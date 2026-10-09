import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ParticleLayer, ScreenShake, ShareButton, GameRecommendations } from "@shared";
import type { ScreenShakeHandle } from "@shared";
import type { GameState, KeyState, Asteroid } from "./lib/types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SHIP_SIZE,
  BULLET_RADIUS,
  FIRE_COOLDOWN,
  INITIAL_ASTEROIDS,
  INITIAL_LIVES,
  INVINCIBLE_FRAMES,
} from "./lib/constants";
import {
  createInitialShip,
  updateShip,
  createBullet,
  updateBullet,
  createInitialAsteroids,
  updateAsteroid,
  checkShipAsteroidCollision,
  processCollisions,
} from "./lib/asteroids";
import { loadHighScore, saveHighScore } from "./lib/storage";
import "./App.css";

/** パーティクル（Canvas内描画用） */
interface CanvasParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

/** スコアポップアップ（Canvas内描画用） */
interface ScorePopupData {
  id: number;
  x: number;
  y: number;
  score: number;
  life: number;
}

let particleIdCounter = 0;
let popupIdCounter = 0;

/** 爆発パーティクル生成 */
function createExplosionParticles(
  x: number,
  y: number,
  size: "large" | "medium" | "small"
): CanvasParticle[] {
  const count = size === "large" ? 24 : size === "medium" ? 16 : 10;
  const baseSpeed = size === "large" ? 4 : size === "medium" ? 3 : 2;
  const baseSize = size === "large" ? 5 : size === "medium" ? 4 : 3;
  const colors = ["#ff6", "#fa0", "#f60", "#fff", "#f88"];

  const particles: CanvasParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = baseSpeed * (0.5 + Math.random());
    particles.push({
      id: particleIdCounter++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: baseSize * (0.5 + Math.random()),
    });
  }
  return particles;
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  invincible: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const alpha = invincible ? 0.3 + Math.sin(Date.now() * 0.02) * 0.3 : 1;
  ctx.strokeStyle = "rgba(255, 255, 255, " + alpha + ")";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SHIP_SIZE, 0);
  ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
  ctx.lineTo(-SHIP_SIZE * 0.4, 0);
  ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  asteroid: Asteroid
) {
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const v = asteroid.vertices;
  ctx.moveTo(v[0].x, v[0].y);
  for (let i = 1; i < v.length; i++) {
    ctx.lineTo(v[i].x, v[i].y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawThrust(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = "#f80";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-SHIP_SIZE * 0.5, -SHIP_SIZE * 0.3);
  ctx.lineTo(-SHIP_SIZE * (0.8 + Math.random() * 0.4), 0);
  ctx.lineTo(-SHIP_SIZE * 0.5, SHIP_SIZE * 0.3);
  ctx.stroke();
  ctx.restore();
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const keysRef = useRef<KeyState>({ left: false, right: false, up: false, space: false });
  const fireCooldownRef = useRef<number>(0);
  const invincibleRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  
  // ドーパミン演出用 refs
  const particlesRef = useRef<CanvasParticle[]>([]);
  const scorePopupsRef = useRef<ScorePopupData[]>([]);
  const screenFlashRef = useRef<{ color: string; alpha: number } | null>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const lastLevelRef = useRef<number>(1);
  
  const audio = useAudio();
  const { particles, burst, confetti, explosion, sparkle } = useParticles();

  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: "before",
    ship: createInitialShip(),
    bullets: [],
    asteroids: [],
    score: 0,
    highScore: loadHighScore(),
    lives: INITIAL_LIVES,
    level: 1,
  }));

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = true;
      if (e.key === "ArrowUp" || e.key === "w") keysRef.current.up = true;
      if (e.key === " ") {
        e.preventDefault();
        keysRef.current.space = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = false;
      if (e.key === "ArrowUp" || e.key === "w") keysRef.current.up = false;
      if (e.key === " ") keysRef.current.space = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const updateGame = () => {
      const state = gameStateRef.current;
      if (!state || state.phase !== "playing") return;

      const keys = keysRef.current;
      const newShip = updateShip(state.ship, keys.left, keys.right, keys.up);

      // Handle firing
      let newBullets = state.bullets.map(updateBullet).filter(b => b.lifetime > 0);
      if (keys.space && fireCooldownRef.current <= 0) {
        newBullets = [...newBullets, createBullet(newShip)];
        fireCooldownRef.current = FIRE_COOLDOWN;
        audio.playTone(440, 0.05, "square", 0.15); // shoot sound
        // 発射時の小さなバースト
        burst(newShip.x, newShip.y, 4);
      }
      fireCooldownRef.current = Math.max(0, fireCooldownRef.current - 1);

      // Update asteroids
      let newAsteroids = state.asteroids.map(updateAsteroid);

      // Process bullet-asteroid collisions
      const collisionResult = processCollisions({
        ...state,
        bullets: newBullets,
        asteroids: newAsteroids,
      });
      newBullets = collisionResult.bullets;
      newAsteroids = collisionResult.asteroids;
      const scoreGained = collisionResult.scoreGained;
      
      // 爆発エフェクト & スコアポップアップ
      for (const col of collisionResult.collisions) {
        // パーティクル生成 (Canvas内)
        const newParticles = createExplosionParticles(col.x, col.y, col.size);
        particlesRef.current = [...particlesRef.current, ...newParticles];
        
        // DOM パーティクル爆発 (サイズに応じた派手さ)
        const particleCount = col.size === "large" ? 20 : col.size === "medium" ? 14 : 8;
        explosion(col.x, col.y, particleCount);
        
        // スコアポップアップ
        scorePopupsRef.current = [...scorePopupsRef.current, {
          id: popupIdCounter++,
          x: col.x,
          y: col.y,
          score: col.score,
          life: 40,
        }];
        
        // 爆発音（サイズで音色変える）
        if (col.size === "large") {
          audio.playNoise(0.2, 0.4, 600);
          audio.playTone(60, 0.25, "sine", 0.3);
        } else if (col.size === "medium") {
          audio.playNoise(0.15, 0.3, 800);
          audio.playTone(80, 0.2, "sine", 0.25);
        } else {
          audio.playNoise(0.1, 0.2, 1000);
          audio.playTone(100, 0.15, "sine", 0.2);
        }
      }

      // Check ship-asteroid collision
      let newLives = state.lives;
      let newPhase: "playing" | "gameover" = "playing";
      let newHighScore = state.highScore;
      let newLevel = state.level;

      if (invincibleRef.current > 0) {
        invincibleRef.current--;
      } else {
        for (const asteroid of newAsteroids) {
          if (checkShipAsteroidCollision(newShip, asteroid, SHIP_SIZE * 0.6)) {
            newLives--;
            // 被弾演出: 画面シェイク + 赤フラッシュ
            shakeRef.current?.shake("heavy", 400);
            screenFlashRef.current = { color: "#f00", alpha: 0.5 };
            audio.playMiss(); // die sound
            
            if (newLives <= 0) {
              newPhase = "gameover";
              const finalScore = state.score + scoreGained;
              if (finalScore > state.highScore) {
                newHighScore = finalScore;
                saveHighScore(newHighScore);
                // ハイスコア更新時は紙吹雪+キラキラ
                confetti(60);
                sparkle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 16);
              }
              audio.playGameOver();
            } else {
              invincibleRef.current = INVINCIBLE_FRAMES;
            }
            break;
          }
        }
      }

      // Check level complete
      if (newAsteroids.length === 0 && newPhase === "playing") {
        newLevel = state.level + 1;
        newAsteroids = createInitialAsteroids(INITIAL_ASTEROIDS + newLevel - 1);
        
        // レベルアップ演出
        if (newLevel > lastLevelRef.current) {
          lastLevelRef.current = newLevel;
          screenFlashRef.current = { color: "#0ff", alpha: 0.4 };
          audio.playLevelUp();
          // レベルクリア紙吹雪
          confetti(40);
        }
      }

      setGameState((prev) => ({
        ...prev,
        phase: newPhase,
        ship: newLives <= 0 ? prev.ship : newShip,
        bullets: newBullets,
        asteroids: newAsteroids,
        score: prev.score + scoreGained,
        highScore: newHighScore,
        lives: newLives,
        level: newLevel,
      }));

      animationRef.current = requestAnimationFrame(updateGame);
    };

    animationRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState.phase, audio, burst, confetti, explosion, sparkle]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw stars (static background)
    ctx.fillStyle = "#333";
    for (let i = 0; i < 100; i++) {
      const x = (i * 73) % CANVAS_WIDTH;
      const y = (i * 137) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 1, 1);
    }

    // Draw asteroids
    for (const asteroid of gameState.asteroids) {
      drawAsteroid(ctx, asteroid);
    }

    // Draw bullets
    ctx.fillStyle = "#fff";
    for (const bullet of gameState.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw ship
    if (gameState.phase === "playing" || gameState.phase === "before") {
      drawShip(ctx, gameState.ship.x, gameState.ship.y, gameState.ship.angle, invincibleRef.current > 0);
      if (keysRef.current.up && gameState.phase === "playing") {
        drawThrust(ctx, gameState.ship.x, gameState.ship.y, gameState.ship.angle);
      }
    }
    
    // Update & Draw particles
    particlesRef.current = particlesRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vx: p.vx * 0.96,
        vy: p.vy * 0.96,
        life: p.life - 1,
      }))
      .filter(p => p.life > 0);
    
    for (const p of particlesRef.current) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Update & Draw score popups
    scorePopupsRef.current = scorePopupsRef.current
      .map(p => ({ ...p, y: p.y - 1, life: p.life - 1 }))
      .filter(p => p.life > 0);
    
    for (const p of scorePopupsRef.current) {
      const alpha = p.life / 40;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ff0";
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "#fa0";
      ctx.shadowBlur = 8;
      ctx.fillText("+" + p.score, p.x, p.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    
    // Draw screen flash
    if (screenFlashRef.current) {
      ctx.fillStyle = screenFlashRef.current.color;
      ctx.globalAlpha = screenFlashRef.current.alpha;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.globalAlpha = 1;
      
      // Fade out flash
      screenFlashRef.current.alpha -= 0.03;
      if (screenFlashRef.current.alpha <= 0) {
        screenFlashRef.current = null;
      }
    }

    // Draw HUD
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE: " + String(gameState.score).padStart(6, "0"), 20, 35);
    ctx.fillText("HIGH:  " + String(gameState.highScore).padStart(6, "0"), 20, 60);
    ctx.textAlign = "right";
    ctx.fillText("LEVEL " + gameState.level, CANVAS_WIDTH - 20, 35);
    
    // Draw lives
    for (let i = 0; i < gameState.lives; i++) {
      ctx.save();
      ctx.translate(CANVAS_WIDTH - 30 - i * 25, 55);
      ctx.rotate(-Math.PI / 2);
      ctx.scale(0.5, 0.5);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SHIP_SIZE, 0);
      ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
      ctx.lineTo(-SHIP_SIZE * 0.4, 0);
      ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }, [gameState]);

  const startGame = useCallback(() => {
    invincibleRef.current = INVINCIBLE_FRAMES;
    fireCooldownRef.current = 0;
    lastLevelRef.current = 1;
    particlesRef.current = [];
    scorePopupsRef.current = [];
    screenFlashRef.current = null;
    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      ship: createInitialShip(),
      bullets: [],
      asteroids: createInitialAsteroids(INITIAL_ASTEROIDS),
      score: 0,
      lives: INITIAL_LIVES,
      level: 1,
    }));
  }, []);

  // Touch controls
  const handleTouchStart = useCallback((key: keyof KeyState) => {
    keysRef.current[key] = true;
  }, []);

  const handleTouchEnd = useCallback((key: keyof KeyState) => {
    keysRef.current[key] = false;
  }, []);

  return (
    <GameShell gameId="asteroids" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="asteroids-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="asteroids-canvas"
          />
          
          {/* DOM パーティクルレイヤー */}
          <ParticleLayer particles={particles} />

          {gameState.phase === "playing" && (
            <div className="asteroids-controls">
              <button
                className="asteroids-control-btn"
                onPointerDown={() => handleTouchStart("left")}
                onPointerUp={() => handleTouchEnd("left")}
                onPointerLeave={() => handleTouchEnd("left")}
              >
                ◀
              </button>
              <button
                className="asteroids-control-btn"
                onPointerDown={() => handleTouchStart("up")}
                onPointerUp={() => handleTouchEnd("up")}
                onPointerLeave={() => handleTouchEnd("up")}
              >
                ▲
              </button>
              <button
                className="asteroids-control-btn"
                onPointerDown={() => handleTouchStart("right")}
                onPointerUp={() => handleTouchEnd("right")}
                onPointerLeave={() => handleTouchEnd("right")}
              >
                ▶
              </button>
              <button
                className="asteroids-control-btn asteroids-fire-btn"
                onPointerDown={() => handleTouchStart("space")}
                onPointerUp={() => handleTouchEnd("space")}
                onPointerLeave={() => handleTouchEnd("space")}
              >
                FIRE
              </button>
            </div>
          )}

          {gameState.phase === "before" && (
            <div className="asteroids-overlay">
              <h1 className="asteroids-title">ASTEROIDS</h1>
              <p className="asteroids-instruction">
                ← → または A/D : 回転<br />
                ↑ または W : 加速<br />
                SPACE : 発射<br />
                <br />
                小惑星を全て破壊せよ！
              </p>
              <button className="asteroids-start-btn" onClick={startGame}>
                START
              </button>
            </div>
          )}

          {gameState.phase === "gameover" && (
            <div className="asteroids-overlay">
              <h1 className="asteroids-gameover">GAME OVER</h1>
              <p className="asteroids-final-score">SCORE: {gameState.score}</p>
              {gameState.score === gameState.highScore && gameState.score > 0 && (
                <p className="asteroids-new-record">★ NEW HIGH SCORE ★</p>
              )}
              <button className="asteroids-start-btn" onClick={startGame}>
                RETRY
              </button>
              <ShareButton score={gameState.score} gameTitle="Asteroids" gameId="asteroids" />
              <GameRecommendations currentGameId="asteroids" />
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
