import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { useAudio, useHighScore, GameShell } from "../../../src/shared";

/* ---- Types ---- */
type Color =
  | "green"
  | "red"
  | "yellow"
  | "blue"
  | "purple"
  | "orange"
  | "pink"
  | "cyan";
type Phase = "idle" | "showing" | "waiting" | "gameover";
type Tempo = "slow" | "normal" | "fast";
type ColorCount = 4 | 6 | 8;
type MissLimit = 0 | 1 | 3;

interface Settings {
  colorCount: ColorCount;
  tempo: Tempo;
  missLimit: MissLimit;
}

interface Checkmark {
  id: number;
  color: Color;
}

/* ---- Constants ---- */
const ALL_COLORS: Color[] = [
  "green",
  "red",
  "yellow",
  "blue",
  "purple",
  "orange",
  "pink",
  "cyan",
];

const FREQ: Record<Color, number> = {
  green: 440, // A4
  red: 164, // E3
  yellow: 660, // E5
  blue: 277, // C#4
  purple: 196, // G3
  orange: 330, // E4
  pink: 523, // C5
  cyan: 784, // G5
};

const TEMPO_MULT: Record<Tempo, number> = {
  slow: 1.5,
  normal: 1.0,
  fast: 0.6,
};

const DEFAULT_SETTINGS: Settings = {
  colorCount: 4,
  tempo: "normal",
  missLimit: 0,
};

const STORAGE_KEY = "simonecho_settings";

/* ---- Helpers ---- */
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      colorCount: p.colorCount === 6 ? 6 : p.colorCount === 8 ? 8 : 4,
      tempo: p.tempo === "slow" ? "slow" : p.tempo === "fast" ? "fast" : "normal",
      missLimit: p.missLimit === 1 ? 1 : p.missLimit === 3 ? 3 : 0,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

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

/* ---- Component ---- */
export default function App() {
  const { playTone: sharedPlayTone, playMiss, playFanfare } = useAudio();
  const { best: hiScore, update: updateHiScore } = useHighScore("simonecho");

  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [level, setLevel] = useState(0);
  const [activeButton, setActiveButton] = useState<Color | null>(null);
  const [showLevelClear, setShowLevelClear] = useState(false);
  const [shake, setShake] = useState(false);
  const [flashError, setFlashError] = useState(false);
  const [checkmarks, setCheckmarks] = useState<Checkmark[]>([]);
  const [missesLeft, setMissesLeft] = useState(0);

  const checkmarkIdRef = useRef(0);
  const showDelayRef = useRef(600);

  const colors = ALL_COLORS.slice(0, settings.colorCount);
  const tempoMult = TEMPO_MULT[settings.tempo];
  const isGrid = settings.colorCount > 4;

  /* ---- Settings ---- */
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  /* ---- Start / Restart ---- */
  const startGame = useCallback(() => {
    const palette = ALL_COLORS.slice(0, settings.colorCount);
    const firstColor = palette[Math.floor(Math.random() * palette.length)];
    showDelayRef.current = 400;
    setSequence([firstColor]);
    setLevel(1);
    setPlayerIndex(0);
    setMissesLeft(settings.missLimit);
    setPhase("showing");
  }, [settings.colorCount, settings.missLimit]);

  /* ---- Sequence display ---- */
  useEffect(() => {
    if (phase !== "showing") return;

    const litDuration = Math.round(getLitDuration(level) * tempoMult);
    const gapDuration = Math.round(getGapDuration(level) * tempoMult);
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

  /* ---- Player input ---- */
  const handleButtonPress = useCallback(
    (color: Color) => {
      if (phase !== "waiting") return;

      const id = ++checkmarkIdRef.current;
      setCheckmarks((prev) => [...prev, { id, color }]);
      setTimeout(() => {
        setCheckmarks((prev) => prev.filter((c) => c.id !== id));
      }, 800);

      setActiveButton(color);
      sharedPlayTone(FREQ[color], 0.3, "sine", 0.35);
      setTimeout(() => setActiveButton(null), 200);

      const expected = sequence[playerIndex];

      if (color !== expected) {
        playMiss();
        setFlashError(true);
        setShake(true);
        setTimeout(() => {
          setFlashError(false);
          setShake(false);
        }, 700);

        if (missesLeft > 0) {
          // Retry: reset round input and replay sequence
          setMissesLeft((prev) => prev - 1);
          setPlayerIndex(0);
          showDelayRef.current = 1000;
          setPhase("showing");
          return;
        }

        updateHiScore(level);
        setTimeout(() => setPhase("gameover"), 900);
        return;
      }

      const nextIndex = playerIndex + 1;

      if (nextIndex >= sequence.length) {
        const newLevel = level + 1;
        updateHiScore(newLevel - 1);
        setLevel(newLevel);
        setShowLevelClear(true);
        playFanfare();
        setTimeout(() => setShowLevelClear(false), 1100);

        const palette = ALL_COLORS.slice(0, settings.colorCount);
        const newColor = palette[Math.floor(Math.random() * palette.length)];
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
      missesLeft,
      settings.colorCount,
      sharedPlayTone,
      playMiss,
      playFanfare,
      updateHiScore,
    ],
  );

  /* ---- Center content (shared between circular & grid layouts) ---- */
  const centerContent = (
    <>
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
      {phase === "showing" && <span className="center-level">{level}</span>}
      {phase === "waiting" && <span className="center-level">{level}</span>}
    </>
  );

  return (
    <GameShell title="Simon Echo" gameId="simonecho">
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
          {phase === "waiting" && (
            <span className="ind-turn">
              Your turn!
              {settings.missLimit > 0 && (
                <span className="miss-counter">
                  {" "}
                  ({missesLeft} miss{missesLeft !== 1 ? "es" : ""} left)
                </span>
              )}
            </span>
          )}
          {(phase === "idle" || phase === "gameover") && (
            <span className="ind-idle">&nbsp;</span>
          )}
        </div>

        <div
          className={`board-wrapper${isGrid ? ` board-wrapper-grid board-wrapper-${settings.colorCount}` : ""}`}
        >
          {isGrid ? (
            <div
              className={`board-grid board-grid-${settings.colorCount}${flashError ? " error-flash" : ""}`}
            >
              {colors.map((c) => (
                <button
                  key={c}
                  className={`grid-sector sector-${c}${activeButton === c ? " active" : ""}${flashError ? " error" : ""}`}
                  onClick={() => handleButtonPress(c)}
                  disabled={phase !== "waiting"}
                  aria-label={c}
                />
              ))}
            </div>
          ) : (
            <div className={`board${flashError ? " error-flash" : ""}`}>
              {colors.map((c) => (
                <button
                  key={c}
                  className={`sector sector-${c}${activeButton === c ? " active" : ""}${flashError ? " error" : ""}`}
                  onClick={() => handleButtonPress(c)}
                  disabled={phase !== "waiting"}
                  aria-label={c}
                />
              ))}
              <div className="center-circle">{centerContent}</div>
            </div>
          )}

          {isGrid && (
            <div className="grid-center-overlay">{centerContent}</div>
          )}

          {checkmarks.map((cm) => (
            <div key={cm.id} className={`checkmark checkmark-${cm.color}`}>
              ✓
            </div>
          ))}

          {showLevelClear && (
            <div className="level-clear">
              <div className="light-ring" />
              <span className="level-clear-text">Level {level}!</span>
            </div>
          )}
        </div>

        {(phase === "idle" || phase === "gameover") && (
          <div className="settings-panel">
            <div className="setting-row">
              <span className="setting-label">Colors</span>
              <div className="setting-options">
                {([4, 6, 8] as const).map((n) => (
                  <button
                    key={n}
                    className={`setting-btn${settings.colorCount === n ? " selected" : ""}`}
                    onClick={() => updateSettings({ colorCount: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <span className="setting-label">Tempo</span>
              <div className="setting-options">
                {(["slow", "normal", "fast"] as const).map((t) => (
                  <button
                    key={t}
                    className={`setting-btn${settings.tempo === t ? " selected" : ""}`}
                    onClick={() => updateSettings({ tempo: t })}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <span className="setting-label">Misses</span>
              <div className="setting-options">
                {([0, 1, 3] as const).map((m) => (
                  <button
                    key={m}
                    className={`setting-btn${settings.missLimit === m ? " selected" : ""}`}
                    onClick={() => updateSettings({ missLimit: m })}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
