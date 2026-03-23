import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell, ScreenShake, ParticleLayer, ScorePopup, useAudio, useParticles } from "@shared";
import type { ScreenShakeHandle } from "@shared";
import "./App.css";

// Canvas dimensions
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 700;

// Perspective parameters
const HORIZON_Y = 200; // Where the horizon line is
const ROAD_WIDTH_FAR = 80;
const ROAD_WIDTH_NEAR = 400;
const LANE_COUNT = 3;

// Player constants
const PLAYER_SIZE = 40;
const PLAYER_Y = CANVAS_HEIGHT - 120;

// Speed settings
const INITIAL_SPEED = 5;
const MAX_SPEED = 20;
const SPEED_INCREMENT = 0.003;

// Obstacle settings
const OBSTACLE_SIZE_FAR = 15;
const OBSTACLE_SIZE_NEAR = 60;
const MIN_OBSTACLE_SPAWN = 60;
const MAX_OBSTACLE_SPAWN = 120;

// Near miss & milestone settings
const NEAR_MISS_THRESHOLD = 0.08; // How close to count as "near miss"
const NEAR_MISS_BONUS = 5;
const MILESTONE_INTERVAL = 100; // Distance milestone every 100m

interface Obstacle {
  lane: number; // 0, 1, 2
  z: number; // 0 (far) to 1 (near)
  id: number;
  nearMissChecked?: boolean; // Track if we've already checked for near miss
}

interface GameState {
  phase: "before" | "playing" | "gameover";
  playerLane: number;
  obstacles: Obstacle[];
  distance: number;
  highScore: number;
  speed: number;
  obstacleIdCounter: number;
  nextObstacleFrame: number;
  frameCount: number;
  lastMilestone: number; // Track last milestone reached
  bonusScore: number; // Accumulated bonus from near misses
  isNewHighScore: boolean; // Track if this run set a new high score
  lastSpeedTier: number; // Track speed tier for sound effects
}

function getLaneX(lane: number, z: number): number {
  const roadWidthAtZ = ROAD_WIDTH_FAR + (ROAD_WIDTH_NEAR - ROAD_WIDTH_FAR) * z;
  const laneWidth = roadWidthAtZ / LANE_COUNT;
  const roadLeft = (CANVAS_WIDTH - roadWidthAtZ) / 2;
  return roadLeft + laneWidth * (lane + 0.5);
}

function getYFromZ(z: number): number {
  return HORIZON_Y + (CANVAS_HEIGHT - HORIZON_Y) * z;
}

function getSizeFromZ(z: number): number {
  return OBSTACLE_SIZE_FAR + (OBSTACLE_SIZE_NEAR - OBSTACLE_SIZE_FAR) * z;
}

function checkCollision(playerLane: number, obstacle: Obstacle): boolean {
  if (obstacle.lane !== playerLane) return false;
  return obstacle.z > 0.85 && obstacle.z < 1.05;
}

function checkNearMiss(playerLane: number, obstacle: Obstacle): boolean {
  // Near miss: obstacle passed by player in adjacent lane
  if (obstacle.lane === playerLane) return false;
  if (Math.abs(obstacle.lane - playerLane) !== 1) return false;
  // Check if obstacle is at player level (z near 0.95)
  return obstacle.z > 0.90 && obstacle.z < 0.95 + NEAR_MISS_THRESHOLD;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);

  // Dopamine effects hooks
  const { particles, sparkle, confetti, explosion } = useParticles();
  const { playTone, playSweep, playBonus, playExplosion, playArpeggio } = useAudio();

  // Effect callbacks stored in refs to avoid re-creating game loop
  const effectCallbacksRef = useRef({
    onNearMiss: (x: number, y: number) => { void x; void y; },
    onMilestone: (distance: number) => { void distance; },
    onSpeedUp: (tier: number) => { void tier; },
    onCrash: (x: number, y: number) => { void x; void y; },
    onHighScore: () => {},
  });

  // Flash overlay state
  const [flashOpacity, setFlashOpacity] = useState(0);
  // Motion blur state
  const [motionBlur, setMotionBlur] = useState(0);
  // Popup state
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);
  const [popupVariant, setPopupVariant] = useState<"default" | "combo" | "bonus" | "critical" | "level">("default");

  // Update effect callbacks when hooks change
  useEffect(() => {
    effectCallbacksRef.current = {
      onNearMiss: (x: number, y: number) => {
        sparkle(x, y, 12);
        // Play near miss sound (quick high-pitched ding)
        playTone(1200, 0.1, "sine", 0.2);
        playTone(1600, 0.08, "sine", 0.15, 0.05);
        setPopupText(`NEAR MISS +${NEAR_MISS_BONUS}`);
        setPopupKey(k => k + 1);
        setPopupVariant("bonus");
      },
      onMilestone: (distance: number) => {
        // Flash screen
        setFlashOpacity(0.4);
        setTimeout(() => setFlashOpacity(0), 150);
        // Play milestone sound
        playArpeggio([660, 880, 1100], 0.1, "sine", 0.25, 0.07);
        setPopupText(`${distance}m!`);
        setPopupKey(k => k + 1);
        setPopupVariant("level");
      },
      onSpeedUp: (tier: number) => {
        // Increase motion blur
        setMotionBlur(Math.min(tier * 2, 10));
        // Play speed up sound (ascending sweep)
        playSweep(400 + tier * 100, 600 + tier * 150, 0.15, "sawtooth", 0.15);
      },
      onCrash: (x: number, y: number) => {
        explosion(x, y, 30);
        shakeRef.current?.shake("heavy", 400);
        playExplosion();
        setFlashOpacity(0.6);
        setTimeout(() => setFlashOpacity(0), 100);
      },
      onHighScore: () => {
        confetti(60);
        playBonus();
      },
    };
  }, [sparkle, confetti, explosion, playTone, playSweep, playBonus, playExplosion, playArpeggio]);

  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: "before",
    playerLane: 1,
    obstacles: [],
    distance: 0,
    highScore: parseInt(localStorage.getItem("cuberunner_highscore") || "0"),
    speed: INITIAL_SPEED,
    obstacleIdCounter: 0,
    nextObstacleFrame: 60,
    frameCount: 0,
    lastMilestone: 0,
    bonusScore: 0,
    isNewHighScore: false,
    lastSpeedTier: 0,
  }));

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Game loop
  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const updateGame = () => {
      const state = gameStateRef.current;
      if (!state || state.phase !== "playing") return;

      const newSpeed = Math.min(MAX_SPEED, state.speed + SPEED_INCREMENT);
      const speedFactor = newSpeed / 100;

      // Check for speed tier change (every 3 speed units)
      const newSpeedTier = Math.floor(newSpeed / 3);
      if (newSpeedTier > state.lastSpeedTier) {
        effectCallbacksRef.current.onSpeedUp(newSpeedTier);
      }

      // Update obstacles
      let updatedObstacles = state.obstacles
        .map((obs) => ({ ...obs, z: obs.z + speedFactor }))
        .filter((obs) => obs.z < 1.2);

      // Check collision
      let collision = false;
      for (const obs of updatedObstacles) {
        if (checkCollision(state.playerLane, obs)) {
          collision = true;
          break;
        }
      }

      if (collision) {
        const playerX = getLaneX(state.playerLane, 0.95);
        effectCallbacksRef.current.onCrash(playerX, PLAYER_Y - PLAYER_SIZE / 2);
        
        const finalScore = Math.floor(state.distance + state.bonusScore);
        const newHighScore = Math.max(finalScore, state.highScore);
        const isNewRecord = finalScore > state.highScore && state.highScore > 0;
        if (newHighScore > state.highScore) {
          localStorage.setItem("cuberunner_highscore", newHighScore.toString());
        }
        
        // Trigger high score confetti after a small delay
        if (isNewRecord) {
          setTimeout(() => {
            effectCallbacksRef.current.onHighScore();
          }, 500);
        }
        
        setGameState((prev) => ({
          ...prev,
          phase: "gameover",
          distance: finalScore,
          highScore: newHighScore,
          isNewHighScore: isNewRecord,
        }));
        return;
      }

      // Check near misses
      let bonusAdded = 0;
      updatedObstacles = updatedObstacles.map((obs) => {
        if (!obs.nearMissChecked && checkNearMiss(state.playerLane, obs)) {
          const obsX = getLaneX(obs.lane, obs.z);
          const obsY = getYFromZ(obs.z);
          effectCallbacksRef.current.onNearMiss(obsX, obsY - getSizeFromZ(obs.z) / 2);
          bonusAdded += NEAR_MISS_BONUS;
          return { ...obs, nearMissChecked: true };
        }
        return obs;
      });

      // Spawn obstacles
      const newObstacles = [...updatedObstacles];
      let nextFrame = state.nextObstacleFrame;
      let idCounter = state.obstacleIdCounter;
      const newFrameCount = state.frameCount + 1;

      if (newFrameCount >= nextFrame) {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        newObstacles.push({ lane, z: 0, id: idCounter });
        idCounter++;
        nextFrame = newFrameCount + MIN_OBSTACLE_SPAWN + 
          Math.floor(Math.random() * (MAX_OBSTACLE_SPAWN - MIN_OBSTACLE_SPAWN));
        
        // Sometimes spawn two obstacles
        if (Math.random() < 0.3 && state.distance > 100) {
          const lane2 = (lane + 1 + Math.floor(Math.random() * 2)) % LANE_COUNT;
          newObstacles.push({ lane: lane2, z: 0, id: idCounter });
          idCounter++;
        }
      }

      const newDistance = state.distance + newSpeed * 0.1;
      
      // Check milestone
      let newMilestone = state.lastMilestone;
      const currentMilestone = Math.floor(newDistance / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
      if (currentMilestone > state.lastMilestone) {
        effectCallbacksRef.current.onMilestone(currentMilestone);
        newMilestone = currentMilestone;
      }

      setGameState((prev) => ({
        ...prev,
        obstacles: newObstacles,
        distance: newDistance,
        speed: newSpeed,
        obstacleIdCounter: idCounter,
        nextObstacleFrame: nextFrame,
        frameCount: newFrameCount,
        lastMilestone: newMilestone,
        bonusScore: prev.bonusScore + bonusAdded,
        lastSpeedTier: newSpeedTier,
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

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sky gradient (purple cyber theme)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    skyGradient.addColorStop(0, "#0a0015");
    skyGradient.addColorStop(1, "#1a0040");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y);

    // Stars
    ctx.fillStyle = "#ffffff";
    const starOffset = (gameState.distance * 0.2) % 100;
    for (let i = 0; i < 30; i++) {
      const x = ((i * 67 + starOffset * 2) % CANVAS_WIDTH);
      const y = (i * 13) % HORIZON_Y;
      const size = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground gradient
    const groundGradient = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
    groundGradient.addColorStop(0, "#1a0040");
    groundGradient.addColorStop(1, "#4d0099");
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y);

    // Draw road with perspective
    ctx.beginPath();
    ctx.moveTo((CANVAS_WIDTH - ROAD_WIDTH_FAR) / 2, HORIZON_Y);
    ctx.lineTo((CANVAS_WIDTH + ROAD_WIDTH_FAR) / 2, HORIZON_Y);
    ctx.lineTo((CANVAS_WIDTH + ROAD_WIDTH_NEAR) / 2, CANVAS_HEIGHT);
    ctx.lineTo((CANVAS_WIDTH - ROAD_WIDTH_NEAR) / 2, CANVAS_HEIGHT);
    ctx.closePath();
    
    const roadGradient = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
    roadGradient.addColorStop(0, "#222");
    roadGradient.addColorStop(1, "#333");
    ctx.fillStyle = roadGradient;
    ctx.fill();

    // Lane lines (animated)
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    const lineOffset = (gameState.distance * 3) % 50;
    
    for (let i = 1; i < LANE_COUNT; i++) {
      ctx.beginPath();
      for (let z = 0; z <= 1; z += 0.02) {
        const x = getLaneX(i - 0.5, z);
        const y = getYFromZ(z);
        if (z === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Road markers (dashed center moving effect)
    ctx.setLineDash([20, 30]);
    ctx.lineDashOffset = -lineOffset * 3;
    for (let i = 1; i < LANE_COUNT; i++) {
      ctx.beginPath();
      for (let z = 0; z <= 1; z += 0.02) {
        const x = getLaneX(i - 0.5, z);
        const y = getYFromZ(z);
        if (z === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Road edges glow
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff00ff";
    ctx.shadowBlur = 10;
    
    // Left edge
    ctx.beginPath();
    ctx.moveTo((CANVAS_WIDTH - ROAD_WIDTH_FAR) / 2, HORIZON_Y);
    ctx.lineTo((CANVAS_WIDTH - ROAD_WIDTH_NEAR) / 2, CANVAS_HEIGHT);
    ctx.stroke();
    
    // Right edge
    ctx.beginPath();
    ctx.moveTo((CANVAS_WIDTH + ROAD_WIDTH_FAR) / 2, HORIZON_Y);
    ctx.lineTo((CANVAS_WIDTH + ROAD_WIDTH_NEAR) / 2, CANVAS_HEIGHT);
    ctx.stroke();
    
    ctx.shadowBlur = 0;

    // Draw obstacles (sorted by z for proper depth)
    const sortedObstacles = [...gameState.obstacles].sort((a, b) => a.z - b.z);
    for (const obs of sortedObstacles) {
      const x = getLaneX(obs.lane, obs.z);
      const y = getYFromZ(obs.z);
      const size = getSizeFromZ(obs.z);
      
      // 3D cube effect
      const depthOffset = size * 0.3;
      
      // Darker back face
      ctx.fillStyle = "#990033";
      ctx.fillRect(x - size / 2 + depthOffset, y - size - depthOffset, size, size);
      
      // Top face
      ctx.fillStyle = "#ff3366";
      ctx.beginPath();
      ctx.moveTo(x - size / 2, y - size);
      ctx.lineTo(x - size / 2 + depthOffset, y - size - depthOffset);
      ctx.lineTo(x + size / 2 + depthOffset, y - size - depthOffset);
      ctx.lineTo(x + size / 2, y - size);
      ctx.closePath();
      ctx.fill();
      
      // Front face
      ctx.fillStyle = "#ff0066";
      ctx.shadowColor = "#ff0066";
      ctx.shadowBlur = 15;
      ctx.fillRect(x - size / 2, y - size, size, size);
      ctx.shadowBlur = 0;
      
      // Right face
      ctx.fillStyle = "#cc0044";
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y - size);
      ctx.lineTo(x + size / 2 + depthOffset, y - size - depthOffset);
      ctx.lineTo(x + size / 2 + depthOffset, y - depthOffset);
      ctx.lineTo(x + size / 2, y);
      ctx.closePath();
      ctx.fill();
    }

    // Draw player cube
    const playerX = getLaneX(gameState.playerLane, 0.95);
    const playerSize = PLAYER_SIZE;
    const depthOffset = playerSize * 0.25;
    
    // Back face
    ctx.fillStyle = "#004466";
    ctx.fillRect(
      playerX - playerSize / 2 + depthOffset,
      PLAYER_Y - playerSize - depthOffset,
      playerSize,
      playerSize
    );
    
    // Top face
    ctx.fillStyle = "#00aaff";
    ctx.beginPath();
    ctx.moveTo(playerX - playerSize / 2, PLAYER_Y - playerSize);
    ctx.lineTo(playerX - playerSize / 2 + depthOffset, PLAYER_Y - playerSize - depthOffset);
    ctx.lineTo(playerX + playerSize / 2 + depthOffset, PLAYER_Y - playerSize - depthOffset);
    ctx.lineTo(playerX + playerSize / 2, PLAYER_Y - playerSize);
    ctx.closePath();
    ctx.fill();
    
    // Front face with glow
    ctx.fillStyle = "#00ffff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 20;
    ctx.fillRect(playerX - playerSize / 2, PLAYER_Y - playerSize, playerSize, playerSize);
    ctx.shadowBlur = 0;
    
    // Right face
    ctx.fillStyle = "#0088aa";
    ctx.beginPath();
    ctx.moveTo(playerX + playerSize / 2, PLAYER_Y - playerSize);
    ctx.lineTo(playerX + playerSize / 2 + depthOffset, PLAYER_Y - playerSize - depthOffset);
    ctx.lineTo(playerX + playerSize / 2 + depthOffset, PLAYER_Y - depthOffset);
    ctx.lineTo(playerX + playerSize / 2, PLAYER_Y);
    ctx.closePath();
    ctx.fill();

    // HUD
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "left";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 5;
    ctx.fillText("距離: " + Math.floor(gameState.distance) + "m", 20, 40);
    ctx.fillStyle = "#888";
    ctx.font = "16px Arial";
    ctx.fillText("BEST: " + gameState.highScore + "m", 20, 65);
    ctx.shadowBlur = 0;

    // Speed indicator
    ctx.fillStyle = "#ff00ff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "right";
    ctx.fillText("速度: " + gameState.speed.toFixed(1), CANVAS_WIDTH - 20, 40);
  }, [gameState]);

  const moveLeft = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "playing" || prev.playerLane <= 0) return prev;
      return { ...prev, playerLane: prev.playerLane - 1 };
    });
  }, []);

  const moveRight = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "playing" || prev.playerLane >= LANE_COUNT - 1) return prev;
      return { ...prev, playerLane: prev.playerLane + 1 };
    });
  }, []);

  const startGame = useCallback(() => {
    setMotionBlur(0);
    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      playerLane: 1,
      obstacles: [],
      distance: 0,
      speed: INITIAL_SPEED,
      obstacleIdCounter: 0,
      nextObstacleFrame: 60,
      frameCount: 0,
      lastMilestone: 0,
      bonusScore: 0,
      isNewHighScore: false,
      lastSpeedTier: 0,
    }));
  }, []);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const minSwipe = 30;
    
    if (Math.abs(dx) > minSwipe) {
      if (dx < 0) {
        moveLeft();
      } else {
        moveRight();
      }
    }
    touchStartRef.current = null;
  }, [moveLeft, moveRight]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        moveLeft();
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        moveRight();
      } else if (e.code === "Space" && gameState.phase !== "playing") {
        e.preventDefault();
        startGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveLeft, moveRight, startGame, gameState.phase]);

  return (
    <GameShell gameId="cuberunner" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="cuberunner-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="cuberunner-canvas"
            style={{
              filter: motionBlur > 0 ? `blur(${motionBlur * 0.2}px)` : undefined,
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />

          {/* Motion blur speed lines overlay */}
          {motionBlur > 2 && (
            <div className="cuberunner-speed-lines" style={{ opacity: motionBlur * 0.1 }} />
          )}

          {/* Screen flash overlay */}
          {flashOpacity > 0 && (
            <div 
              className="cuberunner-flash"
              style={{ opacity: flashOpacity }}
            />
          )}

          {/* Particle effects */}
          <ParticleLayer particles={particles} />

          {/* Score popup */}
          <ScorePopup 
            text={popupText} 
            popupKey={popupKey} 
            variant={popupVariant}
            y="60%"
          />

          {gameState.phase === "before" && (
            <div className="cuberunner-overlay">
              <h1 className="cuberunner-title">CUBE RUNNER</h1>
              <p className="cuberunner-subtitle">NEON DASH</p>
              <p className="cuberunner-instruction">
                ← → キー または 左右スワイプ
                <br />
                で障害物を回避！
              </p>
              {gameState.highScore > 0 && (
                <p className="cuberunner-highscore">BEST: {gameState.highScore}m</p>
              )}
              <button className="cuberunner-start-btn" onClick={startGame}>
                START
              </button>
            </div>
          )}

          {gameState.phase === "gameover" && (
            <div className="cuberunner-overlay">
              <h1 className="cuberunner-gameover">GAME OVER</h1>
              <p className="cuberunner-final-score">距離: {Math.floor(gameState.distance)}m</p>
              {gameState.bonusScore > 0 && (
                <p className="cuberunner-bonus-score">ニアミスボーナス: +{gameState.bonusScore}</p>
              )}
              {gameState.isNewHighScore && (
                <p className="cuberunner-new-record">🎉 NEW RECORD! 🎉</p>
              )}
              <button className="cuberunner-start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
