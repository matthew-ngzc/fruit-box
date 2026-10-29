import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';

const url = process.env.FRUIT_BOX_TEST_URL ?? 'http://127.0.0.1:2567';
for (const [path, expected] of [['/', 'Fruit Box'], ['/app.js', 'Game over'], ['/style.css', '#board'], ['/third-party-license', 'MIT License']]) {
  const response = await fetch(new URL(path, url), { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200, path);
  assert.ok((await response.text()).includes(expected), path);
}

const clients = [];
async function waitFor(room, condition) {
  if (condition()) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { room.onStateChange.remove(changed); reject(new Error('Container state synchronization timed out')); }, 5000);
    const changed = () => {
      if (condition()) { clearTimeout(timer); room.onStateChange.remove(changed); resolve(); }
    };
    room.onStateChange(changed);
  });
}

try {
  const sdk = new Client(url);
  const first = await sdk.create('versus', { nickname: 'Container A' }); clients.push(first);
  const second = await sdk.joinById(first.roomId, { nickname: 'Container B' }); clients.push(second);
  first.onMessage('result', result => assert.equal(result.ok, true));
  second.onMessage('result', result => assert.equal(result.ok, true));
  await waitFor(second, () => second.state?.players?.size === 2);
  first.send('ready'); second.send('ready');
  await waitFor(first, () => first.state.phase === 'playing');
  await waitFor(second, () => second.state.phase === 'playing');
  assert.equal(first.state.board.length, 170);
  assert.deepEqual(first.state.board.toJSON(), second.state.board.toJSON());
  first.send('command', { type: 'pause', id: 1 });
  await waitFor(second, () => second.state.phase === 'paused');
  first.send('command', { type: 'resume', id: 2 });
  second.send('command', { type: 'resume', id: 1 });
  await waitFor(first, () => first.state.phase === 'playing');
  const token = first.reconnectionToken;
  first.reconnection.enabled = false;
  await first.leave(false);
  await waitFor(second, () => second.state.players.get(first.sessionId)?.connected === false);
  const recovered = await sdk.reconnect(token); clients.push(recovered);
  await waitFor(recovered, () => recovered.state?.players?.get(first.sessionId)?.connected === true);
  assert.equal(recovered.sessionId, first.sessionId);
  const solo = await sdk.create('solo', { nickname: 'Container Solo' }); clients.push(solo);
  await waitFor(solo, () => solo.state?.mode === 'solo');
  await assert.rejects(sdk.joinById(solo.roomId, { nickname: 'Extra' }));
  solo.send('ready');
  await waitFor(solo, () => solo.state.phase === 'playing');
  assert.equal(solo.state.players.size, 1);
  solo.onMessage('result', result => assert.equal(result.ok, true));
  solo.send('command', { type: 'pause', id: 1 });
  await waitFor(solo, () => solo.state.phase === 'paused');
  solo.send('command', { type: 'resume', id: 2 });
  await waitFor(solo, () => solo.state.phase === 'playing');
  console.log('Container HTTP/assets/license, versus synchronization/reconnect and one-player solo start/pause/resume passed.');
} finally {
  await Promise.all(clients.map(room => room.leave()));
}
