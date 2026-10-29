export class Match {
  board: number[];
  players: Record<string, { score: number; pauses: number; ready: boolean; lastId: number }>;
  phase: 'playing' | 'paused' | 'finished' = 'playing';
  remainingMs = 120000;
  pauseRemainingMs = 0;
  pausedBy = '';
  private updatedAt: number;

  constructor(board: number[], players: string[], now: number, readonly columns = 17) {
    this.board = [...board];
    this.players = Object.fromEntries(players.map(id => [id, { score: 0, pauses: 2, ready: false, lastId: 0 }]));
    this.updatedAt = now;
  }

  tick(now: number) {
    let elapsed = Math.max(0, now - this.updatedAt);
    if (this.phase === 'paused') {
      const paused = Math.min(elapsed, this.pauseRemainingMs);
      this.pauseRemainingMs -= paused;
      elapsed -= paused;
      if (this.pauseRemainingMs === 0) this.resume();
    }
    if (this.phase === 'playing') this.remainingMs = Math.max(0, this.remainingMs - elapsed);
    this.updatedAt = now;
    if (this.remainingMs === 0) this.phase = 'finished';
  }

  private resume() {
    this.phase = 'playing';
    this.pauseRemainingMs = 0;
    this.pausedBy = '';
    for (const player of Object.values(this.players)) player.ready = false;
  }

  command(playerId: string, value: unknown, now: number): { ok: boolean; reason: string } {
    this.tick(now);
    const reject = (reason: string) => ({ ok: false, reason });
    const player = this.players[playerId];
    if (!player || !value || typeof value !== 'object') return reject('Invalid command');
    const command = value as Record<string, unknown>;
    if (!Number.isSafeInteger(command.id) || Number(command.id) <= player.lastId) return reject('Duplicate or invalid command');
    player.lastId = Number(command.id);
    if (command.type === 'play-again' && this.phase === 'finished') {
      player.ready = true;
      return { ok: true, reason: 'Ready to play again' };
    }
    if (command.type === 'pause' && this.phase === 'playing' && player.pauses > 0) {
      player.pauses--;
      this.phase = 'paused';
      this.pauseRemainingMs = 30000;
      this.pausedBy = playerId;
      return { ok: true, reason: 'Paused' };
    }
    if (command.type === 'resume' && this.phase === 'paused') {
      player.ready = true;
      if (Object.values(this.players).every(player => player.ready)) this.resume();
      return { ok: true, reason: 'Ready to resume' };
    }
    if (this.phase !== 'playing' || command.type !== 'clear') return reject('Match is not playing');
    const { top, left, bottom, right, fruit } = command;
    if (![top, left, bottom, right].every(Number.isInteger)) return reject('Invalid rectangle');
    const t = Number(top), l = Number(left), b = Number(bottom), r = Number(right);
    if (t < 0 || l < 0 || b > this.board.length / this.columns || r > this.columns || t >= b || l >= r) return reject('Invalid rectangle');
    const selected: number[] = [];
    for (let row = t; row < b; row++) for (let col = l; col < r; col++) {
      const index = row * this.columns + col;
      if (this.board[index]) selected.push(index);
    }
    if (!Array.isArray(fruit) || fruit.length !== selected.length || selected.some((id, i) => fruit[i] !== id)) return reject('Fruit already changed');
    if (selected.reduce((sum, id) => sum + this.board[id], 0) !== 10) return reject('Selection must total 10');
    for (const id of selected) this.board[id] = 0;
    player.score += selected.length;
    if (this.board.every(value => value === 0)) this.phase = 'finished';
    return { ok: true, reason: 'Cleared' };
  }
}
