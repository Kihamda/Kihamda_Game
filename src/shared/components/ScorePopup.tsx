interface Props {
  text: string | null;
  popupKey?: number;
  x?: string;
  y?: string;
}

export function ScorePopup({
  text,
  popupKey = 0,
  x = "50%",
  y = "40%",
}: Props) {
  if (!text) return null;
  return (
    <div
      key={popupKey}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translateX(-50%)",
        fontSize: 24,
        fontWeight: 900,
        color: "var(--score-color)",
        textShadow: "0 0 8px rgba(255, 229, 102, 0.8)",
        pointerEvents: "none",
        animation: "score-popup 800ms ease-out forwards",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}
