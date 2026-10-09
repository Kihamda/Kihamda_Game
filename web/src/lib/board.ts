import type { Board, GameSettings } from "./types";

export const createEmptyBoard = (settings: GameSettings): Board => {
  return Array(settings.board.height)
    .fill(null)
    .map(() => Array(settings.board.width).fill(null));
};

export const cloneBoard = (board: Board): Board => board.map((row) => [...row]);

export const checkWin = (
  board: Board,
  row: number,
  col: number,
  mark: string,
  settings: GameSettings
): boolean => {
  const {
    board: { width, height },
    winLength,
  } = settings;

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let count = 1;

    for (let i = 1; i < winLength; i++) {
      const newRow = row + dr * i;
      const newCol = col + dc * i;
      if (
        newRow >= 0 &&
        newRow < height &&
        newCol >= 0 &&
        newCol < width &&
        board[newRow][newCol] === mark
      ) {
        count++;
      } else {
        break;
      }
    }

    for (let i = 1; i < winLength; i++) {
      const newRow = row - dr * i;
      const newCol = col - dc * i;
      if (
        newRow >= 0 &&
        newRow < height &&
        newCol >= 0 &&
        newCol < width &&
        board[newRow][newCol] === mark
      ) {
        count++;
      } else {
        break;
      }
    }

    if (count >= winLength) {
      return true;
    }
  }

  return false;
};
