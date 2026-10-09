export interface Vector2D {
  x: number;
  y: number;
}

export interface Ship {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
}

export interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  vertices: Vector2D[];
}

export type GamePhase = "before" | "playing" | "gameover";

export interface GameState {
  phase: GamePhase;
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  score: number;
  highScore: number;
  lives: number;
  level: number;
}

export interface KeyState {
  left: boolean;
  right: boolean;
  up: boolean;
  space: boolean;
}

/** 衝突時の情報（エフェクト用） */
export interface CollisionInfo {
  x: number;
  y: number;
  size: "large" | "medium" | "small";
  score: number;
}
