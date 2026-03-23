/** カードのスート */
export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

/** カードのランク (1=A, 11=J, 12=Q, 13=K) */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** カード */
export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

/** タブロー（7列のカード配置）*/
export type Tableau = Card[][];

/** ファウンデーション（4つのスート別山）*/
export type Foundation = Record<Suit, Card[]>;

/** ストック（山札）*/
export type Stock = Card[];

/** ウェスト（めくった山札）*/
export type Waste = Card[];

/** ゲーム状態 */
export interface GameState {
  tableau: Tableau;
  foundation: Foundation;
  stock: Stock;
  waste: Waste;
  moves: number;
}

/** ドラッグ中のカード情報 */
export interface DragSource {
  type: "tableau" | "waste" | "foundation";
  pileIndex?: number;
  cardIndex?: number;
  cards: Card[];
}

/** ゲームフェーズ */
export type Phase = "start" | "playing" | "won";