import { useState, useCallback, useRef, useEffect } from "react";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
} from "@shared";
import type { PopupVariant } from "@shared";
import "./App.css";

// ======== Types ========

interface Point {
  x: number;
  y: number;
}

interface Line {
  points: Point[];
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Goal {
  x: number;
  y: number;
  radius: number;
}

interface Level {
  id: number;
  name: string;
  ballStart: Point;
  goal: Goal;
  obstacles: { x: number; y: number; width: number; height: number }[];
  maxInk: number;
}

type Phase = "start" | "drawing" | "simulating" | "win" | "lose";

// ======== Levels ========

const LEVELS: Level[] = [
  {
    id: 1,
    name: "はじめの一歩",
    ballStart: { x: 80, y: 60 },
    goal: { x: 320, y: 280, radius: 25 },
    obstacles: [],
    maxInk: 300,
  },
  {
    id: 2,
    name: "壁を越えて",
    ballStart: { x: 60, y: 60 },
    goal: { x: 340, y: 280, radius: 25 },
    obstacles: [{ x: 180, y: 120, width: 20, height: 180 }],
    maxInk: 400,
  },
  {
    id: 3,
    name: "迷路の入口",
    ballStart: { x: 60, y: 60 },
    goal: { x: 340, y: 280, radius: 25 },
    obstacles: [
      { x: 140, y: 0, width: 20, height: 200 },
      { x: 240, y: 100, width: 20, height: 220 },
    ],
    maxInk: 500,
  },
  {
    id: 4,
    name: "狭い通路",
    ballStart: { x: 60, y: 280 },
    goal: { x: 340, y: 60, radius: 25 },
    obstacles: [
      { x: 0, y: 180, width: 280, height: 20 },
      { x: 120, y: 100, width: 280, height: 20 },
    ],
    maxInk: 600,
  },
  {
    id: 5,
    name: "最終試練",
    ballStart: { x: 200, y: 40 },
    goal: { x: 200, y: 280, radius: 25 },
    obstacles: [
      { x: 80, y: 100, width: 100, height: 15 },
      { x: 220, y: 100, width: 100, height: 15 },
      { x: 120, y: 180, width: 160, height: 15 },
    ],
    maxInk: 700,
  },
];

// ======== Physics Constants ========

const GRAVITY = 0.25;
const FRICTION = 0.99;
const BALL_RADIUS = 12;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 340;
const LINE_COLLISION_DISTANCE = 6;

// ======== Pure Functions ========

function createBall(start: Point): Ball {
  return {
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
  };
}

function calculateInkUsed(lines: Line[]): number {
  let total = 0;
  for (const line of lines) {
    for (let i = 1; i < line.points.length; i++) {
      const dx = line.points[i].x - line.points[i - 1].x;
      const dy = line.points[i].y - line.points[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
  }
  return total;
}

function lineToSegments(line: Line): { p1: Point; p2: Point }[] {
  const segments: { p1: Point; p2: Point }[] = [];
  for (let i = 1; i < line.points.length; i++) {
    segments.push({ p1: line.points[i - 1], p2: line.points[i] });
  }
  return segments;
}

function pointToSegmentDistance(
  p: Point,
  p1: Point,
  p2: Point
): { dist: number; normal: Point } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const dist = Math.sqrt((p.x - p1.x) ** 2 + (p.y - p1.y) ** 2);
    return { dist, normal: { x: 0, y: -1 } };
  }

  let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = p1.x + t * dx;
  const closestY = p1.y + t * dy;

  const dist = Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);

  // Normal perpendicular to segment
  const len = Math.sqrt(lengthSq);
  let nx = -dy / len;
  let ny = dx / len;

  // Make normal point away from ball
  const toP = { x: p.x - closestX, y: p.y - closestY };
  if (nx * toP.x + ny * toP.y < 0) {
    nx = -nx;
    ny = -ny;
  }

  return { dist, normal: { x: nx, y: ny } };
}

function updateBallPhysics(
  ball: Ball,
  lines: Line[],
  obstacles: Level["obstacles"]
): Ball {
  let { x, y, vx, vy } = ball;
  const { radius } = ball;

  // Apply gravity
  vy += GRAVITY;

  // Apply friction
  vx *= FRICTION;
  vy *= FRICTION;

  // Move
  x += vx;
  y += vy;

  // Collision with lines
  for (const line of lines) {
    const segments = lineToSegments(line);
    for (const seg of segments) {
      const { dist, normal } = pointToSegmentDistance({ x, y }, seg.p1, seg.p2);
      if (dist < radius + LINE_COLLISION_DISTANCE) {
        // Reflect velocity
        const dot = vx * normal.x + vy * normal.y;
        if (dot < 0) {
          vx -= 1.5 * dot * normal.x;
          vy -= 1.5 * dot * normal.y;
          // Push out
          const overlap = radius + LINE_COLLISION_DISTANCE - dist;
          x += normal.x * overlap;
          y += normal.y * overlap;
        }
      }
    }
  }

  // Collision with obstacles
  for (const obs of obstacles) {
    const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.height));
    const dx = x - closestX;
    const dy = y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = vx * nx + vy * ny;
      if (dot < 0) {
        vx -= 1.8 * dot * nx;
        vy -= 1.8 * dot * ny;
      }
      const overlap = radius - dist;
      x += nx * overlap;
      y += ny * overlap;
    }
  }

  // Wall collision
  if (x < radius) {
    x = radius;
    vx = -vx * 0.7;
  }
  if (x > CANVAS_WIDTH - radius) {
    x = CANVAS_WIDTH - radius;
    vx = -vx * 0.7;
  }
  if (y < radius) {
    y = radius;
    vy = -vy * 0.7;
  }

  return { x, y, vx, vy, radius };
}

function checkGoal(ball: Ball, goal: Goal): boolean {
  const dx = ball.x - goal.x;
  const dy = ball.y - goal.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < goal.radius + ball.radius * 0.5;
}

function checkFall(ball: Ball): boolean {
  return ball.y > CANVAS_HEIGHT + ball.radius;
}

// ======== App Component ========

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [currentLine, setCurrentLine] = useState<Line | null>(null);
  const [ball, setBall] = useState<Ball | null>(null);
  const [score, setScore] = useState(0);
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    variant: PopupVariant;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const { playClick, playSuccess, playMiss, playCelebrate, playLevelUp } =
    useAudio();
  const { particles, sparkle, confetti } = useParticles();

  const level = LEVELS[currentLevel];
  const inkUsed = calculateInkUsed([...lines, ...(currentLine ? [currentLine] : [])]);
  const inkRemaining = level.maxInk - inkUsed;

  // Show popup helper
  const showPopup = useCallback(
    (text: string, variant: PopupVariant = "default") => {
      setPopup({ text, key: Date.now(), variant });
    },
    []
  );

  // Start game
  const handleStart = useCallback(() => {
    setPhase("drawing");
    setLines([]);
    setCurrentLine(null);
    setBall(null);
    playClick();
  }, [playClick]);

  // Start drawing
  const handleDrawStart = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phase !== "drawing") return;
      if (inkRemaining <= 0) {
        playMiss();
        showPopup("インク切れ!", "critical");
        return;
      }
      playClick();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCurrentLine({ points: [{ x, y }] });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [phase, inkRemaining, playClick, playMiss, showPopup]
  );

  // Continue drawing
  const handleDrawMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!currentLine || phase !== "drawing") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const lastPoint = currentLine.points[currentLine.points.length - 1];
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only add point if moved enough
      if (dist > 5) {
        const newInk = calculateInkUsed([
          ...lines,
          { points: [...currentLine.points, { x, y }] },
        ]);
        if (newInk <= level.maxInk) {
          setCurrentLine((prev) =>
            prev ? { points: [...prev.points, { x, y }] } : null
          );
        }
      }
    },
    [currentLine, phase, lines, level.maxInk]
  );

  // End drawing
  const handleDrawEnd = useCallback(() => {
    if (currentLine && currentLine.points.length > 1) {
      setLines((prev) => [...prev, currentLine]);
      playSuccess();
      const lastPoint = currentLine.points[currentLine.points.length - 1];
      sparkle(lastPoint.x, lastPoint.y);
      showPopup(`+${currentLine.points.length}pt`, "default");
    }
    setCurrentLine(null);
  }, [currentLine, playSuccess, sparkle, showPopup]);

  // Start simulation
  const handleSimulate = useCallback(() => {
    if (lines.length === 0) {
      playMiss();
      showPopup("線を描いてね!", "critical");
      return;
    }
    setPhase("simulating");
    setBall(createBall(level.ballStart));
    playClick();
    showPopup("GO!", "bonus");
  }, [lines, level.ballStart, playMiss, playClick, showPopup]);

  // Reset drawing
  const handleReset = useCallback(() => {
    setPhase("drawing");
    setLines([]);
    setCurrentLine(null);
    setBall(null);
    playClick();
  }, [playClick]);

  // Next level
  const handleNextLevel = useCallback(() => {
    if (currentLevel < LEVELS.length - 1) {
      setCurrentLevel((prev) => prev + 1);
      setPhase("drawing");
      setLines([]);
      setCurrentLine(null);
      setBall(null);
      playLevelUp();
      showPopup(`Level ${currentLevel + 2}`, "level");
    } else {
      // All levels completed
      setPhase("start");
      setCurrentLevel(0);
      setScore(0);
      playCelebrate();
      confetti(80);
      showPopup("全クリア!", "critical");
    }
  }, [currentLevel, playLevelUp, playCelebrate, confetti, showPopup]);

  // Retry level
  const handleRetry = useCallback(() => {
    setPhase("drawing");
    setLines([]);
    setCurrentLine(null);
    setBall(null);
    playClick();
  }, [playClick]);

  // Physics simulation loop
  useEffect(() => {
    if (phase !== "simulating" || !ball) return;

    const tick = () => {
      setBall((prevBall) => {
        if (!prevBall) return null;
        const newBall = updateBallPhysics(prevBall, lines, level.obstacles);

        // Check win
        if (checkGoal(newBall, level.goal)) {
          const bonus = Math.floor(inkRemaining / 10);
          const levelScore = 100 + bonus;
          setScore((prev) => prev + levelScore);
          setPhase("win");
          playCelebrate();
          confetti(50);
          sparkle(level.goal.x, level.goal.y, 15);
          showPopup(`+${levelScore}`, "bonus");
          return newBall;
        }

        // Check fall
        if (checkFall(newBall)) {
          setPhase("lose");
          playMiss();
          showPopup("落ちた...", "critical");
          return newBall;
        }

        return newBall;
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    phase,
    ball,
    lines,
    level,
    inkRemaining,
    playCelebrate,
    playMiss,
    confetti,
    sparkle,
    showPopup,
  ]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid
    ctx.strokeStyle = "#2a2a4e";
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Obstacles
    ctx.fillStyle = "#4a4a6a";
    for (const obs of level.obstacles) {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }

    // Goal
    const gradient = ctx.createRadialGradient(
      level.goal.x,
      level.goal.y,
      0,
      level.goal.x,
      level.goal.y,
      level.goal.radius
    );
    gradient.addColorStop(0, "#4ade80");
    gradient.addColorStop(1, "#22c55e");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(level.goal.x, level.goal.y, level.goal.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw goal star
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", level.goal.x, level.goal.y);

    // Lines (completed)
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const line of lines) {
      if (line.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    }

    // Current line (drawing)
    if (currentLine && currentLine.points.length > 1) {
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentLine.points[0].x, currentLine.points[0].y);
      for (let i = 1; i < currentLine.points.length; i++) {
        ctx.lineTo(currentLine.points[i].x, currentLine.points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ball start position (when drawing)
    if (phase === "drawing") {
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(level.ballStart.x, level.ballStart.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ball (when simulating)
    if (ball && (phase === "simulating" || phase === "win" || phase === "lose")) {
      const ballGradient = ctx.createRadialGradient(
        ball.x - 4,
        ball.y - 4,
        0,
        ball.x,
        ball.y,
        ball.radius
      );
      ballGradient.addColorStop(0, "#fef08a");
      ballGradient.addColorStop(1, "#f59e0b");
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Ball highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(ball.x - 3, ball.y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [phase, level, lines, currentLine, ball]);

  return (
    <GameShell gameId="linedraw" layout="default">
      <div className="linedraw-root">
        <header className="linedraw-header">
          <h1>Line Draw</h1>
          <div className="linedraw-stats">
            <span>Level {currentLevel + 1}</span>
            <span>Score: {score}</span>
          </div>
        </header>

        {phase === "start" && (
          <div className="linedraw-start">
            <p>線を描いてボールをゴールに導こう!</p>
            <button className="linedraw-btn primary" onClick={handleStart}>
              スタート
            </button>
          </div>
        )}

        {(phase === "drawing" ||
          phase === "simulating" ||
          phase === "win" ||
          phase === "lose") && (
          <div className="linedraw-game">
            <div className="linedraw-info">
              <span className="level-name">{level.name}</span>
              <span
                className={`ink-meter ${inkRemaining < 50 ? "low" : ""}`}
              >
                インク: {Math.floor(inkRemaining)}
              </span>
            </div>

            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="linedraw-canvas"
              onPointerDown={handleDrawStart}
              onPointerMove={handleDrawMove}
              onPointerUp={handleDrawEnd}
              onPointerLeave={handleDrawEnd}
            />

            <div className="linedraw-controls">
              {phase === "drawing" && (
                <>
                  <button className="linedraw-btn" onClick={handleReset}>
                    クリア
                  </button>
                  <button
                    className="linedraw-btn primary"
                    onClick={handleSimulate}
                  >
                    発射!
                  </button>
                </>
              )}
              {phase === "simulating" && (
                <button className="linedraw-btn" onClick={handleReset}>
                  やり直す
                </button>
              )}
              {phase === "win" && (
                <>
                  <button className="linedraw-btn" onClick={handleRetry}>
                    もう一度
                  </button>
                  <button
                    className="linedraw-btn primary"
                    onClick={handleNextLevel}
                  >
                    {currentLevel < LEVELS.length - 1 ? "次へ" : "最初から"}
                  </button>
                </>
              )}
              {phase === "lose" && (
                <button className="linedraw-btn primary" onClick={handleRetry}>
                  リトライ
                </button>
              )}
            </div>
          </div>
        )}

        <ParticleLayer particles={particles} />
        {popup && (
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            variant={popup.variant}
            size="lg"
          />
        )}
      </div>
    </GameShell>
  );
}
