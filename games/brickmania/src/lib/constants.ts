// キャンバスサイズ
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 800;

// パドル
export const PADDLE_WIDTH = 100;
export const PADDLE_WIDTH_EXPANDED = 160;
export const PADDLE_HEIGHT = 16;
export const PADDLE_Y = CANVAS_HEIGHT - 50;
export const PADDLE_EXPAND_DURATION = 600; // フレーム数

// ボール
export const BALL_RADIUS = 8;
export const BALL_SPEED = 5;
export const MAX_BALLS = 5;

// ブロック
export const BRICK_ROWS = 8;
export const BRICK_COLS = 10;
export const BRICK_WIDTH = 54;
export const BRICK_HEIGHT = 22;
export const BRICK_PADDING = 4;
export const BRICK_OFFSET_TOP = 80;
export const BRICK_OFFSET_LEFT =
  (CANVAS_WIDTH - (BRICK_WIDTH + BRICK_PADDING) * BRICK_COLS + BRICK_PADDING) / 2;

// ブロック色（行ごと）
export const BRICK_COLORS = [
  "#ff6b6b", // 赤
  "#ff922b", // オレンジ
  "#fcc419", // 黄
  "#51cf66", // 緑
  "#339af0", // 青
  "#845ef7", // 紫
  "#f06595", // ピンク
  "#20c997", // ティール
];

// パワーアップ
export const POWERUP_WIDTH = 30;
export const POWERUP_HEIGHT = 20;
export const POWERUP_SPEED = 2.5;
export const POWERUP_DROP_CHANCE = 0.15;

// レーザー
export const LASER_WIDTH = 4;
export const LASER_HEIGHT = 20;
export const LASER_SPEED = 10;
export const LASER_DURATION = 480; // フレーム数

// ゲーム設定
export const INITIAL_LIVES = 3;
export const MAX_LIVES = 5;
export const COMBO_TIMEOUT = 60; // フレーム数
export const SCORE_BASE = 10;
export const SCORE_COMBO_MULTIPLIER = 0.5;

// 色定義
export const COLORS = {
  background: "#0f0f23",
  paddle: "#4cc9f0",
  paddleExpanded: "#9b5de5",
  ball: "#ffffff",
  text: "#ffffff",
  overlay: "rgba(0, 0, 0, 0.7)",
  laser: "#ff0000",
  powerUp: {
    expand: "#9b5de5",
    multiball: "#00f5d4",
    laser: "#ff0000",
    slow: "#fee440",
    life: "#f15bb5",
  },
} as const;

// ステージ設定
export const STAGE_CONFIGS = [
  { rows: 5, hardRows: 0 },
  { rows: 6, hardRows: 1 },
  { rows: 7, hardRows: 2 },
  { rows: 8, hardRows: 3 },
  { rows: 8, hardRows: 4 },
] as const;
