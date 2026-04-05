import { STORAGE_KEY } from "./constants";

export function loadHighestWave(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
}

export function saveHighestWave(wave: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(wave));
  } catch {
    // ignore
  }
}
