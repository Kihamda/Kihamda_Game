/** カードのスート */
export type Suit = "♠" | "♥" | "♦" | "♣";

/** カードのランク */
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

/** カード */
export interface Card {
  suit: Suit;
  rank: Rank;
}

/** ゲームフェーズ */
export type Phase = "betting" | "playing" | "dealerTurn" | "result";

/** 勝敗結果 */
export type RoundResult =
  | "blackjack"
  | "win"
  | "lose"
  | "push"
  | "bust"
  | null;

/** ゲーム状態 */
export interface GameState {
  phase: Phase;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  chips: number;
  bet: number;
  result: RoundResult;
}