// Merge Master game types

export interface Item {
  id: number;
  level: number;
  row: number;
  col: number;
  isNew?: boolean;
  isMerging?: boolean;
}

export interface GameState {
  items: Item[];
  score: number;
  bestScore: number;
  highestLevel: number;
  gameOver: boolean;
  nextId: number;
}

export interface DragState {
  itemId: number | null;
  startRow: number;
  startCol: number;
}

export const GRID_SIZE = 5;
export const MAX_LEVEL = 10;
