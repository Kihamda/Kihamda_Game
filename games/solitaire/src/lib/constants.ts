import type { Suit } from "./types";

/** スートの表示記号 */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

/** スートの色 */
export const SUIT_COLORS: Record<Suit, "red" | "black"> = {
  spades: "black",
  hearts: "red",
  diamonds: "red",
  clubs: "black",
};

/** ランクの表示文字 */
export const RANK_LABELS: Record<number, string> = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
};

/** ゲーム画面サイズ */
export const GAME_WIDTH = 900;
export const GAME_HEIGHT = 700;

/** カードサイズ */
export const CARD_WIDTH = 70;
export const CARD_HEIGHT = 100;

/** タブローでのカード重なりオフセット */
export const CARD_OVERLAP_FACE_DOWN = 10;
export const CARD_OVERLAP_FACE_UP = 25;