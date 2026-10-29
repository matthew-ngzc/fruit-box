import { schema, t, type SchemaType } from '@colyseus/schema';
export const Player = schema({ nickname: t.string(), score: t.uint16().default(0), pauses: t.uint8().default(2), ready: t.boolean().default(false), connected: t.boolean().default(true) }, 'Player');
export const RoomState = schema({
  mode: t.string().default('versus'),
  rows: t.uint8().default(10),
  columns: t.uint8().default(17),
  board: t.array('uint8'),
  players: t.map(Player),
  phase: t.string().default('waiting'),
  remainingMs: t.number().default(120000),
  pauseRemainingMs: t.number().default(0),
}, 'RoomState');
export type RoomState = SchemaType<typeof RoomState>;
