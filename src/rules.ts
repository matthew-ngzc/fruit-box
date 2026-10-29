// Keep rules independent of Colyseus, clocks and connections.
import { FruitBoxEngine } from '../vendor/fruit-box-game/engine.js';
export type { Fruit, Selection, CertifiedBoard } from '../vendor/fruit-box-game/engine.js';
export const createCertifiedBoard = FruitBoxEngine.createSolvableBoard;
export const inspectSelection = FruitBoxEngine.inspectSelection;
export const clearSelection = FruitBoxEngine.clearSelection;
