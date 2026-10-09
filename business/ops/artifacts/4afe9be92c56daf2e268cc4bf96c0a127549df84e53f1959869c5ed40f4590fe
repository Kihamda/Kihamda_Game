// Best-score persistence is optional; playing must survive denied storage.
const KEY = "merge2048-best";

export function readBestScore(): number {
  try {
    const raw = globalThis.localStorage.getItem(KEY);
    if (raw === null || !/^\d+$/.test(raw)) return 0;
    const score = Number(raw);
    return Number.isSafeInteger(score) && score >= 0 ? score : 0;
  } catch {
    return 0;
  }
}

export function writeBestScore(score: number): void {
  if (!Number.isSafeInteger(score) || score < 0) return;
  try {
    globalThis.localStorage.setItem(KEY, String(score));
  } catch {
    // Current-session bestScore stays in game state; persistence may be denied.
  }
}
