import type { Card } from "../lib/types";
import { SUIT_SYMBOLS, SUIT_COLORS, RANK_LABELS, CARD_WIDTH, CARD_HEIGHT } from "../lib/constants";

interface CardViewProps {
  card: Card | null;
  style?: React.CSSProperties;
  onDragStart?: (e: React.DragEvent) => void;
  onDoubleClick?: () => void;
  draggable?: boolean;
  isPlaceholder?: boolean;
  isStock?: boolean;
}

export function CardView({
  card,
  style,
  onDragStart,
  onDoubleClick,
  draggable = false,
  isPlaceholder = false,
  isStock = false,
}: CardViewProps) {
  if (isPlaceholder) {
    return (
      <div
        className="sol-card sol-card--placeholder"
        style={{ ...style, width: CARD_WIDTH, height: CARD_HEIGHT }}
      >
        {isStock && <span className="sol-card-refresh">↻</span>}
      </div>
    );
  }

  if (!card) {
    return (
      <div
        className="sol-card sol-card--empty"
        style={{ ...style, width: CARD_WIDTH, height: CARD_HEIGHT }}
      />
    );
  }

  if (!card.faceUp) {
    return (
      <div
        className="sol-card sol-card--back"
        style={{ ...style, width: CARD_WIDTH, height: CARD_HEIGHT }}
      />
    );
  }

  const color = SUIT_COLORS[card.suit];

  return (
    <div
      className={`sol-card sol-card--face sol-card--${color}`}
      style={{ ...style, width: CARD_WIDTH, height: CARD_HEIGHT }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDoubleClick={onDoubleClick}
    >
      <span className="sol-card-corner sol-card-corner--top">
        <span className="sol-card-rank">{RANK_LABELS[card.rank]}</span>
        <span className="sol-card-suit">{SUIT_SYMBOLS[card.suit]}</span>
      </span>
      <span className="sol-card-center">{SUIT_SYMBOLS[card.suit]}</span>
      <span className="sol-card-corner sol-card-corner--bottom">
        <span className="sol-card-rank">{RANK_LABELS[card.rank]}</span>
        <span className="sol-card-suit">{SUIT_SYMBOLS[card.suit]}</span>
      </span>
    </div>
  );
}