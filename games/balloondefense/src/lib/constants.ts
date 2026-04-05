import type { BalloonType } from "./types";

/** ゲーム画面サイズ */
export const GAME_WIDTH = 600;
export const GAME_HEIGHT = 700;

/** 初期ライフ */
export const INITIAL_LIVES = 5;

/** 風船の種類別設定 */
export const BALLOON_CONFIG: Record<
  BalloonType,
  {
    baseSize: number;
    baseSpeed: number;
    score: number;
    colors: string[];
  }
> = {
  normal: {
    baseSize: 50,
    baseSpeed: 2,
    score: 10,
    colors: ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"],
  },
  fast: {
    baseSize: 45,
    baseSpeed: 4,
    score: 20,
    colors: ["#f97316", "#ec4899"],
  },
  small: {
    baseSize: 30,
    baseSpeed: 2.5,
    score: 30,
    colors: ["#06b6d4", "#84cc16"],
  },
  bonus: {
    baseSize: 60,
    baseSpeed: 1.5,
    score: 50,
    colors: ["#fbbf24"],
  },
};

/** ウェーブ設定 */
export const WAVE_CONFIG = {
  /** 基本風船数 */
  baseBalloonCount: 10,
  /** ウェーブごとの増加数 */
  balloonIncrement: 5,
  /** 風船スポーン間隔 (ms) */
  baseSpawnInterval: 1200,
  /** スポーン間隔の最小値 (ms) */
  minSpawnInterval: 400,
  /** ウェーブごとの速度増加率 */
  speedMultiplier: 0.15,
};

/** localStorage のキー */
export const STORAGE_KEY = "balloondefense_highscore";
