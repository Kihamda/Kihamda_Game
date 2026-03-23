import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  ScreenShake,
} from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";
import "./App.css";

// Canvas dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

// Player constants
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 50;
const PLAYER_X = 100;
const GROUND_Y = CANVAS_HEIGHT - 60;

// Physics
const GRAVITY = 0.8;
const JUMP_VELOCITY = -15;
const INITIAL_SPEED = 6;
const MAX_SPEED = 15;
const SPEED_INCREMENT = 0.002;

// Obstacles
const OBSTACLE_WIDTH = 30;
const OBSTACLE_MIN_HEIGHT = 40;
const OBSTACLE_MAX_HEIGHT = 70;
const MIN_OBSTACLE_GAP = 300;
const MAX_OBSTACLE_GAP = 500;

// Coins
const COIN_SIZE = 20;
const COIN_SCORE = 10;
const COIN_SPAWN_CHANCE = 0.4;

// Milestones
const MILESTONES = [100, 250, 500, 1000, 2000, 5000];

// Trail history length
const TRAIL_LENGTH = 5;

interface Obstacle {
  x: number;
  width: number;
  height: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface GameState {
  phase: "before" | "playing" | "gameover";
  playerY: number;
  velocityY: number;
  isJumping: boolean;
  obstacles: Obstacle[];
  coins: Coin[];
  distance: number;
  score: number;
  highScore: number;
  speed: number;
  lastMilestone: number;
  trail: TrailPoint[];
}

function createObstacle(startX: number): Obstacle {
  return {
    x: startX,
    width: OBSTACLE_WIDTH + Math.random() * 20,
    height: OBSTACLE_MIN_HEIGHT + Math.random() * (OBSTACLE_MAX_HEIGHT - OBSTACLE_MIN_HEIGHT),
  };
}

function createCoin(startX: number): Coin {
  // Random height - either low (jumpable over) or high (need to jump to get)
  const isHigh = Math.random() > 0.5;
  return {
    x: startX,
    y: isHigh ? GROUND_Y - PLAYER_HEIGHT - 50 : GROUND_Y - 30,
    collected: false,
  };
}

function checkCoinCollision(playerY: number, coin: Coin): boolean {
  if (coin.collected) return false;
  const playerLeft = PLAYER_X;
  const playerRight = PLAYER_X + PLAYER_WIDTH;
  const playerTop = playerY;
  const playerBottom = playerY + PLAYER_HEIGHT;

  const coinCenterX = coin.x + COIN_SIZE / 2;
  const coinCenterY = coin.y + COIN_SIZE / 2;

  return (
    coinCenterX > playerLeft - COIN_SIZE / 2 &&
    coinCenterX < playerRight + COIN_SIZE / 2 &&
    coinCenterY > playerTop - COIN_SIZE / 2 &&
    coinCenterY < playerBottom + COIN_SIZE / 2
  );
}

function checkCollision(playerY: number, obstacle: Obstacle): boolean {
  const playerLeft = PLAYER_X;
  const playerRight = PLAYER_X + PLAYER_WIDTH;
  const playerTop = playerY;
  const playerBottom = playerY + PLAYER_HEIGHT;

  const obstacleLeft = obstacle.x;
  const obstacleRight = obstacle.x + obstacle.width;
  const obstacleTop = GROUND_Y - obstacle.height;
  const obstacleBottom = GROUND_Y;

  // Precise collision detection - match visual hitbox
  return (
    playerRight > obstacleLeft &&
    playerLeft < obstacleRight &&
    playerBottom > obstacleTop &&
    playerTop < obstacleBottom
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);

  // Shared hooks
  const { particles, sparkle, burst, explosion } = useParticles();
  const {
    playTone,
    playSweep,
    playSuccess,
    playBonus,
    playExplosion,
    playLevelUp,
  } = useAudio();

  // Popup state
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    x: string;
    y: string;
    variant: PopupVariant;
  } | null>(null);

  // Flash overlay state
  const [flashActive, setFlashActive] = useState(false);

  // Motion blur state
  const [motionBlur, setMotionBlur] = useState(0);

  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: "before",
    playerY: GROUND_Y - PLAYER_HEIGHT,
    velocityY: 0,
    isJumping: false,
    obstacles: [],
    coins: [],
    distance: 0,
    score: 0,
    highScore: parseInt(localStorage.getItem("endlessrun_highscore") || "0"),
    speed: INITIAL_SPEED,
    lastMilestone: 0,
    trail: [],
  }));

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Trigger popup helper
  const showPopup = useCallback(
    (text: string, x: string, y: string, variant: PopupVariant = "default") => {
      setPopup({ text, key: Date.now(), x, y, variant });
    },
    []
  );

  // Trigger flash helper
  const triggerFlash = useCallback(() => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const updateGame = () => {
      const state = gameStateRef.current;
      if (!state || state.phase !== "playing") return;

      // Apply gravity
      let newVelocityY = state.velocityY + GRAVITY;
      let newPlayerY = state.playerY + newVelocityY;
      let newIsJumping = state.isJumping;

      // Ground collision
      if (newPlayerY >= GROUND_Y - PLAYER_HEIGHT) {
        newPlayerY = GROUND_Y - PLAYER_HEIGHT;
        newVelocityY = 0;
        newIsJumping = false;
      }

      // Update trail when jumping
      let newTrail = [...state.trail];
      if (state.isJumping) {
        newTrail.push({
          x: PLAYER_X + 20,
          y: state.playerY + PLAYER_HEIGHT / 2,
          alpha: 0.6,
        });
        if (newTrail.length > TRAIL_LENGTH) {
          newTrail = newTrail.slice(-TRAIL_LENGTH);
        }
      } else {
        // Fade out trail
        newTrail = newTrail
          .map((t) => ({ ...t, alpha: t.alpha - 0.1 }))
          .filter((t) => t.alpha > 0);
      }

      // Update speed (gradually increase)
      const newSpeed = Math.min(MAX_SPEED, state.speed + SPEED_INCREMENT);

      // Motion blur effect based on speed
      const blurAmount = Math.max(0, ((newSpeed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED)) * 3);
      setMotionBlur(blurAmount);

      // Update obstacles
      const updatedObstacles = state.obstacles
        .map((obs) => ({ ...obs, x: obs.x - newSpeed }))
        .filter((obs) => obs.x > -obs.width);

      // Spawn new obstacles
      const lastObstacle = updatedObstacles[updatedObstacles.length - 1];
      const spawnX = lastObstacle
        ? lastObstacle.x + lastObstacle.width + MIN_OBSTACLE_GAP + Math.random() * (MAX_OBSTACLE_GAP - MIN_OBSTACLE_GAP)
        : CANVAS_WIDTH + 100;

      if (!lastObstacle || lastObstacle.x < CANVAS_WIDTH - 200) {
        updatedObstacles.push(createObstacle(spawnX));
      }

      // Update coins
      let updatedCoins = state.coins
        .map((coin) => ({ ...coin, x: coin.x - newSpeed }))
        .filter((coin) => coin.x > -COIN_SIZE && !coin.collected);

      // Spawn coins between obstacles
      const lastCoin = updatedCoins[updatedCoins.length - 1];
      if (
        (!lastCoin || lastCoin.x < CANVAS_WIDTH - 150) &&
        Math.random() < COIN_SPAWN_CHANCE
      ) {
        const coinSpawnX = CANVAS_WIDTH + 50 + Math.random() * 100;
        updatedCoins.push(createCoin(coinSpawnX));
      }

      // Check coin collection
      let newScore = state.score;
      for (const coin of updatedCoins) {
        if (!coin.collected && checkCoinCollision(newPlayerY, coin)) {
          coin.collected = true;
          newScore += COIN_SCORE;
          // Sparkle + popup + sound (in next render via ref)
          const coinScreenX = (coin.x / CANVAS_WIDTH) * 100;
          const coinScreenY = (coin.y / CANVAS_HEIGHT) * 100;
          sparkle(
            (coin.x / CANVAS_WIDTH) * 800,
            (coin.y / CANVAS_HEIGHT) * 400,
            10
          );
          showPopup(`+${COIN_SCORE}`, `${coinScreenX}%`, `${coinScreenY}%`, "bonus");
          playSuccess();
        }
      }
      updatedCoins = updatedCoins.filter((c) => !c.collected);

      // Check obstacle collision
      let collision = false;
      for (const obs of updatedObstacles) {
        if (checkCollision(newPlayerY, obs)) {
          collision = true;
          break;
        }
      }

      if (collision) {
        // Screen shake + crash sound + explosion
        shakeRef.current?.shake("heavy", 400);
        playExplosion();
        explosion(PLAYER_X + 20, newPlayerY + PLAYER_HEIGHT / 2, 20);

        const finalScore = state.score + Math.floor(state.distance);
        const newHighScore = Math.max(finalScore, state.highScore);
        if (newHighScore > state.highScore) {
          localStorage.setItem("endlessrun_highscore", newHighScore.toString());
        }
        setGameState((prev) => ({
          ...prev,
          phase: "gameover",
          distance: Math.floor(state.distance),
          score: finalScore,
          highScore: newHighScore,
        }));
        return;
      }

      // Update distance
      const newDistance = state.distance + newSpeed * 0.1;

      // Check milestones
      let newLastMilestone = state.lastMilestone;
      for (const m of MILESTONES) {
        if (newDistance >= m && state.lastMilestone < m) {
          newLastMilestone = m;
          // Flash + milestone sound + popup
          triggerFlash();
          playLevelUp();
          burst(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 20);
          showPopup(`🎉 ${m}m 突破！`, "50%", "30%", "level");
        }
      }

      setGameState((prev) => ({
        ...prev,
        playerY: newPlayerY,
        velocityY: newVelocityY,
        isJumping: newIsJumping,
        obstacles: updatedObstacles,
        coins: updatedCoins,
        distance: newDistance,
        score: newScore,
        speed: newSpeed,
        lastMilestone: newLastMilestone,
        trail: newTrail,
      }));

      animationRef.current = requestAnimationFrame(updateGame);
    };

    animationRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.phase, sparkle, burst, explosion, showPopup, triggerFlash, playSuccess, playExplosion, playLevelUp]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, "#87ceeb");
    skyGradient.addColorStop(1, "#e0f6ff");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Clouds (parallax background)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    const cloudOffset = (gameState.distance * 0.5) % CANVAS_WIDTH;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 200 - cloudOffset) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      const y = 50 + (i % 3) * 30;
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.arc(x + 25, y - 10, 20, 0, Math.PI * 2);
      ctx.arc(x + 50, y, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Grass
    ctx.fillStyle = "#228b22";
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 10);

    // Obstacles (red blocks)
    ctx.fillStyle = "#ff4444";
    for (const obs of gameState.obstacles) {
      ctx.fillRect(obs.x, GROUND_Y - obs.height, obs.width, obs.height);
      // Darker top edge
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(obs.x, GROUND_Y - obs.height, obs.width, 5);
      ctx.fillStyle = "#ff4444";
    }

    // Coins (golden circles with shine)
    for (const coin of gameState.coins) {
      if (coin.collected) continue;
      // Glow
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 10;
      // Coin body
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(coin.x + COIN_SIZE / 2, coin.y + COIN_SIZE / 2, COIN_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      // Inner shine
      ctx.fillStyle = "#fff8dc";
      ctx.beginPath();
      ctx.arc(coin.x + COIN_SIZE / 2 - 3, coin.y + COIN_SIZE / 2 - 3, COIN_SIZE / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Jump trail effect
    for (const trail of gameState.trail) {
      ctx.fillStyle = `rgba(100, 200, 255, ${trail.alpha})`;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, 8 * trail.alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (stick figure runner)
    const playerY = gameState.playerY;
    ctx.fillStyle = "#333";

    // Body
    ctx.fillRect(PLAYER_X + 15, playerY + 10, 10, 25);

    // Head
    ctx.beginPath();
    ctx.arc(PLAYER_X + 20, playerY + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Legs animation
    const legOffset = gameState.isJumping ? 0 : Math.sin(gameState.distance * 0.3) * 8;
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Left leg
    ctx.beginPath();
    ctx.moveTo(PLAYER_X + 20, playerY + 35);
    ctx.lineTo(PLAYER_X + 15 - legOffset, playerY + PLAYER_HEIGHT);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(PLAYER_X + 20, playerY + 35);
    ctx.lineTo(PLAYER_X + 25 + legOffset, playerY + PLAYER_HEIGHT);
    ctx.stroke();

    // Arms animation
    const armOffset = gameState.isJumping ? -5 : Math.sin(gameState.distance * 0.3) * 5;
    ctx.beginPath();
    ctx.moveTo(PLAYER_X + 20, playerY + 15);
    ctx.lineTo(PLAYER_X + 10 - armOffset, playerY + 25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(PLAYER_X + 20, playerY + 15);
    ctx.lineTo(PLAYER_X + 30 + armOffset, playerY + 25);
    ctx.stroke();

    // Score display
    ctx.fillStyle = "#333";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "left";
    ctx.fillText("距離: " + Math.floor(gameState.distance) + "m", 20, 35);
    ctx.fillText("SCORE: " + gameState.score, 20, 65);
    ctx.fillText("BEST: " + gameState.highScore, 20, 95);

    // Speed indicator
    ctx.fillStyle = "#666";
    ctx.font = "16px Arial";
    ctx.textAlign = "right";
    ctx.fillText("速度: " + gameState.speed.toFixed(1), CANVAS_WIDTH - 20, 35);
  }, [gameState]);

  const jump = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "playing" || prev.isJumping) return prev;
      // Jump sound
      playTone(440, 0.1, "sine", 0.15);
      playSweep(300, 600, 0.15, "sine", 0.1);
      return {
        ...prev,
        velocityY: JUMP_VELOCITY,
        isJumping: true,
      };
    });
  }, [playTone, playSweep]);

  const startGame = useCallback(() => {
    playBonus();
    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      playerY: GROUND_Y - PLAYER_HEIGHT,
      velocityY: 0,
      isJumping: false,
      obstacles: [createObstacle(CANVAS_WIDTH + 200)],
      coins: [],
      distance: 0,
      score: 0,
      speed: INITIAL_SPEED,
      lastMilestone: 0,
      trail: [],
    }));
    setMotionBlur(0);
  }, [playBonus]);

  const handleClick = useCallback(() => {
    if (gameState.phase === "playing") {
      jump();
    } else if (gameState.phase !== "gameover") {
      startGame();
    }
  }, [gameState.phase, jump, startGame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClick]);

  return (
    <GameShell gameId="endlessrun" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="endlessrun-container">
          {/* Motion blur overlay */}
          {motionBlur > 0 && (
            <div
              className="endlessrun-motion-blur"
              style={{
                opacity: motionBlur * 0.15,
              }}
            />
          )}

          {/* Flash overlay */}
          {flashActive && <div className="endlessrun-flash" />}

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="endlessrun-canvas"
            onClick={handleClick}
          />

          {/* Particle layer */}
          <ParticleLayer particles={particles} />

          {/* Score popup */}
          {popup && (
            <ScorePopup
              text={popup.text}
              popupKey={popup.key}
              x={popup.x}
              y={popup.y}
              variant={popup.variant}
              size="lg"
            />
          )}

          {gameState.phase === "before" && (
            <div className="endlessrun-overlay">
              <h1 className="endlessrun-title">ENDLESS RUN</h1>
              <p className="endlessrun-instruction">
                タップ / スペースキー でジャンプ
                <br />
                障害物を避けてコインを集めろ！
              </p>
              <button className="endlessrun-start-btn" onClick={startGame}>
                START
              </button>
            </div>
          )}

          {gameState.phase === "gameover" && (
            <div className="endlessrun-overlay">
              <h1 className="endlessrun-gameover">GAME OVER</h1>
              <p className="endlessrun-final-score">距離: {Math.floor(gameState.distance)}m</p>
              <p className="endlessrun-final-score">スコア: {gameState.score}</p>
              {gameState.score === gameState.highScore && gameState.score > 0 && (
                <p className="endlessrun-new-record">🎉 NEW RECORD! 🎉</p>
              )}
              <button className="endlessrun-start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
