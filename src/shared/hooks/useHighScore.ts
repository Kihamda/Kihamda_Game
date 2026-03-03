import { useState, useCallback } from "react";

/**
 * ハイスコア管理フック
 * localStorage キーは "kihamda_{gameId}_hiscore" に統一
 */
export function useHighScore(gameId: string) {
  const key = `kihamda_${gameId}_hiscore`;

  const [best, setBest] = useState<number>(() => {
    try {
      const v = localStorage.getItem(key);
      return v ? Number(v) : 0;
    } catch {
      return 0;
    }
  });

  const update = useCallback(
    (score: number): boolean => {
      if (score <= best) return false;
      setBest(score);
      try {
        localStorage.setItem(key, String(score));
      } catch {
        /* storage full or unavailable */
      }
      return true;
    },
    [best, key],
  );

  const reset = useCallback(() => {
    setBest(0);
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  return { best, update, reset };
}
