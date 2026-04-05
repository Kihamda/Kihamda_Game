// ゲームフェーズ
export type GamePhase = "start" | "playing" | "paused" | "cleared" | "gameover";

// パワーアップ種類
export type PowerUpType = "expand" | "multiball" | "laser" | "slow" | "life";

// ブロック
export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  hp: number;
  maxHp: number;
  visible: boolean;
  powerUp?: PowerUpType;
}

// ボール
export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  isPiercing: boolean;
}

// パドル
export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  isExpanded: boolean;
  expandTimer: number;
}

// 落下アイテム
export interface PowerUpItem {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PowerUpType;
  dy: number;
}

// レーザー
export interface Laser {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
}

// ゲーム状態
export interface GameState {
  phase: GamePhase;
  stage: number;
  score: number;
  lives: number;
  paddle: Paddle;
  balls: Ball[];
  bricks: Brick[];
  powerUps: PowerUpItem[];
  lasers: Laser[];
  laserActive: boolean;
  laserTimer: number;
  comboCount: number;
  comboTimer: number;
  highScore: number;
}
