import type { DifficultyConfig } from "./types";

/** ゲーム画面サイズ */
export const GAME_WIDTH = 500;
export const GAME_HEIGHT = 700;

/** レーン数 */
export const LANE_COUNT = 4;

/** レーン幅 */
export const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;

/** ノートサイズ */
export const NOTE_SIZE = 60;

/** 判定ライン位置 (Y座標) */
export const JUDGE_LINE_Y = GAME_HEIGHT - 80;

/** 判定タイミング許容範囲 (ms) */
export const PERFECT_WINDOW = 50;
export const GOOD_WINDOW = 120;

/** スコア */
export const SCORE_PERFECT = 100;
export const SCORE_GOOD = 50;
export const SCORE_MISS = 0;

/** コンボボーナス係数 */
export const COMBO_BONUS_RATE = 0.1;

/** 難易度設定 */
export const DIFFICULTIES: Record<string, DifficultyConfig> = {
  easy: {
    label: "Easy",
    speed: 0.3,
    bpm: 100,
    totalBeats: 32,
  },
  normal: {
    label: "Normal",
    speed: 0.45,
    bpm: 120,
    totalBeats: 48,
  },
  hard: {
    label: "Hard",
    speed: 0.6,
    bpm: 140,
    totalBeats: 64,
  },
};

/** レーンキー */
export const LANE_KEYS = ["d", "f", "j", "k"];

/** レーン色 */
export const LANE_COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b"];

/** localStorage のキー */
export const STORAGE_KEY = "rhythmbeat_highscore";
