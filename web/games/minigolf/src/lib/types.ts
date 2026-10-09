// ミニゴルフの型定義

/** ボールの状態 */
export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

/** トレイルポイント */
export interface TrailPoint {
  id: number;
  x: number;
  y: number;
  opacity: number;
}

/** ホールの定義 */
export interface HoleConfig {
  id: number;
  /** コースの壁 */
  walls: Wall[];
  /** ボールのスタート位置 */
  ballStart: { x: number; y: number };
  /** カップ（ゴール）の位置 */
  cup: { x: number; y: number };
  /** 障害物 */
  obstacles: Obstacle[];
  /** パー */
  par: number;
}

/** 壁 (線分) */
export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** 障害物 */
export interface Obstacle {
  type: "rectangle" | "circle";
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
}

/** ホールごとのスコア */
export interface HoleScore {
  strokes: number;
  par: number;
  completed: boolean;
}

/** ゲームフェーズ */
export type GamePhase =
  | "start"
  | "aiming"
  | "rolling"
  | "holein"
  | "nexthole"
  | "gameover";

/** ゲーム全体の状態 */
export interface GameState {
  phase: GamePhase;
  currentHole: number;
  ball: BallState;
  strokes: number;
  scores: HoleScore[];
  aimAngle: number;
  aimPower: number;
}