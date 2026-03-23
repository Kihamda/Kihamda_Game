/** プレイヤー色 */
export type Color = "white" | "black";

/** 駒の種類 */
export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

/** 駒 */
export interface Piece {
  type: PieceType;
  color: Color;
  hasMoved: boolean;
}

/** 盤面の位置 */
export interface Position {
  row: number;
  col: number;
}

/** セルの状態 */
export type Cell = Piece | null;

/** 8x8のボード */
export type Board = Cell[][];

/** ゲームの状態 */
export interface GameState {
  board: Board;
  currentPlayer: Color;
  selectedPosition: Position | null;
  validMoves: Position[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  capturedWhite: PieceType[];
  capturedBlack: PieceType[];
}

/** ボードサイズ */
export const BOARD_SIZE = 8;
