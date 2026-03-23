import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScreenShake,
  ScorePopup,
} from "../../../src/shared";
import type { ScreenShakeHandle, PopupVariant } from "../../../src/shared";
import type { GameState, LetterResult, LetterState } from "./lib/types";

// ─── ScorePopup Types ──────────────────────────────────────────────────────────

interface PopupData {
  text: string;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}
import {
  createInitialState,
  startGame,
  addLetter,
  removeLetter,
  submitGuess,
} from "./lib/wordguess";
import { KEYBOARD_ROWS, MAX_ATTEMPTS, WORD_LENGTH } from "./lib/constants";

// ─── Start Screen ──────────────────────────────────────────────────────────────

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="start-screen">
      <h1>🔤 Word Guess</h1>
      <p className="subtitle">5文字の英単語を当てよう！</p>

      <div className="rules">
        <h3>📖 遊び方</h3>
        <ul>
          <li>5文字の英単語を入力して推測</li>
          <li>
            <span className="color-hint correct">緑</span> =
            正しい位置に正しい文字
          </li>
          <li>
            <span className="color-hint present">黄</span> =
            単語に含まれるが位置が違う
          </li>
          <li>
            <span className="color-hint absent">灰</span> = 単語に含まれない
          </li>
          <li>6回以内に正解を目指そう！</li>
        </ul>
      </div>

      <button className="start-btn" onClick={onStart}>
        スタート
      </button>
    </div>
  );
}

// ─── Game Board ────────────────────────────────────────────────────────────────

interface TileProps {
  letter: string;
  state: LetterState;
  delay: number;
  onReveal?: (state: LetterState) => void;
}

function Tile({ letter, state, delay, onReveal }: TileProps) {
  const tileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === "empty") {
      return;
    }

    const timer = setTimeout(() => {
      onReveal?.(state);
    }, delay);

    return () => clearTimeout(timer);
  }, [state, delay, onReveal]);

  const tileClass = "tile";

  return (
    <div ref={tileRef} className={tileClass} data-state={state}>
      {letter}
    </div>
  );
}

interface GameBoardProps {
  attempts: LetterResult[][];
  currentAttempt: string;
  currentRow: number;
  onTileReveal: (row: number, col: number, state: LetterState) => void;
}

function GameBoard({
  attempts,
  currentAttempt,
  currentRow,
  onTileReveal,
}: GameBoardProps) {
  const rows = [];

  for (let row = 0; row < MAX_ATTEMPTS; row++) {
    const tiles = [];

    for (let col = 0; col < WORD_LENGTH; col++) {
      let letter = "";
      let state: LetterState = "empty";

      if (row < attempts.length) {
        // Completed row
        letter = attempts[row][col].letter.toUpperCase();
        state = attempts[row][col].state;
      } else if (row === currentRow) {
        // Current input row
        letter = currentAttempt[col] || "";
      }

      tiles.push(
        <Tile
          key={col}
          letter={letter}
          state={state}
          delay={col * 200}
          onReveal={
            row === attempts.length - 1
              ? (s) => onTileReveal(row, col, s)
              : undefined
          }
        />
      );
    }

    rows.push(
      <div key={row} className="board-row">
        {tiles}
      </div>
    );
  }

  return <div className="game-board">{rows}</div>;
}

// ─── Keyboard ──────────────────────────────────────────────────────────────────

interface KeyboardProps {
  keyboardState: Record<string, LetterState>;
  onKey: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}

function Keyboard({ keyboardState, onKey, onEnter, onBackspace }: KeyboardProps) {
  return (
    <div className="keyboard">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {rowIndex === 2 && (
            <button className="key key-wide" onClick={onEnter}>
              ENTER
            </button>
          )}
          {row.map((letter) => (
            <button
              key={letter}
              className={`key key-bounce ${keyboardState[letter] || ""}`}
              data-state={keyboardState[letter] || "unused"}
              onClick={() => onKey(letter)}
            >
              {letter}
            </button>
          ))}
          {rowIndex === 2 && (
            <button className="key key-wide" onClick={onBackspace}>
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Result Screen ─────────────────────────────────────────────────────────────

interface ResultScreenProps {
  won: boolean;
  targetWord: string;
  attempts: number;
  stats: GameStats;
  onRetry: () => void;
  onHome: () => void;
}

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
}

function ResultScreen({
  won,
  targetWord,
  attempts,
  stats,
  onRetry,
  onHome,
}: ResultScreenProps) {
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  return (
    <div className="result-screen">
      <h2>{won ? "🎉 素晴らしい！" : "😢 残念..."}</h2>
      {won ? (
        <p className="result-message">
          {attempts}回目で正解！
        </p>
      ) : (
        <p className="result-message">
          正解は「<strong>{targetWord.toUpperCase()}</strong>」でした
        </p>
      )}

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{stats.gamesPlayed}</div>
          <div className="stat-label">プレイ数</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{winRate}%</div>
          <div className="stat-label">勝率</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">連勝</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.maxStreak}</div>
          <div className="stat-label">最大連勝</div>
        </div>
      </div>

      <div className="result-buttons">
        <button className="retry-btn" onClick={onRetry}>
          もう一度
        </button>
        <button className="home-btn" onClick={onHome}>
          タイトルへ
        </button>
      </div>
    </div>
  );
}

// ─── Statistics Tracking ───────────────────────────────────────────────────────

function loadStats(): GameStats {
  try {
    const saved = localStorage.getItem("wordguess-stats");
    if (saved) return JSON.parse(saved) as GameStats;
  } catch {
    // ignore
  }
  return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 };
}

function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem("wordguess-stats", JSON.stringify(stats));
  } catch {
    // ignore
  }
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [stats, setStats] = useState<GameStats>(loadStats);
  const [popups, setPopups] = useState<PopupData[]>([]);
  const audio = useAudio();
  const { particles, confetti, sparkle } = useParticles();
  const shakeRef = useRef<ScreenShakeHandle>(null);

  // Helper to update stats
  const updateStats = useCallback((won: boolean) => {
    setStats((prev) => {
      const newStats: GameStats = {
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: won ? prev.gamesWon + 1 : prev.gamesWon,
        currentStreak: won ? prev.currentStreak + 1 : 0,
        maxStreak: won
          ? Math.max(prev.maxStreak, prev.currentStreak + 1)
          : prev.maxStreak,
      };
      saveStats(newStats);
      return newStats;
    });
  }, []);

  // Add popup helper
  const addPopup = useCallback(
    (
      text: string,
      x: string,
      y: string,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md"
    ) => {
      const popup: PopupData = {
        text,
        key: Date.now() + Math.random(),
        x,
        y,
        variant,
        size,
      };
      setPopups((prev) => [...prev, popup]);

      // Auto-remove after animation
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.key !== popup.key));
      }, 1500);
    },
    []
  );

  // Handle tile reveal effects with ScorePopup
  const handleTileReveal = useCallback(
    (row: number, col: number, letterState: LetterState) => {
      const xPercent = `${10 + col * 18}%`;
      const yPercent = `${15 + row * 12}%`;

      if (letterState === "correct") {
        // Green sparkle + sound + popup
        const board = document.querySelector(".game-board");
        if (board) {
          const rect = board.getBoundingClientRect();
          const x = rect.left + (col + 0.5) * (rect.width / WORD_LENGTH);
          const y = rect.top + (row + 0.5) * (rect.height / MAX_ATTEMPTS);
          sparkle(x, y, 10);
        }
        audio.playSuccess();
        addPopup("✓", xPercent, yPercent, "bonus", "lg");
      } else if (letterState === "present") {
        // Yellow glow sound + popup
        audio.playTone(600, 0.1, "sine", 0.15);
        addPopup("~", xPercent, yPercent, "default", "md");
      } else {
        // Absent - subtle miss sound
        audio.playTone(200, 0.08, "triangle", 0.08);
      }
    },
    [audio, sparkle, addPopup]
  );

  // Handle key input
  const handleKey = useCallback(
    (letter: string) => {
      if (state.phase !== "playing") return;
      audio.playClick();
      setState((prev) => addLetter(prev, letter));
    },
    [state.phase, audio]
  );

  const handleBackspace = useCallback(() => {
    if (state.phase !== "playing") return;
    audio.playTone(300, 0.05, "sine", 0.1);
    setState((prev) => removeLetter(prev));
  }, [state.phase, audio]);

  const handleEnter = useCallback(() => {
    if (state.phase !== "playing") return;

    setState((prev) => {
      const newState = submitGuess(prev);

      if (newState.message) {
        // Invalid input
        audio.playMiss();
        shakeRef.current?.shake("light", 200);
        return newState;
      }

      // Submitted successfully - count correct letters
      const lastAttempt = newState.attempts[newState.attempts.length - 1];
      const correctCount = lastAttempt.filter((r) => r.state === "correct").length;
      const presentCount = lastAttempt.filter((r) => r.state === "present").length;

      // Show feedback popup based on results
      if (correctCount > 0 || presentCount > 0) {
        const totalHints = correctCount * 2 + presentCount; // Correct worth more
        setTimeout(() => {
          if (totalHints >= 8) {
            addPopup("🔥 HOT!", "50%", "8%", "critical", "lg");
          } else if (totalHints >= 5) {
            addPopup("👍 GOOD!", "50%", "8%", "combo", "md");
          } else if (totalHints >= 2) {
            addPopup("💡 HINT!", "50%", "8%", "default", "sm");
          }
        }, WORD_LENGTH * 200 + 100);
      }

      const isWin = newState.phase === "won";
      const isLoss = newState.phase === "lost";

      if (isWin) {
        // Update stats on win
        updateStats(true);
        
        // Win: confetti explosion + celebration popups
        setTimeout(() => {
          confetti(80);
          audio.playCelebrate();

          // Show attempt-based celebration
          const attempts = newState.attempts.length;
          if (attempts === 1) {
            addPopup("🌟 GENIUS!", "50%", "25%", "critical", "xl");
          } else if (attempts === 2) {
            addPopup("🎯 AMAZING!", "50%", "25%", "critical", "xl");
          } else if (attempts <= 4) {
            addPopup("🎉 GREAT!", "50%", "25%", "bonus", "lg");
          } else {
            addPopup("✨ NICE!", "50%", "25%", "combo", "lg");
          }

          // Check for streak bonus
          const currentStats = loadStats();
          const newStreak = currentStats.currentStreak + 1;
          if (newStreak >= 3) {
            setTimeout(() => {
              addPopup(`🔥 ${newStreak} STREAK!`, "50%", "35%", "level", "lg");
            }, 500);
          }
        }, WORD_LENGTH * 200 + 300);
      } else if (isLoss) {
        // Update stats on loss
        updateStats(false);
        
        // Loss: screen shake
        setTimeout(() => {
          shakeRef.current?.shake("heavy", 400);
          audio.playGameOver();
          addPopup("💔 GAME OVER", "50%", "25%", "default", "lg");
        }, WORD_LENGTH * 200 + 300);
      }

      return newState;
    });
  }, [state.phase, audio, confetti, addPopup, updateStats]);

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.phase !== "playing") return;

      if (e.key === "Enter") {
        handleEnter();
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.phase, handleKey, handleBackspace, handleEnter]);

  const handleStart = useCallback(() => {
    audio.playClick();
    setState(startGame());
  }, [audio]);

  const goToStart = useCallback(() => {
    setState(createInitialState());
  }, []);

  return (
    <GameShell gameId="wordguess" layout="default">
      <ScreenShake ref={shakeRef} className="wordguess-container">
        <ParticleLayer particles={particles} />

        {/* ScorePopups */}
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

        {state.phase === "start" && <StartScreen onStart={handleStart} />}

        {state.phase === "playing" && (
          <div className="game-screen">
            {state.message && (
              <div className="message shake">{state.message}</div>
            )}
            <GameBoard
              attempts={state.attempts}
              currentAttempt={state.currentAttempt}
              currentRow={state.currentRow}
              onTileReveal={handleTileReveal}
            />
            <Keyboard
              keyboardState={state.keyboardState}
              onKey={handleKey}
              onEnter={handleEnter}
              onBackspace={handleBackspace}
            />
          </div>
        )}

        {(state.phase === "won" || state.phase === "lost") && (
          <ResultScreen
            won={state.phase === "won"}
            targetWord={state.targetWord}
            attempts={state.attempts.length}
            stats={stats}
            onRetry={handleStart}
            onHome={goToStart}
          />
        )}
      </ScreenShake>
    </GameShell>
  );
}
