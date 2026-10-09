/** プレイヤー識別子 */
export type Player = 1 | 2;

/** セルの状態: null=空、1=プレイヤー1、2=プレイヤー2 */
export type Cell = Player | null;

/** 7列 x 6行のボード */
export type Board = Cell[][];

/** 勝利ラインの座標 */
export interface WinLine {
  cells: [number, number][];
}

/** ゲームの状態 */
export interface GameState {
  board: Board;
  currentPlayer: Player;
  winner: Player | null;
  winLine: WinLine | null;
  isDraw: boolean;
}

/** 落下アニメーション用 */
export interface DroppingPiece {
  col: number;
  targetRow: number;
  player: Player;
}

export const COLS = 7;
export const ROWS = 6;
