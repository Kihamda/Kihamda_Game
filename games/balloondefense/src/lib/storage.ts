import { STORAGE_KEY } from "./constants";

/** ハイスコアを読み込む */
export function loadHighScore(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const score = parseInt(stored, 10);
      return isNaN(score) ? null : score;
    }
  } catch {
    // localStorage使用不可
  }
  return null;
}

/** ハイスコアを保存する */
export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // localStorage使用不可
  }
}
