import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_RADIUS = 15;
const OBSTACLE_BASE_RADIUS = 12;
const INITIAL_SPAWN_INTERVAL = 1200;
const MIN_SPAWN_INTERVAL = 200;
const DIFFICULTY_INCREASE_RATE = 0.98;

interface Obstacle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  color: string;
}

interface GameState {
  phase: "before" | "playing" | "gameover";
  playerX: number;
  playerY: number;
  obstacles: Obstacle[];
  score: number;
  highScore: number;
  startTime: number;
  spawnInterval: number;
}

const OBSTACLE_COLORS = ["#ff4444", "#ff8800", "#ffdd00", "#ff00ff", "#00ffff"];

function getRandomColor(): string {
  return OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)];
}

function createObstacle(difficulty: number): Obstacle {
  const baseSpeed = 2 + difficulty * 0.5;
  const speedVariance = Math.random() * 2;
  return {
    x: Math.random() * (CANVAS_WIDTH - 40) + 20,
    y: -20,
    radius: OBSTACLE_BASE_RADIUS + Math.random() * 8,
    speed: baseSpeed + speedVariance,
    color: getRandomColor(),
  };
}

function checkCollision(px: number, py: number, obs: Obstacle): boolean {
  const dx = px - obs.x;
  const dy = py - obs.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < PLAYER_RADIUS + obs.radius - 2;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const targetPosRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80 });
  const gameStateRef = useRef<GameState | null>(null);

  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: "before",
    playerX: CANVAS_WIDTH / 2,
    playerY: CANVAS_HEIGHT - 80,
    obstacles: [],
    score: 0,
    highScore: parseInt(localStorage.getItem("dodgeblitz_highscore") || "0"),
    startTime: 0,
    spawnInterval: INITIAL_SPAWN_INTERVAL,
  }));

  // Sync ref in effect
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Game loop effect
  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const updateGame = (timestamp: number) => {
      const state = gameStateRef.current;
      if (!state || state.phase !== "playing") return;

      // Spawn new obstacles
      if (timestamp - lastSpawnRef.current > state.spawnInterval) {
        lastSpawnRef.current = timestamp;
        const elapsed = (timestamp - state.startTime) / 1000;
        const difficulty = Math.min(elapsed / 10, 10);

        setGameState((prev) => ({
          ...prev,
          obstacles: [...prev.obstacles, createObstacle(difficulty)],
          spawnInterval: Math.max(
            MIN_SPAWN_INTERVAL,
            prev.spawnInterval * DIFFICULTY_INCREASE_RATE
          ),
        }));
      }

      // Update player position (smooth follow)
      const dx = targetPosRef.current.x - state.playerX;
      const dy = targetPosRef.current.y - state.playerY;
      const newPlayerX = state.playerX + dx * 0.15;
      const newPlayerY = state.playerY + dy * 0.15;

      // Update obstacles and check collision
      let collision = false;
      const updatedObstacles = state.obstacles
        .map((obs) => ({ ...obs, y: obs.y + obs.speed }))
        .filter((obs) => obs.y < CANVAS_HEIGHT + 50);

      for (const obs of updatedObstacles) {
        if (checkCollision(newPlayerX, newPlayerY, obs)) {
          collision = true;
          break;
        }
      }

      if (collision) {
        const finalScore = Math.floor((timestamp - state.startTime) / 100);
        const newHighScore = Math.max(finalScore, state.highScore);
        if (newHighScore > state.highScore) {
          localStorage.setItem("dodgeblitz_highscore", newHighScore.toString());
        }
        setGameState((prev) => ({
          ...prev,
          phase: "gameover",
          score: finalScore,
          highScore: newHighScore,
        }));
        return;
      }

      // Update score and state
      const newScore = Math.floor((timestamp - state.startTime) / 100);
      setGameState((prev) => ({
        ...prev,
        playerX: newPlayerX,
        playerY: newPlayerY,
        obstacles: updatedObstacles,
        score: newScore,
      }));

      animationRef.current = requestAnimationFrame(updateGame);
    };

    animationRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.phase]);

  // Drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid background
    ctx.strokeStyle = "#1a1a3a";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw obstacles
    for (const obs of gameState.obstacles) {
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fillStyle = obs.color;
      ctx.fill();
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw player
    ctx.beginPath();
    ctx.arc(gameState.playerX, gameState.playerY, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#00ff88";
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner glow
    ctx.beginPath();
    ctx.arc(gameState.playerX, gameState.playerY, PLAYER_RADIUS * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#88ffcc";
    ctx.fill();

    // Score display
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${gameState.score}`, 20, 40);
    ctx.fillText(`BEST: ${gameState.highScore}`, 20, 70);
  }, [gameState]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      const x = Math.max(
        PLAYER_RADIUS,
        Math.min(CANVAS_WIDTH - PLAYER_RADIUS, (e.clientX - rect.left) * scaleX)
      );
      const y = Math.max(
        PLAYER_RADIUS,
        Math.min(CANVAS_HEIGHT - PLAYER_RADIUS, (e.clientY - rect.top) * scaleY)
      );

      targetPosRef.current = { x, y };
    },
    []
  );

  const startGame = useCallback(() => {
    const now = performance.now();
    lastSpawnRef.current = now;
    targetPosRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80 };

    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      playerX: CANVAS_WIDTH / 2,
      playerY: CANVAS_HEIGHT - 80,
      obstacles: [],
      score: 0,
      startTime: now,
      spawnInterval: INITIAL_SPAWN_INTERVAL,
    }));
  }, []);

  const handleCanvasClick = useCallback(() => {
    if (gameState.phase !== "playing") {
      startGame();
    }
  }, [gameState.phase, startGame]);

  return (
    <GameShell gameId="dodgeblitz" layout="immersive">
      <div className="dodgeblitz-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="dodgeblitz-canvas"
          onPointerMove={handlePointerMove}
          onClick={handleCanvasClick}
        />

        {gameState.phase === "before" && (
          <div className="dodgeblitz-overlay">
            <h1 className="dodgeblitz-title">DODGE BLITZ</h1>
            <p className="dodgeblitz-instruction">
              マウス/タッチで移動
              <br />
              障害物を避け続けろ！
            </p>
            <button className="dodgeblitz-start-btn" onClick={startGame}>
              START
            </button>
          </div>
        )}

        {gameState.phase === "gameover" && (
          <div className="dodgeblitz-overlay">
            <h1 className="dodgeblitz-gameover">GAME OVER</h1>
            <p className="dodgeblitz-final-score">SCORE: {gameState.score}</p>
            {gameState.score === gameState.highScore && gameState.score > 0 && (
              <p className="dodgeblitz-new-record">🎉 NEW RECORD! 🎉</p>
            )}
            <button className="dodgeblitz-start-btn" onClick={startGame}>
              RETRY
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}