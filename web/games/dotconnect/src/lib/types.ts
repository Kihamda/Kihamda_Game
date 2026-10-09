/** 座標 */
export interface Point {
  row: number;
  col: number;
}

/** ドット (端点) */
export interface Dot {
  id: string;
  color: string;
  row: number;
  col: number;
  pairId: string;
}

/** 線分 */
export interface Line {
  colorId: string;
  points: Point[];
}

/** グリッドセルの状態 */
export interface CellState {
  dot: Dot | null;
  lineColorId: string | null;
}

/** パズルステージ定義 */
export interface PuzzleStage {
  id: number;
  name: string;
  gridSize: number;
  dots: Dot[];
}

/** ゲーム状態 */
export interface GameState {
  stage: PuzzleStage;
  grid: CellState[][];
  lines: Record<string, Line>;
  currentDrawing: string | null;
  completed: boolean;
}

/** フェーズ */
export type Phase = "start" | "playing" | "result";
