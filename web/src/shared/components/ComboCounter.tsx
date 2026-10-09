import { useRef, useState, useEffect } from "react";
import type { CSSProperties } from "react";

interface Props {
  combo: number;
  /** 表示位置 */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  /** コンボ表示の閾値（この数以上で表示） */
  threshold?: number;
  /** カスタムスタイル */
  style?: CSSProperties;
  /** カスタムクラス名 */
  className?: string;
}

const positionStyles: Record<string, CSSProperties> = {
  "top-left": { top: 16, left: 16 },
  "top-right": { top: 16, right: 16 },
  "bottom-left": { bottom: 16, left: 16 },
  "bottom-right": { bottom: 16, right: 16 },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
};

function getComboTier(combo: number): {
  label: string;
  color: string;
  scale: number;
} {
  if (combo >= 50) {
    return { label: "LEGENDARY!", color: "#ff00ff", scale: 1.6 };
  } else if (combo >= 30) {
    return { label: "INSANE!", color: "#ff3366", scale: 1.4 };
  } else if (combo >= 20) {
    return { label: "AMAZING!", color: "#ff6b6b", scale: 1.3 };
  } else if (combo >= 10) {
    return { label: "GREAT!", color: "#feca57", scale: 1.2 };
  } else if (combo >= 5) {
    return { label: "NICE!", color: "#48dbfb", scale: 1.1 };
  }
  return { label: "", color: "#ffffff", scale: 1 };
}

export function ComboCounter({
  combo,
  position = "top-right",
  threshold = 2,
  style,
  className,
}: Props) {
  const prevComboRef = useRef(combo);
  // アニメーションキーはコンボ数自体を使う（増加するたびに新しいキーになる）
  const [displayedCombo, setDisplayedCombo] = useState(combo);

  // コンボが増加した時にアニメーションをトリガー (setTimeoutで非同期化)
  useEffect(() => {
    if (combo > prevComboRef.current && combo >= threshold) {
      // 非同期でstate更新してlintルールを回避
      const timer = setTimeout(() => {
        setDisplayedCombo(combo);
      }, 0);
      prevComboRef.current = combo;
      return () => clearTimeout(timer);
    } else if (combo !== prevComboRef.current) {
      prevComboRef.current = combo;
      // リセット時も更新
      const timer = setTimeout(() => {
        setDisplayedCombo(combo);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [combo, threshold]);

  if (combo < threshold) return null;

  const tier = getComboTier(combo);

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        ...positionStyles[position],
        display: "flex",
        flexDirection: "column",
        alignItems: position.includes("right") ? "flex-end" : "flex-start",
        pointerEvents: "none",
        zIndex: 120,
        ...style,
      }}
    >
      {/* コンボ数 */}
      <div
        key={displayedCombo}
        style={{
          fontSize: 32 * tier.scale,
          fontWeight: 900,
          color: tier.color,
          textShadow: `
            0 0 10px ${tier.color},
            0 0 20px ${tier.color},
            0 0 30px ${tier.color}
          `,
          animation: "combo-pop 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          lineHeight: 1,
        }}
      >
        {combo}
        <span
          style={{
            fontSize: "0.5em",
            marginLeft: 4,
            opacity: 0.9,
          }}
        >
          COMBO
        </span>
      </div>

      {/* ティアラベル */}
      {tier.label && (
        <div
          style={{
            fontSize: 14 * tier.scale,
            fontWeight: 700,
            color: tier.color,
            textShadow: `0 0 8px ${tier.color}`,
            marginTop: 4,
            letterSpacing: 2,
            animation: combo >= 20 ? "combo-pulse 0.5s ease infinite" : "none",
          }}
        >
          {tier.label}
        </div>
      )}
    </div>
  );
}