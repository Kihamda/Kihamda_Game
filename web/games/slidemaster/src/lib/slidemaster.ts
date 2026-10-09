/** 15パズル ゲームロジック (純粋関数) */

import type { Board, GameState } from "./types";
import {
  GRID_SIZE,
  TOTAL_TILES,
  EMPTY_TILE,
  MIN_SHUFFLE_MOVES,
} from "./constants";

/** 初期完成状態のボードを生成 */
export function createSolvedBoard(): Board {
  const board: Board = [];
  for (let i = 1; i < TOTAL_TILES; i++) {
    board.push(i);
  }
  board.push(EMPTY_TILE);
  return board;
}

/** ボードが完成状態かチェック */
export function isSolved(board: Board): boolean {
  for (let i = 0; i < TOTAL_TILES - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[TOTAL_TILES - 1] === EMPTY_TILE;
}

/** 空きマスのインデックスを取得 */
export function findEmptyIndex(board: Board): number {
  return board.indexOf(EMPTY_TILE);
}

/** インデックスから行・列を取得 */
export function indexToRowCol(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / GRID_SIZE),
    col: index % GRID_SIZE,
  };
}

/** 行・列からインデックスを取得 */
export function rowColToIndex(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

/** 隣接するタイルのインデックスを取得 */
export function getAdjacentIndices(index: number): number[] {
  const { row, col } = indexToRowCol(index);
  const adjacent: number[] = [];

  if (row > 0) adjacent.push(rowColToIndex(row - 1, col)); // 上
  if (row < GRID_SIZE - 1) adjacent.push(rowColToIndex(row + 1, col)); // 下
  if (col > 0) adjacent.push(rowColToIndex(row, col - 1)); // 左
  if (col < GRID_SIZE - 1) adjacent.push(rowColToIndex(row, col + 1)); // 右

  return adjacent;
}

/** タイルが移動可能かチェック */
export function canMove(board: Board, tileIndex: number): boolean {
  const emptyIndex = findEmptyIndex(board);
  return getAdjacentIndices(emptyIndex).includes(tileIndex);
}

/** タイルを移動 */
export function moveTile(board: Board, tileIndex: number): Board | null {
  if (!canMove(board, tileIndex)) return null;

  const emptyIndex = findEmptyIndex(board);
  const newBoard = [...board];
  newBoard[emptyIndex] = newBoard[tileIndex];
  newBoard[tileIndex] = EMPTY_TILE;
  return newBoard;
}

/** ボードをシャッフル (解ける状態を保証) */
export function shuffleBoard(board: Board): Board {
  let shuffled = [...board];

  // ランダムな合法手を繰り返して確実に解ける状態を作成
  for (let i = 0; i < MIN_SHUFFLE_MOVES; i++) {
    const emptyIndex = findEmptyIndex(shuffled);
    const adjacent = getAdjacentIndices(emptyIndex);
    const randomIndex = adjacent[Math.floor(Math.random() * adjacent.length)];
    const moved = moveTile(shuffled, randomIndex);
    if (moved) shuffled = moved;
  }

  // 完成状態になってしまった場合は再シャッフル
  if (isSolved(shuffled)) {
    return shuffleBoard(board);
  }

  return shuffled;
}

/** 初期ゲーム状態を生成 */
export function createInitialState(
  bestMoves: number | null,
  bestTime: number | null
): GameState {
  return {
    board: createSolvedBoard(),
    moves: 0,
    startTime: null,
    elapsedTime: 0,
    phase: "idle",
    bestMoves,
    bestTime,
  };
}

/** シャッフルしてゲームを開始 */
export function startGame(state: GameState): GameState {
  const shuffledBoard = shuffleBoard(createSolvedBoard());
  return {
    ...state,
    board: shuffledBoard,
    moves: 0,
    startTime: Date.now(),
    elapsedTime: 0,
    phase: "playing",
  };
}

/** タイルを移動してゲーム状態を更新 */
export function handleTileClick(
  state: GameState,
  tileIndex: number
): GameState {
  if (state.phase !== "playing") return state;

  const newBoard = moveTile(state.board, tileIndex);
  if (!newBoard) return state;

  const solved = isSolved(newBoard);
  const newMoves = state.moves + 1;
  const elapsedTime = state.startTime ? Date.now() - state.startTime : 0;

  if (solved) {
    // ベストスコア更新チェック
    let bestMoves = state.bestMoves;
    let bestTime = state.bestTime;

    if (bestMoves === null || newMoves < bestMoves) {
      bestMoves = newMoves;
    }
    if (bestTime === null || elapsedTime < bestTime) {
      bestTime = elapsedTime;
    }

    return {
      ...state,
      board: newBoard,
      moves: newMoves,
      elapsedTime,
      phase: "completed",
      bestMoves,
      bestTime,
    };
  }

  return {
    ...state,
    board: newBoard,
    moves: newMoves,
    elapsedTime,
  };
}

/** 時間をフォーマット (mm:ss.ms) */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
}
