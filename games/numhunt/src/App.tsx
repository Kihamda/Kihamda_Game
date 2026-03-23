import { useState, useEffect, useRef, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer, useAudio, useParticles, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import "./App.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "ready" | "playing" | "cleared";

// ─── Constants ────────────────────────────────────────────────────────────────
const GRID_SIZE = 5;
const TOTAL_NUMBERS = GRID_SIZE * GRID_SIZE; // 25

const STORAGE_KEY = "numhunt_best_time";

// Score constants
const BASE_SCORE = 10;
const SPEED_THRESHOLD_MS = 800; // Quick find threshold
const SPEED_BONUS = 5;
const STREAK_THRESHOLDS = [5, 10, 15, 20]; // Milestone streaks

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

// ─── ScorePopup Types ─────────────────────────────────────────────────────────
interface PopupState {
  text: string | null;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
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

  // Speed tracking for bonus
  const lastFindTimeRef = useRef<number>(0);

  // ScorePopup state - support multiple popups
  const [popups, setPopups] = useState<PopupState[]>([]);
  const popupKeyRef = useRef(0);

  const { playTone } = useAudio();
  const { particles, sparkle, confetti } = useParticles();

  const playCorrect = useCallback(() => {
    playTone(600, 0.05, "sine");
  }, [playTone]);

  const playWrong = useCallback(() => {
    playTone(200, 0.1, "sawtooth");
  }, [playTone]);

  const playClear = useCallback(() => {
    playTone(880, 0.3, "sine");
  }, [playTone]);

  // Add popup with auto-removal
  const addPopup = useCallback(
    (
      text: string,
      x: string,
      y: string,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md",
      duration = 1000
    ) => {
      const key = ++popupKeyRef.current;
      const popup: PopupState = { text, key, x, y, variant, size };
      setPopups((prev) => [...prev, popup]);
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.key !== key));
      }, duration);
    },
    []
  );

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
    setPopups([]);
    lastFindTimeRef.current = 0;
    setPhase("playing");
    startTimer();
  }, [startTimer]);

  // Handle cell tap
  const handleCellClick = useCallback(
    (num: number) => {
      if (phase !== "playing") return;
      if (found.has(num)) return;

      // Calculate position for particles and popups
      const idx = grid.indexOf(num);
      const col = idx % GRID_SIZE;
      const row = Math.floor(idx / GRID_SIZE);
      const x = 200 + col * 80;
      const y = 250 + row * 80;
      // Convert to percentage for popup positioning
      const popupX = `${(x / 800) * 100}%`;
      const popupY = `${(y / 600) * 100}%`;

      if (num === nextTarget) {
        // Correct!
        const newFound = new Set(found);
        newFound.add(num);
        setFound(newFound);
        setWrongCell(null);
        playCorrect();
        sparkle(x, y);

        // Calculate time since last find for speed bonus
        const now = performance.now();
        const timeSinceLastFind = lastFindTimeRef.current > 0
          ? now - lastFindTimeRef.current
          : Infinity;
        lastFindTimeRef.current = now;

        // Base score popup
        let scoreText = `+${BASE_SCORE}`;
        let variant: PopupVariant = "default";
        let size: "sm" | "md" | "lg" | "xl" = "md";

        // Speed bonus check
        const hasSpeedBonus = timeSinceLastFind < SPEED_THRESHOLD_MS && num > 1;
        if (hasSpeedBonus) {
          scoreText = `+${BASE_SCORE + SPEED_BONUS}`;
          variant = "bonus";
          // Show speed bonus indicator
          addPopup("⚡ FAST!", popupX, `${(y / 600) * 100 - 8}%`, "bonus", "sm", 800);
        }

        // Check for streak milestones
        const streakIndex = STREAK_THRESHOLDS.indexOf(num);
        if (streakIndex !== -1) {
          const streakBonus = (streakIndex + 1) * 5;
          variant = "combo";
          size = "lg";
          scoreText = `+${BASE_SCORE + (hasSpeedBonus ? SPEED_BONUS : 0) + streakBonus}`;
          // Show streak milestone
          const streakLabels = ["5連続!", "10連続!", "15連続!", "20連続!"];
          setTimeout(() => {
            addPopup(`🔥 ${streakLabels[streakIndex]}`, "50%", "30%", "combo", "lg", 1200);
          }, 200);
        }

        // Show score popup at cell position
        addPopup(scoreText, popupX, popupY, variant, size);

        if (num === TOTAL_NUMBERS) {
          // Cleared!
          stopTimer();
          const finalTime = performance.now() - startTimeRef.current;
          setElapsedMs(finalTime);
          setPhase("cleared");
          confetti();
          playClear();

          // Level completion popup
          setTimeout(() => {
            addPopup("🎉 クリア!", "50%", "35%", "level", "xl", 2000);
          }, 300);

          // Check for new record
          if (bestTime === null || finalTime < bestTime) {
            setBestTime(finalTime);
            saveBestTime(finalTime);
            setIsNewRecord(true);
            // High score celebration popup
            setTimeout(() => {
              addPopup("✨ 新記録! ✨", "50%", "50%", "critical", "xl", 2500);
            }, 800);
          }
        } else {
          setNextTarget(num + 1);
        }
      } else {
        // Wrong
        playWrong();
        setWrongCell(num);
        setTimeout(() => setWrongCell(null), 300);
      }
    },
    [phase, found, grid, nextTarget, stopTimer, bestTime, playCorrect, playWrong, playClear, sparkle, confetti, addPopup]
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
        <ParticleLayer particles={particles} />
        
        {/* Score Popups */}
        {popups.map((popup) => (
          <ScorePopup
            key={popup.key}
            text={popup.text}
            popupKey={popup.key}
            x={popup.x}
            y={popup.y}
            variant={popup.variant}
            size={popup.size}
          />
        ))}
      </div>
    </GameShell>
  );
}
