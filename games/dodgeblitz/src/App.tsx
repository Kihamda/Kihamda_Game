import { useEffect, useRef, useState } from "react";
import "./App.css";
import { useAudio, useHighScore, GameShell } from "../../../src/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

type GamePhase = "waiting" | "playing" | "gameover";
type BulletType = "normal" | "homing";
type ItemType = "bomb" | "shield" | "slow";
type GameEvent = "gameover" | "nearmiss" | "bomb" | "waveup";

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: BulletType;
}

interface Laser {
  id: number;
  y: number;
  phase: "warning" | "active";
  timer: number;
}

interface Item {
  id: number;
  x: number;
  y: number;
  type: ItemType;
  radius: number;
  bobTimer: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

interface FloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  life: number;
  maxLife: number;
  fontSize: number;
}

interface GameState {
  phase: "playing" | "gameover";
  score: number;
  wave: number;
  survivalMs: number;
  playerX: number;
  playerY: number;
  cursorX: number;
  cursorY: number;
  bullets: Bullet[];
  lasers: Laser[];
  items: Item[];
  particles: Particle[];
  floatTexts: FloatText[];
  shieldMs: number;
  slowMs: number;
  bulletSpawnTimer: number;
  laserSpawnTimer: number;
  itemSpawnTimer: number;
  scoreTimer: number;
  waveUpDisplayTimer: number;
  waveUpText: string;
  nearMissTimer: number;
  shakeTimer: number;
  shakeX: number;
  shakeY: number;
  nextId: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

interface GameSettings {
  playerSize: "large" | "normal" | "small";
  difficulty: "easy" | "normal" | "hard";
  itemFrequency: "low" | "normal" | "high";
  startWave: 1 | 2 | 3;
}

interface ResolvedSettings {
  playerRadius: number;
  speedMul: number;
  countMul: number;
  itemInterval: number;
  startWave: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  playerSize: "normal",
  difficulty: "normal",
  itemFrequency: "normal",
  startWave: 1,
};

const SETTINGS_KEY = "dodgeblitz_settings";

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: GameSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYER_RADIUS = 8;
const PLAYER_LERP = 0.1;
const BULLET_RADIUS = 6;
const LASER_WARNING_MS = 1200;
const LASER_ACTIVE_MS = 350;
const LASER_HALF_H = 4;
const ITEM_RADIUS = 14;
const NEAR_MISS_DIST = 22;
const SHAKE_DIST = 38;
const ITEM_SPAWN_INTERVAL = 7500;
const LASER_SPAWN_BASE = 6000;
const WAVE_DURATION_MS = 30000;

function resolveSettings(s: GameSettings): ResolvedSettings {
  return {
    playerRadius: { large: 12, normal: PLAYER_RADIUS, small: 5 }[s.playerSize],
    speedMul: { easy: 0.7, normal: 1, hard: 1.3 }[s.difficulty],
    countMul: { easy: 0.7, normal: 1, hard: 1.3 }[s.difficulty],
    itemInterval: { low: 12000, normal: ITEM_SPAWN_INTERVAL, high: 4000 }[
      s.itemFrequency
    ],
    startWave: s.startWave,
  };
}

function bulletsPerSecond(wave: number, countMul: number): number {
  return Math.min(3 + (wave - 1) * (17 / 9), 20) * countMul;
}

// ─── Game state factory ───────────────────────────────────────────────────────

function createGameState(
  w: number,
  h: number,
  rs: ResolvedSettings,
): GameState {
  return {
    phase: "playing",
    score: 0,
    wave: rs.startWave,
    survivalMs: (rs.startWave - 1) * WAVE_DURATION_MS,
    playerX: w / 2,
    playerY: h / 2,
    cursorX: w / 2,
    cursorY: h / 2,
    bullets: [],
    lasers: [],
    items: [],
    particles: [],
    floatTexts: [],
    shieldMs: 0,
    slowMs: 0,
    bulletSpawnTimer: 0,
    laserSpawnTimer: LASER_SPAWN_BASE,
    itemSpawnTimer: rs.itemInterval,
    scoreTimer: 0,
    waveUpDisplayTimer: 0,
    waveUpText: "",
    nearMissTimer: 0,
    shakeTimer: 0,
    shakeX: 0,
    shakeY: 0,
    nextId: 1,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dist2D(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function spawnBullet(
  gs: GameState,
  w: number,
  h: number,
  rs: ResolvedSettings,
): void {
  const speedBase = (2 + gs.wave * 0.4) * rs.speedMul;
  const slow = gs.slowMs > 0 ? 0.35 : 1;
  const speed = speedBase * slow;
  const side = Math.floor(Math.random() * 4);
  let x = 0,
    y = 0,
    vx = 0,
    vy = 0;
  const spread = (Math.random() - 0.5) * 1.2;
  switch (side) {
    case 0:
      x = Math.random() * w;
      y = -12;
      vx = spread * speed;
      vy = speed;
      break;
    case 1:
      x = w + 12;
      y = Math.random() * h;
      vx = -speed;
      vy = spread * speed;
      break;
    case 2:
      x = Math.random() * w;
      y = h + 12;
      vx = spread * speed;
      vy = -speed;
      break;
    default:
      x = -12;
      y = Math.random() * h;
      vx = speed;
      vy = spread * speed;
      break;
  }
  const homingChance = Math.min(0.1 + gs.wave * 0.04, 0.4);
  const type: BulletType = Math.random() < homingChance ? "homing" : "normal";
  gs.bullets.push({
    id: gs.nextId++,
    x,
    y,
    vx,
    vy,
    radius: BULLET_RADIUS,
    type,
  });
}

function spawnLaser(gs: GameState, h: number): void {
  const y = 50 + Math.random() * (h - 100);
  gs.lasers.push({
    id: gs.nextId++,
    y,
    phase: "warning",
    timer: LASER_WARNING_MS,
  });
}

function spawnItem(gs: GameState, w: number, h: number): void {
  const types: ItemType[] = ["bomb", "shield", "slow"];
  const type = types[Math.floor(Math.random() * types.length)];
  gs.items.push({
    id: gs.nextId++,
    x: ITEM_RADIUS * 2 + Math.random() * (w - ITEM_RADIUS * 4),
    y: ITEM_RADIUS * 2 + Math.random() * (h - ITEM_RADIUS * 4),
    type,
    radius: ITEM_RADIUS,
    bobTimer: Math.random() * Math.PI * 2,
  });
}

function spawnExplosion(gs: GameState, x: number, y: number): void {
  const colors = ["#ff4", "#f80", "#fff", "#f40"];
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    gs.particles.push({
      id: gs.nextId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 3 + Math.random() * 7,
      alpha: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 700,
      maxLife: 700,
    });
  }
}

function addFloat(
  gs: GameState,
  x: number,
  y: number,
  text: string,
  color: string,
  fontSize: number,
): void {
  gs.floatTexts.push({
    id: gs.nextId++,
    x,
    y,
    text,
    color,
    alpha: 1,
    vy: -1.5,
    life: 900,
    maxLife: 900,
    fontSize,
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

function update(
  gs: GameState,
  dt: number,
  w: number,
  h: number,
  rs: ResolvedSettings,
): GameEvent[] {
  if (gs.phase !== "playing") return [];
  const events: GameEvent[] = [];

  // Wave-up pause: all bullets frozen, but effects continue
  if (gs.waveUpDisplayTimer > 0) {
    gs.waveUpDisplayTimer -= dt;
    tickParticles(gs, dt);
    tickFloats(gs, dt);
    tickShake(gs, dt);
    gs.nearMissTimer = Math.max(0, gs.nearMissTimer - dt);
    return events;
  }

  const slow = gs.slowMs > 0 ? 0.35 : 1;

  // ── Core timers ──
  gs.survivalMs += dt;
  gs.shieldMs = Math.max(0, gs.shieldMs - dt);
  gs.slowMs = Math.max(0, gs.slowMs - dt);
  gs.nearMissTimer = Math.max(0, gs.nearMissTimer - dt);

  // ── Wave progression ──
  const newWave = Math.floor(gs.survivalMs / WAVE_DURATION_MS) + 1;
  if (newWave > gs.wave) {
    gs.wave = newWave;
    gs.waveUpDisplayTimer = 1800;
    gs.waveUpText = `WAVE ${gs.wave}`;
    // Clear field on wave up
    gs.bullets = [];
    gs.lasers = [];
    events.push("waveup");
  }

  // ── Score: +1 every 100ms ──
  gs.scoreTimer += dt;
  while (gs.scoreTimer >= 100) {
    gs.scoreTimer -= 100;
    gs.score++;
  }

  // ── Player movement (lerp toward cursor) ──
  gs.playerX += (gs.cursorX - gs.playerX) * PLAYER_LERP;
  gs.playerY += (gs.cursorY - gs.playerY) * PLAYER_LERP;
  // Clamp to canvas
  gs.playerX = Math.max(
    rs.playerRadius,
    Math.min(w - rs.playerRadius, gs.playerX),
  );
  gs.playerY = Math.max(
    rs.playerRadius,
    Math.min(h - rs.playerRadius, gs.playerY),
  );

  // ── Bullet spawning ──
  const interval = 1000 / bulletsPerSecond(gs.wave, rs.countMul);
  gs.bulletSpawnTimer += dt;
  while (gs.bulletSpawnTimer >= interval) {
    gs.bulletSpawnTimer -= interval;
    spawnBullet(gs, w, h, rs);
  }

  // ── Laser spawning ──
  gs.laserSpawnTimer -= dt;
  if (gs.laserSpawnTimer <= 0) {
    spawnLaser(gs, h);
    gs.laserSpawnTimer = Math.max(2000, LASER_SPAWN_BASE - gs.wave * 250);
  }

  // ── Item spawning ──
  gs.itemSpawnTimer -= dt;
  if (gs.itemSpawnTimer <= 0) {
    if (gs.items.length < 3) spawnItem(gs, w, h);
    gs.itemSpawnTimer = rs.itemInterval;
  }

  // ── Update bullets ──
  const deadBullets = new Set<number>();
  for (const b of gs.bullets) {
    b.x += b.vx * slow;
    b.y += b.vy * slow;

    // Homing behaviour
    if (b.type === "homing") {
      const dx = gs.playerX - b.x;
      const dy = gs.playerY - b.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const str = 0.03 * slow;
      b.vx += (dx / d) * str;
      b.vy += (dy / d) * str;
      const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      const cap = (3 + gs.wave * 0.35) * rs.speedMul;
      if (spd > cap) {
        b.vx = (b.vx / spd) * cap;
        b.vy = (b.vy / spd) * cap;
      }
    }

    // Cull off-screen
    if (b.x < -30 || b.x > w + 30 || b.y < -30 || b.y > h + 30) {
      deadBullets.add(b.id);
      continue;
    }

    // Collision with player
    const d = dist2D(b.x, b.y, gs.playerX, gs.playerY);
    const hitDist = b.radius + rs.playerRadius;
    if (d < hitDist) {
      if (gs.shieldMs > 0) {
        deadBullets.add(b.id);
      } else {
        gs.phase = "gameover";
        events.push("gameover");
        return events;
      }
    } else if (d < hitDist + NEAR_MISS_DIST && gs.nearMissTimer <= 0) {
      gs.nearMissTimer = 500;
      events.push("nearmiss");
      addFloat(gs, gs.playerX, gs.playerY - 30, "CLOSE!", "#f44", 18);
      if (d < hitDist + SHAKE_DIST) {
        gs.shakeTimer = 180;
        gs.shakeX = (Math.random() - 0.5) * 6;
        gs.shakeY = (Math.random() - 0.5) * 6;
      }
    }
  }
  gs.bullets = gs.bullets.filter((b) => !deadBullets.has(b.id));

  // ── Update lasers ──
  const deadLasers = new Set<number>();
  for (const l of gs.lasers) {
    l.timer -= dt * (l.phase === "active" ? slow : 1);
    if (l.timer <= 0) {
      if (l.phase === "warning") {
        l.phase = "active";
        l.timer = LASER_ACTIVE_MS;
      } else {
        deadLasers.add(l.id);
        continue;
      }
    }
    if (l.phase === "active" && gs.shieldMs <= 0) {
      const pTop = gs.playerY - rs.playerRadius;
      const pBot = gs.playerY + rs.playerRadius;
      if (pTop < l.y + LASER_HALF_H && pBot > l.y - LASER_HALF_H) {
        gs.phase = "gameover";
        events.push("gameover");
        return events;
      }
    }
  }
  gs.lasers = gs.lasers.filter((l) => !deadLasers.has(l.id));

  // ── Update items ──
  gs.items = gs.items.filter((item) => {
    item.bobTimer += dt * 0.003;
    if (
      dist2D(item.x, item.y, gs.playerX, gs.playerY) <
      item.radius + rs.playerRadius
    ) {
      applyItem(gs, item, events);
      return false;
    }
    return true;
  });

  tickParticles(gs, dt);
  tickFloats(gs, dt);
  tickShake(gs, dt);
  return events;
}

function applyItem(gs: GameState, item: Item, events: GameEvent[]): void {
  switch (item.type) {
    case "bomb":
      gs.score += 100;
      spawnExplosion(gs, item.x, item.y);
      gs.bullets = [];
      gs.lasers = [];
      addFloat(gs, gs.playerX, gs.playerY - 40, "+100 BOOM!", "#ff0", 22);
      events.push("bomb");
      gs.shakeTimer = 380;
      gs.shakeX = (Math.random() - 0.5) * 14;
      gs.shakeY = (Math.random() - 0.5) * 14;
      break;
    case "shield":
      gs.shieldMs = 3000;
      addFloat(gs, gs.playerX, gs.playerY - 40, "SHIELD ON", "#4cf", 20);
      break;
    case "slow":
      gs.slowMs = 3000;
      addFloat(gs, gs.playerX, gs.playerY - 40, "SLOW!", "#a0f", 20);
      break;
  }
}

function tickParticles(gs: GameState, dt: number): void {
  const f = dt / 16;
  gs.particles = gs.particles.filter((p) => {
    p.life -= dt;
    p.x += p.vx * f;
    p.y += p.vy * f;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.alpha = Math.max(0, p.life / p.maxLife);
    return p.life > 0;
  });
}

function tickFloats(gs: GameState, dt: number): void {
  gs.floatTexts = gs.floatTexts.filter((ft) => {
    ft.life -= dt;
    ft.y += ft.vy;
    ft.alpha = Math.max(0, ft.life / ft.maxLife);
    return ft.life > 0;
  });
}

function tickShake(gs: GameState, dt: number): void {
  if (gs.shakeTimer <= 0) return;
  gs.shakeTimer = Math.max(0, gs.shakeTimer - dt);
  if (gs.shakeTimer > 0) {
    const intensity = gs.shakeTimer / 380;
    gs.shakeX = (Math.random() - 0.5) * 6 * intensity;
    gs.shakeY = (Math.random() - 0.5) * 6 * intensity;
  } else {
    gs.shakeX = 0;
    gs.shakeY = 0;
  }
}

// ─── Draw ────────────────────────────────────────────────────────────────────

function draw(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
  w: number,
  h: number,
  rs: ResolvedSettings,
): void {
  ctx.save();
  ctx.translate(gs.shakeX, gs.shakeY);

  // Background
  ctx.fillStyle = "#000";
  ctx.fillRect(-16, -16, w + 32, h + 32);

  // Near-miss overlay
  if (gs.nearMissTimer > 0) {
    ctx.fillStyle = `rgba(255,40,40,${(gs.nearMissTimer / 500) * 0.2})`;
    ctx.fillRect(-16, -16, w + 32, h + 32);
  }

  // Active effect tints
  if (gs.shieldMs > 0) {
    ctx.fillStyle = "rgba(0,160,255,0.06)";
    ctx.fillRect(-16, -16, w + 32, h + 32);
  }
  if (gs.slowMs > 0) {
    ctx.fillStyle = "rgba(140,0,255,0.06)";
    ctx.fillRect(-16, -16, w + 32, h + 32);
  }

  // ── Lasers ──
  for (const l of gs.lasers) {
    if (l.phase === "warning") {
      const p = 1 - l.timer / LASER_WARNING_MS;
      ctx.strokeStyle = `rgba(80,160,255,${0.15 + p * 0.45})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(0, l.y);
      ctx.lineTo(w, l.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(80,160,255,${0.5 + p * 0.5})`;
      ctx.font = "bold 13px Courier New";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("» LASER »", 10, l.y);
    } else {
      const a =
        l.timer / LASER_ACTIVE_MS > 0.5 ? 1 : (l.timer / LASER_ACTIVE_MS) * 2;
      ctx.strokeStyle = `rgba(100,220,255,${a})`;
      ctx.lineWidth = LASER_HALF_H * 2;
      ctx.shadowColor = "#4af";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.moveTo(0, l.y);
      ctx.lineTo(w, l.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // ── Particles ──
  for (const p of gs.particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // ── Items ──
  for (const item of gs.items) {
    const bobY = Math.sin(item.bobTimer) * 4;
    ctx.save();
    ctx.translate(item.x, item.y + bobY);
    const ringColor =
      item.type === "bomb" ? "#ff0" : item.type === "shield" ? "#4cf" : "#a0f";
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = "16px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const icon =
      item.type === "bomb" ? "⭐" : item.type === "shield" ? "🛡" : "⏱";
    ctx.fillText(icon, 0, 1);
    ctx.restore();
  }

  // ── Bullets ──
  for (const b of gs.bullets) {
    ctx.beginPath();
    if (b.type === "homing") {
      ctx.fillStyle = "#f33";
      ctx.shadowColor = "#f55";
    } else {
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#aaf";
    }
    ctx.shadowBlur = 8;
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // ── Player ──
  const playerGlow = gs.shieldMs > 0 ? "#4cf" : "#fff";
  ctx.beginPath();
  ctx.fillStyle = playerGlow;
  ctx.shadowColor = playerGlow;
  ctx.shadowBlur = gs.shieldMs > 0 ? 32 : 18;
  ctx.arc(gs.playerX, gs.playerY, rs.playerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Shield arc
  if (gs.shieldMs > 0) {
    const arc = (gs.shieldMs / 3000) * Math.PI * 2;
    ctx.strokeStyle = "#4cf";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#4cf";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(
      gs.playerX,
      gs.playerY,
      rs.playerRadius + 8,
      -Math.PI / 2,
      -Math.PI / 2 + arc,
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Float texts ──
  for (const ft of gs.floatTexts) {
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${ft.fontSize}px Courier New`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  // ── HUD ──
  drawHUD(ctx, gs, w, h);

  // ── Wave-up overlay ──
  if (gs.waveUpDisplayTimer > 0) {
    const t = gs.waveUpDisplayTimer / 1800;
    const alpha = t > 0.8 ? 1 : t / 0.8;
    const scale = 0.8 + t * 0.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 50;
    ctx.font = "bold 68px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(gs.waveUpText, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
  w: number,
  h: number,
): void {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 17px Courier New";

  const totalSec = Math.floor(gs.survivalMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  ctx.fillText(`SCORE  ${gs.score}`, 16, 16);
  ctx.fillText(`WAVE   ${gs.wave}`, 16, 38);
  ctx.fillText(`TIME   ${mm}:${ss}`, 16, 60);

  // Wave progress bar (top right)
  const waveP = (gs.survivalMs % WAVE_DURATION_MS) / WAVE_DURATION_MS;
  const bW = 130;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(w - bW - 16, 16, bW, 7);
  ctx.fillStyle = "#7af";
  ctx.fillRect(w - bW - 16, 16, bW * waveP, 7);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px Courier New";
  ctx.textAlign = "right";
  ctx.fillText("NEXT WAVE", w - 16, 26);

  // Active effect bars (bottom center)
  let barY = h - 20;
  if (gs.slowMs > 0) {
    drawEffectBar(ctx, w / 2, barY, gs.slowMs / 3000, "#a0f", "SLOW");
    barY -= 26;
  }
  if (gs.shieldMs > 0) {
    drawEffectBar(ctx, w / 2, barY, gs.shieldMs / 3000, "#4cf", "SHIELD");
  }
}

function drawEffectBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  ratio: number,
  color: string,
  label: string,
): void {
  const bW = 180;
  const bH = 6;
  const x = cx - bW / 2;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(x, y, bW, bH);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, bW * ratio, bH);
  ctx.fillStyle = color;
  ctx.font = "10px Courier New";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, cx, y);
}

// ─── App ─────────────────────────────────────────────────────────────────────

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [finalScore, setFinalScore] = useState(0);
  const { best: hiScore, update: updateHiScore } = useHighScore("dodgeblitz");

  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const resolvedRef = useRef<ResolvedSettings>(
    resolveSettings(DEFAULT_SETTINGS),
  );
  const updateSettings = (partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  };

  const gsRef = useRef<GameState | null>(null);
  const { playSweep, playMiss: sharedPlayMiss } = useAudio();
  const sfxRef = useRef({ playSweep, sharedPlayMiss });
  useEffect(() => {
    sfxRef.current = { playSweep, sharedPlayMiss };
  }, [playSweep, sharedPlayMiss]);
  const lastTsRef = useRef(0);
  const rafRef = useRef(0);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const resize = () => {
      const nextWidth = Math.max(1, Math.floor(wrapper.clientWidth));
      const nextHeight = Math.max(1, Math.floor(wrapper.clientHeight));
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapper);
    return () => resizeObserver.disconnect();
  }, []);

  // Mouse / touch tracking
  useEffect(() => {
    const updateCursor = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!gsRef.current || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const ratioX = (clientX - rect.left) / rect.width;
      const ratioY = (clientY - rect.top) / rect.height;

      gsRef.current.cursorX = Math.max(
        0,
        Math.min(canvas.width, ratioX * canvas.width),
      );
      gsRef.current.cursorY = Math.max(
        0,
        Math.min(canvas.height, ratioY * canvas.height),
      );
    };

    const onMouse = (e: MouseEvent) => {
      updateCursor(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateCursor(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = (ts: number) => {
      const dt =
        lastTsRef.current === 0 ? 16 : Math.min(ts - lastTsRef.current, 50);
      lastTsRef.current = ts;

      const gs = gsRef.current;
      if (!gs) return;

      const events = update(
        gs,
        dt,
        canvas.width,
        canvas.height,
        resolvedRef.current,
      );

      for (const ev of events) {
        const sfx = sfxRef.current;
        switch (ev) {
          case "gameover":
            sfx.playSweep(440, 100, 0.9, "sine", 0.4);
            setFinalScore(gs.score);
            updateHiScore(gs.score);
            setPhase("gameover");
            return;
          case "nearmiss":
            sfx.playSweep(900, 350, 0.12, "sine", 0.25);
            break;
          case "bomb":
            sfx.playSweep(180, 25, 0.45, "sawtooth", 0.5);
            break;
          case "waveup":
            sfx.playSweep(280, 700, 0.22, "square", 0.3);
            break;
        }
      }

      draw(ctx, gs, canvas.width, canvas.height, resolvedRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    lastTsRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [phase, updateHiScore]);

  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rs = resolveSettings(settings);
    resolvedRef.current = rs;
    gsRef.current = createGameState(canvas.width, canvas.height, rs);
    setPhase("playing");
  };

  const totalSec = Math.floor(finalScore / 10);
  const finalMm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const finalSs = String(totalSec % 60).padStart(2, "0");

  return (
    <GameShell
      title="Dodge Blitz"
      gameId="dodgeblitz"
      layout="immersive"
      minScale={0.34}
    >
      <div className="dodgeblitz-root">
        <div className="game-wrapper" ref={wrapperRef}>
          <canvas ref={canvasRef} />

          {phase === "waiting" && (
            <div className="overlay interactive">
              <h1>DODGE BLITZ</h1>
              <p className="subtitle">弾幕を掻い潜れ</p>
              <div className="settings-panel">
                <div className="setting-row">
                  <span className="setting-label">自機サイズ</span>
                  <div className="setting-options">
                    {(["large", "normal", "small"] as const).map((v) => (
                      <button
                        key={v}
                        className={`setting-btn${settings.playerSize === v ? " active" : ""}`}
                        onClick={() => updateSettings({ playerSize: v })}
                      >
                        {v.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-label">難易度</span>
                  <div className="setting-options">
                    {(["easy", "normal", "hard"] as const).map((v) => (
                      <button
                        key={v}
                        className={`setting-btn${settings.difficulty === v ? " active" : ""}`}
                        onClick={() => updateSettings({ difficulty: v })}
                      >
                        {v.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-label">アイテム頻度</span>
                  <div className="setting-options">
                    {(["low", "normal", "high"] as const).map((v) => (
                      <button
                        key={v}
                        className={`setting-btn${settings.itemFrequency === v ? " active" : ""}`}
                        onClick={() => updateSettings({ itemFrequency: v })}
                      >
                        {v.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-label">開始Wave</span>
                  <div className="setting-options">
                    {([1, 2, 3] as const).map((v) => (
                      <button
                        key={v}
                        className={`setting-btn${settings.startWave === v ? " active" : ""}`}
                        onClick={() => updateSettings({ startWave: v })}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button className="start-btn" onClick={startGame}>
                START
              </button>
              <p className="how-to">
                マウス / タッチ でプレイヤーを誘導
                <br />
                ⭐ボム &nbsp;&nbsp; 🛡シールド &nbsp;&nbsp; ⏱スロウ
                <br />
                🔴追尾弾 &nbsp;&nbsp; 💙レーザーに注意
                <br />
                <br />
                BEST: {hiScore}
              </p>
            </div>
          )}

          {phase === "gameover" && (
            <div className="overlay interactive">
              <h1>GAME OVER</h1>
              <p className="score-display">
                SCORE: <span>{finalScore}</span>
              </p>
              <p className="score-display" style={{ fontSize: "1rem" }}>
                TIME:{" "}
                <span>
                  {finalMm}:{finalSs}
                </span>
              </p>
              <p className="hi-score">
                BEST: <span>{hiScore}</span>
              </p>
              <button className="start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
};

export default App;
