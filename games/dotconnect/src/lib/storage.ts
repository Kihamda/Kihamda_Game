import type { PuzzleStage } from "./types";

const STORAGE_KEY = "dotconnect_progress";

export interface Progress {
  clearedStages: number[];
}

export function loadProgress(): Progress {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as Progress;
    }
  } catch {
    // ignore
  }
  return { clearedStages: [] };
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function markStageCleared(stage: PuzzleStage): void {
  const progress = loadProgress();
  if (!progress.clearedStages.includes(stage.id)) {
    progress.clearedStages.push(stage.id);
    saveProgress(progress);
  }
}

export function isStageCleared(stageId: number): boolean {
  const progress = loadProgress();
  return progress.clearedStages.includes(stageId);
}
