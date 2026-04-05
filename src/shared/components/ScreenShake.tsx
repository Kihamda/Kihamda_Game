import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { ReactNode, CSSProperties } from "react";

export type ShakeIntensity = "light" | "medium" | "heavy" | "extreme";

export interface ScreenShakeHandle {
  shake: (intensity?: ShakeIntensity, duration?: number) => void;
}

interface Props {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const intensityConfig: Record<
  ShakeIntensity,
  { maxOffset: number; maxRotation: number }
> = {
  light: { maxOffset: 3, maxRotation: 0.5 },
  medium: { maxOffset: 6, maxRotation: 1.5 },
  heavy: { maxOffset: 12, maxRotation: 3 },
  extreme: { maxOffset: 20, maxRotation: 5 },
};

export const ScreenShake = forwardRef<ScreenShakeHandle, Props>(
  function ScreenShake({ children, style, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);

    const shake = useCallback(
      (intensity: ShakeIntensity = "medium", duration = 300) => {
        const el = containerRef.current;
        if (!el) return;

        // 既存のアニメーションをキャンセル
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
        }

        const config = intensityConfig[intensity];
        const startTime = performance.now();

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // 減衰係数 (開始時は強く、終了時は弱く)
          const decay = 1 - progress;

          // ランダムなオフセットと回転
          const offsetX =
            (Math.random() - 0.5) * 2 * config.maxOffset * decay;
          const offsetY =
            (Math.random() - 0.5) * 2 * config.maxOffset * decay;
          const rotation =
            (Math.random() - 0.5) * 2 * config.maxRotation * decay;

          el.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`;

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            el.style.transform = "";
            animationRef.current = null;
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      },
      [],
    );

    useImperativeHandle(ref, () => ({ shake }), [shake]);

    // クリーンアップ
    useEffect(() => {
      return () => {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          ...style,
          willChange: "transform",
        }}
      >
        {children}
      </div>
    );
  },
);