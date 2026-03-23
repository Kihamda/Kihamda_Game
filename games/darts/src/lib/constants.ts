/** 初期スコア */
export const INITIAL_SCORE = 301;

/** 1ラウンドあたりの投擲数 */
export const THROWS_PER_ROUND = 3;

/** ボードの半径 (px) */
export const BOARD_RADIUS = 200;

/** 各リングの半径 (外側から) */
export const RING_RADII = {
  /** ダブルリング外側 */
  doubleOuter: 200,
  /** ダブルリング内側 */
  doubleInner: 180,
  /** トリプルリング外側 */
  tripleOuter: 130,
  /** トリプルリング内側 */
  tripleInner: 110,
  /** シングル内側(大) */
  singleInner: 30,
  /** ブル外側 */
  bullOuter: 30,
  /** ブル内側 (ダブルブル) */
  bullInner: 12,
} as const;

/** ダーツボードの数字配置 (時計回り、12時位置から) */
export const BOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;

/** ゲーム画面サイズ */
export const GAME_WIDTH = 600;
export const GAME_HEIGHT = 700;
