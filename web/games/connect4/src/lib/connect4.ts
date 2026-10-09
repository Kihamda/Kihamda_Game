import type { Board, Cell, GameMode, GameState, Player, WinLine } from "./types";
import { COLS, ROWS } from "./types";

/** 空のボードを作成 */
export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null) as Cell[]);
}

/** 初期ゲーム状態を作成 */
export function createInitialState(gameMode: GameMode): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 1,
    winner: null,
    winLine: null,
    isDraw: false,
    gameMode,
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
    ...state,
    board: newBoard,
    currentPlayer: winner || isDraw ? state.currentPlayer : nextPlayer,
    winner,
    winLine,
    isDraw,
  };
}

/** 有効な列を取得 */
export function getValidColumns(board: Board): number[] {
  return Array.from({ length: COLS }, (_, i) => i).filter((col) =>
    canDropInColumn(board, col)
  );
}

/** ライン評価: 指定位置から各方向の連続数をカウント */
function evaluateLine(
  board: Board,
  startRow: number,
  startCol: number,
  dr: number,
  dc: number,
  player: Player
): number {
  let count = 0;
  let empty = 0;
  for (let i = 0; i < 4; i++) {
    const r = startRow + dr * i;
    const c = startCol + dc * i;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    const cell = board[r][c];
    if (cell === player) count++;
    else if (cell === null) empty++;
    else return 0; // 敵駒があれば無効
  }
  if (count === 4) return 10000;
  if (count === 3 && empty === 1) return 100;
  if (count === 2 && empty === 2) return 10;
  return count;
}

/** ボード評価関数 */
function evaluateBoard(board: Board, cpuPlayer: Player): number {
  const humanPlayer: Player = cpuPlayer === 1 ? 2 : 1;
  let score = 0;
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
  ];

  // 中央列を優先
  for (let row = 0; row < ROWS; row++) {
    if (board[row][3] === cpuPlayer) score += 3;
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const [dr, dc] of directions) {
        score += evaluateLine(board, row, col, dr, dc, cpuPlayer);
        score -= evaluateLine(board, row, col, dr, dc, humanPlayer) * 1.1;
      }
    }
  }
  return score;
}

/** ミニマックス法 (αβ枝刈り) */
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  cpuPlayer: Player
): number {
  const humanPlayer: Player = cpuPlayer === 1 ? 2 : 1;

  // 終端判定
  if (checkWin(board, cpuPlayer)) return 10000 + depth;
  if (checkWin(board, humanPlayer)) return -10000 - depth;
  if (checkDraw(board)) return 0;
  if (depth === 0) return evaluateBoard(board, cpuPlayer);

  const validCols = getValidColumns(board);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const col of validCols) {
      const row = getDropRow(board, col);
      const newBoard = placePiece(board, row, col, cpuPlayer);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, cpuPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const col of validCols) {
      const row = getDropRow(board, col);
      const newBoard = placePiece(board, row, col, humanPlayer);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, cpuPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/** CPUの手を決定 */
export function getCpuMove(board: Board, cpuPlayer: Player): number {
  const validCols = getValidColumns(board);
  if (validCols.length === 0) return -1;

  // 即勝ち・即負けチェック
  const humanPlayer: Player = cpuPlayer === 1 ? 2 : 1;

  // CPUが勝てる手があれば即座に選ぶ
  for (const col of validCols) {
    const row = getDropRow(board, col);
    const testBoard = placePiece(board, row, col, cpuPlayer);
    if (checkWin(testBoard, cpuPlayer)) return col;
  }

  // 相手が勝てる手をブロック
  for (const col of validCols) {
    const row = getDropRow(board, col);
    const testBoard = placePiece(board, row, col, humanPlayer);
    if (checkWin(testBoard, humanPlayer)) return col;
  }

  // ミニマックスで最善手を探索
  let bestCol = validCols[0];
  let bestScore = -Infinity;
  const depth = 5;

  for (const col of validCols) {
    const row = getDropRow(board, col);
    const newBoard = placePiece(board, row, col, cpuPlayer);
    const score = minimax(newBoard, depth, -Infinity, Infinity, false, cpuPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  return bestCol;
}
