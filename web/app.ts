import { Client, type Room } from '@colyseus/sdk';
import type { RoomState } from '../src/state.js';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const message = (text: string) => { element('message').textContent = text; };
const sdk = new Client(location.origin);
const board = element('board');
let room: Room<RoomState> | undefined;
let start: number | undefined, end: number | undefined, dragging = false, moved = false, pending = false;
let commandId = Number(sessionStorage.getItem('commandId') ?? 0);
let connected = false;
let phase = '';
const buttons: HTMLButtonElement[] = [];
const code = element<HTMLInputElement>('room-code');
code.value = new URLSearchParams(location.search).get('room') ?? '';
code.addEventListener('input', updateJoin);
function updateJoin() { element('join').textContent = code.value.trim() ? 'Join room ↗' : 'Create a room ↗'; }
updateJoin();
function send(type: string, extra = {}) {
  if (!room || !connected) return;
  commandId++;
  sessionStorage.setItem('commandId', String(commandId));
  room.send('command', { type, id: commandId, ...extra });
}
function cancelSelection() { start = end = undefined; dragging = false; pending = false; }
function selected() {
  if (start === undefined || end === undefined) return [];
  const left = Math.min(start % 17, end % 17), right = Math.max(start % 17, end % 17);
  const top = Math.min(Math.floor(start / 17), Math.floor(end / 17)), bottom = Math.max(Math.floor(start / 17), Math.floor(end / 17));
  const result: number[] = [];
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) result.push(y * 17 + x);
  return result;
}
function submit() {
  if (!room || start === undefined || end === undefined) return;
  const fruit = selected().filter(id => room!.state.board[id] > 0);
  if (fruit.reduce((sum, id) => sum + room!.state.board[id], 0) !== 10) {
    message('Aim for 10. Try another rectangle.'); cancelSelection(); render(); return;
  }
  pending = true;
  send('clear', { top: Math.min(Math.floor(start / 17), Math.floor(end / 17)), bottom: Math.max(Math.floor(start / 17), Math.floor(end / 17)) + 1,
    left: Math.min(start % 17, end % 17), right: Math.max(start % 17, end % 17) + 1, fruit });
  render();
}
function render() {
  const state = room?.state;
  if (!state?.board) return;
  if (state.phase !== phase) { phase = state.phase; cancelSelection(); }
  const ids = new Set(selected());
  for (let id = 0; id < buttons.length; id++) {
    const value = state.board[id];
    buttons[id].textContent = value ? String(value) : '';
    buttons[id].className = `fruit${value ? '' : ' empty'}${ids.has(id) ? ' selected' : ''}${pending && ids.has(id) ? ' pending' : ''}`;
    buttons[id].setAttribute('aria-label', `Row ${Math.floor(id / 17) + 1}, column ${id % 17 + 1}: ${value || 'empty'}`);
    buttons[id].disabled = state.phase !== 'playing' || !connected;
  }
  const hidden = state.phase === 'paused' || state.phase === 'waiting';
  board.style.visibility = hidden ? 'hidden' : 'visible';
  element('cover').hidden = !hidden && state.phase !== 'finished';
  const players = [...state.players.entries()];
  element('scores').replaceChildren(...players.map(([id, player]) => {
    const div = document.createElement('div'); div.className = 'score';
    const label = document.createElement('span'); label.textContent = player.nickname + (id === room!.sessionId ? ' (you)' : '');
    const detail = document.createElement('small'); detail.textContent = `${player.connected ? 'Connected' : 'Reconnecting…'} · ${player.pauses} pauses left`;
    label.append(detail); const score = document.createElement('b'); score.textContent = String(player.score); div.append(label, score); return div;
  }));
  const seconds = Math.ceil(state.remainingMs / 1000);
  element('time').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const self = state.players.get(room!.sessionId);
  element<HTMLButtonElement>('ready').hidden = state.phase !== 'waiting';
  element<HTMLButtonElement>('ready').disabled = !connected || !!self?.ready;
  element<HTMLButtonElement>('pause').hidden = state.phase !== 'playing';
  element<HTMLButtonElement>('pause').disabled = !connected || !self?.pauses;
  element<HTMLButtonElement>('resume').hidden = state.phase !== 'paused';
  element<HTMLButtonElement>('resume').disabled = !connected || !!self?.ready;
  if (state.phase === 'waiting') {
    element('cover-title').textContent = players.length < 2 ? 'Waiting for your friend' : 'Ready when you are';
    element('cover-detail').textContent = self?.ready ? 'You are ready. Waiting for your friend.' : 'Share the invite link. Both players choose “I’m ready” to begin.';
  } else if (state.phase === 'paused') {
    element('cover-title').textContent = 'A little breather.';
    element('cover-detail').textContent = `Resumes in ${Math.ceil(state.pauseRemainingMs / 1000)}s, or when you are both ready.`;
  } else if (state.phase === 'finished') {
    const scores = players.map(([, player]) => player.score);
    element('cover-title').textContent = scores[0] === scores[1] ? 'A draw. Well played!' : `${players[scores[0] > scores[1] ? 0 : 1][1].nickname} wins!`;
    element('cover-detail').textContent = 'Match finished. Create a new room to play again.';
    sessionStorage.removeItem('rejoin');
  }
  element('selection').textContent = pending ? 'Waiting for server confirmation…' : ids.size ? `Selected sum: ${[...ids].reduce((sum, id) => sum + state.board[id], 0)} / 10` : 'Drag a rectangle, or tap two corners · aim for 10';
}
function attach(joined: Room<RoomState>) {
  room = joined; connected = true;
  sessionStorage.setItem('rejoin', joined.reconnectionToken);
  element('lobby').hidden = true; element('game').hidden = false;
  element('room-id').textContent = joined.roomId;
  history.replaceState(null, '', `?room=${encodeURIComponent(joined.roomId)}`);
  joined.onStateChange(render);
  joined.onMessage('result', (result: { ok: boolean; reason: string }) => { cancelSelection(); message(result.reason); render(); });
  joined.onDrop(() => { connected = false; cancelSelection(); message('Connection lost. Reconnecting… The match clock continues.'); render(); });
  joined.onReconnect(() => { connected = true; sessionStorage.setItem('rejoin', joined.reconnectionToken); message('Reconnected.'); render(); });
  joined.onLeave(() => {
    connected = false; cancelSelection();
    if (joined.state?.phase === 'playing' || joined.state?.phase === 'paused') {
      message('Connection unavailable. Reload to try rejoining before the match finishes.');
    } else {
      sessionStorage.removeItem('rejoin'); message('Room closed. Create a new room to play.');
    }
    render();
  });
  message(''); render();
}
element<HTMLFormElement>('join-form').addEventListener('submit', async event => {
  event.preventDefault(); element<HTMLButtonElement>('join').disabled = true;
  try {
    const nickname = element<HTMLInputElement>('nickname').value;
    attach(code.value.trim() ? await sdk.joinById<RoomState>(code.value.trim(), { nickname }) : await sdk.create<RoomState>('versus', { nickname }));
  } catch (error) { message(error instanceof Error ? error.message : 'Could not join room'); }
  finally { element<HTMLButtonElement>('join').disabled = false; }
});
for (let id = 0; id < 170; id++) {
  const cell = document.createElement('button'); cell.type = 'button'; cell.className = 'fruit'; cell.dataset.cell = String(id); buttons.push(cell); board.append(cell);
  cell.addEventListener('click', event => {
    if ((event as PointerEvent).detail !== 0 || pending || room?.state.phase !== 'playing') return;
    if (start === undefined) { start = end = id; render(); } else { end = id; submit(); }
  });
}
function hit(event: PointerEvent) {
  const rect = board.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom) return undefined;
  return Math.min(9, Math.floor((event.clientY - rect.top) / rect.height * 10)) * 17 + Math.min(16, Math.floor((event.clientX - rect.left) / rect.width * 17));
}
board.addEventListener('pointerdown', event => {
  if (pending || !connected || room?.state.phase !== 'playing' || event.button !== 0) return;
  event.preventDefault(); const id = hit(event); if (id === undefined) return;
  if (start !== undefined) { end = id; submit(); return; }
  start = end = id; dragging = true; moved = false; board.setPointerCapture(event.pointerId); render();
});
board.addEventListener('pointermove', event => { if (dragging) { const id = hit(event); if (id !== undefined && id !== end) { moved = true; end = id; render(); } } });
board.addEventListener('pointerup', () => { if (!dragging) return; dragging = false; if (moved) submit(); });
board.addEventListener('pointercancel', () => { cancelSelection(); render(); });
element('ready').onclick = () => room?.send('ready');
element('pause').onclick = () => send('pause');
element('resume').onclick = () => send('resume');
element('copy').onclick = async () => { try { await navigator.clipboard.writeText(location.href); message('Invite link copied.'); } catch { message(`Share this address: ${location.href}`); } };
element('new-room').onclick = async event => {
  event.preventDefault();
  await room?.leave();
  sessionStorage.removeItem('rejoin');
  location.href = '/';
};
const token = sessionStorage.getItem('rejoin');
const invitedRoom = new URLSearchParams(location.search).get('room');
if (token && (!invitedRoom || token.split(':')[0] === invitedRoom)) {
  message('Trying to rejoin your match…');
  sdk.reconnect<RoomState>(token).then(attach).catch(() => { sessionStorage.removeItem('rejoin'); message('Previous match unavailable. Create or join a room.'); });
}
