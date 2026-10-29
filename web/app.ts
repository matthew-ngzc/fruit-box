import { Client, type Room } from '@colyseus/sdk';
import type { RoomState } from '../src/state.js';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const message = (text: string) => { element('message').textContent = text; };
const sdk = new Client(location.origin);
const board = element('board');
const box = element('selection-box');
const sumBadge = element('box-sum');
const touchPreview = element('touch-preview');
let room: Room<RoomState> | undefined;
let start: number | undefined, end: number | undefined, dragging = false, moved = false, pending = false;
let activePointer: number | undefined;
let pointer: { x: number; y: number; touch: boolean } | undefined;
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
function cancelSelection() {
  dragging = false;
  if (activePointer !== undefined && board.hasPointerCapture(activePointer)) board.releasePointerCapture(activePointer);
  activePointer = undefined; pointer = undefined;
  start = end = undefined; dragging = false; pending = false;
  box.hidden = sumBadge.hidden = touchPreview.hidden = true;
}
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

function renderSelection() {
  const state = room?.state;
  if (!state?.board) return;
  const ids = new Set(selected());
  const sum = [...ids].reduce((total, id) => total + state.board[id], 0);
  for (let id = 0; id < buttons.length; id++) {
    const included = state.board[id] > 0 && ids.has(id);
    buttons[id].className = `fruit${state.board[id] ? '' : ' empty'}${included ? ' selected' : ''}${pending && included ? ' pending' : ''}`;
  }
  const visible = ids.size > 0 && state.phase === 'playing' && connected;
  box.hidden = sumBadge.hidden = !visible;
  touchPreview.hidden = !(visible && dragging && pointer?.touch && element<HTMLInputElement>('touch-aid').checked);
  const description = pending ? 'Waiting for server confirmation…' : visible ? `Sum ${sum} / 10 · ${[...ids].filter(id => state.board[id] > 0).length} apples` : 'Drag across apples to draw a box, or tap two corners';
  if (element('selection').textContent !== description) element('selection').textContent = description;
  if (!visible || start === undefined || end === undefined) return;
  const left = Math.min(start % 17, end % 17), right = Math.max(start % 17, end % 17);
  const top = Math.min(Math.floor(start / 17), Math.floor(end / 17)), bottom = Math.max(Math.floor(start / 17), Math.floor(end / 17));
  const parent = box.parentElement!.getBoundingClientRect();
  const first = buttons[top * 17 + left].getBoundingClientRect();
  const last = buttons[bottom * 17 + right].getBoundingClientRect();
  const x = first.left - parent.left, y = first.top - parent.top;
  Object.assign(box.style, { left: `${x - 2}px`, top: `${y - 2}px`, width: `${last.right - first.left + 4}px`, height: `${last.bottom - first.top + 4}px` });
  box.className = `${sum === 10 ? 'valid' : ''}${pending ? ' pending' : ''}`;
  sumBadge.textContent = pending ? '10 · sending' : `${sum} / 10${sum === 10 ? ' ✓' : ''}`;
  sumBadge.classList.toggle('valid', sum === 10);
  const badgeWidth = sumBadge.offsetWidth, badgeHeight = sumBadge.offsetHeight;
  const candidates = [
    { x, y: y - badgeHeight - 6 },
    { x: last.right - parent.left - badgeWidth, y: y - badgeHeight - 6 },
    { x, y: last.bottom - parent.top + 6 },
    { x: last.right - parent.left - badgeWidth, y: last.bottom - parent.top + 6 },
  ].map(point => ({ x: Math.max(0, Math.min(parent.width - badgeWidth, point.x)), y: Math.max(-badgeHeight / 2, Math.min(parent.height - badgeHeight / 2, point.y)) }));
  const distance = (point: { x: number; y: number }) => pointer ? Math.hypot(point.x + parent.left + badgeWidth / 2 - pointer.x, point.y + parent.top + badgeHeight / 2 - pointer.y) : 0;
  const position = pointer ? candidates.reduce((best, point) => distance(point) > distance(best) ? point : best) : candidates[0];
  Object.assign(sumBadge.style, { left: `${position.x}px`, top: `${position.y}px` });
  if (!touchPreview.hidden && pointer) {
    const row = Math.floor(end / 17), col = end % 17;
    const cells: HTMLElement[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cell = document.createElement('span');
      const r = row + dy, c = col + dx, id = r * 17 + c;
      const value = r >= 0 && r < 10 && c >= 0 && c < 17 ? state.board[id] : 0;
      cell.textContent = value ? String(value) : '·';
      cell.className = `${ids.has(id) && value ? 'chosen ' : ''}${dx === 0 && dy === 0 ? 'endpoint' : ''}`;
      cells.push(cell);
    }
    element('preview-cells').replaceChildren(...cells);
    Object.assign(touchPreview.style, { left: pointer.x > innerWidth / 2 ? '12px' : 'auto', right: pointer.x > innerWidth / 2 ? 'auto' : '12px', top: pointer.y > 160 ? '12px' : 'auto', bottom: pointer.y > 160 ? 'auto' : '12px' });
  }
}

function render() {
  const state = room?.state;
  if (!state?.board) return;
  if (state.phase !== phase) { phase = state.phase; cancelSelection(); }
  for (let id = 0; id < buttons.length; id++) {
    const value = state.board[id];
    buttons[id].textContent = value ? String(value) : '';
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
  renderSelection();
}
function attach(joined: Room<RoomState>) {
  room = joined; connected = true;
  document.body.classList.add('has-game');
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
    if (activePointer !== undefined) return;
    if (start === undefined) { start = end = id; renderSelection(); } else { end = id; submit(); }
  });
}
function hit(event: PointerEvent, clamp = false) {
  const rect = board.getBoundingClientRect();
  if (!clamp && (event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom)) return undefined;
  const x = Math.max(0, Math.min(rect.width - 0.01, event.clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height - 0.01, event.clientY - rect.top));
  return Math.min(9, Math.floor(y / rect.height * 10)) * 17 + Math.min(16, Math.floor(x / rect.width * 17));
}
board.addEventListener('pointerdown', event => {
  if (pending || activePointer !== undefined || !event.isPrimary || !connected || room?.state.phase !== 'playing' || event.button !== 0) return;
  event.preventDefault(); const id = hit(event); if (id === undefined) return;
  pointer = { x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' };
  if (start !== undefined) { end = id; submit(); return; }
  start = end = id; dragging = true; moved = false; activePointer = event.pointerId;
  board.setPointerCapture(event.pointerId); renderSelection();
});
board.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== activePointer) return;
  const id = hit(event, true);
  pointer = { x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' };
  if (id !== undefined && id !== end) { moved = true; end = id; }
  renderSelection();
});
board.addEventListener('pointerup', event => {
  if (!dragging || event.pointerId !== activePointer) return;
  end = hit(event, true); dragging = false;
  if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
  activePointer = undefined;
  touchPreview.hidden = true;
  if (moved) submit(); else renderSelection();
});
board.addEventListener('pointercancel', event => { if (event.pointerId === activePointer) { cancelSelection(); renderSelection(); } });
board.addEventListener('lostpointercapture', event => { if (dragging && event.pointerId === activePointer) { cancelSelection(); renderSelection(); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { cancelSelection(); renderSelection(); } });
window.addEventListener('resize', () => { cancelSelection(); renderSelection(); updateViewControls(); });
element('touch-aid').onchange = renderSelection;

function updateViewControls() {
  const fullscreen = !!document.fullscreenElement;
  element('fullscreen').textContent = fullscreen ? 'Exit fullscreen' : 'Fullscreen';
  element('view-hint').textContent = matchMedia('(max-width: 900px) and (orientation: portrait)').matches
    ? 'Turn your phone sideways for a larger board.' : '';
}
async function enterPlayView() {
  try {
    if (!document.fullscreenElement) {
      if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) {
        message('Fullscreen is unavailable here. Turn your phone sideways; landscape play still works.');
        return;
      }
      await document.documentElement.requestFullscreen();
    }
    if (!matchMedia('(pointer: coarse), (max-width: 900px)').matches) return;
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    if (orientation?.lock) {
      try { await orientation.lock('landscape'); }
      catch { message('Turn your phone sideways for landscape play.'); }
    } else if (matchMedia('(orientation: portrait)').matches) message('Turn your phone sideways for landscape play.');
  } catch { message('Fullscreen was not allowed. You can still turn your phone sideways and play.'); }
  finally { updateViewControls(); }
}
element('fullscreen').onclick = () => {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => message('Use your browser’s fullscreen exit control.'));
  else void enterPlayView();
};
document.addEventListener('fullscreenchange', () => { cancelSelection(); renderSelection(); updateViewControls(); });
element('ready').onclick = () => {
  if (matchMedia('(pointer: coarse), (max-width: 900px)').matches) void enterPlayView();
  room?.send('ready');
};
updateViewControls();
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
