import { useState, useCallback, useRef } from "react";

/**
 * ハイスコア管理フック
 * localStorage キーは "kihamda_{gameId}_hiscore" に統一
 */
export function useHighScore(gameId: string) {
  const key = `kihamda_${gameId}_hiscore`;

  const read = useCallback(() => {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return { score: 0, error: null };
      const score = Number(value);
      return value.trim() !== "" && Number.isSafeInteger(score) && score >= 0
        ? { score, error: null }
        : { score: 0, error: "invalid" as const };
    } catch {
      return { score: 0, error: "unavailable" as const };
    }
  }, [key]);
  const [initial] = useState(read);
  const [best, setBest] = useState(initial.score);
  const [readError, setReadError] = useState(initial.error);
  const readErrorRef = useRef(initial.error);

  const bestRef = useRef(best);
  const lastReadBestRef = useRef(initial.score);
  const pendingOperation = useRef<"write" | "delete" | null>(null);
  const [saveError, setSaveError] = useState(false);

  const retry = useCallback((): boolean => {
    if (readErrorRef.current !== null || pendingOperation.current === "write") {
      const result = read();
      readErrorRef.current = result.error;
      setReadError(result.error);
      if (result.error !== null) {
        if (pendingOperation.current !== null) setSaveError(true);
        return false;
      }
      lastReadBestRef.current = result.score;
      if (pendingOperation.current !== "delete") {
        bestRef.current = Math.max(bestRef.current, result.score);
        setBest(bestRef.current);
      }
    }
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
  }, [key, read]);

  const update = useCallback(
    (score: number): boolean => {
      if (!Number.isSafeInteger(score) || score < 0) return false;
      if (score <= bestRef.current) {
        if (pendingOperation.current === "write") retry();
        return false;
      }
      const historyUnverified = readErrorRef.current !== null;
      bestRef.current = score;
      setBest(score);
      pendingOperation.current = "write";
      retry();
      return !historyUnverified && readErrorRef.current === null && score > lastReadBestRef.current;
    },
    [retry],
  );

  const reset = useCallback(() => {
    bestRef.current = 0;
    setBest(0);
    pendingOperation.current = "delete";
    retry();
  }, [retry]);

  return { best, update, reset, saveError, retry, readError };
}
