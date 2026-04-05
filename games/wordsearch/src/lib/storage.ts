import { STORAGE_KEY } from "./constants";

/** ベストタイム読み込み */
export function loadBestTime(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

/** ベストタイム保存 */
export function saveBestTime(ms: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(ms));
  } catch {
    // ignore
  }
}
