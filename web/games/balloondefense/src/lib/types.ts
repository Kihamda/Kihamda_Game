/** 風船の種類 */
export type BalloonType = "normal" | "fast" | "small" | "bonus";

/** 風船の状態 */
export interface Balloon {
  /** 一意のID */
  id: number;
  /** X座標 */
  x: number;
  /** Y座標 */
  y: number;
  /** 落下速度 (px/frame) */
  speed: number;
  /** 風船の種類 */
  type: BalloonType;
  /** 風船のサイズ (px) */
  size: number;
  /** 風船の色 */
  color: string;
  /** 破裂済みかどうか */
  popped: boolean;
}

/** ゲームの状態 */
export interface GameState {
  /** 現在のスコア */
  score: number;
  /** 残りライフ */
  lives: number;
  /** 現在のウェーブ */
  wave: number;
  /** 風船一覧 */
  balloons: Balloon[];
  /** ウェーブ中の残り風船数 */
  remainingBalloons: number;
  /** ウェーブ中の割った風船数 */
  poppedCount: number;
  /** ゲーム終了フラグ */
  isGameOver: boolean;
  /** ウェーブクリアフラグ */
  isWaveCleared: boolean;
  /** コンボ数 */
  combo: number;
  /** 最後に風船を割った時刻 (ms) */
  lastPopTime: number;
  /** 風船が下に到達したフラグ (赤フラッシュ用) */
  leaked: boolean;
}

/** ゲームフェーズ */
export type GamePhase = "start" | "playing" | "waveClear" | "result";

/** ポップエフェクト */
export interface PopEffect {
  id: number;
  x: number;
  y: number;
  color: string;
  time: number;
}
