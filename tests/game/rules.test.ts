import { describe, expect, it } from 'vitest';
import { createCertifiedBoard, clearSelection, inspectSelection, inspectRectangle } from '../../src/rules.js';

describe('certified boards', () => {
  it.each([1, 42, 4294967295])('can clear every fruit by replaying certified rectangles (seed %i)', seed => {
    const generated = createCertifiedBoard(seed);
    let board = generated.board;
    expect(board).toHaveLength(170);
    for (const step of generated.solution) {
      expect(inspectSelection(board, step.selection).sum).toBe(10);
      const cleared = clearSelection(board, step.selection);
      expect(cleared.cleared).toBe(step.cellIds.length);
      board = cleared.board;
    }
    expect(board.filter(fruit => fruit.active)).toHaveLength(0);
  });
});

it('includes only fruit centers strictly inside a free rectangle', () => {
  const centers = [
    { id: 0, x: 0, y: 5, value: 4 },
    { id: 1, x: 10, y: 5, value: 6 },
    { id: 2, x: 5, y: 0, value: 3 },
    { id: 3, x: 5, y: 10, value: 7 },
    { id: 4, x: 5, y: 5, value: 8 },
    { id: 5, x: 6, y: 6, value: 0 },
  ];
  expect(inspectRectangle(centers, { top: 0, left: 0, bottom: 10, right: 10 })).toEqual({ fruit: [4], sum: 8 });
  expect(inspectRectangle(centers, { top: 4.9, left: 4.9, bottom: 5.1, right: 5.1 })).toEqual({ fruit: [4], sum: 8 });
  expect(inspectRectangle(centers, { top: 5, left: 5, bottom: 5, right: 5 })).toEqual({ fruit: [], sum: 0 });
});

it('rejects a non-ten rectangle and credits fruit count for a valid clear', () => {
  const board = [
    { id: 0, row: 0, column: 0, value: 4, active: true },
    { id: 1, row: 0, column: 1, value: 6, active: true },
    { id: 2, row: 0, column: 2, value: 9, active: true },
  ];
  expect(clearSelection(board, { top: 0, left: 0, bottom: 1, right: 1 }).cleared).toBe(0);
  const result = clearSelection(board, { top: 0, left: 0, bottom: 1, right: 2 });
  expect(result.cleared).toBe(2);
  expect(result.board.map(fruit => fruit.active)).toEqual([false, false, true]);
  expect(board.every(fruit => fruit.active)).toBe(true);
  expect(clearSelection(result.board, { top: 0, left: 0, bottom: 1, right: 2 }).cleared).toBe(0);
});
