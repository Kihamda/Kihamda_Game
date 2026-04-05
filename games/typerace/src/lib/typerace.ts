// タイピングレースのゲームロジック（純粋関数）

import type { Difficulty, GameStats, GameResult, GameSettings } from "./types";
import { SENTENCES, STORAGE_KEY, DEFAULT_SETTINGS } from "./constants";

/**
 * ランダムな文章を取得
 */
export function getRandomSentence(difficulty: Difficulty): string {
  const list = SENTENCES[difficulty];
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * 複数の文章を取得（重複なし）
 */
export function getRandomSentences(
  difficulty: Difficulty,
  count: number
): string[] {
  const list = [...SENTENCES[difficulty]];
  const result: string[] = [];

  for (let i = 0; i < count && list.length > 0; i++) {
    const idx = Math.floor(Math.random() * list.length);
    result.push(list[idx]);
    list.splice(idx, 1);
  }

  return result;
}

/**
 * WPMを計算（Words Per Minute）
 * 標準: 5文字 = 1ワード
 */
export function calculateWPM(
  correctChars: number,
  elapsedTimeMs: number
): number {
  if (elapsedTimeMs <= 0) return 0;
  const minutes = elapsedTimeMs / 60000;
  const words = correctChars / 5;
  return Math.round(words / minutes);
}

/**
 * 正確さを計算（パーセント）
 */
export function calculateAccuracy(
  correctChars: number,
  totalChars: number
): number {
  if (totalChars <= 0) return 100;
  return Math.round((correctChars / totalChars) * 100);
}

/**
 * 最終スコアを計算
 * WPM * accuracy bonus
 */
export function calculateScore(wpm: number, accuracy: number): number {
  const accuracyBonus = accuracy / 100;
  return Math.round(wpm * accuracyBonus * 10);
}

/**
 * ゲーム結果を計算
 */
export function calculateResult(stats: GameStats): GameResult {
  const elapsedTimeMs = stats.endTime - stats.startTime;
  const wpm = calculateWPM(stats.correctChars, elapsedTimeMs);
  const accuracy = calculateAccuracy(stats.correctChars, stats.totalChars);
  const score = calculateScore(wpm, accuracy);

  return {
    wpm,
    accuracy,
    correctChars: stats.correctChars,
    totalChars: stats.totalChars,
    correctWords: stats.correctWords,
    totalWords: stats.totalWords,
    score,
  };
}

/**
 * 入力文字が正しいかチェック
 */
export function checkCharacter(
  input: string,
  target: string,
  position: number
): boolean {
  if (position >= target.length) return false;
  return input === target[position];
}

/**
 * 設定を読み込む
 */
export function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<GameSettings>) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

/**
 * 設定を保存する
 */
export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/**
 * WPMの評価テキストを取得
 */
export function getWPMRating(wpm: number): string {
  if (wpm >= 80) return "Master Typist! 🏆";
  if (wpm >= 60) return "Expert! 🌟";
  if (wpm >= 40) return "Great! 👍";
  if (wpm >= 25) return "Good! 😊";
  return "Keep practicing! 💪";
}
