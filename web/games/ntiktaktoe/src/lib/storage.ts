import { type DevicePreferences, type PersistedState } from "./types";
import { DEVICE_PREFS_KEY, STORAGE_KEY } from "./constants";
import { createDefaultDevicePreferences, normalizeGameSettings } from "./settings";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isIntegerIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

// Validate the saved board against its original settings before normalization.
// Old saves without gameMode remain classic games.
export const validateGameState = (value: unknown): PersistedState | null => {
  if (!isRecord(value) || typeof value.appState !== "string" || !["before", "in_progress", "after"].includes(value.appState)) return null;
  const settings = value.gameSettings;
  if (!isRecord(settings) || !isRecord(settings.board)) return null;
  const { width, height } = settings.board;
  if (!isIntegerIn(width, 3, 30) || !isIntegerIn(height, 3, 30) ||
      !isIntegerIn(settings.winLength, 3, Math.max(width, height)) ||
      (settings.gameMode !== undefined && settings.gameMode !== "classic" && settings.gameMode !== "gravity")) return null;
  const players = settings.players;
  if (!Array.isArray(players) || players.length < 2 || players.length > 30 ||
      !players.every(p => isRecord(p) && [p.name, p.mark, p.color].every(s => typeof s === "string" && s.trim().length > 0))) return null;
  if (!isIntegerIn(value.currentPlayerIndex, 0, players.length - 1) ||
      !(value.winner === null || players.some(p => p.name === value.winner))) return null;
  const board = value.board;
  if (!Array.isArray(board) || board.length !== height ||
      !board.every(row => Array.isArray(row) && row.length === width &&
        row.every(cell => cell === null || players.some(p => p.mark === cell)))) return null;
  return {
    appState: value.appState as PersistedState["appState"],
    gameSettings: normalizeGameSettings(settings as unknown as PersistedState["gameSettings"]),
    board, currentPlayerIndex: value.currentPlayerIndex,
    winner: value.winner as string | null,
  };
};

export const readGameState = (): { state: PersistedState | null; message: string | null } => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return { state: null, message: null };
    const state = validateGameState(JSON.parse(saved));
    return state ? { state, message: null } : {
      state: null, message: "保存データの形式を確認できないため再開できません。新しいゲームを始めると保存データを置き換えます。",
    };
  } catch {
    return { state: null, message: "保存データを読み込めません。新しいゲームは遊べますが、保存・再開できない場合があります。" };
  }
};

export const loadGameState = (): PersistedState | null => readGameState().state;

export const saveGameState = (state: Partial<PersistedState>): boolean => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
};

export const clearSavedGame = (): boolean => {
  try { localStorage.removeItem(STORAGE_KEY); return true; }
  catch { return false; }
};

export const loadDevicePreferences = (): DevicePreferences => {
  try {
    const saved = localStorage.getItem(DEVICE_PREFS_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (!isRecord(parsed)) return createDefaultDevicePreferences();
      const defaults = createDefaultDevicePreferences();
      return {
        confirmationMode: typeof parsed.confirmationMode === "boolean" ? parsed.confirmationMode : defaults.confirmationMode,
        lastGameSettings: normalizeGameSettings(isRecord(parsed.lastGameSettings) ? parsed.lastGameSettings : undefined),
      };
    }
  } catch { /* Use defaults when preferences cannot be read. */ }
  return createDefaultDevicePreferences();
};

export const saveDevicePreferences = (prefs: DevicePreferences): boolean => {
  try { localStorage.setItem(DEVICE_PREFS_KEY, JSON.stringify(prefs)); return true; }
  catch { return false; }
};
