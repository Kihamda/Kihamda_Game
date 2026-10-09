/** localStorage 操作 */

import { STORAGE_KEY } from "./constants";

interface BestScores {
  moves: number | null;
  time: number | null;
}

export function loadBestScores(): BestScores {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as Partial<BestScores>;
      return {
        moves: typeof parsed.moves === "number" ? parsed.moves : null,
        time: typeof parsed.time === "number" ? parsed.time : null,
      };
    }
  } catch {
    // ignore
  }
  return { moves: null, time: null };
}

export function saveBestScores(moves: number | null, time: number | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ moves, time }));
  } catch {
    // ignore
  }
}
