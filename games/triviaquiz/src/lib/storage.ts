import { STORAGE_KEY } from "./constants";

/** ハイスコア読み込み */
export function loadHighScore(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}

/** ハイスコア保存 */
export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // ignore
  }
}