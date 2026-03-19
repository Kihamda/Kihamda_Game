import { useState, useEffect, useRef, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

// --- Types ---
type Phase = "ready" | "playing" | "cleared" | "timeout";

// --- Constants ---
const GRID_SIZE = 8;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE; // 64
const TIME_LIMIT_MS = 30000; // 30秒

const EMOJIS = [
  "🎮", "🎯", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹",
  "🎸", "🎺", "🎷", "🎻", "🪗", "🥁", "🎲", "🎰", "🎳", "🏆",
  "🏅", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐",
  "🏉", "🎱", "🏓", "🏸", "🥊", "🥋", "⛳", "⛸️", "🎿", "🛷",
  "🚴", "🏄", "🏊", "🤿", "🧗", "🪂", "🏋️", "🤸", "🦁", "🐯",
  "🐻", "🐼", "🐨", "🐵", "🦊", "🐱", "🐶", "🐺", "🐗", "🐴",
  "🦄", "🐝", "🦋", "🐌", "🐛", "🦗", "🐞", "🐜", "🕷️", "🦂",
  "🐢", "🐍", "🦎", "🐙", "🦑", "🦐", "🦀", "🐡", "🐠", "🐟",
  "🐬", "🐳", "🐋", "🦈", "🦭", "🐊", "🐆", "🐅", "🦓", "🦍",
  "🦧", "🐘", "🦛", "🦏", "🐪", "��", "🦒", "🦘", "🦬", "🐃",
  "🐂", "🐄", "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐",
  "🍒", "🍑", "🥭", "🍍", "🥝", "🍅", "🥑", "🥦", "🥬", "🥒",
  "🌽", "🥕", "🧄", "🧅", "🥔", "🍠",
];

const STORAGE_KEY = "emojimatch_best_score";

// --- Helpers ---
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, count);
}

function generateGrid(targetEmoji: string): string[] {
  const otherEmojis = EMOJIS.filter((e) => e !== targetEmoji);
  const distractors = pickRandom(otherEmojis, TOTAL_CELLS - 1);
  const grid = shuffle([targetEmoji, ...distractors]);
  return grid;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function loadBestScore(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  } catch {
    // ignore
  }
  return 0;
}

function saveBestScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // ignore
  }
}

// --- Component ---
export default function App() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [targetEmoji, setTargetEmoji] = useState(() => pickRandom(EMOJIS, 1)[0]);
  const [grid, setGrid] = useState<string[]>(() => generateGrid(targetEmoji));
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [foundCell, setFoundCell] = useState<number | null>(null);

  const [remainingMs, setRemainingMs] = useState(TIME_LIMIT_MS);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const [bestScore, setBestScore] = useState<number>(loadBestScore);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const stopTimer = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  // Update refs in effect (not during render)
  const bestScoreRef = useRef(bestScore);
  const scoreRef = useRef(score);
  useEffect(() => {
    bestScoreRef.current = bestScore;
    scoreRef.current = score;
  }, [bestScore, score]);

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, TIME_LIMIT_MS - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        stopTimer();
        setPhase("timeout");
        // Check for new record on timeout
        if (scoreRef.current > bestScoreRef.current) {
          setBestScore(scoreRef.current);
          saveBestScore(scoreRef.current);
          setIsNewRecord(true);
        }
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const handleStart = useCallback(() => {
    const newTarget = pickRandom(EMOJIS, 1)[0];
    setTargetEmoji(newTarget);
    setGrid(generateGrid(newTarget));
    setLevel(1);
    setScore(0);
    setWrongCell(null);
    setFoundCell(null);
    setRemainingMs(TIME_LIMIT_MS);
    setIsNewRecord(false);
    setPhase("playing");
    startTimer();
  }, [startTimer]);

  const nextLevel = useCallback(() => {
    const newTarget = pickRandom(EMOJIS, 1)[0];
    setTargetEmoji(newTarget);
    setGrid(generateGrid(newTarget));
    setFoundCell(null);
    setWrongCell(null);
    setLevel((l) => l + 1);
    startTimeRef.current = performance.now();
    setRemainingMs(TIME_LIMIT_MS);
  }, []);

  const handleCellClick = useCallback(
    (index: number) => {
      if (phase !== "playing") return;
      if (foundCell !== null) return;

      const clickedEmoji = grid[index];

      if (clickedEmoji === targetEmoji) {
        stopTimer();
        setFoundCell(index);
        const timeBonus = Math.floor(remainingMs / 100);
        const levelBonus = level * 10;
        const newScore = score + timeBonus + levelBonus;
        setScore(newScore);

        setTimeout(() => {
          if (newScore > bestScore) {
            setBestScore(newScore);
            saveBestScore(newScore);
            setIsNewRecord(true);
          }
          nextLevel();
          startTimer();
        }, 800);
      } else {
        setWrongCell(index);
        const penalty = 3000;
        const newRemaining = Math.max(0, remainingMs - penalty);
        startTimeRef.current = performance.now() - (TIME_LIMIT_MS - newRemaining);
        setRemainingMs(newRemaining);
        if (newRemaining <= 0) {
          stopTimer();
          setPhase("timeout");
        }
        setTimeout(() => setWrongCell(null), 300);
      }
    },
    [phase, foundCell, grid, targetEmoji, stopTimer, remainingMs, level, score, bestScore, nextLevel, startTimer]
  );

  const timerPercent = (remainingMs / TIME_LIMIT_MS) * 100;
  const timerColor = remainingMs > 10000 ? "#22c55e" : remainingMs > 5000 ? "#eab308" : "#ef4444";

  return (
    <GameShell gameId="emojimatch" layout="default">
      <div className="emojimatch" style={{ width: 800, height: 600 }}>
        <header className="emojimatch__header">
          <h1 className="emojimatch__title">🔍 Emoji Match</h1>
          <div className="emojimatch__stats">
            <span className="emojimatch__level">Lv.{level}</span>
            <span className="emojimatch__score">Score: {score}</span>
            {bestScore > 0 && <span className="emojimatch__best">Best: {bestScore}</span>}
          </div>
        </header>

        <div className="emojimatch__timer-bar">
          <div
            className="emojimatch__timer-fill"
            style={{ width: `${timerPercent}%`, backgroundColor: timerColor }}
          />
          <span className="emojimatch__timer-text">{formatTime(remainingMs)}</span>
        </div>

        <div className="emojimatch__target-area">
          {phase === "ready" && (
            <p className="emojimatch__instruction">大量の絵文字から目的の絵文字を探そう！</p>
          )}
          {phase === "playing" && (
            <div className="emojimatch__target">
              <span className="emojimatch__target-label">探せ：</span>
              <span className="emojimatch__target-emoji">{targetEmoji}</span>
            </div>
          )}
          {phase === "timeout" && (
            <div className="emojimatch__result">
              <p className="emojimatch__gameover">⏱️ TIME UP!</p>
              {isNewRecord && <p className="emojimatch__record">✨ 新記録！ ✨</p>}
              <p className="emojimatch__final-score">最終スコア: <strong>{score}</strong></p>
            </div>
          )}
          {phase === "cleared" && (
            <div className="emojimatch__result">
              <p className="emojimatch__clear">🎉 クリア！</p>
            </div>
          )}
        </div>

        <div className="emojimatch__grid">
          {grid.map((emoji, index) => {
            const isFound = foundCell === index;
            const isWrong = wrongCell === index;
            return (
              <button
                key={index}
                type="button"
                className={`emojimatch__cell${isFound ? " emojimatch__cell--found" : ""}${isWrong ? " emojimatch__cell--wrong" : ""}`}
                onClick={() => handleCellClick(index)}
                disabled={phase !== "playing" || isFound}
                aria-label={`絵文字 ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        <div className="emojimatch__controls">
          {(phase === "ready" || phase === "timeout") && (
            <button type="button" className="emojimatch__btn" onClick={handleStart}>
              {phase === "timeout" ? "もう一度" : "スタート"}
            </button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
