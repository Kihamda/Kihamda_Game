import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { useAudio, useHighScore, GameShell } from "../../../src/shared";

// ─── Types ────────────────────────────────────────────────────────────────────
type MoleType = "normal" | "golden" | "bomb";
type GamePhase = "idle" | "playing" | "gameover";
type SpeedLevel = "slow" | "normal" | "fast";
type GoldenRateLevel = "low" | "normal" | "high";

interface MoleData {
  active: boolean;
  type: MoleType;
  hitAnim: boolean;
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  value: number;
  isBomb: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
}

interface GameSettings {
  gameDuration: number;
  holeCount: number;
  speed: SpeedLevel;
  goldenRate: GoldenRateLevel;
}

// ─── Constants / Configs ──────────────────────────────────────────────────────
const STORAGE_KEY = "molemania_settings";

const DEFAULT_SETTINGS: GameSettings = {
  gameDuration: 60,
  holeCount: 9,
  speed: "normal",
  goldenRate: "normal",
};

const SPEED_CONFIG: Record<
  SpeedLevel,
  { baseInterval: number; maxFactor: number }
> = {
  slow: { baseInterval: 1200, maxFactor: 1.5 },
  normal: { baseInterval: 800, maxFactor: 2.5 },
  fast: { baseInterval: 500, maxFactor: 3.5 },
};

const GOLDEN_RATE_VALUES: Record<GoldenRateLevel, number> = {
  low: 0.05,
  normal: 0.15,
  high: 0.3,
};

const GRID_COLS: Record<number, number> = { 6: 3, 9: 3, 12: 4 };

const DURATION_OPTIONS = [15, 30, 60, 90] as const;
const HOLE_OPTIONS = [6, 9, 12] as const;
const SPEED_OPTIONS: SpeedLevel[] = ["slow", "normal", "fast"];
const GOLDEN_OPTIONS: GoldenRateLevel[] = ["low", "normal", "high"];

const MOLE_EMOJI: Record<MoleType, string> = {
  normal: "🐹",
  golden: "🏅",
  bomb: "💣",
};

const MOLE_POINTS: Record<MoleType, number> = {
  normal: 10,
  golden: 30,
  bomb: -20,
};

const BASE_VISIBLE_DURATION: Record<MoleType, number> = {
  normal: 800,
  golden: 500,
  bomb: 700,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSpeedFactor(
  elapsed: number,
  duration: number,
  maxFactor: number,
): number {
  return 1 + (elapsed / duration) * (maxFactor - 1);
}

function makeMoles(count: number): MoleData[] {
  return Array.from({ length: count }, () => ({
    active: false,
    type: "normal" as MoleType,
    hitAnim: false,
  }));
}

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: GameSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── Component ────────────────────────────────────────────────────────────────
const App = () => {
  const { playSweep, playArpeggio, playNoise, playFanfare } = useAudio();
  const { best: highScore, update: updateHighScore } =
    useHighScore("molemania");

  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const activeRef = useRef<GameSettings>(settings);

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [moles, setMoles] = useState<MoleData[]>(
    makeMoles(DEFAULT_SETTINGS.holeCount),
  );
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.gameDuration);
  const [combo, setCombo] = useState(0);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shaking, setShaking] = useState(false);
  const [fever, setFever] = useState(false);

  // mutable refs that don't trigger re-renders
  const popupIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const startTimeRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  // ref holding current spawn fn to allow self-recursion without stale closure
  const spawnMoleFnRef = useRef<() => void>(() => undefined);

  const updateSetting = useCallback(
    <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  // ── Timer cleanup ────────────────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    moleTimersRef.current.forEach((t) => clearTimeout(t));
    moleTimersRef.current.clear();
  }, []);

  // ── End game ─────────────────────────────────────────────────────────────
  const endGame = useCallback(() => {
    clearAllTimers();
    setPhase("gameover");
    setMoles(makeMoles(activeRef.current.holeCount));
    const finalScore = scoreRef.current;
    updateHighScore(finalScore);
  }, [clearAllTimers, updateHighScore]);

  // ── Spawn logic ──────────────────────────────────────────────────────────
  const doSpawn = useCallback(() => {
    const s = activeRef.current;
    const speedCfg = SPEED_CONFIG[s.speed];
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const factor = getSpeedFactor(elapsed, s.gameDuration, speedCfg.maxFactor);
    const goldenRate = GOLDEN_RATE_VALUES[s.goldenRate];

    let spawnIdx: number | null = null;
    let spawnType: MoleType = "normal";

    setMoles((prev) => {
      const freeIdxs = prev.reduce<number[]>((acc, m, i) => {
        if (!m.active) acc.push(i);
        return acc;
      }, []);
      if (freeIdxs.length === 0) return prev;

      spawnIdx = freeIdxs[Math.floor(Math.random() * freeIdxs.length)];
      const r = Math.random();
      spawnType =
        r < goldenRate ? "golden" : r < goldenRate + 0.15 ? "bomb" : "normal";

      return prev.map((m, i) =>
        i === spawnIdx ? { active: true, type: spawnType, hitAnim: false } : m,
      );
    });

    if (spawnIdx !== null) {
      const idx = spawnIdx;
      const duration = BASE_VISIBLE_DURATION[spawnType] / factor;
      const t = setTimeout(() => {
        let missed = false;
        setMoles((cur) => {
          if (!cur[idx].active || cur[idx].hitAnim) return cur;
          missed = true;
          return cur.map((m, i) => (i === idx ? { ...m, active: false } : m));
        });
        if (missed) {
          comboRef.current = 0;
          setCombo(0);
        }
      }, duration);
      moleTimersRef.current.set(idx, t);
    }

    const interval = speedCfg.baseInterval / factor;
    spawnTimerRef.current = setTimeout(spawnMoleFnRef.current, interval);
  }, []);

  // keep the ref in sync with the latest callback (must be in effect, not render)
  useEffect(() => {
    spawnMoleFnRef.current = doSpawn;
  });

  // ── Particles / popups ───────────────────────────────────────────────────
  const addParticles = useCallback((x: number, y: number) => {
    const id = particleIdRef.current++;
    setParticles((prev) => [...prev, { id, x, y }]);
    setTimeout(
      () => setParticles((prev) => prev.filter((p) => p.id !== id)),
      700,
    );
  }, []);

  const addPopup = useCallback(
    (x: number, y: number, value: number, isBomb: boolean) => {
      const id = popupIdRef.current++;
      setPopups((prev) => [...prev, { id, x, y, value, isBomb }]);
      setTimeout(
        () => setPopups((prev) => prev.filter((p) => p.id !== id)),
        900,
      );
    },
    [],
  );

  // ── Whack ────────────────────────────────────────────────────────────────
  const whackMole = useCallback(
    (idx: number, e: React.SyntheticEvent<HTMLDivElement>) => {
      // Capture position before React may null currentTarget
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Capture hit info from inside updater (updater runs synchronously)
      let hitPoints = 0;
      let hitType: MoleType | null = null;

      setMoles((prev) => {
        const mole = prev[idx];
        if (!mole.active || mole.hitAnim) return prev;
        hitPoints = MOLE_POINTS[mole.type];
        hitType = mole.type;
        return prev.map((m, i) => (i === idx ? { ...m, hitAnim: true } : m));
      });

      // No hit registered (already inactive / animating)
      if (hitType === null) return;

      const isBomb = hitType === "bomb";

      // All side effects outside the updater
      scoreRef.current = Math.max(0, scoreRef.current + hitPoints);
      setScore(scoreRef.current);

      if (isBomb) {
        comboRef.current = 0;
        setCombo(0);
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        playNoise(0.3, 0.5);
      } else {
        comboRef.current += 1;
        const newCombo = comboRef.current;
        setCombo(newCombo);
        if (newCombo >= 5 && newCombo % 5 === 0) {
          setFever(true);
          playFanfare();
          setTimeout(() => setFever(false), 900);
        } else if (hitType === "golden") {
          playArpeggio([880, 1320], 0.18, "sine", 0.3, 0.09);
        } else {
          playSweep(180, 80, 0.15, "square", 0.28);
        }
      }

      addParticles(cx, cy);
      addPopup(cx, cy, hitPoints, isBomb);

      // cancel auto-hide timer
      const existing = moleTimersRef.current.get(idx);
      if (existing !== undefined) {
        clearTimeout(existing);
        moleTimersRef.current.delete(idx);
      }

      // hit animation → deactivate
      setTimeout(() => {
        setMoles((cur) =>
          cur.map((m, i) =>
            i === idx ? { ...m, active: false, hitAnim: false } : m,
          ),
        );
      }, 280);
    },
    [addParticles, addPopup, playSweep, playArpeggio, playNoise, playFanfare],
  );

  // ── Start game ───────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    activeRef.current = settings;
    const speedCfg = SPEED_CONFIG[settings.speed];
    clearAllTimers();
    setPhase("playing");
    setMoles(makeMoles(settings.holeCount));
    scoreRef.current = 0;
    setScore(0);
    comboRef.current = 0;
    setCombo(0);
    setTimeLeft(settings.gameDuration);
    setPopups([]);
    setParticles([]);
    setShaking(false);
    setFever(false);
    startTimeRef.current = Date.now();

    tickTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    spawnTimerRef.current = setTimeout(
      spawnMoleFnRef.current,
      speedCfg.baseInterval,
    );
  }, [clearAllTimers, endGame, settings]);

  // cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const timePercent = (timeLeft / settings.gameDuration) * 100;
  const timerColor =
    timePercent > 50 ? "#4ade80" : timePercent > 25 ? "#facc15" : "#f87171";
  const gridCols = GRID_COLS[settings.holeCount] ?? 3;

  return (
    <GameShell title="Mole Mania" gameId="molemania">
      <div className={`app${shaking ? " shake" : ""}`}>
        {/* ── Idle screen ── */}
        {phase === "idle" && (
          <div className="screen">
            <h1 className="title">🐹 Mole Mania</h1>
            <p className="desc">叩いて叩いて叩きまくれ</p>
            {highScore > 0 && <p className="hi">Best: {highScore}</p>}

            <div className="settings-card">
              <div className="setting-row">
                <span className="setting-label">⏱ ゲーム時間</span>
                <div className="setting-options">
                  {DURATION_OPTIONS.map((v) => (
                    <button
                      key={v}
                      className={`setting-btn${settings.gameDuration === v ? " active" : ""}`}
                      onClick={() => updateSetting("gameDuration", v)}
                    >
                      {v}秒
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-row">
                <span className="setting-label">🕳️ 穴の数</span>
                <div className="setting-options">
                  {HOLE_OPTIONS.map((v) => (
                    <button
                      key={v}
                      className={`setting-btn${settings.holeCount === v ? " active" : ""}`}
                      onClick={() => updateSetting("holeCount", v)}
                    >
                      {v}穴
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-row">
                <span className="setting-label">🏃 出現速度</span>
                <div className="setting-options">
                  {SPEED_OPTIONS.map((v) => (
                    <button
                      key={v}
                      className={`setting-btn${settings.speed === v ? " active" : ""}`}
                      onClick={() => updateSetting("speed", v)}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-row">
                <span className="setting-label">🏅 ゴールデン率</span>
                <div className="setting-options">
                  {GOLDEN_OPTIONS.map((v) => (
                    <button
                      key={v}
                      className={`setting-btn${settings.goldenRate === v ? " active" : ""}`}
                      onClick={() => updateSetting("goldenRate", v)}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="btn-start" onClick={startGame}>
              START
            </button>
          </div>
        )}

        {/* ── Game over screen ── */}
        {phase === "gameover" && (
          <div className="screen">
            <h1 className="title">Time Up!</h1>
            <p className="final-score">{score}</p>
            <p className="score-unit">点</p>
            {score > 0 && score >= highScore && (
              <p className="new-record">NEW RECORD!</p>
            )}
            <p className="hi">Best: {highScore}</p>
            <button className="btn-start" onClick={startGame}>
              RETRY
            </button>
          </div>
        )}

        {/* ── Playing ── */}
        {phase === "playing" && (
          <div className="game-wrap">
            {/* HUD */}
            <div className="hud">
              <div className="hud-block">
                <span className="hud-label">SCORE</span>
                <span className="hud-value">{score}</span>
              </div>

              <div className="hud-center">
                {combo > 1 && (
                  <div className={`combo${fever ? " fever" : ""}`}>
                    {fever ? "🔥 FEVER!" : `x${combo} COMBO`}
                  </div>
                )}
              </div>

              <div className="hud-block">
                <span className="hud-label">TIME</span>
                <span className="hud-value">{timeLeft}</span>
              </div>
            </div>

            {/* Time bar */}
            <div className="time-bar-track">
              <div
                className="time-bar-fill"
                style={{ width: `${timePercent}%`, background: timerColor }}
              />
            </div>

            {/* Grid */}
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
            >
              {moles.map((mole, i) => (
                <div key={i} className="hole-wrap">
                  <div className="hole" />
                  {mole.active && (
                    <div
                      className={`mole mole-${mole.type}${mole.hitAnim ? " squish" : " rising"}`}
                      onClick={(e) => !mole.hitAnim && whackMole(i, e)}
                      onTouchStart={(e) => !mole.hitAnim && whackMole(i, e)}
                    >
                      {MOLE_EMOJI[mole.type]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Particles ── */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle-root"
            style={{ left: p.x, top: p.y }}
          >
            {(["✨", "⭐", "✨", "⭐"] as const).map((s, i) => (
              <span key={i} className={`particle p${i}`}>
                {s}
              </span>
            ))}
          </div>
        ))}

        {/* ── Score popups ── */}
        {popups.map((pop) => (
          <div
            key={pop.id}
            className={`score-popup${pop.isBomb ? " popup-bomb" : pop.value >= 30 ? " popup-gold" : ""}`}
            style={{ left: pop.x, top: pop.y }}
          >
            {pop.value > 0 ? `+${pop.value}` : pop.value}
          </div>
        ))}
      </div>
    </GameShell>
  );
};

export default App;
