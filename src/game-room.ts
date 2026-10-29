import { Room, ServerError, type Client } from '@colyseus/core';
import { createCertifiedBoard } from './rules.js';
import { RoomState, Player } from './state.js';
import { Match } from './match.js';

export class GameRoom extends Room<{ state: RoomState }> {
  maxClients = 2;
  state = new RoomState();
  private match?: Match;
  private reconnections = new Map<string, ReturnType<GameRoom['allowReconnection']>>();
  private ended = false;

  async onCreate(options: unknown) {
    nicknameFrom(options);
    await this.setPrivate(true);
    this.state.mode = this.maxClients === 1 ? 'solo' : 'versus';
    // Construct once before play; never generate or solve on a clear command.
    const { board } = createCertifiedBoard();
    this.state.board.push(...board.map(fruit => fruit.value));
    this.onMessage('ready', client => {
      if (this.match) return;
      const player = this.state.players.get(client.sessionId);
      if (player) player.ready = true;
      if (this.state.players.size === this.maxClients && [...this.state.players.values()].every(player => player.ready)) {
        this.startRound();
      }
      this.broadcastPatch();
    });
    this.onMessage('command', (client, command: unknown) => {
      // Legacy first-round commands remain valid; subsequent rounds require an explicit generation.
      const round = command && typeof command === 'object' && 'round' in command ? command.round : 1;
      const result = round !== this.state.round
        ? { ok: false, reason: 'This command belongs to a different round' }
        : this.match?.command(client.sessionId, command, performance.now()) ?? { ok: false, reason: 'All players must be ready' };
      if (result.ok && this.match?.phase === 'finished' && this.state.players.size === this.maxClients &&
          [...this.state.players.entries()].every(([id, player]) => player.connected && this.match!.players[id].ready)) {
        this.startRound();
        result.reason = 'New round started';
      }
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
      if (this.match.phase === 'finished') {
        this.match.players[client.sessionId].ready = false;
        this.sync();
      }
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

  private startRound() {
    if (this.match) {
      const { board } = createCertifiedBoard();
      board.forEach((fruit, index) => { this.state.board[index] = fruit.value; });
      this.state.round++;
    }
    this.match = new Match([...this.state.board], [...this.state.players.keys()], performance.now());
    this.ended = false;
    this.autoDispose = false;
    void this.lock();
    this.sync();
  }

  private sync() {
    if (!this.match) return;
    this.state.phase = this.match.phase;
    this.state.remainingMs = this.match.remainingMs;
    this.state.pauseRemainingMs = this.match.pauseRemainingMs;
    this.state.pausedBy = this.match.pausedBy;
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
    }
    if (this.match.phase === 'finished' && this.clients.length === 0) void this.disconnect();
  }
}

export class SoloRoom extends GameRoom {
  override maxClients = 1;
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
