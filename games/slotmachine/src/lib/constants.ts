import type { Symbol } from "./types";

export const SYMBOLS: Symbol[] = ["🍒", "🍋", "🍊", "🍇", "🔔", "⭐", "7️⃣"];

// 各シンボルの重み（出現確率に影響）
export const SYMBOL_WEIGHTS: Record<Symbol, number> = {
  "🍒": 25, // 最も出やすい
  "🍋": 22,
  "🍊": 20,
  "🍇": 15,
  "🔔": 10,
  "⭐": 6,
  "7️⃣": 2, // 最もレア
};

// 配当倍率（3つ揃った時）
export const PAYOUTS: Record<Symbol, number> = {
  "🍒": 5,
  "🍋": 8,
  "🍊": 10,
  "🍇": 15,
  "🔔": 25,
  "⭐": 50,
  "7️⃣": 100, // ジャックポット
};

// 2つ揃いの配当（基本配当の1/4）
export const PAIR_PAYOUT_MULTIPLIER = 0.25;

// ゲーム設定
export const INITIAL_COINS = 100;
export const DEFAULT_BET = 10;
export const MIN_BET = 5;
export const MAX_BET = 50;
export const BET_STEP = 5;

// アニメーション設定
export const SPIN_DURATION = 2000; // ms
export const REEL_STOP_DELAY = 300; // 各リール停止の遅延
export const SYMBOLS_PER_REEL = 20; // リールの長さ

// 画面サイズ
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;
