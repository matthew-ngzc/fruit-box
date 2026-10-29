import assert from 'node:assert/strict';
import { Client, type Room } from '@colyseus/sdk';
import { startServer } from '../src/app.js';
import type { RoomState } from '../src/state.js';

const running = await startServer(0);
const clients: Room<RoomState>[] = [];
async function synchronized(room: Room<RoomState>) {
  if (room.state?.players?.size === 2) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { room.onStateChange.remove(changed); reject(new Error('State synchronization timed out')); }, 5000);
    const changed = () => {
      if (room.state?.players?.size === 2) {
        clearTimeout(timer);
        room.onStateChange.remove(changed);
        resolve();
      }
    };
    room.onStateChange(changed);
  });
}
try {
  const sdk = new Client(running.url);
  const first = await sdk.create<RoomState>('versus', { nickname: 'Alice' });
  clients.push(first);
  const second = await sdk.joinById<RoomState>(first.roomId, { nickname: 'Bob' });
  clients.push(second);
  await Promise.all(clients.map(synchronized));
  assert.notEqual(first.sessionId, second.sessionId);
  assert.deepEqual(first.state.toJSON(), second.state.toJSON());
  console.log('Connected guests:', [...first.state.players.values()].map(player => player.nickname).join(', '));
  console.log(`Identical server-owned boards: ${first.state.columns} columns x ${first.state.rows} rows, ${first.state.board.length} fruit`);
  await assert.rejects(sdk.joinById(first.roomId, { nickname: 'Third' }));
  console.log('Third guest rejected; board certificate remains server-side.');
} finally {
  await Promise.all(clients.map(room => room.leave()));
  await running.server.gracefullyShutdown(false);
}
