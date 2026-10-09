import type { Card, Suit, Rank, GameState, Tableau, Foundation, DragSource } from "./types";
import { SUIT_COLORS } from "./constants";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/** デッキを作成 */
function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        faceUp: false,
      });
    }
  }
  return deck;
}

/** シャッフル */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 初期ゲーム状態を作成 */
export function createInitialGameState(): GameState {
  const deck = shuffle(createDeck());
  const tableau: Tableau = [];
  let cardIndex = 0;

  // 7列のタブローを作成（1列目に1枚、2列目に2枚、...）
  for (let col = 0; col < 7; col++) {
    const pile: Card[] = [];
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[cardIndex++] };
      // 各列の一番上のカードのみ表向き
      card.faceUp = row === col;
      pile.push(card);
    }
    tableau.push(pile);
  }

  // 残りはストック
  const stock = deck.slice(cardIndex);

  const foundation: Foundation = {
    spades: [],
    hearts: [],
    diamonds: [],
    clubs: [],
  };

  return {
    tableau,
    foundation,
    stock,
    waste: [],
    moves: 0,
  };
}

/** カードが反対色かどうか */
function isOppositeColor(card1: Card, card2: Card): boolean {
  return SUIT_COLORS[card1.suit] !== SUIT_COLORS[card2.suit];
}

/** タブローへの移動が有効か */
export function canMoveToTableau(cards: Card[], targetPile: Card[]): boolean {
  if (cards.length === 0) return false;
  const movingCard = cards[0];

  // 空の列にはKのみ置ける
  if (targetPile.length === 0) {
    return movingCard.rank === 13;
  }

  const targetCard = targetPile[targetPile.length - 1];
  // 対象カードが裏向きなら不可
  if (!targetCard.faceUp) return false;
  // 反対色で1つ小さいランク
  return isOppositeColor(movingCard, targetCard) && movingCard.rank === targetCard.rank - 1;
}

/** ファウンデーションへの移動が有効か */
export function canMoveToFoundation(card: Card, foundationPile: Card[]): boolean {
  // 空のファウンデーションにはAのみ
  if (foundationPile.length === 0) {
    return card.rank === 1;
  }

  const topCard = foundationPile[foundationPile.length - 1];
  // 同じスートで1つ大きいランク
  return card.suit === topCard.suit && card.rank === topCard.rank + 1;
}

/** タブローにカードを移動 */
export function moveToTableau(
  state: GameState,
  source: DragSource,
  targetPileIndex: number
): GameState | null {
  const targetPile = state.tableau[targetPileIndex];
  if (!canMoveToTableau(source.cards, targetPile)) {
    return null;
  }

  const newState = JSON.parse(JSON.stringify(state)) as GameState;

  // ソースからカードを削除
  if (source.type === "tableau" && source.pileIndex !== undefined && source.cardIndex !== undefined) {
    const sourcePile = newState.tableau[source.pileIndex];
    sourcePile.splice(source.cardIndex);
    // 残りのカードがあれば一番上を表に
    if (sourcePile.length > 0) {
      sourcePile[sourcePile.length - 1].faceUp = true;
    }
  } else if (source.type === "waste" && newState.waste.length > 0) {
    newState.waste.pop();
  } else if (source.type === "foundation") {
    const suit = source.cards[0].suit;
    newState.foundation[suit].pop();
  }

  // ターゲットにカードを追加
  source.cards.forEach((card) => {
    newState.tableau[targetPileIndex].push({ ...card, faceUp: true });
  });

  newState.moves++;
  return newState;
}

/** ファウンデーションにカードを移動 */
export function moveToFoundation(
  state: GameState,
  source: DragSource,
  targetSuit: Suit
): GameState | null {
  // 1枚のみ移動可能
  if (source.cards.length !== 1) return null;

  const card = source.cards[0];
  if (card.suit !== targetSuit) return null;
  if (!canMoveToFoundation(card, state.foundation[targetSuit])) return null;

  const newState = JSON.parse(JSON.stringify(state)) as GameState;

  // ソースからカードを削除
  if (source.type === "tableau" && source.pileIndex !== undefined && source.cardIndex !== undefined) {
    const sourcePile = newState.tableau[source.pileIndex];
    sourcePile.splice(source.cardIndex);
    if (sourcePile.length > 0) {
      sourcePile[sourcePile.length - 1].faceUp = true;
    }
  } else if (source.type === "waste" && newState.waste.length > 0) {
    newState.waste.pop();
  }

  // ファウンデーションに追加
  newState.foundation[targetSuit].push({ ...card, faceUp: true });
  newState.moves++;

  return newState;
}

/** ストックからウェストにカードをめくる */
export function drawFromStock(state: GameState): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;

  if (newState.stock.length === 0) {
    // ストックが空ならウェストをリセット
    newState.stock = newState.waste.reverse().map((c) => ({ ...c, faceUp: false }));
    newState.waste = [];
  } else {
    // 1枚めくる
    const card = newState.stock.pop()!;
    card.faceUp = true;
    newState.waste.push(card);
  }

  return newState;
}

/** 勝利判定 */
export function checkWin(state: GameState): boolean {
  return Object.values(state.foundation).every((pile) => pile.length === 13);
}

/** カードをダブルクリックで自動移動（ファウンデーションへ） */
export function autoMoveToFoundation(state: GameState, card: Card, source: DragSource): GameState | null {
  const suit = card.suit;
  if (canMoveToFoundation(card, state.foundation[suit])) {
    return moveToFoundation(state, source, suit);
  }
  return null;
}