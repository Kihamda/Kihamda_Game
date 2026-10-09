import type { TowerConfig, TowerType, PathPoint } from "./types";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const CELL_SIZE = 40;
export const GRID_COLS = CANVAS_WIDTH / CELL_SIZE;
export const GRID_ROWS = CANVAS_HEIGHT / CELL_SIZE;

export const INITIAL_LIVES = 20;
export const INITIAL_GOLD = 150;
export const MAX_WAVES = 10;

export const ENEMY_BASE_HEALTH = 50;
export const ENEMY_BASE_SPEED = 1.5;
export const ENEMY_MAX_SPEED = 3.5; // Cap enemy speed to keep game fair
export const ENEMY_HEALTH_SCALE = 1.3;
export const ENEMY_SIZE = 16;

export const SPAWN_INTERVAL = 40;
export const ENEMIES_PER_WAVE_BASE = 5;
export const ENEMIES_PER_WAVE_INCREMENT = 2;

export const GOLD_PER_KILL = 10;
export const WAVE_BONUS = 25;

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  normal: {
    name: "通常タワー",
    cost: 50,
    damage: 25,
    range: 120,
    fireRate: 30,
    color: "#4CAF50",
  },
  slow: {
    name: "遅延タワー",
    cost: 75,
    damage: 10,
    range: 100,
    fireRate: 45,
    color: "#2196F3",
  },
  splash: {
    name: "範囲タワー",
    cost: 100,
    damage: 15,
    range: 100,
    fireRate: 60,
    color: "#FF5722",
  },
};

export const SLOW_DURATION = 120;
export const SLOW_FACTOR = 0.5;
export const SPLASH_RADIUS = 60;

export const PROJECTILE_SPEED = 8;

// Path from top-left to bottom-right (snake pattern)
export const PATH: PathPoint[] = [
  { x: 0, y: 80 },
  { x: 160, y: 80 },
  { x: 160, y: 200 },
  { x: 640, y: 200 },
  { x: 640, y: 320 },
  { x: 160, y: 320 },
  { x: 160, y: 440 },
  { x: 640, y: 440 },
  { x: 640, y: 560 },
  { x: 800, y: 560 },
];

export const STORAGE_KEY = "towerdefense_highwave";
