import { useRef, useEffect, useState, useCallback } from "react";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScreenShake,
  ComboCounter,
  ScorePopup,
} from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 700;

const BALL_RADIUS = 15;
const BALL_SPEED = 5;
const GRAVITY = 0.15;
const BOUNCE_VELOCITY = -8;
const FLOOR_Y = CANVAS_HEIGHT - 30;

const COIN_RADIUS = 12;
const COIN_SPAWN_INTERVAL = 90; // フレーム数
const MAX_COINS = 5;

const OBSTACLE_WIDTH = 60;
const OBSTACLE_HEIGHT = 20;
const OBSTACLE_SPAWN_INTERVAL = 150;
const OBSTACLE_SPEED = 2;
const MAX_OBSTACLES = 4;

type GamePhase = "before" | "in_progress" | "after";

interface Popup {
  id: number;
  text: string;
  x: string;
  y: string;
  variant: PopupVariant;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  dx: number;
}

interface GameState {
  ballX: number;
  ballY: number;
  ballDX: number;
  ballDY: number;
  coins: Coin[];
  obstacles: Obstacle[];
  score: number;
  phase: GamePhase;
  frameCount: number;
  highScore: number;
  combo: number;
  lastCoinTime: number;
}

function loadHighScore(): number {
  try {
    const saved = localStorage.getItem("bounceball_highscore");
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem("bounceball_highscore", String(score));
  } catch {
    // ignore
  }
}

function createInitialState(): GameState {
  return {
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballDX: BALL_SPEED,
    ballDY: 0,
    coins: [],
    obstacles: [],
    score: 0,
    phase: "before",
    frameCount: 0,
    highScore: loadHighScore(),
    combo: 0,
    lastCoinTime: 0,
  };
}

function spawnCoin(state: GameState): void {
  if (state.coins.length >= MAX_COINS) return;

  const margin = 50;
  const x = margin + Math.random() * (CANVAS_WIDTH - margin * 2);
  const y = margin + Math.random() * (FLOOR_Y - margin * 2);

  state.coins.push({ x, y, collected: false });
}

function spawnObstacle(state: GameState): void {
  if (state.obstacles.length >= MAX_OBSTACLES) return;

  const fromLeft = Math.random() > 0.5;
  const y = 80 + Math.random() * (FLOOR_Y - 150);

  state.obstacles.push({
    x: fromLeft ? -OBSTACLE_WIDTH : CANVAS_WIDTH,
    y,
    width: OBSTACLE_WIDTH,
    height: OBSTACLE_HEIGHT,
    dx: fromLeft ? OBSTACLE_SPEED : -OBSTACLE_SPEED,
  });
}

function checkCollision(
  bx: number,
  by: number,
  radius: number,
  ox: number,
  oy: number,
  ow: number,
  oh: number
): boolean {
  const closestX = Math.max(ox, Math.min(bx, ox + ow));
  const closestY = Math.max(oy, Math.min(by, oy + oh));
  const distX = bx - closestX;
  const distY = by - closestY;
  return distX * distX + distY * distY < radius * radius;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const prevHighScoreRef = useRef(loadHighScore());

  const [, setTick] = useState(0);
  const [displayCombo, setDisplayCombo] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const popupIdRef = useRef(0);

  // Dopamine hooks
  const { particles, confetti, sparkle, explosion } = useParticles();
  const { playSuccess, playCombo, playBonus, playGameOver, playCelebrate, playClick } = useAudio();

  // Add popup function
  const addPopup = useCallback((text: string, x: string, y: string, variant: PopupVariant) => {
    const id = ++popupIdRef.current;
    setPopups((prev) => [...prev, { id, text, x, y, variant }]);
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1500);
  }, []);

  // Store callbacks in refs for use in game loop
  const effectsRef = useRef({
    sparkle,
    explosion,
    confetti,
    playSuccess,
    playCombo,
    playBonus,
    playGameOver,
    playCelebrate,
    setDisplayCombo,
    addPopup,
    shake: () => shakeRef.current?.shake("medium", 200),
  });

  useEffect(() => {
    effectsRef.current = {
      sparkle,
      explosion,
      confetti,
      playSuccess,
      playCombo,
      playBonus,
      playGameOver,
      playCelebrate,
      setDisplayCombo,
      addPopup,
      shake: () => shakeRef.current?.shake("medium", 200),
    };
  }, [sparkle, explosion, confetti, playSuccess, playCombo, playBonus, playGameOver, playCelebrate, addPopup]);

  // 方向転換（タップ）
  const changeDirection = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase !== "in_progress") return;

    // 横方向を反転
    state.ballDX = -state.ballDX;
    // 上向きにバウンス
    state.ballDY = BOUNCE_VELOCITY;
    playClick();
  }, [playClick]);

  // ゲーム開始
  const startGame = useCallback(() => {
    prevHighScoreRef.current = loadHighScore();
    gameStateRef.current = createInitialState();
    gameStateRef.current.phase = "in_progress";
    setDisplayCombo(0);
    setTick((t) => t + 1);
  }, []);

  // リセット
  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    setDisplayCombo(0);
    setTick((t) => t + 1);
  }, []);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;

      // 描画
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景グラデーション
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#1a1a3e");
      gradient.addColorStop(1, "#2d2d5e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 床
      ctx.fillStyle = "#4a4a8a";
      ctx.fillRect(0, FLOOR_Y, CANVAS_WIDTH, CANVAS_HEIGHT - FLOOR_Y);

      // コイン描画
      for (const coin of state.coins) {
        if (coin.collected) continue;
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, COIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 2;
        ctx.stroke();

        // コインの輝き
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(coin.x - 4, coin.y - 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 障害物描画
      for (const obstacle of state.obstacles) {
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.strokeStyle = "#ff6b7a";
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

        // スパイク風の装飾
        ctx.fillStyle = "#ff6b7a";
        const spikes = 4;
        const spikeWidth = obstacle.width / spikes;
        for (let i = 0; i < spikes; i++) {
          ctx.beginPath();
          ctx.moveTo(obstacle.x + i * spikeWidth, obstacle.y);
          ctx.lineTo(obstacle.x + i * spikeWidth + spikeWidth / 2, obstacle.y - 8);
          ctx.lineTo(obstacle.x + (i + 1) * spikeWidth, obstacle.y);
          ctx.fill();
        }
      }

      // ボール描画
      const ballGradient = ctx.createRadialGradient(
        state.ballX - 5,
        state.ballY - 5,
        0,
        state.ballX,
        state.ballY,
        BALL_RADIUS
      );
      ballGradient.addColorStop(0, "#7dd3fc");
      ballGradient.addColorStop(1, "#0ea5e9");
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(state.ballX, state.ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // ボールの影
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(
        state.ballX,
        FLOOR_Y - 5,
        BALL_RADIUS * 0.8,
        5,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // スコア表示
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${state.score}`, 20, 35);

      // ハイスコア表示
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#aaa";
      ctx.fillText(`High: ${state.highScore}`, 20, 60);

      // ゲーム中のみ更新
      if (state.phase === "in_progress") {
        state.frameCount++;

        // 重力
        state.ballDY += GRAVITY;

        // ボール移動
        state.ballX += state.ballDX;
        state.ballY += state.ballDY;

        // 壁との衝突（左右）
        if (state.ballX - BALL_RADIUS <= 0) {
          state.ballX = BALL_RADIUS;
          state.ballDX = Math.abs(state.ballDX);
        }
        if (state.ballX + BALL_RADIUS >= CANVAS_WIDTH) {
          state.ballX = CANVAS_WIDTH - BALL_RADIUS;
          state.ballDX = -Math.abs(state.ballDX);
        }

        // 床との衝突
        if (state.ballY + BALL_RADIUS >= FLOOR_Y) {
          state.ballY = FLOOR_Y - BALL_RADIUS;
          state.ballDY = BOUNCE_VELOCITY;
        }

        // 天井との衝突
        if (state.ballY - BALL_RADIUS <= 0) {
          state.ballY = BALL_RADIUS;
          state.ballDY = Math.abs(state.ballDY);
        }

        // コインとの衝突
        const currentTime = performance.now();
        for (const coin of state.coins) {
          if (coin.collected) continue;
          const dx = state.ballX - coin.x;
          const dy = state.ballY - coin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < BALL_RADIUS + COIN_RADIUS) {
            coin.collected = true;
            state.score += 10;

            // Combo logic: within 1 second of last coin
            if (currentTime - state.lastCoinTime < 1000) {
              state.combo += 1;
            } else {
              state.combo = 1;
            }
            state.lastCoinTime = currentTime;

            // Dopamine effects
            const effects = effectsRef.current;
            // Get canvas position for particle effects
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (canvasRect) {
              const screenX = canvasRect.left + coin.x;
              const screenY = canvasRect.top + coin.y;
              effects.sparkle(screenX, screenY, 8);
            }

            // Calculate popup position relative to container
            const popupX = `${(coin.x / CANVAS_WIDTH) * 100}%`;
            const popupY = `${(coin.y / CANVAS_HEIGHT) * 100}%`;

            if (state.combo >= 5) {
              // Big combo - critical variant
              effects.playCombo(state.combo);
              effects.playBonus();
              effects.setDisplayCombo(state.combo);
              effects.addPopup(`+10 x${state.combo}`, popupX, popupY, "critical");
            } else if (state.combo >= 3) {
              // Combo - combo variant
              effects.playCombo(state.combo);
              effects.setDisplayCombo(state.combo);
              effects.addPopup(`+10 x${state.combo}`, popupX, popupY, "combo");
            } else {
              // Normal coin - bonus variant
              effects.playSuccess();
              effects.setDisplayCombo(state.combo);
              effects.addPopup("+10", popupX, popupY, "bonus");
            }
          }
        }

        // Reset combo after 1.5 seconds of no coins
        if (currentTime - state.lastCoinTime > 1500 && state.combo > 0) {
          state.combo = 0;
          effectsRef.current.setDisplayCombo(0);
        }

        // 障害物との衝突チェック
        for (const obstacle of state.obstacles) {
          if (
            checkCollision(
              state.ballX,
              state.ballY,
              BALL_RADIUS,
              obstacle.x,
              obstacle.y,
              obstacle.width,
              obstacle.height
            )
          ) {
            // ゲームオーバー
            state.phase = "after";
            const isNewHighScore = state.score > prevHighScoreRef.current;
            if (state.score > state.highScore) {
              state.highScore = state.score;
              saveHighScore(state.score);
            }

            // Game over effects
            const effects = effectsRef.current;
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (canvasRect) {
              const screenX = canvasRect.left + state.ballX;
              const screenY = canvasRect.top + state.ballY;
              effects.explosion(screenX, screenY);
            }
            effects.shake();

            if (isNewHighScore) {
              // New high score celebration
              setTimeout(() => {
                effects.confetti(60);
                effects.playCelebrate();
              }, 400);
            } else {
              effects.playGameOver();
            }

            setTick((t) => t + 1);
          }
        }

        // 障害物移動
        for (const obstacle of state.obstacles) {
          obstacle.x += obstacle.dx;
        }

        // 画面外の障害物を削除
        state.obstacles = state.obstacles.filter(
          (o) => o.x + o.width > -10 && o.x < CANVAS_WIDTH + 10
        );

        // 収集済みコインを削除
        state.coins = state.coins.filter((c) => !c.collected);

        // コイン生成
        if (state.frameCount % COIN_SPAWN_INTERVAL === 0) {
          spawnCoin(state);
        }

        // 障害物生成
        if (state.frameCount % OBSTACLE_SPAWN_INTERVAL === 0) {
          spawnObstacle(state);
        }
      }

      // ゲーム開始前のメッセージ
      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("バウンシングボール", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#ccc";
        ctx.fillText("タップで方向転換", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
        ctx.fillText("コインを集めよう！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.fillText("障害物に注意！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("タップでスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110);
      }

      // ゲーム終了メッセージ
      if (state.phase === "after") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#ff4757";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "28px sans-serif";
        ctx.fillText(`Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        if (state.score >= state.highScore && state.score > 0) {
          ctx.fillStyle = "#ffd700";
          ctx.font = "20px sans-serif";
          ctx.fillText("🏆 NEW HIGH SCORE! 🏆", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55);
        }

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("タップでリトライ", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // イベントハンドラー
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "before") {
      startGame();
    } else if (state.phase === "in_progress") {
      changeDirection();
    } else if (state.phase === "after") {
      resetGame();
    }
  }, [startGame, changeDirection, resetGame]);

  return (
    <GameShell gameId="bounceball" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div
          ref={containerRef}
          className="bounceball-container"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onClick={handleClick}
          onTouchStart={(e) => {
            e.preventDefault();
            handleClick();
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="bounceball-canvas"
          />

          {/* Score popups */}
          {popups.map((popup) => (
            <ScorePopup
              key={popup.id}
              text={popup.text}
              popupKey={popup.id}
              x={popup.x}
              y={popup.y}
              variant={popup.variant}
            />
          ))}

          {/* Combo counter overlay */}
          <ComboCounter combo={displayCombo} position="top-right" threshold={3} />

          {/* Particle effects layer */}
          <ParticleLayer particles={particles} />
        </div>
      </ScreenShake>
    </GameShell>
  );
}