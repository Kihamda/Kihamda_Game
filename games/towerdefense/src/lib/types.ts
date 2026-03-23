export type TowerType = "normal" | "slow" | "splash";

export interface Tower {
  id: number;
  type: TowerType;
  x: number;
  y: number;
  lastFireTime: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number;
  slowUntil: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  towerType: TowerType;
  speed: number;
}

export interface PathPoint {
  x: number;
  y: number;
}

export type GamePhase = "before" | "playing" | "won" | "lost";

export interface GameState {
  phase: GamePhase;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  lives: number;
  gold: number;
  wave: number;
  waveInProgress: boolean;
  enemiesToSpawn: number;
  spawnTimer: number;
  selectedTowerType: TowerType | null;
  highestWave: number;
}

export interface TowerConfig {
  name: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  color: string;
}

/** 敵撃破イベント（演出用） */
export interface KillEvent {
  x: number;
  y: number;
  gold: number;
}

/** ダメージ適用結果 */
export interface DamageResult {
  enemies: Enemy[];
  goldEarned: number;
  kills: KillEvent[];
}
