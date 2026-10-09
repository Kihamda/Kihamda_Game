import type {
  DevicePreferences,
  GameMode,
  GameSettings,
  Player,
} from "./types";
import { DEFAULT_COLORS } from "./constants";

const MIN_BOARD_SIZE = 3;
const MAX_BOARD_SIZE = 30;

const sanitizeBoardSize = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_SIZE, Math.floor(value)));
};

const sanitizePlayers = (
  players: Player[] | undefined,
  fallback: Player[],
): Player[] => {
  if (!Array.isArray(players) || players.length < 2) {
    return fallback.map((player) => ({ ...player }));
  }

  const sanitizedPlayers = players
    .map((player, index) => {
      const fallbackPlayer = fallback[index] ?? {
        name: `Player ${index + 1}`,
        mark: `${index + 1}`,
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      };

      return {
        name:
          typeof player?.name === "string" && player.name.trim().length > 0
            ? player.name
            : fallbackPlayer.name,
        mark:
          typeof player?.mark === "string" && player.mark.trim().length > 0
            ? player.mark
            : fallbackPlayer.mark,
        color:
          typeof player?.color === "string" && player.color.trim().length > 0
            ? player.color
            : fallbackPlayer.color,
      };
    })
    .slice(0, 30);

  return sanitizedPlayers.length >= 2
    ? sanitizedPlayers
    : fallback.map((player) => ({ ...player }));
};

const normalizeGameMode = (mode: unknown): GameMode => {
  return mode === "gravity" ? "gravity" : "classic";
};

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
  gameMode: "classic",
});

export const createDefaultDevicePreferences = (): DevicePreferences => ({
  confirmationMode: false,
  lastGameSettings: createDefaultSettings(),
});

export const cloneGameSettings = (settings: GameSettings): GameSettings => ({
  board: { ...settings.board },
  winLength: settings.winLength,
  gameMode: settings.gameMode,
  players: settings.players.map((player) => ({ ...player })),
});

export const normalizeGameSettings = (
  settings?: Partial<GameSettings>,
): GameSettings => {
  const defaults = createDefaultSettings();
  const width = sanitizeBoardSize(
    settings?.board?.width ?? defaults.board.width,
    defaults.board.width,
  );
  const height = sanitizeBoardSize(
    settings?.board?.height ?? defaults.board.height,
    defaults.board.height,
  );
  const maxWinLength = Math.max(width, height);
  const rawWinLength =
    typeof settings?.winLength === "number"
      ? settings.winLength
      : defaults.winLength;
  const winLength = Math.max(
    3,
    Math.min(maxWinLength, Math.floor(rawWinLength)),
  );

  return {
    board: { width, height },
    players: sanitizePlayers(settings?.players, defaults.players),
    winLength,
    gameMode: normalizeGameMode(settings?.gameMode),
  };
};
