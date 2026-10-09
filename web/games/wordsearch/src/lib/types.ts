/** グリッド上の位置 */
export interface Position {
  row: number;
  col: number;
}

/** 単語の配置情報 */
export interface WordPlacement {
  word: string;
  startPos: Position;
  direction: Direction;
  found: boolean;
}

/** 配置方向 */
export type Direction =
  | "horizontal"
  | "vertical"
  | "diagonal-down"
  | "diagonal-up";

/** ゲームの状態 */
export interface GameState {
  grid: string[][];
  words: WordPlacement[];
  selectedCells: Position[];
  foundWords: string[];
  isComplete: boolean;
  startTime: number;
  elapsedTime: number;
}

/** ゲームフェーズ */
export type GamePhase = "start" | "playing" | "complete" | "timeout";
