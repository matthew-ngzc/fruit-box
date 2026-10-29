// Keep rules independent of Colyseus, clocks and connections.
import { FruitBoxEngine } from '../vendor/fruit-box-game/engine.js';
import type { Selection } from '../vendor/fruit-box-game/engine.js';
export type { Fruit, Selection, CertifiedBoard } from '../vendor/fruit-box-game/engine.js';
export const createCertifiedBoard = FruitBoxEngine.createSolvableBoard;
export const inspectSelection = FruitBoxEngine.inspectSelection;
export const clearSelection = FruitBoxEngine.clearSelection;

// Coordinates share the caller's units; no DOM or cell-size assumption is needed.
export function inspectRectangle(centers: readonly { id: number; x: number; y: number; value: number }[], rectangle: Selection) {
  const included = centers.filter(cell => cell.value > 0 && cell.x > rectangle.left && cell.x < rectangle.right && cell.y > rectangle.top && cell.y < rectangle.bottom);
  return { fruit: included.map(cell => cell.id), sum: included.reduce((sum, cell) => sum + cell.value, 0) };
}
