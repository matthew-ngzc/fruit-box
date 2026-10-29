import { Room, ServerError, type Client } from '@colyseus/core';
import { createCertifiedBoard } from './rules.js';
import { RoomState, Player } from './state.js';

export class VersusRoom extends Room<{ state: RoomState }> {
  maxClients = 2;
  state = new RoomState();

  async onCreate(options: unknown) {
    nicknameFrom(options);
    await this.setPrivate(true);
    // Construct once before play; never generate or solve on a clear command.
    const { board } = createCertifiedBoard();
    this.state.board.push(...board.map(fruit => fruit.value));
  }

  onAuth(_client: Client, options: unknown) {
    return nicknameFrom(options);
  }

  onJoin(client: Client) {
    this.state.players.set(client.sessionId, new Player({ nickname: client.auth }));
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
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
