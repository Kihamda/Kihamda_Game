import { STORAGE_KEY } from "./constants";

export function loadHighScore(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, score.toString());
  } catch {
    // Ignore storage errors
  }
}
