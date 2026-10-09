import type { Card, Suit, Rank, RoundResult } from "./types";
import { DEALER_STAND_VALUE } from "./constants";

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/** デッキを作成 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/** デッキをシャッフル */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** カードの数値を取得 (Aは1または11) */
export function getCardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return parseInt(rank, 10);
}

/** 手札の合計を計算 (Aの調整込み) */
export function calculateHandValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    total += getCardValue(card.rank);
    if (card.rank === "A") aces++;
  }

  // Aを1として計算する調整
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

/** ブラックジャックかどうか */
export function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && calculateHandValue(hand) === 21;
}

/** バストかどうか */
export function isBust(hand: Card[]): boolean {
  return calculateHandValue(hand) > 21;
}

/** ディーラーがヒットすべきか */
export function shouldDealerHit(hand: Card[]): boolean {
  return calculateHandValue(hand) < DEALER_STAND_VALUE;
}

/** 勝敗を判定 */
export function determineResult(
  playerHand: Card[],
  dealerHand: Card[]
): RoundResult {
  const playerValue = calculateHandValue(playerHand);
  const dealerValue = calculateHandValue(dealerHand);
  const playerBJ = isBlackjack(playerHand);
  const dealerBJ = isBlackjack(dealerHand);

  // プレイヤーバスト
  if (playerValue > 21) return "bust";

  // ブラックジャック判定
  if (playerBJ && dealerBJ) return "push";
  if (playerBJ) return "blackjack";
  if (dealerBJ) return "lose";

  // ディーラーバスト
  if (dealerValue > 21) return "win";

  // 数値比較
  if (playerValue > dealerValue) return "win";
  if (playerValue < dealerValue) return "lose";
  return "push";
}

/** スートの色を取得 */
export function getSuitColor(suit: Suit): string {
  return suit === "♥" || suit === "♦" ? "#dc2626" : "#1e293b";
}