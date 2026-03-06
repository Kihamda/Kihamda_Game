import type { DevicePreferences, GameSettings } from "./types";
import { DEFAULT_COLORS } from "./constants";

export const createDefaultSettings = (): GameSettings => ({
  board: {
    width: 21,
    height: 21,
  },
  players: [
    { name: "Player 1", mark: "X", color: DEFAULT_COLORS[0] },
    { name: "Player 2", mark: "O", color: DEFAULT_COLORS[1] },
  ],
  winLength: 5,
});

export const createDefaultDevicePreferences = (): DevicePreferences => ({
  confirmationMode: false,
  lastGameSettings: createDefaultSettings(),
});

export const cloneGameSettings = (settings: GameSettings): GameSettings => ({
  board: { ...settings.board },
  winLength: settings.winLength,
  players: settings.players.map((player) => ({ ...player })),
});
