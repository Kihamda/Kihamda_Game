import type { GameSettings } from "./types";
import { DEFAULT_COLORS, DEFAULT_MARKS } from "./constants";

export const addPlayerToSettings = (settings: GameSettings): GameSettings => {
  const usedMarks = settings.players.map((p) => p.mark);
  const availableMark =
    DEFAULT_MARKS.find((m) => !usedMarks.includes(m)) || "?";
  const usedColors = settings.players.map((p) => p.color);
  const availableColor =
    DEFAULT_COLORS.find((c) => !usedColors.includes(c)) || DEFAULT_COLORS[0];

  return {
    ...settings,
    players: [
      ...settings.players,
      {
        name: `Player ${settings.players.length + 1}`,
        mark: availableMark,
        color: availableColor,
      },
    ],
  };
};

export const removePlayerFromSettings = (
  settings: GameSettings,
  index: number
): GameSettings => {
  if (settings.players.length <= 2) return settings;
  return {
    ...settings,
    players: settings.players.filter((_, i) => i !== index),
  };
};

export const updatePlayerName = (
  settings: GameSettings,
  index: number,
  name: string
): GameSettings => {
  const players = [...settings.players];
  players[index] = { ...players[index], name };
  return { ...settings, players };
};

export const updatePlayerMark = (
  settings: GameSettings,
  index: number,
  mark: string
): GameSettings => {
  const players = [...settings.players];
  players[index] = { ...players[index], mark };
  return { ...settings, players };
};

export const updatePlayerColor = (
  settings: GameSettings,
  index: number,
  color: string
): GameSettings => {
  const players = [...settings.players];
  players[index] = { ...players[index], color };
  return { ...settings, players };
};
