export interface Fruit { id: number; row: number; column: number; value: number; active: boolean }
export interface Selection { top: number; right: number; bottom: number; left: number }
export interface CertifiedBoard { board: Fruit[]; solution: { selection: Selection; cellIds: number[] }[] }
export const FruitBoxEngine: {
  createSolvableBoard(seed?: number): CertifiedBoard;
  inspectSelection(board: Fruit[], selection: Selection): { apples: Fruit[]; count: number; sum: number };
  clearSelection(board: Fruit[], selection: Selection): { board: Fruit[]; cleared: number };
};
