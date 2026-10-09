import { type DevicePreferences, type PersistedState } from "./types";
import { DEVICE_PREFS_KEY, STORAGE_KEY } from "./constants";
import {
  createDefaultDevicePreferences,
  normalizeGameSettings,
} from "./settings";

export const loadGameState = (): Partial<PersistedState> | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<PersistedState>;
      if (parsed.gameSettings) {
        return {
          ...parsed,
          gameSettings: normalizeGameSettings(parsed.gameSettings),
        };
      }

      return parsed;
    }
  } catch (error) {
    console.error("Failed to load game state:", error);
  }
  return null;
};

export const saveGameState = (state: Partial<PersistedState>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save game state:", error);
  }
};

export const clearSavedGame = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const loadDevicePreferences = (): DevicePreferences => {
  try {
    const saved = localStorage.getItem(DEVICE_PREFS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<DevicePreferences>;
      const defaults = createDefaultDevicePreferences();
      return {
        confirmationMode:
          typeof parsed.confirmationMode === "boolean"
            ? parsed.confirmationMode
            : defaults.confirmationMode,
        lastGameSettings: normalizeGameSettings(parsed.lastGameSettings),
      };
    }
  } catch (error) {
    console.error("Failed to load device preferences:", error);
  }

  return createDefaultDevicePreferences();
};

export const saveDevicePreferences = (prefs: DevicePreferences) => {
  try {
    localStorage.setItem(DEVICE_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error("Failed to save device preferences:", error);
  }
};
