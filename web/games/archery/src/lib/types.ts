/** ゲームフェーズ */
export type GamePhase = "ready" | "aiming" | "flying" | "result";

/** 風情報 */
export interface Wind {
  /** 風速 (-1 ~ 1, 負は左、正は右) */
  speed: number;
  /** 表示用テキスト */
  label: string;
}

/** 矢の状態 */
export interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 軌道履歴 */
  trail: { x: number; y: number }[];
}

/** 射撃結果 */
export interface ShotResult {
  /** 得点 */
  score: number;
  /** 的の中心からの距離 */
  distance: number;
  /** ゾーン名 */
  zone: string;
}

/** ヒット情報（演出用） */
export interface HitInfo {
  x: number;
  y: number;
  score: number;
  isBullseye: boolean;
  timestamp: number;
}

/** ゲーム状態 */
export interface GameState {
  phase: GamePhase;
  /** 現在の射撃番号 (1-5) */
  shotNumber: number;
  /** 合計得点 */
  totalScore: number;
  /** 各射撃の結果 */
  results: ShotResult[];
  /** 現在の風 */
  wind: Wind;
  /** 飛行中の矢 */
  arrow: Arrow | null;
  /** 狙い位置 (クロスヘア) */
  aimX: number;
  aimY: number;
  /** 最後のヒット情報（演出用） */
  lastHit: HitInfo | null;
}
