/** バブルの色パレット */
export const COLORS = [
  "#ef4444", // red
  "#22c55e", // green
  "#3b82f6", // blue
  "#eab308", // yellow
  "#a855f7", // purple
  "#ec4899", // pink
];

/** バブルの半径 */
export const BUBBLE_RADIUS = 18;

/** 盤面幅 */
export const BOARD_WIDTH = 500;

/** 盤面高さ */
export const BOARD_HEIGHT = 700;

/** 横の列数 */
export const COLS = 13;

/** 初期行数 */
export const INITIAL_ROWS = 6;

/** 発射台のY座標 */
export const SHOOTER_Y = BOARD_HEIGHT - 50;

/** 発射速度 */
export const SHOOT_SPEED = 14;

/** 危険ライン（この下にバブルが来たらゲームオーバー） */
export const DANGER_LINE_Y = SHOOTER_Y - BUBBLE_RADIUS * 3;

/** 新しい行が追加されるまでの発射数 */
export const SHOTS_PER_ROW = 5;
