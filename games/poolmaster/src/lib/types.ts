// Pool Master 型定義

/** ボールの種類 */
export type BallType = "solid" | "stripe" | "eight" | "cue";

/** ボール状態 */
export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: BallType;
  pocketed: boolean;
}

/** プレイヤー */
export interface Player {
  id: 1 | 2;
  name: string;
  assignedType: BallType | null;
  pocketedBalls: number[];
}

/** ゲームフェーズ */
export type GamePhase = 
  | "start"
  | "aiming"
  | "shooting"
  | "rolling"
  | "turnEnd"
  | "gameover";

/** 勝敗結果 */
export type GameResult = {
  winner: 1 | 2;
  reason: "8ball" | "foul8ball";
} | null;

/** ゲーム全体の状態 */
export interface GameState {
  phase: GamePhase;
  balls: Ball[];
  currentPlayer: 1 | 2;
  player1: Player;
  player2: Player;
  aimAngle: number;
  aimPower: number;
  message: string;
  result: GameResult;
  foul: boolean;
  cueBallPlaceable: boolean;
}

/** エフェクトイベント (演出用) */
export interface EffectEvent {
  type: "pocket" | "combo" | "win" | "foul" | "hit";
  x?: number;
  y?: number;
  ballId?: number;
  comboCount?: number;
}
