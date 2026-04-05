import type { PieceType } from "./types";

/** 駒の表示記号 */
export const PIECE_SYMBOLS: Record<string, Record<PieceType, string>> = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};

/** ボードの初期配置 */
export const INITIAL_SETUP: { row: number; col: number; type: PieceType; color: "white" | "black" }[] = [
  // Black pieces (top)
  { row: 0, col: 0, type: "rook", color: "black" },
  { row: 0, col: 1, type: "knight", color: "black" },
  { row: 0, col: 2, type: "bishop", color: "black" },
  { row: 0, col: 3, type: "queen", color: "black" },
  { row: 0, col: 4, type: "king", color: "black" },
  { row: 0, col: 5, type: "bishop", color: "black" },
  { row: 0, col: 6, type: "knight", color: "black" },
  { row: 0, col: 7, type: "rook", color: "black" },
  // Black pawns
  ...Array.from({ length: 8 }, (_, col) => ({ row: 1, col, type: "pawn" as PieceType, color: "black" as const })),
  // White pawns
  ...Array.from({ length: 8 }, (_, col) => ({ row: 6, col, type: "pawn" as PieceType, color: "white" as const })),
  // White pieces (bottom)
  { row: 7, col: 0, type: "rook", color: "white" },
  { row: 7, col: 1, type: "knight", color: "white" },
  { row: 7, col: 2, type: "bishop", color: "white" },
  { row: 7, col: 3, type: "queen", color: "white" },
  { row: 7, col: 4, type: "king", color: "white" },
  { row: 7, col: 5, type: "bishop", color: "white" },
  { row: 7, col: 6, type: "knight", color: "white" },
  { row: 7, col: 7, type: "rook", color: "white" },
];
