/** 15パズルの型定義 */

/** ゲーム状態 */
export type GamePhase = "idle" | "playing" | "completed";

/** タイル (0 は空きマス) */
export type Tile = number;

/** ボード状態: 4x4の配列 */
export type Board = Tile[];

/** ゲーム状態 */
export interface GameState {
  board: Board;
  moves: number;
  startTime: number | null;
  elapsedTime: number;
  phase: GamePhase;
  bestMoves: number | null;
  bestTime: number | null;
}
