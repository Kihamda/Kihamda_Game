import type { GameState } from "./types";
import { STORAGE_KEY } from "./constants";
import { createInitialState } from "./clickmaster";

/** ゲーム状態を保存 */
export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存失敗は無視
  }
}

/** ゲーム状態を読み込み */
export function loadGame(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as GameState;
      // 最低限のバリデーション
      if (
        typeof parsed.points === "number" &&
        typeof parsed.totalPoints === "number" &&
        Array.isArray(parsed.upgrades)
      ) {
        return parsed;
      }
    }
  } catch {
    // 読み込み失敗は無視
  }
  return createInitialState();
}

/** セーブデータを削除 */
export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 削除失敗は無視
  }
}
