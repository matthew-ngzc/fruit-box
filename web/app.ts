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
function updateJoin() { element('join').textContent = code.value.trim() ? 'Join room' : 'Create room'; }
updateJoin();
function send(type: string, extra = {}) {
  if (!room || !connected) return;
  commandId++;
  sessionStorage.setItem('commandId', String(commandId));
  room.send('command', { type, id: commandId, round: room.state.round, ...extra });
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
    message(fruit.length ? `Total: ${sum}. Select 10.` : 'Select apples totaling 10.');
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
  const description = pending ? 'Checking…' : visible ? `Total: ${inspected.sum} / 10 · Apples: ${ids.size}` : 'Drag a box to make 10.';
  if (element('selection').textContent !== description) element('selection').textContent = description;
  if (!visible || !bounds || !end) return;
  const parent = box.parentElement!;
  const parentBounds = parent.getBoundingClientRect(), boardBounds = board.getBoundingClientRect();
  const originX = boardBounds.left - parentBounds.left - parent.clientLeft;
  const originY = boardBounds.top - parentBounds.top - parent.clientTop;
  Object.assign(box.style, { left: `${originX + bounds.left}px`, top: `${originY + bounds.top}px`, width: `${bounds.right - bounds.left}px`, height: `${bounds.bottom - bounds.top}px` });
  box.className = `${inspected.sum === 10 ? 'valid' : ''}${pending ? ' pending' : ''}`;
  sumBadge.textContent = pending ? 'Checking…' : `${inspected.sum} / 10${inspected.sum === 10 ? ' ✓' : ''}`;
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
  if (state.phase !== phase) {
    phase = state.phase; cancelSelection();
    message('');
    if (phase === 'playing' && connected) sessionStorage.setItem('rejoin', room!.reconnectionToken);
  }
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
  element('game').dataset.phase = state.phase;
  document.title = `Fruit Box · ${solo ? 'Solo' : 'Versus'}`;
  element('game-mode').textContent = solo ? 'SOLO' : 'VERSUS';
  element('room-invite').hidden = solo;
  element('new-room').textContent = 'New game';
  const players = [...state.players.entries()];
  const opponentName = players.find(([id]) => id !== room!.sessionId)?.[1].nickname ?? 'the other player';
  element('scores').replaceChildren(...players.map(([id, player]) => {
    const div = document.createElement('div'); div.className = 'score';
    const label = document.createElement('span'); label.textContent = player.nickname + (id === room!.sessionId && !solo ? ' (you)' : '');
    const detail = document.createElement('small'); detail.textContent = `${player.connected ? 'Connected' : 'Disconnected'} · Pauses left: ${player.pauses}`;
    label.append(detail); const score = document.createElement('b'); score.textContent = String(player.score); div.append(label, score); return div;
  }));
  const seconds = Math.ceil(state.remainingMs / 1000);
  element('time').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const self = state.players.get(room!.sessionId);
  element('ready').textContent = solo ? 'Start' : 'Ready';
  element('resume').textContent = self?.ready ? `Waiting for ${opponentName}…` : 'Resume';
  element<HTMLButtonElement>('ready').hidden = state.phase !== 'waiting';
  element<HTMLButtonElement>('ready').disabled = !connected || !!self?.ready;
  element<HTMLButtonElement>('pause').hidden = state.phase !== 'playing';
  element<HTMLButtonElement>('pause').disabled = !connected || !self?.pauses;
  element<HTMLButtonElement>('resume').hidden = state.phase !== 'paused';
  element<HTMLButtonElement>('resume').disabled = !connected || !!self?.ready;
  const allConnected = players.length === (solo ? 1 : 2) && players.every(([, player]) => player.connected);
  element('play-again').hidden = state.phase !== 'finished';
  element<HTMLButtonElement>('play-again').disabled = !connected || !allConnected || !!self?.ready;
  element('play-again').textContent = self?.ready ? `Waiting for ${opponentName}…` : 'Play again';
  element('rematch-status').hidden = state.phase !== 'finished' || solo;
  element('rematch-status').textContent = !allConnected ? `${opponentName} disconnected. Select New game to start another room.`
    : players.filter(([, player]) => player.ready).map(([, player]) => `${player.nickname}: ready.`).join(' ') || 'Both players must select Play again.';
  if (state.phase === 'waiting') {
    element('cover-title').textContent = solo ? 'Solo' : players.length < 2 ? 'Waiting for player' : 'Ready to start';
    element('cover-detail').textContent = solo ? 'Select Start to play.' : self?.ready ? `Waiting for ${opponentName} to start.` : players.length < 2 ? 'Share the room code or invite link.' : 'Both players must select Ready.';
  } else if (state.phase === 'paused') {
    element('cover-title').textContent = state.players.get(state.pausedBy) ? `Paused by ${state.players.get(state.pausedBy)!.nickname}` : 'Paused';
    element('cover-detail').textContent = `Resumes in ${Math.ceil(state.pauseRemainingMs / 1000)}s. ${solo ? 'Select Resume to continue.' : self?.ready ? `Waiting for ${opponentName}.` : 'Both players must select Resume.'}`;
  } else if (state.phase === 'finished') {
    const scores = players.map(([, player]) => player.score);
    element('cover-title').textContent = solo ? 'Game over' : scores[0] === scores[1] ? 'Draw' : `${players[scores[0] > scores[1] ? 0 : 1][1].nickname} wins`;
    element('cover-detail').textContent = solo ? `Score: ${scores[0]}` : players.map(([, player]) => `${player.nickname}: ${player.score}`).join(' · ');
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
  joined.onMessage('result', (result: { ok: boolean; reason: string }) => { cancelSelection(); message(result.ok ? '' : result.reason); render(); });
  joined.onDrop(() => { connected = false; cancelSelection(); message('Disconnected. Reconnecting… The timer is still running.'); render(); });
  joined.onReconnect(() => { connected = true; sessionStorage.setItem('rejoin', joined.reconnectionToken); message('Reconnected.'); render(); });
  joined.onLeave(() => {
    connected = false; cancelSelection();
    if (joined.state?.phase === 'playing' || joined.state?.phase === 'paused') {
      message('Disconnected. Reload to rejoin before the round ends.');
    } else {
      sessionStorage.removeItem('rejoin'); message('Room closed. Start a new game.');
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
  const available = !!document.fullscreenEnabled && !!document.documentElement.requestFullscreen;
  element('fullscreen').textContent = fullscreen ? 'Exit fullscreen' : available ? 'Fullscreen' : 'Fullscreen unavailable';
  element<HTMLButtonElement>('fullscreen').disabled = !available && !fullscreen;
  const hint = element('view-hint');
  hint.classList.toggle('unsupported', !available);
  hint.textContent = !available ? 'Fullscreen is not supported. Rotate your phone to play in landscape.'
    : matchMedia('(max-width: 900px) and (orientation: portrait)').matches ? 'Rotate your phone for a larger board.' : '';
}
async function enterPlayView() {
  try {
    if (!document.fullscreenElement) {
      if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) {
        message('Fullscreen is not supported. Rotate your phone to play in landscape.');
        return;
      }
      await document.documentElement.requestFullscreen();
    }
    if (!matchMedia('(pointer: coarse), (max-width: 900px)').matches) return;
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    if (orientation?.lock) {
      try { await orientation.lock('landscape'); }
      catch { message('Rotate your phone to play in landscape.'); }
    } else if (matchMedia('(orientation: portrait)').matches) message('Rotate your phone to play in landscape.');
  } catch { message('Fullscreen was blocked. Rotate your phone to play in landscape.'); }
  finally { updateViewControls(); }
}
element('fullscreen').onclick = () => {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => message('Exit fullscreen using your browser controls.'));
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
element('play-again').onclick = () => {
  if (matchMedia('(pointer: coarse), (max-width: 900px)').matches) void enterPlayView();
  send('play-again');
};

async function copyRoomText(kind: 'code' | 'link') {
  if (!room) return;
  const text = kind === 'code' ? room.roomId : new URL(`/?room=${encodeURIComponent(room.roomId)}`, location.origin).href;
  const label = kind === 'code' ? 'Room code' : 'Invite link';
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      element('share-fallback').hidden = true;
      message(`${label} copied.`);
      return;
    }
  } catch { /* Clipboard permission can be denied even on a secure origin. */ }
  // Wi-Fi HTTP may lack Clipboard API. Keep selected text as the final fallback.
  element('share-fallback').hidden = false;
  element('share-label').textContent = label;
  const input = element<HTMLInputElement>('share-text');
  input.value = text; input.focus(); input.select(); input.setSelectionRange(0, text.length);
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* Manual selection remains available. */ }
  message(copied ? `${label} copied.` : `Copy the selected ${kind === 'code' ? 'room code' : 'invite link'} manually.`);
}
element('copy').onclick = () => { void copyRoomText('link'); };
element('copy-code').onclick = () => { void copyRoomText('code'); };
element('share-close').onclick = () => { element('share-fallback').hidden = true; };

element('new-room').onclick = async event => {
  event.preventDefault();
  await room?.leave();
  sessionStorage.removeItem('rejoin');
  location.href = '/';
};
const token = sessionStorage.getItem('rejoin');
const invitedRoom = new URLSearchParams(location.search).get('room');
if (token && (!invitedRoom || token.split(':')[0] === invitedRoom)) {
  message('Reconnecting…');
  sdk.reconnect<RoomState>(token).then(attach).catch(() => { sessionStorage.removeItem('rejoin'); message('Room unavailable. Create or join a room.'); });
}
