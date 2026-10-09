import type { Board, Cell, Color, GameState, Piece, PieceType, Position } from "./types";
import { BOARD_SIZE } from "./types";
import { INITIAL_SETUP } from "./constants";

/** 空のボードを作成 */
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null) as Cell[]
  );
}

/** 初期ボードを作成 */
export function createInitialBoard(): Board {
  const board = createEmptyBoard();
  for (const { row, col, type, color } of INITIAL_SETUP) {
    board[row][col] = { type, color, hasMoved: false };
  }
  return board;
}

/** 初期ゲーム状態を作成 */
export function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: "white",
    selectedPosition: null,
    validMoves: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedWhite: [],
    capturedBlack: [],
  };
}

/** 位置が盤面内かどうか */
function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/** 位置が等しいか */
function posEquals(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

/** キングの位置を取得 */
function findKing(board: Board, color: Color): Position | null {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece?.type === "king" && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

/** 駒の基本的な移動先を取得（チェック考慮なし） */
function getRawMoves(board: Board, pos: Position): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const moves: Position[] = [];
  const { row, col } = pos;
  const { type, color } = piece;

  const addMoveIfValid = (r: number, c: number, captureOnly = false, moveOnly = false): boolean => {
    if (!isInBounds(r, c)) return false;
    const target = board[r][c];
    
    if (moveOnly && target !== null) return false;
    if (captureOnly && (target === null || target.color === color)) return false;
    if (!captureOnly && !moveOnly && target?.color === color) return false;
    
    moves.push({ row: r, col: c });
    return target === null;
  };

  const addSlidingMoves = (directions: [number, number][]) => {
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (isInBounds(r, c)) {
        const target = board[r][c];
        if (target) {
          if (target.color !== color) {
            moves.push({ row: r, col: c });
          }
          break;
        }
        moves.push({ row: r, col: c });
        r += dr;
        c += dc;
      }
    }
  };

  switch (type) {
    case "pawn": {
      const direction = color === "white" ? -1 : 1;
      const startRow = color === "white" ? 6 : 1;
      
      // 前進
      if (addMoveIfValid(row + direction, col, false, true)) {
        // 初期位置からの2マス前進
        if (row === startRow) {
          addMoveIfValid(row + direction * 2, col, false, true);
        }
      }
      // 斜め取り
      addMoveIfValid(row + direction, col - 1, true);
      addMoveIfValid(row + direction, col + 1, true);
      break;
    }
    case "knight": {
      const knightMoves: [number, number][] = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of knightMoves) {
        addMoveIfValid(row + dr, col + dc);
      }
      break;
    }
    case "bishop":
      addSlidingMoves([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
      break;
    case "rook":
      addSlidingMoves([[-1, 0], [1, 0], [0, -1], [0, 1]]);
      break;
    case "queen":
      addSlidingMoves([
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ]);
      break;
    case "king": {
      const kingMoves: [number, number][] = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ];
      for (const [dr, dc] of kingMoves) {
        addMoveIfValid(row + dr, col + dc);
      }
      break;
    }
  }

  return moves;
}

/** 指定色がチェック状態かどうか */
function isInCheck(board: Board, color: Color): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;

  const opponentColor = color === "white" ? "black" : "white";

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece?.color === opponentColor) {
        const moves = getRawMoves(board, { row, col });
        if (moves.some((m) => posEquals(m, kingPos))) {
          return true;
        }
      }
    }
  }
  return false;
}

/** 駒を移動（新しいボードを返す） */
function movePiece(board: Board, from: Position, to: Position): Board {
  const newBoard = board.map((r) => [...r]);
  const piece = newBoard[from.row][from.col];
  
  if (piece) {
    // ポーンのプロモーション
    let movedPiece: Piece = { ...piece, hasMoved: true };
    if (piece.type === "pawn") {
      const promotionRow = piece.color === "white" ? 0 : 7;
      if (to.row === promotionRow) {
        movedPiece = { type: "queen", color: piece.color, hasMoved: true };
      }
    }
    
    newBoard[to.row][to.col] = movedPiece;
    newBoard[from.row][from.col] = null;
  }
  
  return newBoard;
}

/** 合法手を取得（チェック考慮あり） */
export function getValidMoves(board: Board, pos: Position): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const rawMoves = getRawMoves(board, pos);
  
  // 自殺手を除外
  return rawMoves.filter((move) => {
    const newBoard = movePiece(board, pos, move);
    return !isInCheck(newBoard, piece.color);
  });
}

/** プレイヤーに合法手があるかどうか */
function hasLegalMoves(board: Board, color: Color): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece?.color === color) {
        const moves = getValidMoves(board, { row, col });
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

/** セルをクリックした際の状態更新 */
export function handleCellClick(state: GameState, pos: Position): GameState {
  const { board, currentPlayer, selectedPosition, validMoves, isCheckmate, isStalemate } = state;

  // ゲーム終了時は何もしない
  if (isCheckmate || isStalemate) return state;

  const clickedPiece = board[pos.row][pos.col];

  // 移動先として有効なマスをクリック
  if (selectedPosition && validMoves.some((m) => posEquals(m, pos))) {
    const newBoard = movePiece(board, selectedPosition, pos);
    const capturedPiece = board[pos.row][pos.col];
    
    const nextPlayer = currentPlayer === "white" ? "black" : "white";
    const check = isInCheck(newBoard, nextPlayer);
    const hasMovesForNext = hasLegalMoves(newBoard, nextPlayer);
    
    // キャプチャされた駒の追加
    let newCapturedWhite = [...state.capturedWhite];
    let newCapturedBlack = [...state.capturedBlack];
    if (capturedPiece) {
      if (capturedPiece.color === "white") {
        newCapturedBlack = [...newCapturedBlack, capturedPiece.type];
      } else {
        newCapturedWhite = [...newCapturedWhite, capturedPiece.type];
      }
    }
    
    return {
      board: newBoard,
      currentPlayer: nextPlayer,
      selectedPosition: null,
      validMoves: [],
      isCheck: check,
      isCheckmate: check && !hasMovesForNext,
      isStalemate: !check && !hasMovesForNext,
      capturedWhite: newCapturedWhite,
      capturedBlack: newCapturedBlack,
    };
  }

  // 自分の駒を選択
  if (clickedPiece?.color === currentPlayer) {
    const moves = getValidMoves(board, pos);
    return {
      ...state,
      selectedPosition: pos,
      validMoves: moves,
    };
  }

  // 選択解除
  return {
    ...state,
    selectedPosition: null,
    validMoves: [],
  };
}

/** 位置が選択中の駒か */
export function isSelectedCell(state: GameState, pos: Position): boolean {
  return state.selectedPosition !== null && posEquals(state.selectedPosition, pos);
}

/** 位置が有効な移動先か */
export function isValidMoveCell(state: GameState, pos: Position): boolean {
  return state.validMoves.some((m) => posEquals(m, pos));
}

/** 駒の価値（キャプチャ駒のソート用） */
export function getPieceValue(type: PieceType): number {
  const values: Record<PieceType, number> = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
    king: 0,
  };
  return values[type];
}
