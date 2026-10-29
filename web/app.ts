import { Client, type Room } from '@colyseus/sdk';
import type { RoomState } from '../src/state.js';
import { inspectRectangle } from '../src/rules.js';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const message = (text: string) => { element('message').textContent = text; };
const sdk = new Client(location.origin);
const board = element('board');
const box = element('selection-box');
const sumBadge = element('box-sum');
let room: Room<RoomState> | undefined;
type Point = { x: number; y: number };
let start: Point | undefined, end: Point | undefined, dragging = false, pending = false;
let activePointer: number | undefined;
let commandId = Number(sessionStorage.getItem('commandId') ?? 0);
let connected = false;
let phase = '';
const cells: HTMLDivElement[] = [];
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
  activePointer = undefined;
  start = end = undefined; dragging = false; pending = false;
  box.hidden = sumBadge.hidden = true;
}
function rectangle() {
  if (!start || !end) return undefined;
  return { left: Math.min(start.x, end.x), right: Math.max(start.x, end.x), top: Math.min(start.y, end.y), bottom: Math.max(start.y, end.y) };
}
function inspectDrawnRectangle() {
  const bounds = rectangle();
  const state = room?.state;
  if (!bounds || !state?.board) return { fruit: [], sum: 0 };
  const boardBounds = board.getBoundingClientRect();
  const centers = cells.map((cell, id) => {
    const rect = cell.getBoundingClientRect();
    return { id, x: rect.left + rect.width / 2 - boardBounds.left, y: rect.top + rect.height / 2 - boardBounds.top, value: state.board[id] };
  });
  return inspectRectangle(centers, bounds);
}
function submit() {
  if (!room) return;
  const { fruit, sum } = inspectDrawnRectangle();
  if (sum !== 10) {
    message(fruit.length ? `This box totals ${sum}. Aim for 10.` : 'Draw a box around fruit centers totaling 10.');
    cancelSelection(); renderSelection(); return;
  }
  pending = true;
  // Every visual center in a regular grid forms a contiguous row/column range.
  // Empty outer rows/columns can be trimmed without changing the intended fruit.
  const rows = fruit.map(id => Math.floor(id / 17)), columns = fruit.map(id => id % 17);
  send('clear', { top: Math.min(...rows), bottom: Math.max(...rows) + 1, left: Math.min(...columns), right: Math.max(...columns) + 1, fruit });
  renderSelection();
}
function renderSelection() {
  const state = room?.state;
  if (!state?.board) return;
  const inspected = inspectDrawnRectangle();
  const ids = new Set(inspected.fruit);
  const bounds = rectangle();
  for (let id = 0; id < cells.length; id++) {
    const included = ids.has(id);
    cells[id].className = `fruit${state.board[id] ? '' : ' empty'}${included ? ' selected' : ''}${pending && included ? ' pending' : ''}`;
  }
  const visible = !!bounds && bounds.right > bounds.left && bounds.bottom > bounds.top && state.phase === 'playing' && connected;
  box.hidden = sumBadge.hidden = !visible;
  const description = pending ? 'Waiting for server confirmation…' : visible ? `Sum ${inspected.sum} / 10 · ${ids.size} apples` : 'Draw a box around fruit centers · aim for 10';
  if (element('selection').textContent !== description) element('selection').textContent = description;
  if (!visible || !bounds || !end) return;
  const parent = box.parentElement!;
  const parentBounds = parent.getBoundingClientRect(), boardBounds = board.getBoundingClientRect();
  const originX = boardBounds.left - parentBounds.left - parent.clientLeft;
  const originY = boardBounds.top - parentBounds.top - parent.clientTop;
  Object.assign(box.style, { left: `${originX + bounds.left}px`, top: `${originY + bounds.top}px`, width: `${bounds.right - bounds.left}px`, height: `${bounds.bottom - bounds.top}px` });
  box.className = `${inspected.sum === 10 ? 'valid' : ''}${pending ? ' pending' : ''}`;
  sumBadge.textContent = pending ? '10 · sending' : `${inspected.sum} / 10${inspected.sum === 10 ? ' ✓' : ''}`;
  sumBadge.classList.toggle('valid', inspected.sum === 10);
  const badgeWidth = sumBadge.offsetWidth, badgeHeight = sumBadge.offsetHeight;
  const x = Math.max(0, Math.min(parent.clientWidth - badgeWidth, originX + end.x - badgeWidth / 2));
  // Stay close to the moving endpoint instead of jumping elsewhere on the board.
  const above = originY + end.y - badgeHeight - 24;
  const y = parentBounds.top + parent.clientTop + above >= 4 ? above : originY + end.y + 24;
  Object.assign(sumBadge.style, { left: `${x}px`, top: `${y}px` });
}

function render() {
  const state = room?.state;
  if (!state?.board) return;
  if (state.phase !== phase) { phase = state.phase; cancelSelection(); }
  for (let id = 0; id < cells.length; id++) {
    const value = state.board[id];
    cells[id].textContent = value ? String(value) : '';
    cells[id].setAttribute('aria-label', `Row ${Math.floor(id / 17) + 1}, column ${id % 17 + 1}: ${value || 'empty'}`);
  }
  const hidden = state.phase === 'paused' || state.phase === 'waiting';
  board.style.visibility = hidden ? 'hidden' : 'visible';
  element('cover').hidden = !hidden && state.phase !== 'finished';
  const solo = state.mode === 'solo';
  document.body.dataset.mode = solo ? 'solo' : 'versus';
  element('game').dataset.mode = solo ? 'solo' : 'versus';
  document.title = `Fruit Box · ${solo ? 'Solo' : 'Versus'}`;
  element('game-mode').textContent = solo ? 'SOLO PLAY' : 'SHARED-BOARD COMPETITION';
  element('room-invite').hidden = solo;
  element('new-room').textContent = 'New game';
  const players = [...state.players.entries()];
  element('scores').replaceChildren(...players.map(([id, player]) => {
    const div = document.createElement('div'); div.className = 'score';
    const label = document.createElement('span'); label.textContent = player.nickname + (id === room!.sessionId && !solo ? ' (you)' : '');
    const detail = document.createElement('small'); detail.textContent = `${player.connected ? 'Connected' : 'Reconnecting…'} · ${player.pauses} pauses left`;
    label.append(detail); const score = document.createElement('b'); score.textContent = String(player.score); div.append(label, score); return div;
  }));
  const seconds = Math.ceil(state.remainingMs / 1000);
  element('time').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const self = state.players.get(room!.sessionId);
  element('ready').textContent = solo ? 'Start solo round' : "I'm ready";
  element('resume').textContent = solo ? 'Resume' : 'Ready to resume';
  element<HTMLButtonElement>('ready').hidden = state.phase !== 'waiting';
  element<HTMLButtonElement>('ready').disabled = !connected || !!self?.ready;
  element<HTMLButtonElement>('pause').hidden = state.phase !== 'playing';
  element<HTMLButtonElement>('pause').disabled = !connected || !self?.pauses;
  element<HTMLButtonElement>('resume').hidden = state.phase !== 'paused';
  element<HTMLButtonElement>('resume').disabled = !connected || !!self?.ready;
  if (state.phase === 'waiting') {
    element('cover-title').textContent = solo ? 'Ready for a solo round?' : players.length < 2 ? 'Waiting for your friend' : 'Ready when you are';
    element('cover-detail').textContent = solo ? 'Start a 120-second round whenever you are ready.' : self?.ready ? 'You are ready. Waiting for your friend.' : 'Share the invite link. Both players choose “I’m ready” to begin.';
  } else if (state.phase === 'paused') {
    element('cover-title').textContent = 'A little breather.';
    element('cover-detail').textContent = `Resumes in ${Math.ceil(state.pauseRemainingMs / 1000)}s, or ${solo ? 'tap Resume to continue' : 'when you are both ready'}.`;
  } else if (state.phase === 'finished') {
    const scores = players.map(([, player]) => player.score);
    element('cover-title').textContent = solo ? 'Round complete. Well played!' : scores[0] === scores[1] ? 'A draw. Well played!' : `${players[scores[0] > scores[1] ? 0 : 1][1].nickname} wins!`;
    element('cover-detail').textContent = solo ? `Final score: ${scores[0]} apples. Choose New game to play again.` : 'Match finished. Create a new room to play again.';
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
async function join(mode: 'solo' | 'versus') {
  element<HTMLButtonElement>('join').disabled = element<HTMLButtonElement>('solo').disabled = true;
  try {
    const nickname = element<HTMLInputElement>('nickname').value;
    const joined = mode === 'solo'
      ? await sdk.create<RoomState>('solo', { nickname: nickname.trim() || 'You' })
      : code.value.trim() ? await sdk.joinById<RoomState>(code.value.trim(), { nickname }) : await sdk.create<RoomState>('versus', { nickname });
    attach(joined);
  } catch (error) { message(error instanceof Error ? error.message : 'Could not join room'); }
  finally { element<HTMLButtonElement>('join').disabled = element<HTMLButtonElement>('solo').disabled = false; }
}
element<HTMLFormElement>('join-form').addEventListener('submit', event => { event.preventDefault(); void join('versus'); });
element('solo').onclick = () => { void join('solo'); };
for (let id = 0; id < 170; id++) {
  const cell = document.createElement('div'); cell.className = 'fruit'; cell.dataset.cell = String(id); cell.setAttribute('role', 'img'); cells.push(cell); board.append(cell);
}
function pointFromEvent(event: PointerEvent): Point {
  const rect = board.getBoundingClientRect();
  return { x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)) };
}
board.addEventListener('pointerdown', event => {
  if (pending || activePointer !== undefined || !event.isPrimary || !connected || room?.state.phase !== 'playing' || event.button !== 0) return;
  event.preventDefault();
  start = end = pointFromEvent(event); dragging = true; activePointer = event.pointerId;
  board.setPointerCapture(event.pointerId); renderSelection();
});
board.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== activePointer) return;
  end = pointFromEvent(event); renderSelection();
});
board.addEventListener('pointerup', event => {
  if (!dragging || event.pointerId !== activePointer || !start) return;
  end = pointFromEvent(event); dragging = false;
  if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
  activePointer = undefined;
  if (Math.hypot(end.x - start.x, end.y - start.y) < 4) { cancelSelection(); renderSelection(); }
  else submit();
});
board.addEventListener('pointercancel', event => { if (event.pointerId === activePointer) { cancelSelection(); renderSelection(); } });
board.addEventListener('lostpointercapture', event => { if (dragging && event.pointerId === activePointer) { cancelSelection(); renderSelection(); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { cancelSelection(); renderSelection(); } });
window.addEventListener('resize', () => { cancelSelection(); renderSelection(); updateViewControls(); });

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
