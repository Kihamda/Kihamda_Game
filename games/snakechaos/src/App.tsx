import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { useAudio, useHighScore, GameShell } from "../../../src/shared";

// ── Settings types ──────────────────────────────────────────────────────────
type GridSize = "SMALL" | "MEDIUM" | "LARGE";
type SpeedLevel = "EASY" | "NORMAL" | "FAST";
type WallMode = "SOLID" | "WRAP";
type PowerUpFreq = "LOW" | "NORMAL" | "HIGH";

interface Settings {
  gridSize: GridSize;
  speed: SpeedLevel;
  wallMode: WallMode;
  powerUpFreq: PowerUpFreq;
}

interface GameConfig {
  grid: number;
  cell: number;
  board: number;
  initMs: number;
  minMs: number;
  wallMode: WallMode;
  puBase: number;
  puRange: number;
}

const STORAGE_KEY = "snakechaos_settings";
const TARGET_BOARD = 480;
const GRID_MAP: Record<GridSize, number> = { SMALL: 15, MEDIUM: 20, LARGE: 25 };
const SPEED_MAP: Record<SpeedLevel, [number, number]> = {
  EASY: [250, 120],
  NORMAL: [200, 80],
  FAST: [130, 50],
};
const PU_MAP: Record<PowerUpFreq, [number, number]> = {
  LOW: [6, 6],
  NORMAL: [3, 5],
  HIGH: [1, 3],
};

const DEFAULT_SETTINGS: Settings = {
  gridSize: "MEDIUM",
  speed: "NORMAL",
  wallMode: "SOLID",
  powerUpFreq: "NORMAL",
};

function resolveConfig(s: Settings): GameConfig {
  const grid = GRID_MAP[s.gridSize];
  const cell = Math.floor(TARGET_BOARD / grid);
  const [initMs, minMs] = SPEED_MAP[s.speed];
  const [puBase, puRange] = PU_MAP[s.powerUpFreq];
  return { grid, cell, board: grid * cell, initMs, minMs, wallMode: s.wallMode, puBase, puRange };
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ── Types ───────────────────────────────────────────────────────────────────
type Dir = "U" | "D" | "L" | "R";
type PUType = "speedDown" | "doubleScore" | "star";
type Phase = "idle" | "playing" | "gameover";

interface Pos {
  x: number;
  y: number;
}
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}
interface PUItem {
  pos: Pos;
  type: PUType;
}
interface ActiveEffects {
  speedDown: number | null;
  doubleScore: number | null;
  star: number | null;
}
interface GS {
  phase: Phase;
  snake: Pos[];
  dir: Dir;
  nextDir: Dir;
  food: Pos;
  pu: PUItem | null;
  puCountdown: number;
  score: number;
  highScore: number;
  combo: number;
  comboEnd: number;
  effects: ActiveEffects;
  particles: Particle[];
  shakeEnd: number;
  lastTick: number;
  tickMs: number;
  rafId: number | null;
  pid: number;
  config: GameConfig;
}
interface ScorePopup {
  id: number;
  x: number;
  y: number;
  text: string;
  frame: number;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────
function puColor(t: PUType): string {
  return t === "speedDown" ? "#4af" : t === "doubleScore" ? "#ff4" : "#fff";
}
function puEmoji(t: PUType): string {
  return t === "speedDown" ? "⚡" : t === "doubleScore" ? "💥" : "🛡️";
}

function randomFree(exclude: Pos[], grid: number): Pos {
  let p: Pos;
  do {
    p = {
      x: Math.floor(Math.random() * grid),
      y: Math.floor(Math.random() * grid),
    };
  } while (exclude.some((q) => q.x === p.x && q.y === p.y));
  return p;
}

function calcMs(score: number, initMs: number, minMs: number): number {
  return Math.max(minMs, initMs - Math.floor(score / 50) * 10);
}

function spawnParticles(gs: GS, x: number, y: number, color: string): void {
  const { cell } = gs.config;
  const cx = x * cell + cell / 2;
  const cy = y * cell + cell / 2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const s = 1.5 + Math.random() * 2;
    gs.particles.push({
      id: ++gs.pid,
      x: cx,
      y: cy,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 1,
      color,
      size: 3 + Math.random() * 3,
    });
  }
}

function makeInitialGS(config: GameConfig): GS {
  const mid = Math.floor(config.grid / 2);
  return {
    phase: "idle",
    snake: [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ],
    dir: "R",
    nextDir: "R",
    food: { x: Math.min(mid + 5, config.grid - 1), y: mid },
    pu: null,
    puCountdown: config.puBase + Math.floor(config.puRange / 2),
    score: 0,
    highScore: 0,
    combo: 0,
    comboEnd: 0,
    effects: { speedDown: null, doubleScore: null, star: null },
    particles: [],
    shakeEnd: 0,
    lastTick: 0,
    tickMs: config.initMs,
    rafId: null,
    pid: 0,
    config,
  };
}

// ── Canvas draw ───────────────────────────────────────────────────────────────
function drawGame(canvas: HTMLCanvasElement, gs: GS): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { grid, cell, board } = gs.config;

  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, board, board);

  // Subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= grid; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, board);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(board, i * cell);
    ctx.stroke();
  }

  const now = Date.now();
  const starActive = gs.effects.star !== null && gs.effects.star > now;

  // Food
  ctx.font = `${cell - 4}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🍎", gs.food.x * cell + cell / 2, gs.food.y * cell + cell / 2);

  // Power-up
  if (gs.pu !== null) {
    ctx.fillText(
      puEmoji(gs.pu.type),
      gs.pu.pos.x * cell + cell / 2,
      gs.pu.pos.y * cell + cell / 2,
    );
  }

  // Snake
  gs.snake.forEach((seg, i) => {
    const alpha = 1 - (i / gs.snake.length) * 0.5;
    if (i === 0) {
      ctx.fillStyle = starActive ? "#e0e0ff" : "#39ff14";
      ctx.shadowColor = starActive ? "#aaf" : "#39ff14";
      ctx.shadowBlur = 18;
    } else {
      ctx.fillStyle = starActive
        ? `rgba(180,180,255,${alpha})`
        : `rgba(57,255,20,${alpha})`;
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.roundRect(
      seg.x * cell + 1,
      seg.y * cell + 1,
      cell - 2,
      cell - 2,
      i === 0 ? 6 : 3,
    );
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Particles
  gs.particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Opposite direction guard ──────────────────────────────────────────────────
const OPPOSITE: Record<Dir, Dir> = { U: "D", D: "U", L: "R", R: "L" };

// ── Setting option definitions ────────────────────────────────────────────
const GRID_OPTIONS: { value: GridSize; label: string; sub: string }[] = [
  { value: "SMALL", label: "15×15", sub: "狭い" },
  { value: "MEDIUM", label: "20×20", sub: "標準" },
  { value: "LARGE", label: "25×25", sub: "広い" },
];
const SPEED_OPTIONS: { value: SpeedLevel; label: string; sub: string }[] = [
  { value: "EASY", label: "EASY", sub: "ゆっくり" },
  { value: "NORMAL", label: "NORMAL", sub: "標準" },
  { value: "FAST", label: "FAST", sub: "高速" },
];
const WALL_OPTIONS: { value: WallMode; label: string; sub: string }[] = [
  { value: "SOLID", label: "SOLID", sub: "壁で死亡" },
  { value: "WRAP", label: "WRAP", sub: "すり抜け" },
];
const PU_OPTIONS: { value: PowerUpFreq; label: string; sub: string }[] = [
  { value: "LOW", label: "LOW", sub: "少ない" },
  { value: "NORMAL", label: "NORMAL", sub: "標準" },
  { value: "HIGH", label: "HIGH", sub: "多い" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState(loadSettings);
  const currentConfig = resolveConfig(settings);
  const gsRef = useRef<GS>(makeInitialGS(resolveConfig(loadSettings())));
  const popupIdRef = useRef(0);
  // Store tick fn in ref to avoid stale closure in RAF
  const tickFnRef = useRef<() => void>(() => {});

  const { playSweep, playArpeggio } = useAudio();
  const sfxRef = useRef({ playSweep, playArpeggio });
  useEffect(() => {
    sfxRef.current = { playSweep, playArpeggio };
  }, [playSweep, playArpeggio]);
  const { best: highScore, update: updateHiScore } = useHighScore("snakechaos");

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [effects, setEffects] = useState<ActiveEffects>({
    speedDown: null,
    doubleScore: null,
    star: null,
  });
  const [isShaking, setIsShaking] = useState(false);
  const [popups, setPopups] = useState<ScorePopup[]>([]);

  // ── Sync config into idle GS when settings change ────────────────────────
  useEffect(() => {
    const gs = gsRef.current;
    if (gs.phase !== "playing") gs.config = resolveConfig(settings);
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  // ── Add a score popup ──────────────────────────────────────────────────────
  const addPopup = useCallback((x: number, y: number, text: string) => {
    setPopups((prev) => [
      ...prev.slice(-12),
      { id: ++popupIdRef.current, x, y, text, frame: 0 },
    ]);
  }, []);

  // ── Single game tick ───────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const gs = gsRef.current;
    if (gs.phase !== "playing") return;

    const now = Date.now();
    const { grid, cell, initMs, minMs } = gs.config;
    const wrapMode = gs.config.wallMode === "WRAP";
    gs.dir = gs.nextDir;

    // New head position
    const head = gs.snake[0];
    if (!head) return;
    let nx = head.x + (gs.dir === "R" ? 1 : gs.dir === "L" ? -1 : 0);
    let ny = head.y + (gs.dir === "D" ? 1 : gs.dir === "U" ? -1 : 0);

    const starActive = gs.effects.star !== null && gs.effects.star > now;

    if (starActive || wrapMode) {
      nx = ((nx % grid) + grid) % grid;
      ny = ((ny % grid) + grid) % grid;
    }

    // Collision
    const wallHit = nx < 0 || nx >= grid || ny < 0 || ny >= grid;
    const selfHit = gs.snake.some((p) => p.x === nx && p.y === ny);

    if (!starActive && (wallHit || selfHit)) {
      gs.phase = "gameover";
      gs.shakeEnd = now + 600;
      updateHiScore(gs.score);
      setPhase("gameover");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 1000);
      sfxRef.current.playArpeggio(
        [440, 330, 220, 110],
        0.15,
        "sine",
        0.25,
        0.15,
      );
      return;
    }

    const newHead: Pos = { x: nx, y: ny };
    const newSnake = [newHead, ...gs.snake];

    let scoreGain = 0;
    let comboLabel = "";

    // Food
    if (nx === gs.food.x && ny === gs.food.y) {
      const comboOk = now < gs.comboEnd;
      gs.combo = comboOk ? gs.combo + 1 : 1;
      gs.comboEnd = now + 2000;

      const dbl =
        gs.effects.doubleScore !== null && gs.effects.doubleScore > now;
      const base = 10 * (dbl ? 2 : 1);
      const bonus = gs.combo >= 3 ? 2 : 1;
      scoreGain += base * bonus;
      gs.score += base * bonus;
      gs.food = randomFree(newSnake, grid);
      spawnParticles(gs, nx, ny, "#39ff14");
      sfxRef.current.playSweep(660, 1320, 0.12, "sine", 0.25);

      if (gs.combo >= 3) comboLabel = ` COMBO×${gs.combo}!`;

      // Maybe spawn power-up
      gs.puCountdown--;
      if (gs.puCountdown <= 0 && gs.pu === null) {
        const types: PUType[] = ["speedDown", "doubleScore", "star"];
        const t = types[Math.floor(Math.random() * types.length)];
        if (t !== undefined) {
          gs.pu = { pos: randomFree([...newSnake, gs.food], grid), type: t };
        }
        gs.puCountdown = gs.config.puBase + Math.floor(Math.random() * gs.config.puRange);
      }

      gs.tickMs = calcMs(gs.score, initMs, minMs);
    } else {
      newSnake.pop();
    }

    // Power-up pickup
    if (gs.pu !== null && nx === gs.pu.pos.x && ny === gs.pu.pos.y) {
      const t = gs.pu.type;
      let gain = 0;
      if (t === "speedDown") {
        gs.effects.speedDown = now + 3000;
        gain = 30;
      } else if (t === "doubleScore") {
        gs.effects.doubleScore = now + 5000;
        gain = 20;
      } else {
        gs.effects.star = now + 3000;
        gain = 50;
      }
      spawnParticles(gs, nx, ny, puColor(t));
      sfxRef.current.playArpeggio(
        [440, 554, 659, 880],
        0.09,
        "sine",
        0.18,
        0.09,
      );
      gs.score += gain;
      scoreGain += gain;
      gs.pu = null;
    }

    gs.snake = newSnake;

    if (scoreGain > 0) {
      addPopup(
        nx * cell + cell / 2,
        ny * cell - 4,
        `+${scoreGain}${comboLabel}`,
      );
    }

    setScore(gs.score);
    setCombo(gs.combo);
    setEffects({ ...gs.effects });
  }, [addPopup, updateHiScore]);

  // Keep tickFnRef current
  useEffect(() => {
    tickFnRef.current = tick;
  }, [tick]);

  // ── RAF (render + particle update + timed tick) ────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = () => {
      const gs = gsRef.current;
      const now = Date.now();

      // Expire effects
      gs.effects = {
        speedDown:
          gs.effects.speedDown !== null && gs.effects.speedDown > now
            ? gs.effects.speedDown
            : null,
        doubleScore:
          gs.effects.doubleScore !== null && gs.effects.doubleScore > now
            ? gs.effects.doubleScore
            : null,
        star:
          gs.effects.star !== null && gs.effects.star > now
            ? gs.effects.star
            : null,
      };

      // Game tick
      if (gs.phase === "playing" && now - gs.lastTick >= gs.tickMs) {
        gs.lastTick = now;
        tickFnRef.current();
      }

      // Particle physics
      gs.particles = gs.particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vx: p.vx * 0.95,
          vy: p.vy * 0.95,
          life: p.life - 0.035,
        }))
        .filter((p) => p.life > 0);

      // Age popups
      setPopups((prev) =>
        prev
          .map((p) => ({ ...p, frame: p.frame + 1 }))
          .filter((p) => p.frame < 60),
      );

      drawGame(canvas, gs);
      gs.rafId = requestAnimationFrame(loop);
    };

    gsRef.current.rafId = requestAnimationFrame(loop);
    // eslint cleanup
    const gs = gsRef.current;
    return () => {
      if (gs.rafId !== null) cancelAnimationFrame(gs.rafId);
    };
  }, []);

  // ── Keyboard input ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      let d: Dir | null = null;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          d = "U";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          d = "D";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          d = "L";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          d = "R";
          break;
      }
      if (d !== null && d !== OPPOSITE[gs.dir]) {
        if (gs.phase === "idle" || gs.phase === "gameover") return;
        e.preventDefault();
        gs.nextDir = d;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Swipe support ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      const gs = gsRef.current;
      if (gs.phase !== "playing") return;
      let d: Dir;
      if (Math.abs(dx) > Math.abs(dy)) {
        d = dx > 0 ? "R" : "L";
      } else {
        d = dy > 0 ? "D" : "U";
      }
      if (d !== OPPOSITE[gs.dir]) gs.nextDir = d;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, []);

  // ── Soft key direction change ──────────────────────────────────────────────
  const changeDir = useCallback((d: Dir) => {
    const gs = gsRef.current;
    if (gs.phase !== "playing") return;
    if (d !== OPPOSITE[gs.dir]) gs.nextDir = d;
  }, []);

  // ── Start / Restart ────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const cfg = resolveConfig(settings);
    const fresh = makeInitialGS(cfg);
    fresh.phase = "playing";
    fresh.lastTick = Date.now();
    gsRef.current = fresh;
    setPhase("playing");
    setScore(0);
    setCombo(0);
    setEffects({ speedDown: null, doubleScore: null, star: null });
    setIsShaking(false);
    setPopups([]);
  }, [settings]);

  // ── Back to menu ───────────────────────────────────────────────────────
  const backToMenu = useCallback(() => {
    const cfg = resolveConfig(settings);
    gsRef.current = makeInitialGS(cfg);
    setPhase("idle");
    setScore(0);
    setCombo(0);
    setEffects({ speedDown: null, doubleScore: null, star: null });
    setIsShaking(false);
    setPopups([]);
  }, [settings]);

  // ── Effect bar helper ──────────────────────────────────────────────────────
  // deadline は RAF ループが null にするので、null チェックだけで十分
  const effectItems: { label: string; active: boolean; cls: string }[] = [
    { label: "⚡ SLOW", active: effects.speedDown !== null, cls: "eff-speed" },
    { label: "💥 ×2", active: effects.doubleScore !== null, cls: "eff-double" },
    { label: "🛡️ STAR", active: effects.star !== null, cls: "eff-star" },
  ];

  return (
    <GameShell title="Snake Chaos" gameId="snakechaos">
      <div className="app">
        <div className="header">
          <div className="score-group">
            <span className="label">SCORE</span>
            <span className="value">{score}</span>
          </div>
          <div className="score-group">
            <span className="label">BEST</span>
            <span className="value">{highScore}</span>
          </div>
          {combo >= 3 && <div className="combo-badge">COMBO ×{combo}!</div>}
        </div>

        {/* Active effects bar */}
        <div className="effects-bar">
          {effectItems.map(
            (item) =>
              item.active && (
                <span key={item.cls} className={`eff-badge ${item.cls}`}>
                  {item.label}
                </span>
              ),
          )}
        </div>

        {/* Game area */}
        <div className={`game-wrap${isShaking ? " shake" : ""}`}>
          <canvas ref={canvasRef} width={currentConfig.board} height={currentConfig.board} />

          {/* Score popups */}
          {popups.map((p) => (
            <div
              key={p.id}
              className="score-popup"
              style={{
                left: p.x,
                top: p.y - p.frame * 1.2,
                opacity: 1 - p.frame / 60,
              }}
            >
              {p.text}
            </div>
          ))}

          {/* Start overlay */}
          {phase === "idle" && (
            <div className="overlay">
              <div className="overlay-inner settings-panel">
                <h1 className="game-title">🐍 SNAKE CHAOS</h1>
                <div className="settings-card">
                  <div className="setting-row">
                    <span className="setting-label">GRID</span>
                    <div className="setting-options">
                      {GRID_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          className={`setting-btn${settings.gridSize === o.value ? " active" : ""}`}
                          onClick={() => updateSetting("gridSize", o.value)}
                        >
                          <span className="sb-main">{o.label}</span>
                          <span className="sb-sub">{o.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">SPEED</span>
                    <div className="setting-options">
                      {SPEED_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          className={`setting-btn${settings.speed === o.value ? " active" : ""}`}
                          onClick={() => updateSetting("speed", o.value)}
                        >
                          <span className="sb-main">{o.label}</span>
                          <span className="sb-sub">{o.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">WALL</span>
                    <div className="setting-options">
                      {WALL_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          className={`setting-btn${settings.wallMode === o.value ? " active" : ""}`}
                          onClick={() => updateSetting("wallMode", o.value)}
                        >
                          <span className="sb-main">{o.label}</span>
                          <span className="sb-sub">{o.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">POWER UP</span>
                    <div className="setting-options">
                      {PU_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          className={`setting-btn${settings.powerUpFreq === o.value ? " active" : ""}`}
                          onClick={() => updateSetting("powerUpFreq", o.value)}
                        >
                          <span className="sb-main">{o.label}</span>
                          <span className="sb-sub">{o.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="overlay-hint">Arrow keys / WASD / スワイプで操作</p>
                <button className="btn-start" onClick={startGame}>
                  GAME START
                </button>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {phase === "gameover" && (
            <div className="overlay">
              <div className="overlay-inner">
                <h2 className="over-title">GAME OVER</h2>
                <p className="over-score">SCORE &nbsp; {score}</p>
                <p className="over-hi">BEST &nbsp; {highScore}</p>
                <button className="btn-start" onClick={startGame}>
                  RESTART
                </button>
                <button className="btn-menu" onClick={backToMenu}>
                  MENU
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Soft keys for mobile */}
        <div className="softkeys">
          <div className="sk-row">
            <button className="sk-btn" onPointerDown={() => changeDir("U")}>
              ▲
            </button>
          </div>
          <div className="sk-row">
            <button className="sk-btn" onPointerDown={() => changeDir("L")}>
              ◀
            </button>
            <button className="sk-btn" onPointerDown={() => changeDir("D")}>
              ▼
            </button>
            <button className="sk-btn" onPointerDown={() => changeDir("R")}>
              ▶
            </button>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
