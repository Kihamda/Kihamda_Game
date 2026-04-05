import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ScreenShake } from "@shared/components/ScreenShake";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles } from "@shared/hooks/useParticles";
import { ShareButton, GameRecommendations } from "@shared";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import "./App.css";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 700;
const NINJA_SIZE = 30;
const WALL_WIDTH = 40;
const GRAVITY = 0.4;
const JUMP_VELOCITY_Y = -10;
const JUMP_VELOCITY_X = 7;
const OBSTACLE_WIDTH = 80;
const OBSTACLE_HEIGHT = 20;
const OBSTACLE_INTERVAL = 150;
const NEAR_MISS_THRESHOLD = 15; // ニアミス判定の距離
const MILESTONE_INTERVAL = 100; // マイルストーン間隔(m)

interface Ninja {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  direction: 1 | -1;
  isOnWall: boolean;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  fromLeft: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface GameState {
  phase: "before" | "playing" | "gameover";
  ninja: Ninja;
  obstacles: Obstacle[];
  score: number;
  highScore: number;
  cameraY: number;
  obstacleIdCounter: number;
  lastMilestone: number;
  passedObstacleIds: Set<number>;
}

function createObstacle(id: number, y: number): Obstacle {
  const fromLeft = Math.random() < 0.5;
  const width = OBSTACLE_WIDTH + Math.random() * 60;
  return {
    id,
    x: fromLeft ? WALL_WIDTH : CANVAS_WIDTH - WALL_WIDTH - width,
    y,
    width,
    fromLeft,
  };
}

function generateInitialObstacles(): { obstacles: Obstacle[]; counter: number } {
  const obstacles: Obstacle[] = [];
  let counter = 0;

  for (let i = 1; i <= 5; i++) {
    const y = CANVAS_HEIGHT - i * OBSTACLE_INTERVAL;
    obstacles.push(createObstacle(counter++, y));
  }

  return { obstacles, counter };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const flashRef = useRef<number>(0);
  
  const { particles, sparkle, burst } = useParticles();
  const { playTone, playSweep, playArpeggio, playNoise } = useAudio();
  
  // 効果音
  const playJumpSound = useCallback(() => {
    playTone(660, 0.08, "sine", 0.15);
    playTone(880, 0.1, "sine", 0.12, 0.04);
  }, [playTone]);
  
  const playWallKickSound = useCallback(() => {
    playTone(440, 0.06, "square", 0.1);
    playTone(550, 0.1, "sine", 0.15, 0.03);
    playTone(660, 0.08, "triangle", 0.12, 0.06);
  }, [playTone]);
  
  const playMilestoneSound = useCallback(() => {
    playArpeggio([523, 659, 784, 1047], 0.12, "sine", 0.2, 0.06);
  }, [playArpeggio]);
  
  const playNearMissSound = useCallback(() => {
    playTone(1200, 0.08, "sine", 0.15);
    playTone(1600, 0.1, "triangle", 0.1, 0.04);
  }, [playTone]);
  
  const playFallSound = useCallback(() => {
    playSweep(400, 100, 0.4, "sawtooth", 0.25);
    playNoise(0.2, 0.3, 600);
  }, [playSweep, playNoise]);
  
  const [popup, setPopup] = useState<{ text: string; key: number; variant: "bonus" | "level" } | null>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    const { obstacles, counter } = generateInitialObstacles();
    return {
      phase: "before",
      ninja: {
        x: WALL_WIDTH,
        y: CANVAS_HEIGHT - 100,
        velocityX: 0,
        velocityY: 0,
        direction: 1,
        isOnWall: true,
      },
      obstacles,
      score: 0,
      highScore: parseInt(localStorage.getItem("ninjajump_highscore") || "0"),
      cameraY: 0,
      obstacleIdCounter: counter,
      lastMilestone: 0,
      passedObstacleIds: new Set(),
    };
  });

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const updateGame = () => {
      const state = gameStateRef.current;
      if (!state || state.phase !== "playing") return;

      let { x, y, velocityX, velocityY, isOnWall } = state.ninja;
      const { direction } = state.ninja;
      let { cameraY, obstacles, obstacleIdCounter, lastMilestone, passedObstacleIds } = state;
      
      // トレイル更新
      if (!isOnWall && (velocityX !== 0 || velocityY !== 0)) {
        trailRef.current.push({ x: x + NINJA_SIZE / 2, y: y + NINJA_SIZE / 2, alpha: 1 });
        if (trailRef.current.length > 15) {
          trailRef.current.shift();
        }
      }
      // トレイルのフェードアウト
      trailRef.current = trailRef.current
        .map(p => ({ ...p, alpha: p.alpha - 0.08 }))
        .filter(p => p.alpha > 0);
      
      // フラッシュ減衰
      if (flashRef.current > 0) {
        flashRef.current = Math.max(0, flashRef.current - 0.05);
      }

      velocityY += GRAVITY;
      x += velocityX;
      y += velocityY;

      const leftWallX = WALL_WIDTH;
      const rightWallX = CANVAS_WIDTH - WALL_WIDTH - NINJA_SIZE;
      
      const wasOnWall = state.ninja.isOnWall;

      if (x <= leftWallX && direction === -1) {
        x = leftWallX;
        velocityX = 0;
        velocityY = Math.min(velocityY, 2);
        isOnWall = true;
        
        // 壁キック時のエフェクト
        if (!wasOnWall) {
          const screenY = y + cameraY;
          sparkle(leftWallX, screenY + NINJA_SIZE / 2, 6);
          playWallKickSound();
        }
      } else if (x >= rightWallX && direction === 1) {
        x = rightWallX;
        velocityX = 0;
        velocityY = Math.min(velocityY, 2);
        isOnWall = true;
        
        // 壁キック時のエフェクト
        if (!wasOnWall) {
          const screenY = y + cameraY;
          sparkle(CANVAS_WIDTH - WALL_WIDTH, screenY + NINJA_SIZE / 2, 6);
          playWallKickSound();
        }
      } else {
        isOnWall = false;
      }

      const heightFromStart = Math.max(0, Math.floor((CANVAS_HEIGHT - 100 - y + cameraY) / 10));
      
      // マイルストーン判定
      const currentMilestone = Math.floor(heightFromStart / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
      if (currentMilestone > lastMilestone && currentMilestone > 0) {
        lastMilestone = currentMilestone;
        flashRef.current = 1;
        playMilestoneSound();
        setPopup({ text: `${currentMilestone}m!`, key: Date.now(), variant: "level" });
        burst(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 20);
      }

      const targetCameraY = Math.max(0, (CANVAS_HEIGHT - 100 - y) - CANVAS_HEIGHT / 2);
      if (targetCameraY > cameraY) {
        cameraY = targetCameraY;
      }

      const highestObstacle = Math.min(...obstacles.map((o) => o.y), CANVAS_HEIGHT);
      const visibleTop = -cameraY - 200;
      if (highestObstacle > visibleTop) {
        const newY = highestObstacle - OBSTACLE_INTERVAL;
        obstacles = [...obstacles, createObstacle(obstacleIdCounter++, newY)];
      }

      const screenBottom = CANVAS_HEIGHT + cameraY + 100;
      obstacles = obstacles.filter((o) => o.y < screenBottom);

      const ninjaLeft = x;
      const ninjaRight = x + NINJA_SIZE;
      const ninjaTop = y;
      const ninjaBottom = y + NINJA_SIZE;

      // 衝突判定とニアミス判定
      for (const obstacle of obstacles) {
        const obsLeft = obstacle.x;
        const obsRight = obstacle.x + obstacle.width;
        const obsTop = obstacle.y;
        const obsBottom = obstacle.y + OBSTACLE_HEIGHT;

        // 衝突判定
        if (
          ninjaRight > obsLeft &&
          ninjaLeft < obsRight &&
          ninjaBottom > obsTop &&
          ninjaTop < obsBottom
        ) {
          const finalScore = heightFromStart;
          const newHighScore = Math.max(finalScore, state.highScore);
          if (newHighScore > state.highScore) {
            localStorage.setItem("ninjajump_highscore", newHighScore.toString());
          }
          playFallSound();
          shakeRef.current?.shake("heavy", 400);
          setGameState((prev) => ({
            ...prev,
            phase: "gameover",
            score: finalScore,
            highScore: newHighScore,
          }));
          return;
        }
        
        // ニアミス判定（障害物の上を通過した時）
        if (!passedObstacleIds.has(obstacle.id)) {
          // 忍者が障害物より上にいる かつ 横方向で障害物と重なっている
          if (
            ninjaBottom < obsTop && 
            ninjaBottom > obsTop - NEAR_MISS_THRESHOLD &&
            ninjaRight > obsLeft &&
            ninjaLeft < obsRight
          ) {
            const newPassedIds = new Set(passedObstacleIds);
            newPassedIds.add(obstacle.id);
            passedObstacleIds = newPassedIds;
            
            playNearMissSound();
            const screenY = (y + NINJA_SIZE) + cameraY;
            sparkle(x + NINJA_SIZE / 2, screenY, 4);
            setPopup({ text: "CLOSE!", key: Date.now(), variant: "bonus" });
          }
        }
      }

      const playerScreenY = y + cameraY;
      if (playerScreenY > CANVAS_HEIGHT + 50) {
        const finalScore = heightFromStart;
        const newHighScore = Math.max(finalScore, state.highScore);
        if (newHighScore > state.highScore) {
          localStorage.setItem("ninjajump_highscore", newHighScore.toString());
        }
        playFallSound();
        shakeRef.current?.shake("medium", 300);
        setGameState((prev) => ({
          ...prev,
          phase: "gameover",
          score: finalScore,
          highScore: newHighScore,
        }));
        return;
      }

      setGameState((prev) => ({
        ...prev,
        ninja: { x, y, velocityX, velocityY, direction, isOnWall },
        obstacles,
        cameraY,
        score: heightFromStart,
        obstacleIdCounter,
        lastMilestone,
        passedObstacleIds,
      }));

      animationRef.current = requestAnimationFrame(updateGame);
    };

    animationRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.phase, playWallKickSound, playMilestoneSound, playNearMissSound, playFallSound, sparkle, burst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { ninja, obstacles, cameraY, score, highScore } = gameState;

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < 30; i++) {
      const starX = (i * 47 + cameraY * 0.03) % CANVAS_WIDTH;
      const starY = (i * 71 + cameraY * 0.02) % CANVAS_HEIGHT;
      ctx.beginPath();
      ctx.arc(starX, starY, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(0, cameraY);

    const wallGradientLeft = ctx.createLinearGradient(0, 0, WALL_WIDTH, 0);
    wallGradientLeft.addColorStop(0, "#374151");
    wallGradientLeft.addColorStop(1, "#1f2937");
    ctx.fillStyle = wallGradientLeft;
    ctx.fillRect(0, -cameraY - 1000, WALL_WIDTH, CANVAS_HEIGHT + cameraY + 2000);

    const wallGradientRight = ctx.createLinearGradient(CANVAS_WIDTH - WALL_WIDTH, 0, CANVAS_WIDTH, 0);
    wallGradientRight.addColorStop(0, "#1f2937");
    wallGradientRight.addColorStop(1, "#374151");
    ctx.fillStyle = wallGradientRight;
    ctx.fillRect(CANVAS_WIDTH - WALL_WIDTH, -cameraY - 1000, WALL_WIDTH, CANVAS_HEIGHT + cameraY + 2000);

    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 1;
    for (let i = -20; i < 50; i++) {
      const lineY = Math.floor((-cameraY) / 50) * 50 + i * 50;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(WALL_WIDTH, lineY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH - WALL_WIDTH, lineY);
      ctx.lineTo(CANVAS_WIDTH, lineY);
      ctx.stroke();
    }

    for (const obstacle of obstacles) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(obstacle.x + 3, obstacle.y + 3, obstacle.width, OBSTACLE_HEIGHT);

      const spikeGradient = ctx.createLinearGradient(0, obstacle.y, 0, obstacle.y + OBSTACLE_HEIGHT);
      spikeGradient.addColorStop(0, "#ef4444");
      spikeGradient.addColorStop(1, "#b91c1c");
      ctx.fillStyle = spikeGradient;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, OBSTACLE_HEIGHT);

      ctx.fillStyle = "#fee2e2";
      const spikeCount = Math.floor(obstacle.width / 15);
      for (let j = 0; j < spikeCount; j++) {
        const spikeX = obstacle.x + 7.5 + j * 15;
        ctx.beginPath();
        ctx.moveTo(spikeX - 5, obstacle.y + OBSTACLE_HEIGHT);
        ctx.lineTo(spikeX, obstacle.y + 5);
        ctx.lineTo(spikeX + 5, obstacle.y + OBSTACLE_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }
    }
    
    // トレイル描画
    for (const trail of trailRef.current) {
      ctx.fillStyle = `rgba(233, 69, 96, ${trail.alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, 6 * trail.alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    const nx = ninja.x;
    const ny = ninja.y;

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(nx + NINJA_SIZE / 2, ny + NINJA_SIZE + 3, NINJA_SIZE / 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(nx + 5, ny + 8, NINJA_SIZE - 10, NINJA_SIZE - 8);

    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(nx + NINJA_SIZE / 2, ny + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e94560";
    ctx.fillRect(nx + 3, ny + 6, NINJA_SIZE - 6, 4);

    ctx.strokeStyle = "#e94560";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ninja.direction === 1) {
      ctx.moveTo(nx + 3, ny + 8);
      ctx.quadraticCurveTo(nx - 5, ny + 5, nx - 8, ny + 15);
    } else {
      ctx.moveTo(nx + NINJA_SIZE - 3, ny + 8);
      ctx.quadraticCurveTo(nx + NINJA_SIZE + 5, ny + 5, nx + NINJA_SIZE + 8, ny + 15);
    }
    ctx.stroke();

    ctx.fillStyle = "#fff";
    const eyeOffsetX = ninja.direction === 1 ? 3 : -3;
    ctx.beginPath();
    ctx.ellipse(nx + NINJA_SIZE / 2 - 4 + eyeOffsetX, ny + 10, 3, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(nx + NINJA_SIZE / 2 + 4 + eyeOffsetX, ny + 10, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(nx + NINJA_SIZE / 2 - 3 + eyeOffsetX, ny + 10, 1.5, 0, Math.PI * 2);
    ctx.arc(nx + NINJA_SIZE / 2 + 5 + eyeOffsetX, ny + 10, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText("HEIGHT: " + score + "m", 55, 30);
    ctx.fillText("BEST: " + highScore + "m", 55, 55);
    ctx.shadowBlur = 0;
    
    // マイルストーン画面フラッシュ
    if (flashRef.current > 0) {
      ctx.fillStyle = `rgba(255, 215, 0, ${flashRef.current * 0.3})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }, [gameState]);

  const handleJump = useCallback(() => {
    if (gameState.phase !== "playing") return;

    const state = gameStateRef.current;
    if (!state) return;

    if (state.ninja.isOnWall) {
      playJumpSound();
      const newDirection: 1 | -1 = state.ninja.direction === 1 ? -1 : 1;
      setGameState((prev) => ({
        ...prev,
        ninja: {
          ...prev.ninja,
          velocityX: JUMP_VELOCITY_X * newDirection,
          velocityY: JUMP_VELOCITY_Y,
          direction: newDirection,
          isOnWall: false,
        },
      }));
    }
  }, [gameState.phase, playJumpSound]);

  const startGame = useCallback(() => {
    const { obstacles, counter } = generateInitialObstacles();
    
    // リセット
    trailRef.current = [];
    flashRef.current = 0;

    setGameState({
      phase: "playing",
      ninja: {
        x: WALL_WIDTH,
        y: CANVAS_HEIGHT - 100,
        velocityX: 0,
        velocityY: 0,
        direction: 1,
        isOnWall: true,
      },
      obstacles,
      score: 0,
      highScore: parseInt(localStorage.getItem("ninjajump_highscore") || "0"),
      cameraY: 0,
      obstacleIdCounter: counter,
      lastMilestone: 0,
      passedObstacleIds: new Set(),
    });
  }, []);

  const handleCanvasClick = useCallback(() => {
    if (gameState.phase !== "playing") {
      startGame();
    } else {
      handleJump();
    }
  }, [gameState.phase, startGame, handleJump]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handleCanvasClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCanvasClick]);

  return (
    <GameShell gameId="ninjajump" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="ninjajump-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="ninjajump-canvas"
            onClick={handleCanvasClick}
            onTouchStart={(e) => {
              e.preventDefault();
              handleCanvasClick();
            }}
          />
          
          <ParticleLayer particles={particles} />
          
          {popup && (
            <ScorePopup
              text={popup.text}
              popupKey={popup.key}
              variant={popup.variant}
              y="30%"
              size="lg"
            />
          )}

          {gameState.phase === "before" && (
            <div className="ninjajump-overlay">
              <div className="ninjajump-ninja-icon">🥷</div>
              <h1 className="ninjajump-title">忍者ジャンプ</h1>
              <p className="ninjajump-instruction">
                タップまたはスペースキーでジャンプ！
                <br />
                壁から壁へ飛び移ろう
                <br />
                赤い障害物を避けて上昇せよ！
              </p>
              <button className="ninjajump-start-btn" onClick={startGame}>
                START
              </button>
            </div>
          )}

          {gameState.phase === "gameover" && (
            <div className="ninjajump-overlay">
              <h1 className="ninjajump-gameover">GAME OVER</h1>
              <p className="ninjajump-final-score">HEIGHT: {gameState.score}m</p>
              <p className="ninjajump-best-score">BEST: {gameState.highScore}m</p>
              {gameState.score === gameState.highScore && gameState.score > 0 && (
                <p className="ninjajump-new-record">🎉 NEW RECORD! 🎉</p>
              )}
              <button className="ninjajump-start-btn" onClick={startGame}>
                RETRY
              </button>
              <ShareButton score={gameState.score} gameTitle="Ninja Jump" gameId="ninjajump" />
              <GameRecommendations currentGameId="ninjajump" />
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
