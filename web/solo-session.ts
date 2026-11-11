import { Match } from '../src/match.js';
import { createCertifiedBoard, type Selection } from '../src/rules.js';
import type { SoloResult } from '../src/solo-result.js';
import { Player, RoomState } from '../src/state.js';
import { recordSoloStats } from './solo-stats.js';

const resultPrefix = 'fruit-box:solo-result:';
const outbox = new Map<string, SoloResult>();
let flushing = false;
let retry: number | undefined;
try {
  for (const key of Object.keys(localStorage).filter(key => key.startsWith(resultPrefix))) {
    const stored = localStorage.getItem(key);
    if (stored) outbox.set(key, JSON.parse(stored));
  }
} catch { /* Storage can be unavailable in some browser contexts. */ }

async function sendResults() {
  if (flushing || !navigator.onLine || !outbox.size) return;
  window.clearTimeout(retry);
  flushing = true;
  try {
    for (const [key, result] of outbox) {
      const response = await fetch('/solo-results', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(result),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok && response.status !== 400 && response.status !== 413) break;
      outbox.delete(key);
      try { localStorage.removeItem(key); } catch { /* The server can safely replay a retry. */ }
    }
  } catch { /* Keep the result for the next delivery. */ }
  finally {
    flushing = false;
    if (outbox.size) retry = window.setTimeout(sendResults, 10000);
  }
}

window.addEventListener('online', () => void sendResults());
void sendResults();

export class SoloSession {
  readonly sessionId = 'local-solo';
  readonly state = new RoomState();
  private match?: Match;
  private seed = 0;
  private moves: Selection[] = [];
  private attemptId = '';
  private recordedSecond = -1;
  private readonly timer: number;
  private readonly checkpointOnExit = () => {
    this.match?.tick(performance.now());
    this.checkpoint(true);
  };

  constructor(nickname: string, private readonly render: () => void) {
    this.state.mode = 'solo';
    this.state.players.set(this.sessionId, new Player({ nickname }));
    this.prepareBoard();
    window.addEventListener('pagehide', this.checkpointOnExit);
    this.timer = window.setInterval(() => {
      if (!this.match || this.match.phase === 'finished') return;
      this.match.tick(performance.now());
      this.sync();
    }, 100);
  }

  private prepareBoard() {
    this.seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    this.state.board.splice(0, this.state.board.length, ...createCertifiedBoard(this.seed).board.map(fruit => fruit.value));
    this.attemptId = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    this.moves = [];
    this.recordedSecond = -1;
  }

  start() {
    if (this.match && this.match.phase !== 'finished') return;
    if (this.match) {
      this.prepareBoard();
      this.state.round++;
    }
    this.match = new Match([...this.state.board], [this.sessionId], performance.now());
    this.sync();
  }

  command(type: string, id: number, extra: Partial<Selection>) {
    if (!this.match) return;
    const result = this.match.command(this.sessionId, { ...extra, type, id }, performance.now());
    if (result.ok && type === 'clear') {
      const { top, bottom, left, right } = extra as Selection;
      this.moves.push({ top, bottom, left, right });
    }
    this.sync();
    return result;
  }

  close() {
    this.checkpointOnExit();
    window.removeEventListener('pagehide', this.checkpointOnExit);
    window.clearInterval(this.timer);
  }

  private checkpoint(force: boolean) {
    const match = this.match;
    if (!match) return;
    const activeMs = 120000 - match.remainingMs;
    const second = Math.floor(activeMs / 1000);
    if (force || second !== this.recordedSecond) {
      this.recordedSecond = second;
      recordSoloStats(this.attemptId, activeMs, match.phase === 'finished' ? match.players[this.sessionId].score : undefined);
    }
  }

  private sync() {
    const match = this.match!;
    const finished = match.phase === 'finished' && this.state.phase !== 'finished';
    this.state.phase = match.phase;
    this.state.remainingMs = match.remainingMs;
    this.state.pauseRemainingMs = match.pauseRemainingMs;
    this.state.pausedBy = match.pausedBy;
    const player = this.state.players.get(this.sessionId)!;
    const local = match.players[this.sessionId];
    player.score = local.score;
    player.pauses = local.pauses;
    player.ready = local.ready;
    match.board.forEach((value, index) => { this.state.board[index] = value; });
    this.checkpoint(finished);
    this.render();
    if (finished) {
      const key = resultPrefix + this.attemptId;
      const result = { attemptId: this.attemptId, seed: this.seed, moves: this.moves };
      outbox.set(key, result);
      try { localStorage.setItem(key, JSON.stringify(result)); } catch { /* Keep the current-tab outbox. */ }
      void sendResults();
    }
  }
}
