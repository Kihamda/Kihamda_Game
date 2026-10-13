import { useState, useCallback, useRef } from "react";

/**
 * ハイスコア管理フック
 * localStorage キーは "kihamda_{gameId}_hiscore" に統一
 */
export function useHighScore(gameId: string) {
  const key = `kihamda_${gameId}_hiscore`;

  const [best, setBest] = useState<number>(() => {
    try {
      const v = localStorage.getItem(key);
      const score = v ? Number(v) : 0;
      return Number.isSafeInteger(score) && score >= 0 ? score : 0;
    } catch {
      return 0;
    }
  });

  const bestRef = useRef(best);
  const [saveError, setSaveError] = useState(false);

  const update = useCallback(
    (score: number): boolean => {
      if (!Number.isSafeInteger(score) || score < 0 || score <= bestRef.current) return false;
      bestRef.current = score;
      setBest(score);
      try {
        localStorage.setItem(key, String(score));
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
      return true;
    },
    [key],
  );

  const reset = useCallback(() => {
    bestRef.current = 0;
    setBest(0);
    try {
      localStorage.removeItem(key);
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [key]);

  return { best, update, reset, saveError };
}
