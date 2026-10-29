import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { startServer } from '../../src/app.js';
import type { RoomState } from '../../src/state.js';

function findClear(values: number[]) {
  for (let top = 0; top < 10; top++) for (let left = 0; left < 17; left++)
    for (let bottom = top + 1; bottom <= 10; bottom++) for (let right = left + 1; right <= 17; right++) {
      const fruit: number[] = [];
      for (let row = top; row < bottom; row++) for (let col = left; col < right; col++) if (values[row * 17 + col]) fruit.push(row * 17 + col);
      if (fruit.reduce((sum, id) => sum + values[id], 0) === 10) return { top, left, bottom, right, fruit };
    }
  throw new Error('Initial certified board has no clear');
}

let running: Awaited<ReturnType<typeof startServer>>;
const rooms: Room<RoomState>[] = [];
const connect = (room: Room<RoomState>) => { rooms.push(room); return room; };
async function waitFor(room: Room<RoomState>, condition: () => boolean) {
  if (condition()) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { room.onStateChange.remove(changed); reject(new Error('State synchronization timed out')); }, 5000);
    const changed = () => {
      if (condition()) { clearTimeout(timer); room.onStateChange.remove(changed); resolve(); }
    };
    room.onStateChange(changed);
  });
}
beforeAll(async () => { running = await startServer(0); });
afterAll(async () => {
  await Promise.all(rooms.map(room => room.leave()));
  await running.server.gracefullyShutdown(false);
});

it('two guests receive the same server-owned board and distinct identities', async () => {
  const sdk = new Client(running.url);
  const first = connect(await sdk.create<RoomState>('versus', { nickname: 'Sam' }));
  const second = connect(await sdk.joinById<RoomState>(first.roomId, { nickname: 'Sam' }));
  await waitFor(first, () => first.state?.players?.size === 2);
  await waitFor(second, () => second.state?.players?.size === 2);
  expect(first.sessionId).not.toBe(second.sessionId);
  expect([...first.state.players.values()].map(player => player.nickname)).toEqual(['Sam', 'Sam']);
  expect(first.state.board.toJSON()).toEqual(second.state.board.toJSON());
  expect(first.state.board.length).toBe(170);
  expect(first.state.rows).toBe(10);
  expect(first.state.columns).toBe(17);
  expect(first.state.toJSON()).not.toHaveProperty('solution');
});

it.each([undefined, null, 17, '', '   ', 'x'.repeat(25), 'bad\nname'])('rejects malformed nickname %j without consuming a seat', async nickname => {
  const sdk = new Client(running.url);
  const first = connect(await sdk.create<RoomState>('versus', { nickname: 'Host' }));
  await expect(sdk.joinById(first.roomId, { nickname })).rejects.toThrow('Nickname');
  const second = connect(await sdk.joinById<RoomState>(first.roomId, { nickname: '  Guest  ' }));
  await waitFor(second, () => second.state?.players?.size === 2);
  expect(second.state.players.get(second.sessionId)?.nickname).toBe('Guest');
});


it('rejects a third guest and keeps separate rooms isolated', async () => {
  const sdk = new Client(running.url);
  const first = connect(await sdk.create<RoomState>('versus', { nickname: 'One' }));
  const second = connect(await sdk.joinById<RoomState>(first.roomId, { nickname: 'Two' }));
  await waitFor(first, () => first.state?.players?.size === 2);
  await expect(sdk.joinById(first.roomId, { nickname: 'Three' })).rejects.toThrow();
  const separate = connect(await sdk.create<RoomState>('versus', { nickname: 'Separate', board: [9], seed: 42 }));
  await waitFor(separate, () => separate.state?.players?.size === 1);
  expect(separate.roomId).not.toBe(first.roomId);
  expect([...separate.state.players.values()].map(player => player.nickname)).toEqual(['Separate']);
  expect(separate.state.board.length).toBe(170);
  const original = first.state.board.toJSON();
  await second.leave();
  await waitFor(first, () => first.state.players.size === 1);
  expect(first.state.board.toJSON()).toEqual(original);
  expect(separate.state.players.size).toBe(1);
  const replacement = connect(await sdk.joinById<RoomState>(first.roomId, { nickname: 'Replacement' }));
  await waitFor(replacement, () => replacement.state?.players?.size === 2);
  expect(replacement.state.board.toJSON()).toEqual(original);
});

it('does not admit guests by public room-name matching', async () => {
  const sdk = new Client(running.url);
  connect(await sdk.create<RoomState>('versus', { nickname: 'Private' }));
  await expect(sdk.join('versus', { nickname: 'Uninvited' })).rejects.toThrow();
});

it('starts a one-seat solo round without another guest', async () => {
  const sdk = new Client(running.url);
  const solo = connect(await sdk.create<RoomState>('solo', { nickname: 'Solo' }));
  await waitFor(solo, () => solo.state?.players?.size === 1);
  expect(solo.state.mode).toBe('solo');
  await expect(sdk.joinById(solo.roomId, { nickname: 'Unexpected guest' })).rejects.toThrow();
  solo.send('ready');
  await waitFor(solo, () => solo.state.phase === 'playing');
  expect(solo.state.players.size).toBe(1);
  expect(solo.state.board.length).toBe(170);
  expect(solo.state.remainingMs).toBeGreaterThan(119000);
});

it('credits solo clears once, resumes alone and restores score after reconnect', async () => {
  const sdk = new Client(running.url);
  const solo = connect(await sdk.create<RoomState>('solo', { nickname: 'Solo' }));
  await waitFor(solo, () => solo.state?.mode === 'solo');
  solo.send('ready');
  await waitFor(solo, () => solo.state.phase === 'playing');
  const clear = { ...findClear([...solo.state.board]), type: 'clear', id: 1 };
  const received: { ok: boolean }[] = [];
  solo.onMessage('result', result => received.push(result));
  solo.send('command', clear);
  await waitFor(solo, () => solo.state.players.get(solo.sessionId)?.score === clear.fruit.length);
  solo.send('command', clear);
  solo.send('command', { type: 'pause', id: 2 });
  await waitFor(solo, () => solo.state.phase === 'paused');
  expect(solo.state.players.get(solo.sessionId)?.score).toBe(clear.fruit.length);
  expect(solo.state.players.get(solo.sessionId)?.pauses).toBe(1);
  expect(received.some(result => result.ok === false)).toBe(true);
  solo.send('command', { type: 'resume', id: 3 });
  await waitFor(solo, () => solo.state.phase === 'playing');
  const token = solo.reconnectionToken, id = solo.sessionId;
  solo.reconnection.enabled = false;
  await solo.leave(false);
  const recovered = connect(await sdk.reconnect<RoomState>(token));
  await waitFor(recovered, () => recovered.state?.players?.get(id)?.connected === true);
  expect(recovered.sessionId).toBe(id);
  expect(recovered.state.mode).toBe('solo');
  expect(recovered.state.players.size).toBe(1);
  expect(recovered.state.players.get(id)?.score).toBe(clear.fruit.length);
});

it('does not let client options change a versus room into solo', async () => {
  const sdk = new Client(running.url);
  const first = connect(await sdk.create<RoomState>('versus', { nickname: 'Host', mode: 'solo', maxClients: 1 }));
  await waitFor(first, () => first.state?.players?.size === 1);
  expect(first.state.mode).toBe('versus');
  first.send('ready');
  await waitFor(first, () => first.state.players.get(first.sessionId)?.ready === true);
  expect(first.state.phase).toBe('waiting');
  connect(await sdk.joinById<RoomState>(first.roomId, { nickname: 'Guest' }));
});

it('starts only after both guests ready and synchronizes a confirmed clear', async () => {
  const sdk = new Client(running.url);
  const first = connect(await sdk.create<RoomState>('versus', { nickname: 'Alice' }));
  const second = connect(await sdk.joinById<RoomState>(first.roomId, { nickname: 'Bob' }));
  await waitFor(second, () => second.state?.players?.size === 2);
  first.send('ready');
  await waitFor(first, () => first.state?.players?.get(first.sessionId)?.ready === true);
  expect(first.state.phase).toBe('waiting');
  second.send('ready');
  await waitFor(first, () => first.state.phase === 'playing');
  expect(first.state.remainingMs).toBeGreaterThan(119000);
  first.send('command', { type: 'pause', id: 1 });
  await waitFor(second, () => second.state.phase === 'paused');
  expect(second.state.players.get(first.sessionId)?.pauses).toBe(1);
  first.send('command', { type: 'resume', id: 2 });
  second.send('command', { type: 'resume', id: 1 });
  await waitFor(second, () => second.state.phase === 'playing');
});

it('arbitrates conflicting network clears once and restores identity/score after a drop', async () => {
  const sdk = new Client(running.url);
  const a = connect(await sdk.create<RoomState>('versus', { nickname: 'A' }));
  const b = connect(await sdk.joinById<RoomState>(a.roomId, { nickname: 'B' }));
  await waitFor(b, () => b.state?.players?.size === 2);
  a.send('ready'); b.send('ready');
  await waitFor(a, () => a.state.phase === 'playing');
  const clear = { ...findClear([...a.state.board]), type: 'clear', id: 1 };
  const result = new Promise<{ ok: boolean }>(resolve => a.onMessage('result', resolve));
  a.send('command', clear);
  expect((await result).ok).toBe(true);
  await waitFor(b, () => b.state.players.get(a.sessionId)?.score === clear.fruit.length);
  const rejected = new Promise<{ ok: boolean }>(resolve => b.onMessage('result', resolve));
  b.send('command', clear);
  expect((await rejected).ok).toBe(false);
  a.send('command', clear);
  const token = a.reconnectionToken;
  const session = a.sessionId;
  a.reconnection.enabled = false;
  await a.leave(false);
  await waitFor(b, () => b.state.players.get(session)?.connected === false);
  const before = b.state.remainingMs;
  const recovered = connect(await sdk.reconnect<RoomState>(token));
  await waitFor(recovered, () => recovered.state?.players?.get(session)?.connected === true);
  expect(recovered.sessionId).toBe(session);
  expect(recovered.state.players.get(session)?.score).toBe(clear.fruit.length);
  expect(recovered.state.remainingMs).toBeLessThanOrEqual(before);
  expect(recovered.state.board.toJSON()).toEqual(b.state.board.toJSON());
});
