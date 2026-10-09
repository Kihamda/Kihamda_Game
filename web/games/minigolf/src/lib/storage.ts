// ミニゴルフ ストレージ
const STORAGE_KEY = "minigolf_best_score";

/** ベストスコアを読み込む */
export function loadBestScore(): number | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return null;
    const score = parseInt(saved, 10);
    return isNaN(score) ? null : score;
  } catch {
    return null;
  }
}

/** ベストスコアを保存 (低いほど良い) */
export function saveBestScore(score: number): void {
  try {
    const current = loadBestScore();
    if (current === null || score < current) {
      localStorage.setItem(STORAGE_KEY, String(score));
    }
  } catch {
    // ignore
  }
}