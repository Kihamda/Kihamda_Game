import type { Direction, GameState, Position, WordPlacement } from "./types";
import {
  GRID_SIZE,
  RANDOM_CHARS,
  WORD_LISTS,
  WORDS_TO_PLACE,
} from "./constants";

/** 方向のベクトル */
const DIRECTION_VECTORS: Record<Direction, { dr: number; dc: number }> = {
  horizontal: { dr: 0, dc: 1 },
  vertical: { dr: 1, dc: 0 },
  "diagonal-down": { dr: 1, dc: 1 },
  "diagonal-up": { dr: -1, dc: 1 },
};

/** 全方向リスト */
const ALL_DIRECTIONS: Direction[] = [
  "horizontal",
  "vertical",
  "diagonal-down",
  "diagonal-up",
];

/** 配列シャッフル */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 単語が配置可能か確認 */
function canPlaceWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: Direction,
): boolean {
  const { dr, dc } = DIRECTION_VECTORS[direction];
  const chars = word.split("");

  for (let i = 0; i < chars.length; i++) {
    const row = startRow + i * dr;
    const col = startCol + i * dc;

    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return false;
    }

    const cell = grid[row][col];
    if (cell !== "" && cell !== chars[i]) {
      return false;
    }
  }

  return true;
}

/** 単語を配置 */
function placeWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: Direction,
): void {
  const { dr, dc } = DIRECTION_VECTORS[direction];
  const chars = word.split("");

  for (let i = 0; i < chars.length; i++) {
    const row = startRow + i * dr;
    const col = startCol + i * dc;
    grid[row][col] = chars[i];
  }
}

/** 単語を配置してみる */
function tryPlaceWord(
  grid: string[][],
  word: string,
): WordPlacement | null {
  const directions = shuffle(ALL_DIRECTIONS);

  for (const direction of directions) {
    const positions: { row: number; col: number }[] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (canPlaceWord(grid, word, row, col, direction)) {
          positions.push({ row, col });
        }
      }
    }

    if (positions.length > 0) {
      const pos = positions[Math.floor(Math.random() * positions.length)];
      placeWord(grid, word, pos.row, pos.col, direction);
      return {
        word,
        startPos: { row: pos.row, col: pos.col },
        direction,
        found: false,
      };
    }
  }

  return null;
}

/** グリッドをランダム文字で埋める */
function fillGrid(grid: string[][]): void {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === "") {
        grid[row][col] =
          RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
      }
    }
  }
}

/** 空グリッド作成 */
function createEmptyGrid(): string[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ""),
  );
}

/** ゲーム初期化 */
export function initializeGame(category: string): GameState {
  const wordList = WORD_LISTS[category] ?? WORD_LISTS.animals;
  const shuffledWords = shuffle(wordList);
  const grid = createEmptyGrid();
  const placements: WordPlacement[] = [];

  // 単語を配置
  for (const word of shuffledWords) {
    if (placements.length >= WORDS_TO_PLACE) break;
    const placement = tryPlaceWord(grid, word);
    if (placement) {
      placements.push(placement);
    }
  }

  // 残りをランダム文字で埋める
  fillGrid(grid);

  return {
    grid,
    words: placements,
    selectedCells: [],
    foundWords: [],
    isComplete: false,
    startTime: Date.now(),
    elapsedTime: 0,
  };
}

/** 選択セルから単語を抽出 */
export function getSelectedWord(
  grid: string[][],
  cells: Position[],
): string {
  return cells.map((c) => grid[c.row][c.col]).join("");
}

/** 選択が有効な直線か確認 */
export function isValidSelection(cells: Position[]): boolean {
  if (cells.length < 2) return true;

  const dr = cells[1].row - cells[0].row;
  const dc = cells[1].col - cells[0].col;

  // 方向が有効か確認 (水平、垂直、斜め)
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1) return false;
  if (dr === 0 && dc === 0) return false;

  // 全てのセルが同じ方向で連続しているか
  for (let i = 2; i < cells.length; i++) {
    const expectedRow = cells[i - 1].row + dr;
    const expectedCol = cells[i - 1].col + dc;
    if (cells[i].row !== expectedRow || cells[i].col !== expectedCol) {
      return false;
    }
  }

  return true;
}

/** 単語が見つかったかチェック */
export function checkWord(
  state: GameState,
  selectedWord: string,
): GameState {
  const word = state.words.find(
    (w) => !w.found && (w.word === selectedWord || w.word === selectedWord.split("").reverse().join("")),
  );

  if (!word) return state;

  const newWords = state.words.map((w) =>
    w.word === word.word ? { ...w, found: true } : w,
  );
  const newFoundWords = [...state.foundWords, word.word];
  const isComplete = newWords.every((w) => w.found);

  return {
    ...state,
    words: newWords,
    foundWords: newFoundWords,
    isComplete,
    elapsedTime: isComplete ? Date.now() - state.startTime : state.elapsedTime,
  };
}

/** 単語のセル位置を取得 */
export function getWordCells(placement: WordPlacement): Position[] {
  const { dr, dc } = DIRECTION_VECTORS[placement.direction];
  const cells: Position[] = [];

  for (let i = 0; i < placement.word.length; i++) {
    cells.push({
      row: placement.startPos.row + i * dr,
      col: placement.startPos.col + i * dc,
    });
  }

  return cells;
}

/** 時間フォーマット */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
