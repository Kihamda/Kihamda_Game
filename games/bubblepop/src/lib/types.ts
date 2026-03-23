/** ゲームフェーズ */
export type Phase = "start" | "playing" | "result";

/** バブルの色 */
export type BubbleColor = string;

/** 盤面上のバブル */
export interface Bubble {
  id: number;
  color: BubbleColor;
  row: number;
  col: number;
  x: number;
  y: number;
  removing?: boolean;
  falling?: boolean;
}

/** 発射中のバブル */
export interface ShootingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
}

/** グリッド座標 */
export interface GridPos {
  row: number;
  col: number;
}

/** ゲーム結果 */
export type GameResult = "win" | "lose" | null;
