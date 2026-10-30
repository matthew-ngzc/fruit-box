import { expect, it } from 'vitest';
import { startServer } from '../../src/app.js';

it('shares one request budget across matchmaking aliases and spoofed proxy addresses', async () => {
  const running = await startServer(0, undefined, { http: { requestBurst: 2, requestRefillMs: 60000 } });
  const post = (path: string, body = '{broken', address = '198.51.100.1') => fetch(`${running.url}/matchmake/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': address }, body,
  });
  try {
    expect((await post('create/solo')).status).toBe(400);
    expect((await post('joinOrCreate/solo')).status).toBe(400);
    const reconnect = await post('reconnect/missing', '{}', '198.51.100.2');
    expect(reconnect.status).toBe(429);
    expect(reconnect.headers.get('retry-after')).toBe('60');
    expect((await post('create/solo')).status).toBe(429);
    expect((await post('joinOrCreate/solo')).status).toBe(429);
    expect((await fetch(`${running.url}/__healthcheck`)).status).toBe(200);
    expect((await fetch(`${running.url}/matchmake/create/solo`, { method: 'OPTIONS' })).status).toBe(204);
  } finally {
    await running.server.gracefullyShutdown(false);
  }
});
it('refills the shared budget after a finite wait', async () => {
  const running = await startServer(0, undefined, { http: { requestBurst: 1, requestRefillMs: 250 } });
  const post = () => fetch(`${running.url}/matchmake/reconnect/missing`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken',
  });
  try {
    expect((await post()).status).toBe(400);
    expect((await post()).status).toBe(429);
    await new Promise(resolve => setTimeout(resolve, 300));
    expect((await post()).status).toBe(400);
  } finally {
    await running.server.gracefullyShutdown(false);
  }
});
