import { Room, ServerError, type Client } from '@colyseus/core';
import { createCertifiedBoard } from './rules.js';
import { RoomState, Player } from './state.js';
import { Match } from './match.js';

export class VersusRoom extends Room<{ state: RoomState }> {
  maxClients = 2;
  state = new RoomState();
  private match?: Match;
  private reconnections = new Map<string, ReturnType<VersusRoom['allowReconnection']>>();
  private ended = false;

  async onCreate(options: unknown) {
    nicknameFrom(options);
    await this.setPrivate(true);
    // Construct once before play; never generate or solve on a clear command.
    const { board } = createCertifiedBoard();
    this.state.board.push(...board.map(fruit => fruit.value));
    this.onMessage('ready', client => {
      if (this.match) return;
      const player = this.state.players.get(client.sessionId);
      if (player) player.ready = true;
      if (this.state.players.size === 2 && [...this.state.players.values()].every(player => player.ready)) {
        this.match = new Match([...this.state.board], [...this.state.players.keys()], performance.now());
        this.autoDispose = false;
        void this.lock();
        this.sync();
      }
      this.broadcastPatch();
    });
    this.onMessage('command', (client, command: unknown) => {
      const result = this.match?.command(client.sessionId, command, performance.now()) ?? { ok: false, reason: 'Both players must be ready' };
      this.sync();
      const id = command && typeof command === 'object' && 'id' in command ? command.id : null;
      client.send('result', { ...result, id });
      this.broadcastPatch();
    });
    this.clock.setInterval(() => {
      this.match?.tick(performance.now());
      this.sync();
    }, 100);
  }

  onAuth(_client: Client, options: unknown) {
    return nicknameFrom(options);
  }

  onJoin(client: Client) {
    this.state.players.set(client.sessionId, new Player({ nickname: client.auth }));
  }

  onLeave(client: Client) {
    if (!this.match) this.state.players.delete(client.sessionId);
    else {
      const player = this.state.players.get(client.sessionId);
      if (player) player.connected = false;
    }
  }

  async onDrop(client: Client) {
    if (!this.match || this.match.phase === 'finished') return;
    this.state.players.get(client.sessionId)!.connected = false;
    const pending = this.allowReconnection(client, 'manual');
    this.reconnections.set(client.sessionId, pending);
    try { await pending; } catch { /* The match ended before this guest returned. */ }
    finally { this.reconnections.delete(client.sessionId); }
  }

  onReconnect(client: Client) {
    this.state.players.get(client.sessionId)!.connected = true;
  }

  private sync() {
    if (!this.match) return;
    this.state.phase = this.match.phase;
    this.state.remainingMs = this.match.remainingMs;
    this.state.pauseRemainingMs = this.match.pauseRemainingMs;
    this.match.board.forEach((value, index) => { this.state.board[index] = value; });
    for (const [id, player] of Object.entries(this.match.players)) {
      const publicPlayer = this.state.players.get(id)!;
      publicPlayer.score = player.score;
      publicPlayer.pauses = player.pauses;
      publicPlayer.ready = player.ready;
    }
    if (this.match.phase === 'finished' && !this.ended) {
      this.ended = true;
      for (const pending of this.reconnections.values()) pending.reject(new Error('Match finished'));
      this.clock.setTimeout(() => { void this.disconnect(); }, 60000);
    }
  }
}

function nicknameFrom(options: unknown): string {
  const nickname = options && typeof options === 'object' && 'nickname' in options ? options.nickname : undefined;
  if (typeof nickname !== 'string' || nickname.length > 100 || /[\p{Cc}\p{Cf}]/u.test(nickname)) {
    throw new ServerError(400, 'Nickname must be 1-24 characters without control characters');
  }
  const trimmed = nickname.trim();
  if ([...trimmed].length < 1 || [...trimmed].length > 24) {
    throw new ServerError(400, 'Nickname must be 1-24 characters without control characters');
  }
  return trimmed;
}
