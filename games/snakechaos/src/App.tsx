import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 20;
const COLS = CANVAS_WIDTH / CELL_SIZE;
const ROWS = CANVAS_HEIGHT / CELL_SIZE;
const INITIAL_SPEED = 120;
const SPEED_INCREMENT = 2;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type GamePhase = "ready" | "playing" | "gameover";

interface Point {
  x: number;
  y: number;
}

function randomPosition(exclude: Point[]): Point {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (exclude.some((p) => p.x === pos.x && p.y === pos.y));
  return pos;
}

function getOppositeDirection(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    UP: "DOWN",
    DOWN: "UP",
    LEFT: "RIGHT",
    RIGHT: "LEFT",
  };
  return opposites[dir];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    snake: [{ x: 10, y: 15 }] as Point[],
    direction: "RIGHT" as Direction,
    nextDirection: "RIGHT" as Direction,
    apple: { x: 20, y: 15 } as Point,
    score: 0,
    speed: INITIAL_SPEED,
    lastMoveTime: 0,
  });

  const [phase, setPhase] = useState<GamePhase>("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("snakechaos_highscore");
    return saved ? parseInt(saved, 10) : 0;
  });

  const initGame = useCallback(() => {
    const state = gameStateRef.current;
    state.snake = [{ x: 10, y: 15 }];
    state.direction = "RIGHT";
    state.nextDirection = "RIGHT";
    state.apple = randomPosition(state.snake);
    state.score = 0;
    state.speed = INITIAL_SPEED;
    state.lastMoveTime = 0;
    setScore(0);
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setPhase("playing");
  }, [initGame]);

  const endGame = useCallback(() => {
    const finalScore = gameStateRef.current.score;
    setPhase("gameover");
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem("snakechaos_highscore", String(finalScore));
    }
  }, [highScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "ready" || phase === "gameover") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          startGame();
        }
        return;
      }

      const state = gameStateRef.current;
      const keyMap: Record<string, Direction> = {
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",
        w: "UP",
        s: "DOWN",
        a: "LEFT",
        d: "RIGHT",
      };

      const newDir = keyMap[e.key];
      if (newDir && newDir !== getOppositeDirection(state.direction)) {
        e.preventDefault();
        state.nextDirection = newDir;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, startGame]);

  useEffect(() => {
    if (phase !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const gameLoop = (timestamp: number) => {
      const state = gameStateRef.current;

      if (timestamp - state.lastMoveTime >= state.speed) {
        state.lastMoveTime = timestamp;
        state.direction = state.nextDirection;

        const head = state.snake[0];
        const delta: Record<Direction, Point> = {
          UP: { x: 0, y: -1 },
          DOWN: { x: 0, y: 1 },
          LEFT: { x: -1, y: 0 },
          RIGHT: { x: 1, y: 0 },
        };
        const d = delta[state.direction];
        const newHead: Point = { x: head.x + d.x, y: head.y + d.y };

        if (
          newHead.x < 0 ||
          newHead.x >= COLS ||
          newHead.y < 0 ||
          newHead.y >= ROWS
        ) {
          endGame();
          return;
        }

        if (state.snake.some((p) => p.x === newHead.x && p.y === newHead.y)) {
          endGame();
          return;
        }

        state.snake.unshift(newHead);

        if (newHead.x === state.apple.x && newHead.y === state.apple.y) {
          state.score += 10;
          setScore(state.score);
          state.speed = Math.max(40, state.speed - SPEED_INCREMENT);
          state.apple = randomPosition(state.snake);
        } else {
          state.snake.pop();
        }
      }

      render(ctx, state);
      animationId = requestAnimationFrame(gameLoop);
    };

    const render = (
      ctx: CanvasRenderingContext2D,
      state: typeof gameStateRef.current
    ) => {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = "#252540";
      ctx.lineWidth = 1;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(CANVAS_WIDTH, y * CELL_SIZE);
        ctx.stroke();
      }

      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(
        state.apple.x * CELL_SIZE + CELL_SIZE / 2,
        state.apple.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      state.snake.forEach((segment, i) => {
        const isHead = i === 0;
        const alpha = isHead ? 1 : 1 - (i / state.snake.length) * 0.5;

        if (isHead) {
          ctx.fillStyle = "#4ecdc4";
        } else {
          ctx.fillStyle = "rgba(78, 205, 196, " + alpha + ")";
        }

        ctx.beginPath();
        ctx.roundRect(
          segment.x * CELL_SIZE + 1,
          segment.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2,
          isHead ? 6 : 4
        );
        ctx.fill();

        if (isHead) {
          ctx.fillStyle = "#1a1a2e";
          const eyeOffset = CELL_SIZE / 4;
          const eyeSize = 3;
          const cx = segment.x * CELL_SIZE + CELL_SIZE / 2;
          const cy = segment.y * CELL_SIZE + CELL_SIZE / 2;

          let eye1x: number, eye1y: number, eye2x: number, eye2y: number;
          switch (state.direction) {
            case "UP":
              eye1x = cx - eyeOffset;
              eye1y = cy - eyeOffset;
              eye2x = cx + eyeOffset;
              eye2y = cy - eyeOffset;
              break;
            case "DOWN":
              eye1x = cx - eyeOffset;
              eye1y = cy + eyeOffset;
              eye2x = cx + eyeOffset;
              eye2y = cy + eyeOffset;
              break;
            case "LEFT":
              eye1x = cx - eyeOffset;
              eye1y = cy - eyeOffset;
              eye2x = cx - eyeOffset;
              eye2y = cy + eyeOffset;
              break;
            default:
              eye1x = cx + eyeOffset;
              eye1y = cy - eyeOffset;
              eye2x = cx + eyeOffset;
              eye2y = cy + eyeOffset;
          }

          ctx.beginPath();
          ctx.arc(eye1x, eye1y, eyeSize, 0, Math.PI * 2);
          ctx.arc(eye2x, eye2y, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [phase, endGame]);

  useEffect(() => {
    if (phase !== "playing") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = "#252540";
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(CANVAS_WIDTH, y * CELL_SIZE);
        ctx.stroke();
      }
    }
  }, [phase]);

  return (
    <GameShell gameId="snakechaos" layout="immersive">
      <div
        className="snake-game"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="snake-canvas"
        />

        <div className="snake-hud">
          <div className="snake-score">Score: {score}</div>
          <div className="snake-highscore">Best: {highScore}</div>
        </div>

        {phase === "ready" && (
          <div className="snake-overlay">
            <h1 className="snake-title">Snake Chaos</h1>
            <p className="snake-instruction">Arrow Keys / WASD to move</p>
            <button className="snake-start-btn" onClick={startGame}>
              START
            </button>
            <p className="snake-hint">Space / Enter to start</p>
          </div>
        )}

        {phase === "gameover" && (
          <div className="snake-overlay snake-gameover">
            <h1 className="snake-gameover-title">Game Over</h1>
            <p className="snake-final-score">Score: {score}</p>
            {score === highScore && score > 0 && (
              <p className="snake-new-record">New Record!</p>
            )}
            <button className="snake-start-btn" onClick={startGame}>
              RETRY
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
