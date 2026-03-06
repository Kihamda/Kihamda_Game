import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { useAudio, GameShell, useHighScore } from "../../../src/shared";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "title" | "playing" | "stageclear" | "gameover";
type PowerType = "multiball" | "paddle" | "speed" | "explosive";

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  explosive: boolean;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
}

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface DroppingPower {
  type: PowerType;
  x: number;
  y: number;
  dy: number;
}

interface ActivePower {
  type: Exclude<PowerType, "explosive">;
  remaining: number; // seconds
}

interface PopupItem {
  id: number;
  x: number;
  y: number;
  text: string;
  isCombo: boolean;
}

interface GameState {
  phase: Phase;
  balls: Ball[];
  paddleX: number;
  paddleW: number;
  blocks: Block[];
  particles: Particle[];
  droppingPowers: DroppingPower[];
  activePowers: ActivePower[];
  score: number;
  lives: number;
  stage: number;
  combo: number;
  comboTimer: number;
  shake: number;
  mouseX: number;
  ballAttached: boolean;
  stageDelay: number;
  explosiveCharged: boolean;
  lastTime: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CW = 480;
const CH = 620;
const PADDLE_Y = 572;
const PADDLE_H = 12;
const BASE_PADDLE_W = 80;
const BLOCK_COLS = 8;
const BLOCK_ROWS = 6;
const BLK_GAP = 5;
const BLK_OFFSET_X = 10;
const BLK_W = (CW - BLK_OFFSET_X * 2 - BLK_GAP * (BLOCK_COLS - 1)) / BLOCK_COLS;
const BLK_H = 22;
const BLK_START_Y = 55;
const BALL_R = 8;
const BASE_SPEED = 4.5;
const POWER_DROP_CHANCE = 0.18;
const COMBO_RESET_MS = 2800;
const POWER_LABEL: Record<Exclude<PowerType, "explosive">, string> = {
  multiball: "🔴 MULTI 10s",
  paddle: "🔵 WIDE 8s",
  speed: "⚡ SLOW 6s",
};

// ─── Settings ─────────────────────────────────────────────────────────────────
interface Settings {
  lives: number;
  baseSpeed: number;
  paddleW: number;
  powerDropRate: number;
}

const DEFAULT_SETTINGS: Settings = {
  lives: 3,
  baseSpeed: BASE_SPEED,
  paddleW: BASE_PADDLE_W,
  powerDropRate: POWER_DROP_CHANCE,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem("brickblast_settings");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: Settings): void {
  localStorage.setItem("brickblast_settings", JSON.stringify(s));
}

const SETTING_OPTIONS: {
  key: keyof Settings;
  label: string;
  choices: { value: number; label: string }[];
}[] = [
  {
    key: "lives",
    label: "初期ライフ",
    choices: [
      { value: 1, label: "1" },
      { value: 3, label: "3" },
      { value: 5, label: "5" },
    ],
  },
  {
    key: "baseSpeed",
    label: "ボール速度",
    choices: [
      { value: 3.0, label: "SLOW" },
      { value: 4.5, label: "NORMAL" },
      { value: 6.0, label: "FAST" },
    ],
  },
  {
    key: "paddleW",
    label: "パドルサイズ",
    choices: [
      { value: 120, label: "WIDE" },
      { value: 80, label: "NORMAL" },
      { value: 50, label: "NARROW" },
    ],
  },
  {
    key: "powerDropRate",
    label: "パワーアップ出現率",
    choices: [
      { value: 0.08, label: "LOW" },
      { value: 0.18, label: "NORMAL" },
      { value: 0.35, label: "HIGH" },
    ],
  },
];

// ─── Game Helpers ─────────────────────────────────────────────────────────────
const BLOCK_COLORS: Record<number, string> = {
  3: "#4488ff",
  2: "#44cc66",
  1: "#ff4455",
};

function blockColor(hp: number): string {
  return BLOCK_COLORS[hp] ?? "#aaaaaa";
}

function makeBlocks(stage: number): Block[] {
  const blocks: Block[] = [];
  const rows = Math.min(3 + stage, BLOCK_ROWS);
  const maxHpRange = Math.min(stage, 3);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      const hp = 1 + Math.floor(Math.random() * maxHpRange);
      blocks.push({
        x: BLK_OFFSET_X + c * (BLK_W + BLK_GAP),
        y: BLK_START_Y + r * (BLK_H + BLK_GAP),
        w: BLK_W,
        h: BLK_H,
        hp,
        maxHp: hp,
      });
    }
  }
  return blocks;
}

function makeBall(paddleX: number, paddleW: number, speed: number): Ball {
  const ang = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;
  const sign = Math.random() < 0.5 ? -1 : 1;
  return {
    x: paddleX + paddleW / 2,
    y: PADDLE_Y - BALL_R - 1,
    dx: Math.cos(ang) * speed * sign,
    dy: -Math.abs(Math.sin(ang) * speed),
    radius: BALL_R,
    explosive: false,
  };
}

function currentSpeed(state: GameState, baseSpeed: number): number {
  const hasSpeed = state.activePowers.some((p) => p.type === "speed");
  return baseSpeed * (1 + state.stage * 0.08) * (hasSpeed ? 0.7 : 1);
}

function normalizeBall(ball: Ball, speed: number) {
  const mag = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
  if (mag < 0.01) return;
  ball.dx = (ball.dx / mag) * speed;
  ball.dy = (ball.dy / mag) * speed;
}

function spawnParticles(
  particles: Particle[],
  bx: number,
  by: number,
  bw: number,
  bh: number,
  color: string,
) {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 1.5 + Math.random() * 3.5;
    const maxLife = 0.5 + Math.random() * 0.7;
    particles.push({
      x: bx + bw / 2,
      y: by + bh / 2,
      dx: Math.cos(angle) * spd,
      dy: Math.sin(angle) * spd,
      life: maxLife,
      maxLife,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function maybeDrop(drops: DroppingPower[], x: number, y: number, dropChance: number) {
  if (Math.random() < dropChance) {
    const types: PowerType[] = ["multiball", "paddle", "speed", "explosive"];
    const type = types[Math.floor(Math.random() * types.length)]!;
    drops.push({ type, x, y, dy: 2.2 });
  }
}

const POWER_DOT: Record<PowerType, string> = {
  multiball: "#ff4455",
  paddle: "#4488ff",
  speed: "#ffdd22",
  explosive: "#ff8800",
};

// ─── Component ────────────────────────────────────────────────────────────────
const App = () => {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showTitle, setShowTitle] = useState(true);
  const settingsRef = useRef(settings);
  const startGameRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState>({
    phase: "title",
    balls: [],
    paddleX: CW / 2 - BASE_PADDLE_W / 2,
    paddleW: BASE_PADDLE_W,
    blocks: [],
    particles: [],
    droppingPowers: [],
    activePowers: [],
    score: 0,
    lives: 3,
    stage: 1,
    combo: 0,
    comboTimer: 0,
    shake: 0,
    mouseX: CW / 2,
    ballAttached: true,
    stageDelay: 0,
    explosiveCharged: false,
    lastTime: 0,
  });
  const {
    playTone: sharedPlayTone,
    playArpeggio,
    playMiss: sharedPlayMiss,
  } = useAudio();
  // Bridge hook callbacks into the imperative game loop via refs
  const { best: bestScore, update: updateBest } = useHighScore("brickblast");
  const sfxRef = useRef({ sharedPlayTone, playArpeggio, sharedPlayMiss });
  useEffect(() => {
    sfxRef.current = { sharedPlayTone, playArpeggio, sharedPlayMiss };
  }, [sharedPlayTone, playArpeggio, sharedPlayMiss]);
  const highScoreRef = useRef({ bestScore, updateBest });
  useEffect(() => {
    highScoreRef.current = { bestScore, updateBest };
  }, [bestScore, updateBest]);
  const rafRef = useRef<number>(0);
  const popupIdRef = useRef(0);

  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [activePowerBadges, setActivePowerBadges] = useState<ActivePower[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const gs = gsRef.current;

    // ── Input ──────────────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      const rect = canvasRef.current!.getBoundingClientRect();
      gs.mouseX = e.clientX - rect.left;
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      gs.mouseX = e.touches[0]!.clientX - rect.left;
    }
    function onPointerDown() {
      if (gs.phase === "title") {
        return;
      } else if (gs.phase === "playing" && gs.ballAttached) {
        gs.ballAttached = false;
      } else if (gs.phase === "gameover" || gs.phase === "stageclear") {
        if (gs.stageDelay <= 0) {
          if (gs.phase === "stageclear") {
            gs.stage++;
            nextStage();
          } else {
            gs.phase = "title";
            setShowTitle(true);
          }
        }
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);

    // ── Game Init ──────────────────────────────────────────────────────────
    function startGame() {
      gs.phase = "playing";
      gs.score = 0;
      gs.lives = settingsRef.current.lives;
      gs.stage = 1;
      gs.combo = 0;
      gs.comboTimer = 0;
      gs.activePowers = [];
      gs.droppingPowers = [];
      gs.particles = [];
      gs.explosiveCharged = false;
      setActivePowerBadges([]);
      nextStage();
    }

    startGameRef.current = startGame;

    function nextStage() {
      const basePW = settingsRef.current.paddleW;
      gs.blocks = makeBlocks(gs.stage);
      gs.balls = [];
      gs.ballAttached = true;
      gs.paddleW = hasPower("paddle") ? basePW * 1.5 : basePW;
      gs.paddleX = CW / 2 - gs.paddleW / 2;
      gs.particles = [];
      gs.droppingPowers = [];
      gs.phase = "playing";
      gs.stageDelay = 0;
    }

    function hasPower(type: PowerType): boolean {
      return gs.activePowers.some((p) => p.type === type);
    }

    function addActivePower(
      type: Exclude<PowerType, "explosive">,
      duration: number,
    ) {
      const existing = gs.activePowers.find((p) => p.type === type);
      if (existing) {
        existing.remaining = Math.max(existing.remaining, duration);
      } else {
        gs.activePowers.push({ type, remaining: duration });
      }
      setActivePowerBadges([...gs.activePowers]);
    }

    function addPopup(x: number, y: number, text: string, isCombo: boolean) {
      const id = ++popupIdRef.current;
      setPopups((prev) => [...prev, { id, x, y, text, isCombo }]);
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }, 1100);
    }

    // ── Collision ──────────────────────────────────────────────────────────
    function collideBallBlock(ball: Ball, block: Block): boolean {
      if (
        ball.x + ball.radius <= block.x ||
        ball.x - ball.radius >= block.x + block.w ||
        ball.y + ball.radius <= block.y ||
        ball.y - ball.radius >= block.y + block.h
      ) {
        return false;
      }
      const ol = ball.x + ball.radius - block.x;
      const or_ = block.x + block.w - (ball.x - ball.radius);
      const ot = ball.y + ball.radius - block.y;
      const ob = block.y + block.h - (ball.y - ball.radius);
      const min = Math.min(ol, or_, ot, ob);
      if (min === ot) ball.dy = -Math.abs(ball.dy);
      else if (min === ob) ball.dy = Math.abs(ball.dy);
      else if (min === ol) ball.dx = -Math.abs(ball.dx);
      else ball.dx = Math.abs(ball.dx);
      return true;
    }

    function destroyBlock(block: Block, ball: Ball) {
      const sfx = sfxRef.current;

      if (ball.explosive) {
        // 3×3 area explosion
        const blocksCopy = [...gs.blocks];
        blocksCopy.forEach((b) => {
          const colDist = Math.abs(
            Math.round((b.x - BLK_OFFSET_X) / (BLK_W + BLK_GAP)) -
              Math.round((block.x - BLK_OFFSET_X) / (BLK_W + BLK_GAP)),
          );
          const rowDist = Math.abs(
            Math.round((b.y - BLK_START_Y) / (BLK_H + BLK_GAP)) -
              Math.round((block.y - BLK_START_Y) / (BLK_H + BLK_GAP)),
          );
          if (colDist <= 1 && rowDist <= 1) {
            gs.score += b.hp;
            spawnParticles(gs.particles, b.x, b.y, b.w, b.h, blockColor(b.hp));
            maybeDrop(gs.droppingPowers, b.x + b.w / 2, b.y + b.h, settingsRef.current.powerDropRate);
            const freqs = [880, 660, 440] as const;
            sfx.sharedPlayTone(freqs[3 - b.hp] ?? 440, 0.09, "square", 0.18);
          }
        });
        gs.blocks = gs.blocks.filter((b) => {
          const colDist = Math.abs(
            Math.round((b.x - BLK_OFFSET_X) / (BLK_W + BLK_GAP)) -
              Math.round((block.x - BLK_OFFSET_X) / (BLK_W + BLK_GAP)),
          );
          const rowDist = Math.abs(
            Math.round((b.y - BLK_START_Y) / (BLK_H + BLK_GAP)) -
              Math.round((block.y - BLK_START_Y) / (BLK_H + BLK_GAP)),
          );
          return !(colDist <= 1 && rowDist <= 1);
        });
        ball.explosive = false;
        gs.shake = 12;
        gs.explosiveCharged = false;
        addPopup(block.x + block.w / 2, block.y, "💥 BLAST!", true);
      } else {
        block.hp--;
        const freqs = [880, 660, 440] as const;
        sfx.sharedPlayTone(
          freqs[3 - Math.max(block.hp, 1)] ?? 440,
          0.09,
          "square",
          0.18,
        );
        if (block.hp <= 0) {
          gs.score += block.maxHp;
          spawnParticles(
            gs.particles,
            block.x,
            block.y,
            block.w,
            block.h,
            blockColor(1),
          );
          maybeDrop(
            gs.droppingPowers,
            block.x + block.w / 2,
            block.y + block.h,
            settingsRef.current.powerDropRate,
          );
          gs.blocks = gs.blocks.filter((b) => b !== block);
          gs.combo++;
          gs.comboTimer = COMBO_RESET_MS;
          const bonus = gs.combo >= 3 ? gs.combo : 0;
          const pts = block.maxHp + bonus;
          gs.score += bonus;
          if (gs.combo >= 3) {
            addPopup(
              block.x + block.w / 2,
              block.y,
              `${gs.combo}× COMBO!`,
              true,
            );
          } else {
            addPopup(block.x + block.w / 2, block.y, `+${pts}`, false);
          }
        }
      }
    }

    // ── Update ─────────────────────────────────────────────────────────────
    function update(dt: number) {
      if (gs.phase !== "playing") return;

      // Combo timer
      if (gs.comboTimer > 0) {
        gs.comboTimer -= dt;
        if (gs.comboTimer <= 0) gs.combo = 0;
      }

      // Shake decay
      if (gs.shake > 0) gs.shake = Math.max(0, gs.shake - dt * 0.04);

      // Active power timers
      gs.activePowers = gs.activePowers.filter((p) => {
        p.remaining -= dt / 1000;
        return p.remaining > 0;
      });

      // Paddle width
      const basePW = settingsRef.current.paddleW;
      const targetPW = hasPower("paddle") ? basePW * 1.5 : basePW;
      gs.paddleW = gs.paddleW + (targetPW - gs.paddleW) * 0.15;

      // Paddle movement
      const minX = 0;
      const maxX = CW - gs.paddleW;
      const targetX = gs.mouseX - gs.paddleW / 2;
      gs.paddleX = Math.max(minX, Math.min(maxX, targetX));

      // Ball attached to paddle
      if (gs.ballAttached) {
        // recreate every frame so launch angle is fresh on release
        gs.balls = [makeBall(gs.paddleX, gs.paddleW, currentSpeed(gs, settingsRef.current.baseSpeed))];
        const b = gs.balls[0]!;
        b.x = gs.paddleX + gs.paddleW / 2;
        b.y = PADDLE_Y - BALL_R - 1;
        // NOTE: keep dx/dy from makeBall — they become the launch velocity
        return;
      }

      const speed = currentSpeed(gs, settingsRef.current.baseSpeed);

      // Ball movement & collision
      const toRemove: Ball[] = [];
      for (const ball of gs.balls) {
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall collisions
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.dx = Math.abs(ball.dx);
        }
        if (ball.x + ball.radius >= CW) {
          ball.x = CW - ball.radius;
          ball.dx = -Math.abs(ball.dx);
        }
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.dy = Math.abs(ball.dy);
        }

        // Paddle collision
        if (
          ball.dy > 0 &&
          ball.y + ball.radius >= PADDLE_Y &&
          ball.y + ball.radius <= PADDLE_Y + PADDLE_H + 6 &&
          ball.x >= gs.paddleX &&
          ball.x <= gs.paddleX + gs.paddleW
        ) {
          ball.dy = -Math.abs(ball.dy);
          const hitPos = (ball.x - gs.paddleX) / gs.paddleW - 0.5;
          ball.dx += hitPos * 2.8;
          normalizeBall(ball, speed);
          ball.y = PADDLE_Y - ball.radius;
        }

        // Block collision
        for (const block of [...gs.blocks]) {
          if (collideBallBlock(ball, block)) {
            destroyBlock(block, ball);
            break;
          }
        }

        // Ball lost
        if (ball.y - ball.radius > CH) {
          toRemove.push(ball);
        }
      }

      gs.balls = gs.balls.filter((b) => !toRemove.includes(b));

      // Miss detection
      if (gs.balls.length === 0) {
        gs.lives--;
        gs.combo = 0;
        gs.comboTimer = 0;
        sfxRef.current.sharedPlayMiss();
        if (gs.lives <= 0) {
          gs.phase = "gameover";
          gs.stageDelay = 1.5;
          highScoreRef.current.updateBest(gs.score);
        } else {
          gs.ballAttached = true;
        }
        setActivePowerBadges([...gs.activePowers]);
      }

      // Multiball: maintain ball count
      if (hasPower("multiball") && gs.balls.length > 0 && gs.balls.length < 3) {
        while (gs.balls.length < 3) {
          const src = gs.balls[0]!;
          const spread = Math.PI * 0.15;
          const angle =
            Math.atan2(src.dy, src.dx) + (Math.random() - 0.5) * spread;
          gs.balls.push({
            ...src,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
          });
        }
      }

      // Dropping power-ups
      gs.droppingPowers = gs.droppingPowers.filter((dp) => {
        dp.y += dp.dy;
        if (dp.y > CH) return false;
        // Catch with paddle
        if (
          dp.y + 8 >= PADDLE_Y &&
          dp.y <= PADDLE_Y + PADDLE_H + 10 &&
          dp.x >= gs.paddleX - 8 &&
          dp.x <= gs.paddleX + gs.paddleW + 8
        ) {
          applyPower(dp.type);
          return false;
        }
        return true;
      });

      // Particles
      const dtSec = dt / 1000;
      gs.particles = gs.particles.filter((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.dy += 0.08;
        p.life -= dtSec;
        return p.life > 0;
      });

      // Stage clear
      if (gs.blocks.length === 0 && !gs.ballAttached) {
        gs.phase = "stageclear";
        gs.stageDelay = 2;
        sfxRef.current.playArpeggio(
          [523, 659, 784, 1047, 1319],
          0.18,
          "sine",
          0.28,
          0.09,
        );
        setActivePowerBadges([...gs.activePowers]);
      }

      // Stage delay countdown
      if (
        (gs.phase === "stageclear" || gs.phase === "gameover") &&
        gs.stageDelay > 0
      ) {
        gs.stageDelay -= dtSec;
      }
    }

    function applyPower(type: PowerType) {
      sfxRef.current.playArpeggio(
        [523, 659, 784, 1047],
        0.12,
        "sine",
        0.22,
        0.07,
      );
      if (type === "explosive") {
        gs.explosiveCharged = true;
        gs.balls.forEach((b) => (b.explosive = true));
        addPopup(CW / 2, CH / 2 - 60, "💥 EXPLOSIVE!", true);
        return;
      }
      const durations: Record<Exclude<PowerType, "explosive">, number> = {
        multiball: 10,
        paddle: 8,
        speed: 6,
      };
      addActivePower(type, durations[type]);
      if (type === "multiball") {
        gs.shake = 10;
        if (gs.balls.length > 0 && !gs.ballAttached) {
          const src = gs.balls[0]!;
          const spd = currentSpeed(gs, settingsRef.current.baseSpeed);
          for (let i = 1; i < 3; i++) {
            const spread = (Math.PI / 6) * (i === 1 ? 1 : -1);
            const base = Math.atan2(src.dy, src.dx);
            gs.balls.push({
              ...src,
              dx: Math.cos(base + spread) * spd,
              dy: Math.sin(base + spread) * spd,
            });
          }
        }
        addPopup(CW / 2, CH / 2 - 40, "🔴 MULTI BALL!", true);
      }
    }

    // ── Draw ───────────────────────────────────────────────────────────────
    function draw() {
      // Shake transform
      const sx = gs.shake > 0 ? (Math.random() - 0.5) * gs.shake : 0;
      const sy = gs.shake > 0 ? (Math.random() - 0.5) * gs.shake : 0;
      ctx.save();
      ctx.translate(sx, sy);

      // Background
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(-CW * 0.1, -CH * 0.1, CW * 1.2, CH * 1.2);

      if (gs.phase === "title") {
        drawTitle();
      } else {
        drawGame();
        if (gs.phase === "stageclear")
          drawOverlay(
            "STAGE CLEAR!",
            `STAGE ${gs.stage}`,
            "#44ff88",
            gs.stageDelay,
          );
        if (gs.phase === "gameover")
          drawOverlay(
            "GAME OVER",
            `SCORE: ${gs.score}`,
            "#ff4455",
            gs.stageDelay,
            "クリック / タップでタイトルへ",
          );
      }

      ctx.restore();
    }

    function drawTitle() {
      const cx = CW / 2;
      // Logo glow
      ctx.shadowColor = "#4488ff";
      ctx.shadowBlur = 30;
      ctx.fillStyle = "#4488ff";
      ctx.font = "bold 54px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BRICK", cx, 200);
      ctx.fillStyle = "#ff4455";
      ctx.fillText("BLAST", cx, 260);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#aaaacc";
      ctx.font = "18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("マウス / タッチでパドルを操作", cx, 320);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "14px monospace";
      ctx.fillText("クリック / タップでスタート", cx, 420);

      // Decorative blocks
      const colors = ["#4488ff", "#44cc66", "#ff4455"];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = colors[i % 3]!;
        ctx.fillRect(
          BLK_OFFSET_X + i * (BLK_W + BLK_GAP),
          CH - 120,
          BLK_W,
          BLK_H,
        );
      }
    }

    function drawGame() {
      // HUD
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE  ${gs.score}`, 10, 26);
      ctx.textAlign = "center";
      ctx.fillText(`STAGE ${gs.stage}`, CW / 2, 26);
      ctx.textAlign = "right";
      ctx.fillText("❤️".repeat(gs.lives), CW - 10, 26);

      // Combo
      if (gs.combo >= 2) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.font = `bold ${14 + gs.combo * 2}px 'Segoe UI', sans-serif`;
        ctx.fillStyle = `hsl(${270 + gs.combo * 20}, 100%, 70%)`;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fillText(`${gs.combo}× COMBO`, CW / 2, 44);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Active power timers on canvas
      if (gs.activePowers.length > 0) {
        ctx.font = "12px monospace";
        ctx.textAlign = "left";
        gs.activePowers.forEach((ap, i) => {
          const label = POWER_LABEL[ap.type];
          const barW = 80;
          const maxDur =
            ap.type === "multiball" ? 10 : ap.type === "paddle" ? 8 : 6;
          const ratio = ap.remaining / maxDur;
          const bx = CW - barW - 8;
          const by = 40 + i * 22;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(bx - 2, by - 12, barW + 4, 14);
          ctx.fillStyle = POWER_DOT[ap.type];
          ctx.fillRect(bx, by - 11, barW * ratio, 12);
          ctx.fillStyle = "#fff";
          ctx.font = "10px monospace";
          ctx.textAlign = "right";
          ctx.fillText(label.split(" ")[0] ?? "", CW - 8, by - 1);
        });
      }

      // Blocks
      for (const b of gs.blocks) {
        const base = blockColor(b.hp);
        ctx.fillStyle = base;
        ctx.beginPath();
        roundRect(ctx, b.x, b.y, b.w, b.h, 4);
        ctx.fill();
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, 6, 2);
        ctx.fill();
        // HP label if > 1
        if (b.hp > 1) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.fillText(String(b.hp), b.x + b.w / 2, b.y + b.h / 2 + 4);
        }
      }

      // Particles
      for (const p of gs.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // Dropping powers
      for (const dp of gs.droppingPowers) {
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = POWER_DOT[dp.type];
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        const letter = dp.type[0]!.toUpperCase();
        ctx.fillText(letter, dp.x, dp.y + 4);
      }

      // Paddle
      const px = gs.paddleX;
      const pw = gs.paddleW;
      const padColor = gs.explosiveCharged
        ? "#ff8800"
        : hasPower("paddle")
          ? "#4488ff"
          : "#ccddff";
      ctx.fillStyle = padColor;
      ctx.beginPath();
      roundRect(ctx, px, PADDLE_Y, pw, PADDLE_H, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      roundRect(ctx, px + 4, PADDLE_Y + 2, pw - 8, 4, 2);
      ctx.fill();

      // Balls
      for (const ball of gs.balls) {
        const ballColor = ball.explosive ? "#ff8800" : "#ffffff";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ballColor;
        if (ball.explosive) {
          ctx.shadowColor = "#ff8800";
          ctx.shadowBlur = 14;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        // Shine
        ctx.beginPath();
        ctx.arc(
          ball.x - ball.radius * 0.3,
          ball.y - ball.radius * 0.3,
          ball.radius * 0.35,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fill();
      }

      // "Click to launch" hint
      if (gs.ballAttached) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "13px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("クリック / タップでボール発射", CW / 2, CH - 14);
      }
    }

    function drawOverlay(
      title: string,
      sub: string,
      color: string,
      delay: number,
      hint = "クリック / タップで続ける",
    ) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, CW, CH);
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
      ctx.fillStyle = color;
      ctx.font = "bold 48px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(title, CW / 2, CH / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ccccdd";
      ctx.font = "22px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(sub, CW / 2, CH / 2 + 20);
      if (delay <= 0) {
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = "15px monospace";
        ctx.fillText(hint, CW / 2, CH / 2 + 70);
      }
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(
        `BEST: ${highScoreRef.current.bestScore}`,
        CW / 2,
        CH / 2 + 50,
      );
    }

    function roundRect(
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) {
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }

    // ── Loop ───────────────────────────────────────────────────────────────
    let prevTime = 0;
    function loop(ts: number) {
      const dt = Math.min(ts - prevTime, 50);
      prevTime = ts;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [setPopups, setActivePowerBadges, setShowTitle]);

  const handleStart = useCallback(() => {
    saveSettings(settings);
    setShowTitle(false);
    startGameRef.current?.();
  }, [settings]);

  const updateSetting = useCallback(
    (key: keyof Settings, value: number) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  return (
    <GameShell title="Brick Blast" gameId="brickblast">
      <div className="game-wrapper">
        <div className="game-container">
          <canvas ref={canvasRef} width={CW} height={CH} />
          {showTitle && (
            <div className="settings-overlay">
              <div className="settings-panel">
                <h1 className="settings-logo">
                  <span className="logo-brick">BRICK</span>{" "}
                  <span className="logo-blast">BLAST</span>
                </h1>
                <p className="settings-hint">
                  マウス / タッチでパドルを操作
                </p>
                {SETTING_OPTIONS.map((group) => (
                  <div key={group.key} className="setting-group">
                    <div className="setting-label">{group.label}</div>
                    <div className="setting-options">
                      {group.choices.map((opt) => (
                        <button
                          key={opt.value}
                          className={`setting-btn${settings[group.key] === opt.value ? " active" : ""}`}
                          onClick={() => updateSetting(group.key, opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="start-btn" onClick={handleStart}>
                  START
                </button>
              </div>
            </div>
          )}
          <div className="popup-layer" aria-hidden="true">
            {popups.map((p) => (
              <div
                key={p.id}
                className={`score-popup${p.isCombo ? " combo" : ""}`}
                style={{ left: p.x, top: p.y }}
              >
                {p.text}
              </div>
            ))}
          </div>
          {activePowerBadges.length > 0 && (
            <div className="power-indicator" aria-live="polite">
              {activePowerBadges.map((ap) => (
                <div key={ap.type} className="power-badge">
                  {POWER_LABEL[ap.type]}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
};

export default App;
