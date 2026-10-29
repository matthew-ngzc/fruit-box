import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { startServer } from '../../src/app.js';
import type { RoomState } from '../../src/state.js';

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
