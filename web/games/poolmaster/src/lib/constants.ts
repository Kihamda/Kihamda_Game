// Pool Master 定数

/** ゲーム画面サイズ */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 500;

/** テーブル関連 */
export const TABLE_MARGIN = 40;
export const TABLE_LEFT = TABLE_MARGIN;
export const TABLE_TOP = TABLE_MARGIN;
export const TABLE_WIDTH = GAME_WIDTH - TABLE_MARGIN * 2;
export const TABLE_HEIGHT = GAME_HEIGHT - TABLE_MARGIN * 2;
export const TABLE_RIGHT = TABLE_LEFT + TABLE_WIDTH;
export const TABLE_BOTTOM = TABLE_TOP + TABLE_HEIGHT;

/** クッションの厚み */
export const CUSHION_WIDTH = 20;

/** ボール関連 */
export const BALL_RADIUS = 12;
export const MAX_BALL_SPEED = 25;
export const FRICTION = 0.985;
export const MIN_VELOCITY = 0.1;

/** キューボール初期位置 */
export const CUE_BALL_START_X = TABLE_LEFT + TABLE_WIDTH * 0.25;
export const CUE_BALL_START_Y = TABLE_TOP + TABLE_HEIGHT / 2;

/** ラック位置 */
export const RACK_X = TABLE_LEFT + TABLE_WIDTH * 0.75;
export const RACK_Y = TABLE_TOP + TABLE_HEIGHT / 2;

/** ポケット */
export const POCKET_RADIUS = 22;
export const POCKET_POSITIONS = [
  { x: TABLE_LEFT, y: TABLE_TOP },
  { x: TABLE_LEFT + TABLE_WIDTH / 2, y: TABLE_TOP },
  { x: TABLE_RIGHT, y: TABLE_TOP },
  { x: TABLE_LEFT, y: TABLE_BOTTOM },
  { x: TABLE_LEFT + TABLE_WIDTH / 2, y: TABLE_BOTTOM },
  { x: TABLE_RIGHT, y: TABLE_BOTTOM },
];

/** ショットパワー */
export const MIN_POWER = 2;
export const MAX_POWER = 20;

/** 色定義 */
export const COLORS = {
  tableCloth: "#0d5b33",
  tableBorder: "#4a2c1a",
  cushion: "#3d7a52",
  pocket: "#1a1a1a",
  cueBall: "#ffffff",
  cueBallStroke: "#cccccc",
  solidBalls: [
    "#ffd700", // 1 - 黄
    "#0066cc", // 2 - 青
    "#cc0000", // 3 - 赤
    "#660099", // 4 - 紫
    "#ff6600", // 5 - オレンジ
    "#006633", // 6 - 緑
    "#8b0000", // 7 - 茶
  ],
  eightBall: "#000000",
  stripeBalls: [
    "#ffd700", // 9 - 黄縞
    "#0066cc", // 10 - 青縞
    "#cc0000", // 11 - 赤縞
    "#660099", // 12 - 紫縞
    "#ff6600", // 13 - オレンジ縞
    "#006633", // 14 - 緑縞
    "#8b0000", // 15 - 茶縞
  ],
  aimLine: "rgba(255, 255, 255, 0.6)",
  powerBar: "#e74c3c",
  powerBarBg: "#333333",
} as const;

/** ボール番号配列 (1-7: ソリッド, 8: エイト, 9-15: ストライプ) */
export const SOLID_BALLS = [1, 2, 3, 4, 5, 6, 7];
export const STRIPE_BALLS = [9, 10, 11, 12, 13, 14, 15];
export const EIGHT_BALL = 8;

/** ポケット位置をボールID→座標に変換するための配列インデックス */
export const POCKET_INDEX_BY_POSITION = [
  { x: TABLE_LEFT, y: TABLE_TOP },
  { x: TABLE_LEFT + TABLE_WIDTH / 2, y: TABLE_TOP },
  { x: TABLE_RIGHT, y: TABLE_TOP },
  { x: TABLE_LEFT, y: TABLE_BOTTOM },
  { x: TABLE_LEFT + TABLE_WIDTH / 2, y: TABLE_BOTTOM },
  { x: TABLE_RIGHT, y: TABLE_BOTTOM },
] as const;
