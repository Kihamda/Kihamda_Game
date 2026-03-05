import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./App.css";
import { useAudio, GameShell, useHighScore } from "../../../src/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FallingWord {
  id: number;
  text: string;
  x: number; // left % inside game area
  fallDuration: number; // ms
  spawnTime: number; // Date.now()
}

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number; // CSS var --tx
  ty: number; // CSS var --ty
  color: string;
  duration: number; // ms
}

interface FloatEffect {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

type Phase = "idle" | "playing" | "gameover";

type WordDifficulty = "SHORT" | "MIXED" | "LONG";
type FallSpeed = "SLOW" | "NORMAL" | "FAST";
type LifeCount = "CASUAL" | "NORMAL" | "HARDCORE";
type SpawnRate = "RELAXED" | "NORMAL" | "INTENSE";

interface GameSettings {
  wordDifficulty: WordDifficulty;
  fallSpeed: FallSpeed;
  lifeCount: LifeCount;
  spawnRate: SpawnRate;
}

const DEFAULT_SETTINGS: GameSettings = {
  wordDifficulty: "MIXED",
  fallSpeed: "NORMAL",
  lifeCount: "NORMAL",
  spawnRate: "NORMAL",
};

const STORAGE_KEY = "typingblitz_settings";

function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved)
      return {
        ...DEFAULT_SETTINGS,
        ...(JSON.parse(saved) as Partial<GameSettings>),
      };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: GameSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// ─── Settings Configs ────────────────────────────────────────────────────────

const WORD_DIFF_OPTIONS: {
  key: WordDifficulty;
  label: string;
  desc: string;
}[] = [
  { key: "SHORT", label: "SHORT", desc: "3-4文字" },
  { key: "MIXED", label: "MIXED", desc: "全単語" },
  { key: "LONG", label: "LONG", desc: "5文字以上" },
];

const FALL_SPEED_CONFIG: Record<FallSpeed, { base: number; min: number }> = {
  SLOW: { base: 12000, min: 5000 },
  NORMAL: { base: 8500, min: 2800 },
  FAST: { base: 5000, min: 1500 },
};

const FALL_SPEED_OPTIONS: { key: FallSpeed; label: string; desc: string }[] = [
  { key: "SLOW", label: "SLOW", desc: "ゆっくり" },
  { key: "NORMAL", label: "NORMAL", desc: "標準" },
  { key: "FAST", label: "FAST", desc: "高速" },
];

const LIFE_COUNT_MAP: Record<LifeCount, number> = {
  CASUAL: Infinity,
  NORMAL: 5,
  HARDCORE: 3,
};

const LIFE_COUNT_OPTIONS: { key: LifeCount; label: string; desc: string }[] = [
  { key: "CASUAL", label: "CASUAL", desc: "無制限" },
  { key: "NORMAL", label: "NORMAL", desc: "5" },
  { key: "HARDCORE", label: "HARDCORE", desc: "3" },
];

const SPAWN_RATE_CONFIG: Record<SpawnRate, { base: number; min: number }> = {
  RELAXED: { base: 3000, min: 1200 },
  NORMAL: { base: 2200, min: 650 },
  INTENSE: { base: 1500, min: 400 },
};

const SPAWN_RATE_OPTIONS: { key: SpawnRate; label: string; desc: string }[] = [
  { key: "RELAXED", label: "RELAXED", desc: "のんびり" },
  { key: "NORMAL", label: "NORMAL", desc: "標準" },
  { key: "INTENSE", label: "INTENSE", desc: "猛烈" },
];

interface ActiveConfig {
  wordPool: readonly string[];
  fallBase: number;
  fallMin: number;
  spawnBase: number;
  spawnMin: number;
  maxLives: number;
}

function buildActiveConfig(
  s: GameSettings,
  words: readonly string[],
): ActiveConfig {
  const fall = FALL_SPEED_CONFIG[s.fallSpeed];
  const spawn = SPAWN_RATE_CONFIG[s.spawnRate];
  const pool =
    s.wordDifficulty === "SHORT"
      ? words.filter((w) => w.length <= 4)
      : s.wordDifficulty === "LONG"
        ? words.filter((w) => w.length >= 5)
        : words;
  return {
    wordPool: pool,
    fallBase: fall.base,
    fallMin: fall.min,
    spawnBase: spawn.base,
    spawnMin: spawn.min,
    maxLives: LIFE_COUNT_MAP[s.lifeCount],
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DIFFICULTY_RAMP_MS = 90_000;

const WORDS: readonly string[] = [
  "cat",
  "dog",
  "sun",
  "run",
  "fly",
  "box",
  "ice",
  "arc",
  "orb",
  "gem",
  "jump",
  "fish",
  "bird",
  "fast",
  "cool",
  "fire",
  "ring",
  "king",
  "star",
  "play",
  "rain",
  "road",
  "tree",
  "moon",
  "wind",
  "snow",
  "glow",
  "bolt",
  "frog",
  "hawk",
  "wolf",
  "claw",
  "dust",
  "iron",
  "jade",
  "lava",
  "maze",
  "snake",
  "plane",
  "water",
  "light",
  "happy",
  "music",
  "dance",
  "storm",
  "heart",
  "flame",
  "cloud",
  "night",
  "power",
  "rider",
  "stone",
  "sword",
  "tiger",
  "blaze",
  "frost",
  "spark",
  "flash",
  "raven",
  "comet",
  "prism",
  "rocket",
  "castle",
  "mirror",
  "forest",
  "shadow",
  "silver",
  "golden",
  "hunter",
  "mystic",
  "cosmic",
  "plasma",
  "cipher",
  "vertex",
  "zenith",
  "thunder",
  "monster",
  "perfect",
  "rainbow",
  "victory",
  "amazing",
  "crystal",
  "phantom",
  "warrior",
  "tornado",
  "eclipse",
  "volcano",
  "diamond",
  "quantum",
  "stealth",
  "orbital",
  "blazing",
  "radiant",
  "champion",
  "midnight",
  "blizzard",
  "infinity",
  "survival",
  "universe",
  "lightning",
  "adventure",
  "challenge",
  "explosion",
  "supernova",
];

const PARTICLE_COLORS = [
  "#4ade80",
  "#facc15",
  "#60a5fa",
  "#f97316",
  "#e879f9",
  "#34d399",
  "#fb7185",
  "#38bdf8",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

let uid = 0;
const nextId = () => ++uid;

function randomWordFrom(pool: readonly string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function getDifficulty(
  elapsed: number,
  cfg: ActiveConfig,
): { fallMs: number; spawnMs: number } {
  const t = Math.min(elapsed / DIFFICULTY_RAMP_MS, 1);
  const ease = t * t;
  return {
    fallMs: cfg.fallBase - (cfg.fallBase - cfg.fallMin) * ease,
    spawnMs: cfg.spawnBase - (cfg.spawnBase - cfg.spawnMin) * ease,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

const App = () => {
  const { playFanfare, playMiss, playClick } = useAudio();
  const { best: bestScore, update: updateBest } = useHighScore("typingblitz");

  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const activeConfigRef = useRef<ActiveConfig>(
    buildActiveConfig(DEFAULT_SETTINGS, WORDS),
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [words, setWords] = useState<FallingWord[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(5);
  const [maxLives, setMaxLives] = useState(5);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatEffects, setFloatEffects] = useState<FloatEffect[]>([]);
  const [shake, setShake] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const wordsRef = useRef<FallingWord[]>([]);
  const livesRef = useRef(5);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const missedRef = useRef(new Set<number>());
  const completedRef = useRef(new Set<number>());
  const gameStartRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const rafRef = useRef(0);
  const lastCompleteRef = useRef(0);
  const completionIntervalsRef = useRef<number[]>([]);

  // Sync refs with latest state after each render (useLayoutEffect → before paint)
  useLayoutEffect(() => {
    phaseRef.current = phase;
    wordsRef.current = words;
    livesRef.current = lives;
    comboRef.current = combo;
    scoreRef.current = score;
  });

  // Set --area-height CSS custom property for falling animation
  useEffect(() => {
    const el = gameAreaRef.current;
    if (!el) return;
    const update = () =>
      el.style.setProperty("--area-height", `${el.clientHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateSetting = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // ── Effect helpers ───────────────────────────────────────────────────────

  const spawnParticles = useCallback((cx: number, cy: number) => {
    const ps: Particle[] = Array.from({ length: 14 }, () => ({
      id: nextId(),
      x: cx,
      y: cy,
      tx: (Math.random() - 0.5) * 240,
      ty: (Math.random() - 0.5) * 220 - 40,
      color:
        PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      duration: 480 + Math.random() * 320,
    }));
    setParticles((prev) => [...prev, ...ps]);
    const ids = new Set(ps.map((p) => p.id));
    setTimeout(
      () => setParticles((prev) => prev.filter((p) => !ids.has(p.id))),
      950,
    );
  }, []);

  const spawnFloat = useCallback(
    (text: string, x: number, y: number, color: string) => {
      const id = nextId();
      setFloatEffects((prev) => [...prev, { id, text, x, y, color }]);
      setTimeout(
        () => setFloatEffects((prev) => prev.filter((e) => e.id !== id)),
        900,
      );
    },
    [],
  );

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }, []);

  // ── Word completion ──────────────────────────────────────────────────────

  const completeWord = useCallback(
    (word: FallingWord) => {
      if (completedRef.current.has(word.id)) return;
      completedRef.current.add(word.id);

      const now = Date.now();
      const prevComplete = lastCompleteRef.current;
      lastCompleteRef.current = now;
      if (prevComplete > 0) {
        const interval = now - prevComplete;
        if (interval < 15_000) {
          completionIntervalsRef.current = [
            ...completionIntervalsRef.current.slice(-9),
            interval,
          ];
        }
      }

      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);

      const multiplier = newCombo >= 3 ? 1 + (newCombo - 1) * 0.2 : 1;
      const pts = Math.round(word.text.length * 10 * multiplier);
      scoreRef.current += pts;
      setScore(scoreRef.current);

      // Visual effects at word position
      const el = document.getElementById(`w-${word.id}`);
      const area = gameAreaRef.current;
      if (el && area) {
        const er = el.getBoundingClientRect();
        const ar = area.getBoundingClientRect();
        const cx = er.left - ar.left + er.width / 2;
        const cy = er.top - ar.top + er.height / 2;
        spawnParticles(cx, cy);

        const ivals = completionIntervalsRef.current;
        if (ivals.length >= 3) {
          const recent = ivals[ivals.length - 1];
          const avg =
            ivals.slice(0, -1).reduce((a, b) => a + b, 0) / (ivals.length - 1);
          if (recent < avg * 0.55) {
            spawnFloat("BLAZING!", cx, cy - 30, "#f97316");
          } else if (recent < avg * 0.78) {
            spawnFloat("FAST!", cx, cy - 30, "#facc15");
          }
        }
        if (newCombo >= 3) {
          spawnFloat(`${newCombo}\u00d7 COMBO!`, cx, cy - 56, "#e879f9");
        }
      }

      playFanfare();
      setWords((prev) => prev.filter((w) => w.id !== word.id));
      setInputVal("");
      if (inputRef.current) inputRef.current.value = "";
    },
    [spawnParticles, spawnFloat, playFanfare],
  );

  // ── Miss ─────────────────────────────────────────────────────────────────

  const missWord = useCallback(
    (wordId: number) => {
      if (missedRef.current.has(wordId)) return;
      missedRef.current.add(wordId);

      playMiss();
      triggerShake();
      comboRef.current = 0;
      setCombo(0);

      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      setWords((prev) => prev.filter((w) => w.id !== wordId));

      if (newLives <= 0) {
        const fs = scoreRef.current;
        setFinalScore(fs);
        updateBest(fs);
        setPhase("gameover");
        phaseRef.current = "gameover";
      }
    },
    [triggerShake, playMiss, updateBest],
  );

  // ── Input handler ────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (phaseRef.current !== "playing") return;

      const raw = e.target.value.toLowerCase().replace(/\s/g, "");
      const match = wordsRef.current.find((w) => w.text === raw);
      if (match) {
        completeWord(match);
        return;
      }
      setInputVal(raw);
      playClick();
    },
    [completeWord, playClick],
  );

  // ── Miss detection (interval) ────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      const now = Date.now();
      wordsRef.current
        .filter((w) => now - w.spawnTime >= w.fallDuration)
        .forEach((w) => missWord(w.id));
    }, 120);
    return () => clearInterval(id);
  }, [phase, missWord]);

  // ── Spawn loop (rAF) ─────────────────────────────────────────────────────

  const spawnWord = useCallback(() => {
    const cfg = activeConfigRef.current;
    const elapsed = Date.now() - gameStartRef.current;
    const { fallMs } = getDifficulty(elapsed, cfg);
    setWords((prev) => [
      ...prev,
      {
        id: nextId(),
        text: randomWordFrom(cfg.wordPool),
        x: 4 + Math.random() * 78,
        fallDuration: fallMs + (Math.random() - 0.5) * 600,
        spawnTime: Date.now(),
      },
    ]);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const tick = () => {
      if (phaseRef.current !== "playing") return;
      const elapsed = Date.now() - gameStartRef.current;
      const { spawnMs } = getDifficulty(elapsed, activeConfigRef.current);
      if (Date.now() - lastSpawnRef.current >= spawnMs) {
        lastSpawnRef.current = Date.now();
        spawnWord();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, spawnWord]);

  // ── Start / restart ──────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    const cfg = buildActiveConfig(settings, WORDS);
    activeConfigRef.current = cfg;
    uid = 0;
    missedRef.current.clear();
    completedRef.current.clear();
    completionIntervalsRef.current = [];
    lastCompleteRef.current = 0;
    gameStartRef.current = Date.now();
    lastSpawnRef.current = Date.now() - 1_800;
    comboRef.current = 0;
    scoreRef.current = 0;
    livesRef.current = cfg.maxLives;
    setMaxLives(cfg.maxLives);
    setWords([]);
    setInputVal("");
    setScore(0);
    setCombo(0);
    setLives(cfg.maxLives);
    setParticles([]);
    setFloatEffects([]);
    setShake(false);
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [settings]);

  // ── Active word: the earliest-to-expire word whose text starts with input ──

  const activeWord: FallingWord | undefined = useMemo(() => {
    if (!inputVal) return undefined;
    return words
      .filter((w) => w.text.startsWith(inputVal))
      .sort(
        (a, b) => a.spawnTime + a.fallDuration - (b.spawnTime + b.fallDuration),
      )[0];
  }, [inputVal, words]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <GameShell title="Typing Blitz" gameId="typingblitz">
      <div className="app">
        {/* HUD */}
        <div className="hud">
          <div className="hud-score">SCORE: {score}</div>
          <div className="hud-lives">
            {!isFinite(maxLives) ? (
              <span className="hud-life" style={{ fontSize: "1.3em" }}>
                ∞
              </span>
            ) : (
              Array.from({ length: maxLives }, (_, i) => (
                <span
                  key={i}
                  className="hud-life"
                  style={{ opacity: i < lives ? 1 : 0.18 }}
                >
                  💙
                </span>
              ))
            )}
          </div>
          <div className="hud-combo" style={{ opacity: combo >= 2 ? 1 : 0 }}>
            {combo >= 2 ? `${combo}\u00d7 COMBO` : "\u00a0"}
          </div>
        </div>

        {/* Game area */}
        <div
          ref={gameAreaRef}
          className={`game-area${shake ? " shake" : ""}`}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Falling words */}
          {words.map((word) => {
            const isActive = activeWord?.id === word.id;
            const typedLen = isActive ? inputVal.length : 0;

            return (
              <span
                key={word.id}
                id={`w-${word.id}`}
                className={`falling-word${isActive ? " active" : ""}`}
                style={{
                  left: `${word.x}%`,
                  animationDuration: `${word.fallDuration}ms`,
                }}
              >
                {[...word.text].map((ch, i) => {
                  const cls =
                    i < typedLen
                      ? "ch-typed"
                      : i === typedLen && isActive
                        ? "ch-next"
                        : "ch-pending";
                  return (
                    <span key={i} className={cls}>
                      {ch}
                    </span>
                  );
                })}
              </span>
            );
          })}

          {/* Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="particle"
              style={
                {
                  left: p.x,
                  top: p.y,
                  background: p.color,
                  "--tx": `${p.tx}px`,
                  "--ty": `${p.ty}px`,
                  "--dur": `${p.duration}ms`,
                } as React.CSSProperties & Record<string, string | number>
              }
            />
          ))}

          {/* Float effects */}
          {floatEffects.map((e) => (
            <div
              key={e.id}
              className="float-effect"
              style={{ left: e.x, top: e.y, color: e.color }}
            >
              {e.text}
            </div>
          ))}

          {/* Overlay */}
          {phase !== "playing" && (
            <div className="overlay">
              {phase === "idle" && (
                <div className="settings-screen">
                  <div className="overlay-title">TYPING BLITZ</div>
                  <p className="overlay-hint">
                    Words fall from above — type them before they hit the
                    ground. Combo multiplier for streaks!
                  </p>

                  <div className="settings-card">
                    <div className="settings-card-label">Word Length</div>
                    <div className="settings-btn-group">
                      {WORD_DIFF_OPTIONS.map((o) => (
                        <button
                          key={o.key}
                          className={`settings-btn${settings.wordDifficulty === o.key ? " active" : ""}`}
                          onClick={() =>
                            updateSetting({ wordDifficulty: o.key })
                          }
                        >
                          {o.label}
                          <span className="settings-btn-desc">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="settings-card">
                    <div className="settings-card-label">Fall Speed</div>
                    <div className="settings-btn-group">
                      {FALL_SPEED_OPTIONS.map((o) => (
                        <button
                          key={o.key}
                          className={`settings-btn${settings.fallSpeed === o.key ? " active" : ""}`}
                          onClick={() => updateSetting({ fallSpeed: o.key })}
                        >
                          {o.label}
                          <span className="settings-btn-desc">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="settings-card">
                    <div className="settings-card-label">Lives</div>
                    <div className="settings-btn-group">
                      {LIFE_COUNT_OPTIONS.map((o) => (
                        <button
                          key={o.key}
                          className={`settings-btn${settings.lifeCount === o.key ? " active" : ""}`}
                          onClick={() => updateSetting({ lifeCount: o.key })}
                        >
                          {o.label}
                          <span className="settings-btn-desc">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="settings-card">
                    <div className="settings-card-label">Spawn Rate</div>
                    <div className="settings-btn-group">
                      {SPAWN_RATE_OPTIONS.map((o) => (
                        <button
                          key={o.key}
                          className={`settings-btn${settings.spawnRate === o.key ? " active" : ""}`}
                          onClick={() => updateSetting({ spawnRate: o.key })}
                        >
                          {o.label}
                          <span className="settings-btn-desc">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className="start-btn" onClick={startGame}>
                    START
                  </button>
                </div>
              )}
              {phase === "gameover" && (
                <>
                  <div className="overlay-title">GAME OVER</div>
                  <div className="overlay-subtitle">SCORE: {finalScore}</div>
                  <div
                    className="overlay-subtitle"
                    style={{ fontSize: 16, opacity: 0.7 }}
                  >
                    BEST: {bestScore}
                  </div>
                  <button className="start-btn" onClick={startGame}>
                    PLAY AGAIN
                  </button>
                  <button
                    className="settings-link"
                    onClick={() => setPhase("idle")}
                  >
                    Settings
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="input-area">
          <input
            ref={inputRef}
            type="text"
            className={`input-field${lives <= 2 && phase === "playing" ? " danger" : ""}`}
            value={inputVal}
            onChange={handleChange}
            placeholder={phase === "playing" ? "type here..." : ""}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={phase !== "playing"}
          />
        </div>
      </div>
    </GameShell>
  );
};

export default App;
