export type PopupVariant = "default" | "combo" | "bonus" | "critical" | "level";

interface Props {
  text: string | null;
  popupKey?: number;
  x?: string;
  y?: string;
  variant?: PopupVariant;
  size?: "sm" | "md" | "lg" | "xl";
}

const variantStyles: Record<
  PopupVariant,
  { color: string; glow: string; animation: string }
> = {
  default: {
    color: "var(--score-color)",
    glow: "0 0 8px rgba(255, 229, 102, 0.8)",
    animation: "score-popup 800ms ease-out forwards",
  },
  combo: {
    color: "#ff6b6b",
    glow: "0 0 12px rgba(255, 107, 107, 0.9), 0 0 24px rgba(255, 107, 107, 0.5)",
    animation: "score-popup-bounce 900ms ease-out forwards",
  },
  bonus: {
    color: "#48dbfb",
    glow: "0 0 16px rgba(72, 219, 251, 0.9), 0 0 32px rgba(72, 219, 251, 0.5)",
    animation: "score-popup-glow 1000ms ease-out forwards",
  },
  critical: {
    color: "#ff9ff3",
    glow: "0 0 20px rgba(255, 159, 243, 1), 0 0 40px rgba(255, 159, 243, 0.6)",
    animation: "score-popup-critical 1200ms ease-out forwards",
  },
  level: {
    color: "#1dd1a1",
    glow: "0 0 24px rgba(29, 209, 161, 1), 0 0 48px rgba(29, 209, 161, 0.7)",
    animation: "score-popup-level 1500ms ease-out forwards",
  },
};

const sizeMap: Record<string, number> = {
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
};

export function ScorePopup({
  text,
  popupKey = 0,
  x = "50%",
  y = "40%",
  variant = "default",
  size = "md",
}: Props) {
  if (!text) return null;
  const style = variantStyles[variant];
  return (
    <div
      key={popupKey}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translateX(-50%)",
        fontSize: sizeMap[size],
        fontWeight: 900,
        color: style.color,
        textShadow: style.glow,
        pointerEvents: "none",
        animation: style.animation,
        whiteSpace: "nowrap",
        zIndex: 110,
        letterSpacing: variant === "critical" ? "2px" : "0",
      }}
    >
      {text}
    </div>
  );
}
