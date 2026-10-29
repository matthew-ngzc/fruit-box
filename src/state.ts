import { schema, t, type SchemaType } from '@colyseus/schema';
export const Player = schema({ nickname: t.string() }, 'Player');
export const RoomState = schema({
  rows: t.uint8().default(10),
  columns: t.uint8().default(17),
  board: t.array('uint8'),
  players: t.map(Player),
}, 'RoomState');
export type RoomState = SchemaType<typeof RoomState>;
