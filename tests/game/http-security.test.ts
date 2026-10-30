import { afterAll, beforeAll, expect, it } from 'vitest';
import { request } from 'node:http';
import { startServer } from '../../src/app.js';

let running: Awaited<ReturnType<typeof startServer>>;
beforeAll(async () => { running = await startServer(0, undefined, { http: { bodyTimeoutMs: 150, maxConcurrentBodies: 2 } }); });
afterAll(async () => { await running.server.gracefullyShutdown(false); });

function post(body: string, chunked = false, path = '/matchmake/joinById/missing') {
  return new Promise<number>((resolve, reject) => {
    const req = request(`${running.url}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json',
        ...(chunked ? { 'transfer-encoding': 'chunked' } : { 'content-length': Buffer.byteLength(body) }) },
    }, res => { res.resume(); res.on('end', () => resolve(res.statusCode!)); });
    req.on('error', reject);
    req.end(body);
  });
}

it.each(['create/solo', 'joinOrCreate/solo', 'joinById/missing', 'reconnect/missing'])('rejects declared oversized bodies before parsing %s', async path => {
  expect(await post(JSON.stringify({ padding: 'x'.repeat(4096) }), false, '/matchmake/' + path)).toBe(413);
});
it('rejects oversized chunked matchmaking bodies by actual byte count', async () => {
  expect(await post(JSON.stringify({ padding: '🍊'.repeat(1100) }), true)).toBe(413);
});
it('accepts a body at the limit and returns malformed JSON as a client error', async () => {
  const empty = JSON.stringify({ nickname: 'At limit', padding: '' });
  const body = JSON.stringify({ nickname: 'At limit', padding: 'x'.repeat(4096 - Buffer.byteLength(empty)) });
  expect(Buffer.byteLength(body)).toBe(4096);
  expect(await post(body, false, '/matchmake/create/solo')).toBe(200);
  expect(await post('{broken')).toBe(400);
  expect((await fetch(`${running.url}/__healthcheck`)).status).toBe(200);
});

it('expires incomplete uploads and releases capacity for the next request', async () => {
  const status = await new Promise<number>((resolve, reject) => {
    const req = request(`${running.url}/matchmake/create/solo`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'transfer-encoding': 'chunked' },
    }, res => { res.resume(); res.on('end', () => resolve(res.statusCode!)); });
    req.on('error', reject);
    req.write('{');
  });
  expect(status).toBe(408);
  expect(await post('{}')).not.toBe(503);
});

it('bounds simultaneous body reads without blocking health checks', async () => {
  const pending = Array.from({ length: 2 }, () => new Promise<number>((resolve, reject) => {
    const req = request(`${running.url}/matchmake/create/solo`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'transfer-encoding': 'chunked' },
    }, res => { res.resume(); res.on('end', () => resolve(res.statusCode!)); });
    req.on('error', reject);
    req.write('{');
  }));
  await new Promise(resolve => setTimeout(resolve, 30));
  expect((await fetch(`${running.url}/__healthcheck`)).status).toBe(200);
  expect(await post('{}')).toBe(503);
  expect(await Promise.all(pending)).toEqual([408, 408]);
  expect(await post('{}')).not.toBe(503);
});
