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

/** 演出トリガー用のイベント情報 */
export interface GameEvent {
  type: "drop" | "clear" | "tetris" | "levelup" | "gameover" | "none";
  linesCleared?: number;
  clearedRows?: number[]; // 消えた行のインデックス
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
  /** 直近のイベント（演出トリガー用） */
  lastEvent: GameEvent;
}

export type GamePhase = "start" | "playing" | "paused" | "gameover";
