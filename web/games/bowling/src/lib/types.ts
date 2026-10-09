// ボウリングの型定義

/** ピン状態 (true = 立っている) */
export interface PinState {
  standing: boolean[];
}

/** フレームの投球結果 */
export interface FrameResult {
  /** 1投目で倒した本数 */
  roll1: number | null;
  /** 2投目で倒した本数 */
  roll2: number | null;
  /** 3投目(10フレーム用) */
  roll3: number | null;
  /** ストライク */
  isStrike: boolean;
  /** スペア */
  isSpare: boolean;
  /** フレームスコア(ボーナス込み確定値) */
  score: number | null;
  /** 累積スコア */
  cumulativeScore: number | null;
}

/** ボールの状態 */
export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

/** ピンの物理状態 */
export interface Pin {
  id: number;
  x: number;
  y: number;
  standing: boolean;
}

/** ゲームフェーズ */
export type GamePhase = 
  | "start"
  | "aiming"
  | "rolling"
  | "result"
  | "gameover";

/** ゲーム全体の状態 */
export interface GameState {
  phase: GamePhase;
  frames: FrameResult[];
  currentFrame: number;
  currentRoll: number;
  pins: Pin[];
  ball: BallState;
  aimAngle: number;
  aimPower: number;
  totalScore: number;
}
