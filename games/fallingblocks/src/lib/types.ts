// Falling Blocks - Type definitions

export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export interface Position {
  row: number;
  col: number;
}

export interface Tetromino {
  type: TetrominoType;
  positions: Position[];
  rotation: number;
}

export interface GameState {
  board: (TetrominoType | null)[][];
  currentPiece: Tetromino | null;
  nextPiece: TetrominoType;
  score: number;
  level: number;
  linesCleared: number;
  gameOver: boolean;
  isPaused: boolean;
}

export type GamePhase = "start" | "playing" | "paused" | "gameover";
