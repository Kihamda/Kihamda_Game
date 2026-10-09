import type { Board, Cell, GameState, Player, WinLine } from "./types";
import { COLS, ROWS } from "./types";

/** 空のボードを作成 */
export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null) as Cell[]);
}

/** 初期ゲーム状態を作成 */
export function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 1,
    winner: null,
    winLine: null,
    isDraw: false,
  };
}

/** 指定列に駒を落とせるか判定 */
export function canDropInColumn(board: Board, col: number): boolean {
  return board[0][col] === null;
}

/** 指定列に駒を落とした場合の行を取得 (落とせない場合は -1) */
export function getDropRow(board: Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      return row;
    }
  }
  return -1;
}

/** 駒を配置した新しいボードを返す (immutable) */
export function placePiece(
  board: Board,
  row: number,
  col: number,
  player: Player
): Board {
  return board.map((r, ri) =>
    ri === row ? r.map((c, ci) => (ci === col ? player : c)) : r
  );
}

/** 4つ揃った勝利ラインを検出 */
export function checkWin(board: Board, player: Player): WinLine | null {
  // 方向: 右、下、右下、右上
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
  ];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] !== player) continue;

      for (const [dr, dc] of directions) {
        const cells: [number, number][] = [[row, col]];
        let r = row + dr;
        let c = col + dc;

        while (
          r >= 0 &&
          r < ROWS &&
          c >= 0 &&
          c < COLS &&
          board[r][c] === player
        ) {
          cells.push([r, c]);
          r += dr;
          c += dc;
        }

        if (cells.length >= 4) {
          return { cells: cells.slice(0, 4) };
        }
      }
    }
  }

  return null;
}

/** 引き分け判定 (ボードが埋まっている) */
export function checkDraw(board: Board): boolean {
  return board[0].every((cell) => cell !== null);
}

/** 駒を落として新しい状態を返す */
export function dropPiece(state: GameState, col: number): GameState {
  if (state.winner || state.isDraw) return state;

  const row = getDropRow(state.board, col);
  if (row === -1) return state;

  const newBoard = placePiece(state.board, row, col, state.currentPlayer);
  const winLine = checkWin(newBoard, state.currentPlayer);
  const winner = winLine ? state.currentPlayer : null;
  const isDraw = !winner && checkDraw(newBoard);
  const nextPlayer: Player = state.currentPlayer === 1 ? 2 : 1;

  return {
    board: newBoard,
    currentPlayer: winner || isDraw ? state.currentPlayer : nextPlayer,
    winner,
    winLine,
    isDraw,
  };
}
