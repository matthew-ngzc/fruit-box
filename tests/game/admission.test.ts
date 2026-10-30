import { afterEach, expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { startServer } from '../../src/app.js';

let running: Awaited<ReturnType<typeof startServer>>;
const clients: Room[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map(room => room.leave()));
  await running?.server.gracefullyShutdown(false);
});

it('shares creation admission across solo, versus and joinOrCreate while allowing an existing invite', async () => {
  running = await startServer(0, '127.0.0.1', { rooms: { creationBurst: 2, creationRefillMs: 60000 } });
  const sdk = new Client(running.url);
  clients.push(await sdk.create('solo', { nickname: 'Solo' }));
  const host = await sdk.create('versus', { nickname: 'Host' }); clients.push(host);
  await expect(sdk.create('solo', { nickname: 'Excess' })).rejects.toThrow('creation');
  await expect(sdk.joinOrCreate('versus', { nickname: 'Alias' })).rejects.toThrow('creation');
  const response = await fetch(`${running.url}/matchmake/create/solo`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1', 'cf-connecting-ip': '192.0.2.2' },
    body: JSON.stringify({ nickname: 'Spoofed' }),
  });
  expect(response.status).toBe(429);
  clients.push(await sdk.joinById(host.roomId, { nickname: 'Friend' }));
});

it('releases the shared room capacity after disposal without charging invalid admission', async () => {
  running = await startServer(0, '127.0.0.1', { rooms: { maxRooms: 1, creationBurst: 20 } });
  const sdk = new Client(running.url);
  await expect(sdk.create('solo', { nickname: '' })).rejects.toThrow('Nickname');
  const host = await sdk.create('versus', { nickname: 'Host' }); clients.push(host);
  await expect(sdk.create('solo', { nickname: 'Excess' })).rejects.toThrow('capacity');
  const friend = await sdk.joinById(host.roomId, { nickname: 'Friend' }); clients.push(friend);
  await Promise.all([host.leave(), friend.leave()]);
  await expect.poll(async () => {
    try { clients.push(await sdk.create('solo', { nickname: 'Replacement' })); return true; }
    catch { return false; }
  }).toBe(true);
});

it('disconnects a flooding guest while the other guest can still use the room', async () => {
  running = await startServer(0);
  const sdk = new Client(running.url);
  const offender = await sdk.create('versus', { nickname: 'Flood' }); clients.push(offender);
  const friend = await sdk.joinById(offender.roomId, { nickname: 'Friend' }); clients.push(friend);
  offender.reconnection.enabled = false;
  offender.onMessage('result', () => {});
  const left = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Flooding guest remained connected')), 3000);
    offender.onLeave(() => { clearTimeout(timer); resolve(); });
  });
  for (let id = 1; id <= 60; id++) offender.send('command', { type: 'clear', id });
  await left;
  clients.push(await sdk.joinById(friend.roomId, { nickname: 'Replacement' }));
});

it('closes an active-match flood promptly and never strands the old socket on reconnect', async () => {
  running = await startServer(0);
  const sdk = new Client(running.url);
  const offender = await sdk.create('solo', { nickname: 'Flood' }); clients.push(offender);
  offender.reconnection.enabled = false;
  offender.onMessage('result', () => {});
  const playing = new Promise<void>(resolve => offender.onStateChange(state => { if (state.phase === 'playing') resolve(); }));
  offender.send('ready');
  await playing;
  const token = offender.reconnectionToken;
  const closed = new Promise<boolean>(resolve => {
    const timer = setTimeout(() => resolve(false), 500);
    offender.onLeave(() => { clearTimeout(timer); resolve(true); });
  });
  for (let id = 1; id <= 60; id++) offender.send('command', { type: 'clear', id });
  expect(await closed).toBe(true);
  const recovered = await sdk.reconnect(token); clients.push(recovered);
  expect(recovered.sessionId).toBe(offender.sessionId);
  expect(offender.connection.isOpen).toBe(false);
});
