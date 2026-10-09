// ボウリング定数

/** ゲーム画面サイズ */
export const GAME_WIDTH = 600;
export const GAME_HEIGHT = 700;

/** レーン関連 */
export const LANE_WIDTH = 300;
export const LANE_LEFT = (GAME_WIDTH - LANE_WIDTH) / 2;
export const LANE_RIGHT = LANE_LEFT + LANE_WIDTH;
export const LANE_TOP = 50;
export const LANE_BOTTOM = 600;

/** ボール関連 */
export const BALL_RADIUS = 18;
export const BALL_START_X = GAME_WIDTH / 2;
export const BALL_START_Y = LANE_BOTTOM - 40;
export const MIN_POWER = 5;
export const MAX_POWER = 20;

/** ピン関連 */
export const PIN_RADIUS = 12;
export const PIN_START_Y = LANE_TOP + 80;
export const PIN_SPACING_X = 35;
export const PIN_SPACING_Y = 30;

/** 10本のピン初期位置 (三角形配置) */
export const PIN_POSITIONS: { x: number; y: number }[] = [
  // 1列目 (手前) - 4本
  { x: GAME_WIDTH / 2 - PIN_SPACING_X * 1.5, y: PIN_START_Y + PIN_SPACING_Y * 3 },
  { x: GAME_WIDTH / 2 - PIN_SPACING_X * 0.5, y: PIN_START_Y + PIN_SPACING_Y * 3 },
  { x: GAME_WIDTH / 2 + PIN_SPACING_X * 0.5, y: PIN_START_Y + PIN_SPACING_Y * 3 },
  { x: GAME_WIDTH / 2 + PIN_SPACING_X * 1.5, y: PIN_START_Y + PIN_SPACING_Y * 3 },
  // 2列目 - 3本
  { x: GAME_WIDTH / 2 - PIN_SPACING_X, y: PIN_START_Y + PIN_SPACING_Y * 2 },
  { x: GAME_WIDTH / 2, y: PIN_START_Y + PIN_SPACING_Y * 2 },
  { x: GAME_WIDTH / 2 + PIN_SPACING_X, y: PIN_START_Y + PIN_SPACING_Y * 2 },
  // 3列目 - 2本
  { x: GAME_WIDTH / 2 - PIN_SPACING_X * 0.5, y: PIN_START_Y + PIN_SPACING_Y },
  { x: GAME_WIDTH / 2 + PIN_SPACING_X * 0.5, y: PIN_START_Y + PIN_SPACING_Y },
  // 4列目 (奥) - 1本
  { x: GAME_WIDTH / 2, y: PIN_START_Y },
];

/** フレーム数 */
export const TOTAL_FRAMES = 10;

/** 色定義 */
export const COLORS = {
  lane: "#deb887",
  laneGutter: "#8b4513",
  ball: "#2c3e50",
  pinStanding: "#ffffff",
  pinFallen: "#999999",
  pinStroke: "#333333",
  aimLine: "#e74c3c",
  powerBar: "#27ae60",
  scoreBoard: "#2c3e50",
  strike: "#f1c40f",
  spare: "#3498db",
} as const;
