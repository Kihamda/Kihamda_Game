/** ゲームフェーズ */
export type Phase = "menu" | "playing" | "cleared" | "stageSelect";

/** 方向 */
export type Direction = "up" | "down" | "left" | "right";

/** セルの種類 */
export type CellType = "ice" | "wall" | "goal";

/** ステージデータ */
export interface Stage {
  id: number;
  name: string;
  width: number;
  height: number;
  /** セルのグリッド (row-major) */
  cells: CellType[][];
  /** プレイヤー開始位置 */
  startX: number;
  startY: number;
  /** パー手数 (評価用) */
  par: number;
}

/** プレイヤー状態 */
export interface PlayerState {
  x: number;
  y: number;
  isSliding: boolean;
}

/** ゲーム状態 */
export interface GameState {
  stageId: number;
  player: PlayerState;
  moves: number;
  history: Array<{ x: number; y: number }>;
}
