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
  const pendingOperation = useRef<"write" | "delete" | null>(null);
  const [saveError, setSaveError] = useState(false);

  const retry = useCallback((): boolean => {
    if (pendingOperation.current === null) return true;
    try {
      if (pendingOperation.current === "delete") localStorage.removeItem(key);
      else localStorage.setItem(key, String(bestRef.current));
      pendingOperation.current = null;
      setSaveError(false);
      return true;
    } catch {
      setSaveError(true);
      return false;
    }
  }, [key]);

  const update = useCallback(
    (score: number): boolean => {
      if (!Number.isSafeInteger(score) || score < 0) return false;
      if (score <= bestRef.current) {
        if (pendingOperation.current === "write") retry();
        return false;
      }
      bestRef.current = score;
      setBest(score);
      pendingOperation.current = "write";
      retry();
      return true;
    },
    [retry],
  );

  const reset = useCallback(() => {
    bestRef.current = 0;
    setBest(0);
    pendingOperation.current = "delete";
    retry();
  }, [retry]);

  return { best, update, reset, saveError, retry };
}
