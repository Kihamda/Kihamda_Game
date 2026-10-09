import { useCallback } from "react";
import type { GameState, Suit, DragSource, Card } from "../lib/types";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  CARD_HEIGHT,
  CARD_OVERLAP_FACE_DOWN,
  CARD_OVERLAP_FACE_UP,
  SUIT_SYMBOLS,
} from "../lib/constants";
import { CardView } from "./CardView";

interface GameBoardProps {
  state: GameState;
  onDraw: () => void;
  onDrop: (source: DragSource, targetType: "tableau" | "foundation", targetIndex: number | Suit) => void;
  onAutoMove: (card: Card, source: DragSource) => void;
}

const SUITS_ORDER: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export function GameBoard({ state, onDraw, onDrop, onAutoMove }: GameBoardProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent, source: DragSource) => {
      e.dataTransfer.setData("application/json", JSON.stringify(source));
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleTableauDrop = useCallback(
    (e: React.DragEvent, pileIndex: number) => {
      e.preventDefault();
      try {
        const source = JSON.parse(e.dataTransfer.getData("application/json")) as DragSource;
        onDrop(source, "tableau", pileIndex);
      } catch {
        // ignore parse error
      }
    },
    [onDrop]
  );

  const handleFoundationDrop = useCallback(
    (e: React.DragEvent, suit: Suit) => {
      e.preventDefault();
      try {
        const source = JSON.parse(e.dataTransfer.getData("application/json")) as DragSource;
        onDrop(source, "foundation", suit);
      } catch {
        // ignore parse error
      }
    },
    [onDrop]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const renderTableau = () => {
    return state.tableau.map((pile, pileIndex) => {
      const pileHeight =
        CARD_HEIGHT +
        pile.reduce((acc, _card, i) => {
          if (i === 0) return acc;
          return acc + (pile[i - 1].faceUp ? CARD_OVERLAP_FACE_UP : CARD_OVERLAP_FACE_DOWN);
        }, 0);

      return (
        <div
          key={pileIndex}
          className="sol-tableau-pile"
          style={{ height: Math.max(pileHeight, CARD_HEIGHT + 20) }}
          onDrop={(e) => handleTableauDrop(e, pileIndex)}
          onDragOver={handleDragOver}
        >
          {pile.length === 0 ? (
            <CardView card={null} isPlaceholder />
          ) : (
            pile.map((card, cardIndex) => {
              const top = pile
                .slice(0, cardIndex)
                .reduce(
                  (acc, c) => acc + (c.faceUp ? CARD_OVERLAP_FACE_UP : CARD_OVERLAP_FACE_DOWN),
                  0
                );
              const isDraggable = card.faceUp;
              const cardsToMove = pile.slice(cardIndex);

              return (
                <CardView
                  key={card.id}
                  card={card}
                  style={{ position: "absolute", top, left: 0, zIndex: cardIndex }}
                  draggable={isDraggable}
                  onDragStart={(e) =>
                    handleDragStart(e, {
                      type: "tableau",
                      pileIndex,
                      cardIndex,
                      cards: cardsToMove,
                    })
                  }
                  onDoubleClick={() => {
                    if (card.faceUp && cardIndex === pile.length - 1) {
                      onAutoMove(card, {
                        type: "tableau",
                        pileIndex,
                        cardIndex,
                        cards: [card],
                      });
                    }
                  }}
                />
              );
            })
          )}
        </div>
      );
    });
  };

  const renderFoundation = () => {
    return SUITS_ORDER.map((suit) => {
      const pile = state.foundation[suit];
      const topCard = pile.length > 0 ? pile[pile.length - 1] : null;

      return (
        <div
          key={suit}
          className="sol-foundation-pile"
          onDrop={(e) => handleFoundationDrop(e, suit)}
          onDragOver={handleDragOver}
        >
          {topCard ? (
            <CardView
              card={topCard}
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: "foundation",
                  cards: [topCard],
                })
              }
            />
          ) : (
            <div className="sol-foundation-placeholder">
              <span className="sol-foundation-suit">{SUIT_SYMBOLS[suit]}</span>
            </div>
          )}
        </div>
      );
    });
  };

  const renderStock = () => {
    const hasStock = state.stock.length > 0;

    return (
      <div className="sol-stock" onClick={onDraw}>
        {hasStock ? (
          <CardView card={{ id: "stock", suit: "spades", rank: 1, faceUp: false }} />
        ) : (
          <CardView card={null} isPlaceholder isStock />
        )}
        <span className="sol-stock-count">{state.stock.length}</span>
      </div>
    );
  };

  const renderWaste = () => {
    const topCard = state.waste.length > 0 ? state.waste[state.waste.length - 1] : null;

    return (
      <div className="sol-waste">
        {topCard ? (
          <CardView
            card={topCard}
            draggable
            onDragStart={(e) =>
              handleDragStart(e, {
                type: "waste",
                cards: [topCard],
              })
            }
            onDoubleClick={() => {
              onAutoMove(topCard, {
                type: "waste",
                cards: [topCard],
              });
            }}
          />
        ) : (
          <CardView card={null} isPlaceholder />
        )}
      </div>
    );
  };

  return (
    <div className="sol-board" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
      <div className="sol-top-row">
        <div className="sol-stock-waste">
          {renderStock()}
          {renderWaste()}
        </div>
        <div className="sol-foundation-row">{renderFoundation()}</div>
      </div>
      <div className="sol-tableau-row">{renderTableau()}</div>
      <div className="sol-moves">移動回数: {state.moves}</div>
    </div>
  );
}