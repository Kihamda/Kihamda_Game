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
    return JSON.parse(data) as Progress;
  } catch {
    return getDefaultProgress();
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function updateProgress(
  stageId: number,
  moves: number
): Progress {
  const progress = loadProgress();
  
  if (!progress.cleared.includes(stageId)) {
    progress.cleared.push(stageId);
  }
  
  const prevBest = progress.bestMoves[stageId];
  if (prevBest === undefined || moves < prevBest) {
    progress.bestMoves[stageId] = moves;
  }
  
  saveProgress(progress);
  return progress;
}
