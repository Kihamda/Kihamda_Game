// ボウリング localStorage

const STORAGE_KEY = "bowling_highscore";

export function loadHighScore(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, score.toString());
  } catch {
    // ignore
  }
}
