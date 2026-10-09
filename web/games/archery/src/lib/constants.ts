/** キャンバス幅 */
export const CANVAS_WIDTH = 700;

/** キャンバス高さ */
export const CANVAS_HEIGHT = 500;

/** 的の中心X座標 */
export const TARGET_X = 550;

/** 的の中心Y座標 */
export const TARGET_Y = 250;

/** 的の外側半径 */
export const TARGET_RADIUS = 120;

/** 弓の位置X */
export const BOW_X = 100;

/** 弓の位置Y */
export const BOW_Y = 250;

/** 矢の速度 */
export const ARROW_SPEED = 18;

/** 重力 */
export const GRAVITY = 0.08;

/** 風の影響係数 */
export const WIND_FACTOR = 0.15;

/** 総射撃回数 */
export const TOTAL_SHOTS = 5;

/** スコアゾーン (内側から) */
export const SCORE_ZONES = [
  { radius: 12, score: 10, name: "X", color: "#ffd700" },
  { radius: 24, score: 10, name: "10", color: "#ffd700" },
  { radius: 36, score: 9, name: "9", color: "#ffd700" },
  { radius: 48, score: 8, name: "8", color: "#ff0000" },
  { radius: 60, score: 7, name: "7", color: "#ff0000" },
  { radius: 72, score: 6, name: "6", color: "#0000ff" },
  { radius: 84, score: 5, name: "5", color: "#0000ff" },
  { radius: 96, score: 4, name: "4", color: "#000000" },
  { radius: 108, score: 3, name: "3", color: "#000000" },
  { radius: 120, score: 2, name: "2", color: "#ffffff" },
];

/** 風レベル定義 */
export const WIND_LEVELS = [
  { min: -1.0, max: -0.7, label: "強風 ←←←" },
  { min: -0.7, max: -0.4, label: "中風 ←←" },
  { min: -0.4, max: -0.1, label: "微風 ←" },
  { min: -0.1, max: 0.1, label: "無風" },
  { min: 0.1, max: 0.4, label: "微風 →" },
  { min: 0.4, max: 0.7, label: "中風 →→" },
  { min: 0.7, max: 1.0, label: "強風 →→→" },
];
