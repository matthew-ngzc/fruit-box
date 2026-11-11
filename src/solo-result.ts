import { createEndpoint } from '@colyseus/core';
import { clearSelection, createCertifiedBoard, type Selection } from './rules.js';

export interface SoloResult {
  attemptId: string;
  seed: number;
  moves: Selection[];
}

function isSelection(move: unknown): move is Selection {
  if (!move || typeof move !== 'object') return false;
  const { top, bottom, left, right } = move as Selection;
  return [top, bottom, left, right].every(Number.isInteger)
    && top >= 0 && top < bottom && bottom <= 10
    && left >= 0 && left < right && right <= 17;
}

export const soloResult = createEndpoint('/solo-results', { method: 'POST' }, async ctx => {
  const { attemptId, seed, moves } = (ctx.body ?? {}) as Partial<SoloResult>;
  if (typeof attemptId !== 'string' || !/^[a-f0-9]{32}$/.test(attemptId)
      || typeof seed !== 'number' || !Number.isInteger(seed) || seed < 1 || seed > 0xffffffff
      || !Array.isArray(moves) || moves.length > 85 || !moves.every(isSelection)) {
    return Response.json({ error: 'Invalid solo result' }, { status: 400 });
  }

  let board;
  try { ({ board } = createCertifiedBoard(seed)); }
  catch { return Response.json({ error: 'Invalid board seed' }, { status: 400 }); }

  let score = 0;
  for (const move of moves) {
    const result = clearSelection(board, move);
    if (!result.cleared) {
      return Response.json({ error: 'Invalid solo replay' }, { status: 400 });
    }
    score += result.cleared;
    board = result.board;
  }
  // Replaying the same input yields the same receipt without a second write.
  return Response.json({ attemptId, score });
});
