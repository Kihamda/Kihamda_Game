import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { useAudio, useHighScore, GameShell } from "../../../src/shared";

type Color = "red" | "blue" | "green" | "yellow";
type Phase = "idle" | "showing" | "waiting" | "gameover";

const COLORS: Color[] = ["green", "red", "yellow", "blue"];

const FREQ: Record<Color, number> = {
  red: 164, // E3
  blue: 277, // C#4
  green: 440, // A4
  yellow: 660, // E5
};

function getLitDuration(level: number): number {
  if (level <= 5) return 500;
  if (level <= 10) return 350;
  return 250;
}

function getGapDuration(level: number): number {
  if (level <= 5) return 200;
  if (level <= 10) return 150;
  return 100;
}

// --- Types ---
interface Checkmark {
  id: number;
  color: Color;
}

// --- Component ---
export default function App() {
  const { playTone: sharedPlayTone, playMiss, playFanfare } = useAudio();
  const { best: hiScore, update: updateHiScore } = useHighScore("simonecho");
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [level, setLevel] = useState(0);
  const [activeButton, setActiveButton] = useState<Color | null>(null);
  const [showLevelClear, setShowLevelClear] = useState(false);
  const [shake, setShake] = useState(false);
  const [flashError, setFlashError] = useState(false);
  const [checkmarks, setCheckmarks] = useState<Checkmark[]>([]);

  const checkmarkIdRef = useRef(0);
  // Delay (ms) before starting sequence playback; set before transitioning to 'showing'
  const showDelayRef = useRef(600);

  // --- Start / Restart ---
  const startGame = useCallback(() => {
    const firstColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    showDelayRef.current = 400;
    setSequence([firstColor]);
    setLevel(1);
    setPlayerIndex(0);
    setPhase("showing");
  }, []);

  // --- Sequence display ---
  useEffect(() => {
    if (phase !== "showing") return;

    const litDuration = getLitDuration(level);
    const gapDuration = getGapDuration(level);
    const delay = showDelayRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    sequence.forEach((color, idx) => {
      const offset = delay + idx * (litDuration + gapDuration);

      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setActiveButton(color);
          sharedPlayTone(FREQ[color], litDuration / 1000, "sine", 0.35);
        }, offset),
      );

      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setActiveButton(null);
          if (idx === sequence.length - 1) {
            setPhase("waiting");
          }
        }, offset + litDuration),
      );
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sequence]);

  // --- Player input ---
  const handleButtonPress = useCallback(
    (color: Color) => {
      if (phase !== "waiting") return;

      // Floating checkmark
      const id = ++checkmarkIdRef.current;
      setCheckmarks((prev) => [...prev, { id, color }]);
      setTimeout(() => {
        setCheckmarks((prev) => prev.filter((c) => c.id !== id));
      }, 800);

      // Flash the pressed button
      setActiveButton(color);
      sharedPlayTone(FREQ[color], 0.3, "sine", 0.35);
      setTimeout(() => setActiveButton(null), 200);

      const expected = sequence[playerIndex];

      if (color !== expected) {
        // Wrong answer
        playMiss();
        setFlashError(true);
        setShake(true);
        setTimeout(() => {
          setFlashError(false);
          setShake(false);
        }, 700);

        updateHiScore(level);
        setTimeout(() => setPhase("gameover"), 900);
        return;
      }

      const nextIndex = playerIndex + 1;

      if (nextIndex >= sequence.length) {
        // Level cleared
        const newLevel = level + 1;
        updateHiScore(newLevel - 1);
        setLevel(newLevel);
        setShowLevelClear(true);
        playFanfare();
        setTimeout(() => setShowLevelClear(false), 1100);

        const newColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        const newSequence = [...sequence, newColor];
        showDelayRef.current = 1300;
        setSequence(newSequence);
        setPlayerIndex(0);
        setPhase("showing");
      } else {
        setPlayerIndex(nextIndex);
      }
    },
    [
      phase,
      sequence,
      playerIndex,
      level,
      sharedPlayTone,
      playMiss,
      playFanfare,
      updateHiScore,
    ],
  );

  return (
    <GameShell title="Simon Echo">
      <div className={`app${shake ? " shake" : ""}`}>
        <header className="header">
          <div className="score-display">
            <span className="score-label">LEVEL</span>
            <span className="score-value">
              {phase === "idle" ? "—" : level}
            </span>
          </div>
          <h1 className="title">
            SIMON
            <br />
            ECHO
          </h1>
          <div className="score-display">
            <span className="score-label">BEST</span>
            <span className="score-value">{hiScore > 0 ? hiScore : "—"}</span>
          </div>
        </header>

        <div className="indicator" aria-live="polite">
          {phase === "showing" && <span className="ind-watch">Watch...</span>}
          {phase === "waiting" && <span className="ind-turn">Your turn!</span>}
          {(phase === "idle" || phase === "gameover") && (
            <span className="ind-idle">&nbsp;</span>
          )}
        </div>

        <div className="board-wrapper">
          <div className={`board${flashError ? " error-flash" : ""}`}>
            {COLORS.map((color) => (
              <button
                key={color}
                className={`sector sector-${color}${activeButton === color ? " active" : ""}${flashError ? " error" : ""}`}
                onClick={() => handleButtonPress(color)}
                disabled={phase !== "waiting"}
                aria-label={color}
              />
            ))}

            <div className="center-circle">
              {phase === "idle" && (
                <button className="center-btn" onClick={startGame}>
                  START
                </button>
              )}
              {phase === "gameover" && (
                <button className="center-btn" onClick={startGame}>
                  RETRY
                </button>
              )}
              {phase === "showing" && (
                <span className="center-level">{level}</span>
              )}
              {phase === "waiting" && (
                <span className="center-level">{level}</span>
              )}
            </div>
          </div>

          {/* Floating checkmarks */}
          {checkmarks.map((cm) => (
            <div key={cm.id} className={`checkmark checkmark-${cm.color}`}>
              ✓
            </div>
          ))}

          {/* Level clear popup */}
          {showLevelClear && (
            <div className="level-clear">
              <div className="light-ring" />
              <span className="level-clear-text">Level {level}!</span>
            </div>
          )}
        </div>

        {phase === "gameover" && (
          <div className="gameover-banner">
            <p className="gameover-title">GAME OVER</p>
            <p className="gameover-score">
              Score: <strong>{level}</strong>
            </p>
            {level >= hiScore && hiScore > 0 && (
              <p className="new-hi">★ NEW BEST ★</p>
            )}
          </div>
        )}
      </div>
    </GameShell>
  );
}
