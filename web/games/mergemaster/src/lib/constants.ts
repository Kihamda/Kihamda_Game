// Merge Master constants

export const GRID_SIZE = 5;
export const MAX_LEVEL = 10;

// 各レベルの絵文字表現
export const LEVEL_EMOJIS: Record<number, string> = {
  1: "🥚",
  2: "🐣",
  3: "🐥",
  4: "🐤",
  5: "🐔",
  6: "🦆",
  7: "🦅",
  8: "🦉",
  9: "🦚",
  10: "🐉",
};

// 各レベルのスコア
export const LEVEL_SCORES: Record<number, number> = {
  1: 0,
  2: 10,
  3: 30,
  4: 60,
  5: 100,
  6: 150,
  7: 210,
  8: 280,
  9: 360,
  10: 500,
};

// 各レベルの色
export const LEVEL_COLORS: Record<number, string> = {
  1: "#FFF9C4",
  2: "#FFECB3",
  3: "#FFE082",
  4: "#FFD54F",
  5: "#FFCA28",
  6: "#FFC107",
  7: "#FFB300",
  8: "#FFA000",
  9: "#FF8F00",
  10: "#FF6F00",
};

export const STORAGE_KEY = "mergemaster-best";
