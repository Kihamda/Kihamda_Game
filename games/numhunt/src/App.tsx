import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { useAudio, GameShell } from "../../../src/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "EASY" | "NORMAL" | "HARD" | "EXPERT";
type GameState = "idle" | "playing" | "cleared";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}

// ─── Difficulty Config ────────────────────────────────────────────────────────

interface DiffConfig {
  label: string;
  cols: number;
  total: number;
  description: string;
}

const DIFF_CONFIG: Record<Difficulty, DiffConfig> = {
  EASY: { label: "EASY", cols: 4, total: 16, description: "4×4 昇順" },
  NORMAL: { label: "NORMAL", cols: 5, total: 25, description: "5×5 昇順" },
  HARD: { label: "HARD", cols: 5, total: 25, description: "5×5 降順" },
  EXPERT: { label: "EXPERT", cols: 6, total: 36, description: "6×6 昇順" },
};

const DIFFICULTIES = Object.keys(DIFF_CONFIG) as Difficulty[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSequence(diff: Difficulty): number[] {
  const { total } = DIFF_CONFIG[diff];
  if (diff === "HARD") {
    return Array.from({ length: total }, (_v, i) => total - i);
  }
  return Array.from({ length: total }, (_v, i) => i + 1);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(ms: number): string {
  const raw = Math.max(0, ms);
  const minutes = Math.floor(raw / 60000);
  const seconds = Math.floor((raw % 60000) / 1000);
  const centis = Math.floor((raw % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const PARTICLE_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#c77dff"];

const App = () => {
  const { playTone: sharedPlayTone, playArpeggio, playMiss } = useAudio();

  const [difficulty, setDifficulty] = useState<Difficulty>("NORMAL");
  const [gameState, setGameState] = useState<GameState>("idle");
  const [grid, setGrid] = useState<number[]>([]);
  const [sequence, setSequence] = useState<number[]>([]);
  const [nextIndex, setNextIndex] = useState(0);
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [shakeNum, setShakeNum] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [bestTimes, setBestTimes] = useState<
    Partial<Record<Difficulty, number>>
  >(() => {
    try {
      const saved = localStorage.getItem("numhunt_best");
      if (saved) {
        return JSON.parse(saved) as Partial<Record<Difficulty, number>>;
      }
    } catch {
      // ignore
    }
    return {};
  });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [clearWave, setClearWave] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(true);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const startTimeRef = useRef<number>(0);
  const penaltyRef = useRef(0);
  const rafRef = useRef<number>(0);
  const particleIdRef = useRef(0);
  const waveTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const appRef = useRef<HTMLDivElement>(null);

  const stopTimer = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const startGame = useCallback(() => {
    // Clear previous wave timeouts
    waveTimeoutsRef.current.forEach(clearTimeout);
    waveTimeoutsRef.current = [];
    stopTimer();

    const { total, cols } = DIFF_CONFIG[difficulty];
    const seq = buildSequence(difficulty);
    const nums = shuffleArray(
      Array.from({ length: cols * cols }, (_v, i) => i + 1).slice(0, total),
    );

    penaltyRef.current = 0;
    setPenalty(0);
    setGrid(nums);
    setSequence(seq);
    setNextIndex(0);
    setTapped(new Set());
    setShakeNum(null);
    setIsNewRecord(false);
    setClearWave(new Set());
    setParticles([]);
    setElapsed(0);
    setGameState("playing");

    startTimeRef.current = performance.now();

    const tick = () => {
      setElapsed(
        performance.now() - startTimeRef.current + penaltyRef.current * 1000,
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [difficulty, stopTimer]);

  const addParticles = useCallback((x: number, y: number) => {
    const ps: Particle[] = Array.from({ length: 7 }, () => ({
      id: ++particleIdRef.current,
      x: x + (Math.random() - 0.5) * 50,
      y: y + (Math.random() - 0.5) * 50,
      color:
        PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]!,
    }));
    setParticles((prev) => [...prev, ...ps]);
    const ids = new Set(ps.map((p) => p.id));
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, 650);
  }, []);

  const handleTap = useCallback(
    (num: number, e: React.MouseEvent<HTMLButtonElement>) => {
      if (gameState !== "playing") return;

      const rect = e.currentTarget.getBoundingClientRect();
      const appRect = appRef.current?.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      addParticles(
        centerX - (appRect?.left ?? 0),
        centerY - (appRect?.top ?? 0),
      );

      const expected = sequence[nextIndex];
      if (num !== expected) {
        // Wrong tap
        playMiss();
        penaltyRef.current += 0.5;
        setPenalty(penaltyRef.current);
        setShakeNum(num);
        setTimeout(() => setShakeNum(null), 420);
        return;
      }

      // Correct tap
      const freq = 440 + (nextIndex / sequence.length) * 440;
      sharedPlayTone(freq, 0.1, "sine", 0.22);

      const newTapped = new Set(tapped);
      newTapped.add(num);
      setTapped(newTapped);

      const newIndex = nextIndex + 1;
      setNextIndex(newIndex);

      if (newIndex < sequence.length) return;

      // ── CLEAR ──
      stopTimer();
      const finalMs =
        performance.now() - startTimeRef.current + penaltyRef.current * 1000;
      setElapsed(finalMs);
      setGameState("cleared");
      playArpeggio([523.25, 659.25, 783.99, 1046.5], 0.28, "sine", 0.32, 0.13);

      // Wave animation: light up cells in tap order
      const orderedNums = [...newTapped]; // insertion = tap order
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      orderedNums.forEach((n, i) => {
        const t = setTimeout(() => {
          setClearWave((prev) => new Set([...prev, n]));
        }, i * 45);
        timeouts.push(t);
      });
      waveTimeoutsRef.current = timeouts;

      // Save best time
      const prev = bestTimes[difficulty];
      if (prev === undefined || finalMs < prev) {
        setIsNewRecord(true);
        const newBest = { ...bestTimes, [difficulty]: finalMs };
        setBestTimes(newBest);
        try {
          localStorage.setItem("numhunt_best", JSON.stringify(newBest));
        } catch {
          // ignore
        }
      }
    },
    [
      gameState,
      sequence,
      nextIndex,
      tapped,
      bestTimes,
      difficulty,
      addParticles,
      stopTimer,
      playMiss,
      sharedPlayTone,
      playArpeggio,
    ],
  );

  const handleChangeDifficulty = useCallback(
    (d: Difficulty) => {
      if (gameState === "playing") return;
      setDifficulty(d);
      setGameState("idle");
      setElapsed(0);
    },
    [gameState],
  );

  const handleStop = useCallback(() => {
    stopTimer();
    waveTimeoutsRef.current.forEach(clearTimeout);
    waveTimeoutsRef.current = [];
    setGameState("idle");
  }, [stopTimer]);

  // ── Derived values ──
  const { cols } = DIFF_CONFIG[difficulty];
  const currentBest = bestTimes[difficulty];
  const timeDiff =
    gameState === "playing" && currentBest !== undefined
      ? elapsed - currentBest
      : null;
  const nextNum = sequence[nextIndex];

  return (
    <GameShell title="Num Hunt" gameId="numhunt">
      <div className="numhunt-root">
        <div className="app" ref={appRef}>
          {/* Particles layer */}
          <div className="particles-layer" aria-hidden="true">
            {particles.map((p) => (
              <div
                key={p.id}
                className="particle"
                style={{ left: p.x, top: p.y, background: p.color }}
              />
            ))}
          </div>

          <h1 className="title">Num Hunt</h1>

          {/* Difficulty selector */}
          <div className="difficulty-row" role="group" aria-label="難易度選択">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={`diff-btn${difficulty === d ? " active" : ""}`}
                onClick={() => handleChangeDifficulty(d)}
                disabled={gameState === "playing"}
                aria-label={`${d}: ${DIFF_CONFIG[d].description}`}
              >
                <span className="diff-label">{d}</span>
                <span className="diff-desc">{DIFF_CONFIG[d].description}</span>
              </button>
            ))}
          </div>

          {/* Timer */}
          <div className="timer-area">
            <div
              className={`timer${gameState === "cleared" ? " timer--cleared" : ""}`}
            >
              {formatTime(elapsed)}
            </div>
            <div className="timer-sub">
              {penalty > 0 && (
                <span className="penalty">
                  ペナルティ +{penalty.toFixed(1)}s
                </span>
              )}
              {timeDiff !== null && (
                <span
                  className={`time-diff${timeDiff < 0 ? " ahead" : " behind"}`}
                >
                  ベストより {timeDiff >= 0 ? "+" : ""}
                  {(timeDiff / 1000).toFixed(2)}秒
                </span>
              )}
              {currentBest !== undefined && gameState !== "playing" && (
                <span className="best-label">
                  ベスト: {formatTime(currentBest)}
                </span>
              )}
            </div>
          </div>

          {/* Clear banner */}
          {gameState === "cleared" && (
            <div className="clear-banner">
              <div className="clear-text">CLEAR!</div>
              {isNewRecord && <div className="new-record">NEW RECORD!</div>}
            </div>
          )}

          {/* Controls */}
          <div className="controls">
            {gameState !== "playing" ? (
              <button className="start-btn" onClick={startGame}>
                {gameState === "cleared" ? "もう一度" : "スタート"}
              </button>
            ) : (
              <button className="stop-btn" onClick={handleStop}>
                やめる
              </button>
            )}
            <label className="hint-toggle">
              <input
                type="checkbox"
                checked={showHint}
                onChange={(e) => setShowHint(e.target.checked)}
              />
              次の数字を表示
            </label>
          </div>

          {/* Next hint */}
          {showHint && gameState === "playing" && nextNum !== undefined && (
            <div className="next-hint">
              次: <span className="next-num">{nextNum}</span>
              <span className="next-progress">
                {nextIndex}/{sequence.length}
              </span>
            </div>
          )}

          {/* Grid */}
          <div
            className="grid"
            style={{ "--cols": cols } as React.CSSProperties}
          >
            {grid.map((num) => {
              const isTappedPlaying =
                gameState === "playing" && tapped.has(num);
              const isWave = clearWave.has(num);
              const isShaking = shakeNum === num;
              return (
                <button
                  key={num}
                  className={[
                    "cell",
                    isTappedPlaying ? "cell--faded" : "",
                    isWave ? "cell--wave" : "",
                    isShaking ? "cell--shake" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={(e) => handleTap(num, e)}
                  disabled={isTappedPlaying || gameState !== "playing"}
                  aria-label={`数字 ${num}`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </GameShell>
  );
};

export default App;
