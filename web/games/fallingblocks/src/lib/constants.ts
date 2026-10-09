// Falling Blocks - Constants

import type { TetrominoType, Position } from "./types";

export const BOARD_ROWS = 20;
export const BOARD_COLS = 10;
export const CELL_SIZE = 28;

export const INITIAL_DROP_INTERVAL = 1000;
export const MIN_DROP_INTERVAL = 100;
export const LEVEL_SPEED_DECREASE = 80;
export const LINES_PER_LEVEL = 10;

export const SCORE_PER_LINE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: "#00f5ff",
  O: "#ffeb3b",
  T: "#9c27b0",
  S: "#4caf50",
  Z: "#f44336",
  J: "#2196f3",
  L: "#ff9800",
};

// Shape definitions (relative positions from center)
// Rotation 0 shapes
export const TETROMINO_SHAPES: Record<TetrominoType, Position[]> = {
  I: [
    { row: 0, col: -1 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ],
  O: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ],
  T: [
    { row: 0, col: -1 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
  ],
  S: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 0 },
  ],
  Z: [
    { row: 0, col: -1 },
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ],
  J: [
    { row: 0, col: -1 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
  ],
  L: [
    { row: 0, col: -1 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: -1 },
  ],
};

export const TETROMINO_TYPES: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];
