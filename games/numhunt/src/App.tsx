import { useState, useEffect, useRef, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "ready" | "playing" | "cleared";

// ─── Constants ────────────────────────────────────────────────────────────────
const GRID_SIZE = 5;
const TOTAL_NUMBERS = GRID_SIZE * GRID_SIZE; // 25

const STORAGE_KEY = "numhunt_best_time";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function loadBestTime(): number | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveBestTime(ms: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(ms));
  } catch {
    // ignore
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function App() {
  // Game state
  const [phase, setPhase] = useState<Phase>("ready");
  const [grid, setGrid] = useState<number[]>(() =>
    shuffle(Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1))
  );
  const [nextTarget, setNextTarget] = useState(1);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [wrongCell, setWrongCell] = useState<number | null>(null);

  // Timer
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  // Best time
  const [bestTime, setBestTime] = useState<number | null>(loadBestTime);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Timer loop
  const stopTimer = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now();
    const tick = () => {
      setElapsedMs(performance.now() - startTimeRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopTimer(), [stopTimer]);

  // Start game
  const handleStart = useCallback(() => {
    const shuffled = shuffle(
      Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1)
    );
    setGrid(shuffled);
    setNextTarget(1);
    setFound(new Set());
    setWrongCell(null);
    setElapsedMs(0);
    setIsNewRecord(false);
    setPhase("playing");
    startTimer();
  }, [startTimer]);

  // Handle cell tap
  const handleCellClick = useCallback(
    (num: number) => {
      if (phase !== "playing") return;
      if (found.has(num)) return;

      if (num === nextTarget) {
        // Correct!
        const newFound = new Set(found);
        newFound.add(num);
        setFound(newFound);
        setWrongCell(null);

        if (num === TOTAL_NUMBERS) {
          // Cleared!
          stopTimer();
          const finalTime = performance.now() - startTimeRef.current;
          setElapsedMs(finalTime);
          setPhase("cleared");

          // Check for new record
          if (bestTime === null || finalTime < bestTime) {
            setBestTime(finalTime);
            saveBestTime(finalTime);
            setIsNewRecord(true);
          }
        } else {
          setNextTarget(num + 1);
        }
      } else {
        // Wrong
        setWrongCell(num);
        setTimeout(() => setWrongCell(null), 300);
      }
    },
    [phase, found, nextTarget, stopTimer, bestTime]
  );

  return (
    <GameShell gameId="numhunt" layout="default">
      <div className="numhunt" style={{ width: 800, height: 600 }}>
        {/* Header */}
        <header className="numhunt__header">
          <h1 className="numhunt__title">数字探し</h1>
          <div className="numhunt__timer">{formatTime(elapsedMs)}</div>
          {bestTime !== null && (
            <div className="numhunt__best">ベスト: {formatTime(bestTime)}</div>
          )}
        </header>

        {/* Status */}
        <div className="numhunt__status">
          {phase === "ready" && (
            <p className="numhunt__instruction">
              1から25までの数字を順番にタップしよう！
            </p>
          )}
          {phase === "playing" && (
            <p className="numhunt__target">
              次: <span className="numhunt__target-num">{nextTarget}</span>
              <span className="numhunt__progress">
                ({nextTarget - 1}/{TOTAL_NUMBERS})
              </span>
            </p>
          )}
          {phase === "cleared" && (
            <div className="numhunt__result">
              <p className="numhunt__clear">🎉 クリア！</p>
              {isNewRecord && (
                <p className="numhunt__record">✨ 新記録！ ✨</p>
              )}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="numhunt__grid">
          {grid.map((num) => {
            const isFound = found.has(num);
            const isWrong = wrongCell === num;
            return (
              <button
                key={num}
                type="button"
                className={`numhunt__cell${isFound ? " numhunt__cell--found" : ""}${isWrong ? " numhunt__cell--wrong" : ""}`}
                onClick={() => handleCellClick(num)}
                disabled={phase !== "playing" || isFound}
                aria-label={`数字 ${num}`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="numhunt__controls">
          {phase !== "playing" && (
            <button
              type="button"
              className="numhunt__btn"
              onClick={handleStart}
            >
              {phase === "cleared" ? "もう一度" : "スタート"}
            </button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
