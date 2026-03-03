import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { useAudio, useHighScore, GameShell } from "../../../src/shared";

// ── Constants ───────────────────────────────────────────────────────────────
const GRID = 20;
const CELL = 24;
const BOARD = GRID * CELL; // 480px

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

function randomFree(exclude: Pos[]): Pos {
  let p: Pos;
  do {
    p = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (exclude.some((q) => q.x === p.x && q.y === p.y));
  return p;
}

function calcMs(score: number): number {
  return Math.max(80, 200 - Math.floor(score / 50) * 10);
}

function spawnParticles(gs: GS, x: number, y: number, color: string): void {
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
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

function makeInitialGS(): GS {
  return {
    phase: "idle",
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],
    dir: "R",
    nextDir: "R",
    food: { x: 15, y: 10 },
    pu: null,
    puCountdown: 5,
    score: 0,
    highScore: 0,
    combo: 0,
    comboEnd: 0,
    effects: { speedDown: null, doubleScore: null, star: null },
    particles: [],
    shakeEnd: 0,
    lastTick: 0,
    tickMs: 200,
    rafId: null,
    pid: 0,
  };
}

// ── Canvas draw ───────────────────────────────────────────────────────────────
function drawGame(canvas: HTMLCanvasElement, gs: GS): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, BOARD, BOARD);

  // Subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, BOARD);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(BOARD, i * CELL);
    ctx.stroke();
  }

  const now = Date.now();
  const starActive = gs.effects.star !== null && gs.effects.star > now;

  // Food
  ctx.font = `${CELL - 4}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🍎", gs.food.x * CELL + CELL / 2, gs.food.y * CELL + CELL / 2);

  // Power-up
  if (gs.pu !== null) {
    ctx.fillText(
      puEmoji(gs.pu.type),
      gs.pu.pos.x * CELL + CELL / 2,
      gs.pu.pos.y * CELL + CELL / 2,
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
      seg.x * CELL + 1,
      seg.y * CELL + 1,
      CELL - 2,
      CELL - 2,
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS>(makeInitialGS());
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
    gs.dir = gs.nextDir;

    // New head position
    const head = gs.snake[0];
    if (!head) return;
    let nx = head.x + (gs.dir === "R" ? 1 : gs.dir === "L" ? -1 : 0);
    let ny = head.y + (gs.dir === "D" ? 1 : gs.dir === "U" ? -1 : 0);

    const starActive = gs.effects.star !== null && gs.effects.star > now;

    if (starActive) {
      nx = ((nx % GRID) + GRID) % GRID;
      ny = ((ny % GRID) + GRID) % GRID;
    }

    // Collision
    const wallHit = nx < 0 || nx >= GRID || ny < 0 || ny >= GRID;
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
      gs.food = randomFree(newSnake);
      spawnParticles(gs, nx, ny, "#39ff14");
      sfxRef.current.playSweep(660, 1320, 0.12, "sine", 0.25);

      if (gs.combo >= 3) comboLabel = ` COMBO×${gs.combo}!`;

      // Maybe spawn power-up
      gs.puCountdown--;
      if (gs.puCountdown <= 0 && gs.pu === null) {
        const types: PUType[] = ["speedDown", "doubleScore", "star"];
        const t = types[Math.floor(Math.random() * types.length)];
        if (t !== undefined) {
          gs.pu = { pos: randomFree([...newSnake, gs.food]), type: t };
        }
        gs.puCountdown = 3 + Math.floor(Math.random() * 5);
      }

      gs.tickMs = calcMs(gs.score);
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
        nx * CELL + CELL / 2,
        ny * CELL - 4,
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
    const fresh = makeInitialGS();
    fresh.phase = "playing";
    fresh.lastTick = Date.now();
    gsRef.current = fresh;
    setPhase("playing");
    setScore(0);
    setCombo(0);
    setEffects({ speedDown: null, doubleScore: null, star: null });
    setIsShaking(false);
    setPopups([]);
  }, []);

  // ── Effect bar helper ──────────────────────────────────────────────────────
  // deadline は RAF ループが null にするので、null チェックだけで十分
  const effectItems: { label: string; active: boolean; cls: string }[] = [
    { label: "⚡ SLOW", active: effects.speedDown !== null, cls: "eff-speed" },
    { label: "💥 ×2", active: effects.doubleScore !== null, cls: "eff-double" },
    { label: "🛡️ STAR", active: effects.star !== null, cls: "eff-star" },
  ];

  return (
    <GameShell title="Snake Chaos">
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
          <canvas ref={canvasRef} width={BOARD} height={BOARD} />

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
              <div className="overlay-inner">
                <h1 className="game-title">🐍 SNAKE CHAOS</h1>
                <p className="overlay-hint">Arrow keys / WASD で操作</p>
                <p className="overlay-hint">スワイプでも遊べる</p>
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
