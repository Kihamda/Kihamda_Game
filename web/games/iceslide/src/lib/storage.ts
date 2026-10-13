import { TOTAL_STAGES } from "./constants";

const STORAGE_KEY = "iceslide_progress";

export interface Progress {
  /** クリア済みステージID */
  cleared: number[];
  /** 各ステージのベストスコア */
  bestMoves: Record<number, number>;
}

function getDefaultProgress(): Progress {
  return {
    cleared: [],
    bestMoves: {},
  };
}

export function loadProgress(): Progress {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return getDefaultProgress();
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== "object") return getDefaultProgress();
    const value = parsed as Record<string, unknown>;
    if (!Array.isArray(value.cleared) || !value.bestMoves ||
        typeof value.bestMoves !== "object" || Array.isArray(value.bestMoves)) {
      return getDefaultProgress();
    }
    const validId = (id: unknown): id is number =>
      typeof id === "number" && Number.isInteger(id) && id >= 1 && id <= TOTAL_STAGES;
    const cleared = [...new Set(value.cleared.filter(validId))];
    const bestMoves: Record<number, number> = {};
    for (const [key, moves] of Object.entries(value.bestMoves)) {
      const id = Number(key);
      if (validId(id) && cleared.includes(id) && typeof moves === "number" &&
          Number.isSafeInteger(moves) && moves > 0) bestMoves[id] = moves;
    }
    return { cleared, bestMoves };
  } catch {
    return getDefaultProgress();
  }
}

export function saveProgress(progress: Progress): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function updateProgress(
  stageId: number,
  moves: number
): { progress: Progress; saved: boolean } {
  const progress = loadProgress();
  
  if (!progress.cleared.includes(stageId)) {
    progress.cleared.push(stageId);
  }
  
  const prevBest = progress.bestMoves[stageId];
  if (prevBest === undefined || moves < prevBest) {
    progress.bestMoves[stageId] = moves;
  }
  
  return { progress, saved: saveProgress(progress) };
}
