import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useParticles, ParticleLayer, ScorePopup, ScreenShake, useAudio, ShareButton, GameRecommendations } from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";

import "./App.css";

// Canvas dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

// Helicopter constants
const HELI_WIDTH = 50;
const HELI_HEIGHT = 25;
const HELI_X = 100;

// Physics
const GRAVITY = 0.4;
const LIFT = -0.8;
const MAX_VELOCITY = 8;

// Terrain & Obstacles
const INITIAL_SPEED = 3;
const MAX_SPEED = 8;
const SPEED_INCREMENT = 0.001;

const OBSTACLE_WIDTH = 40;
const OBSTACLE_MIN_GAP = 150;
const OBSTACLE_MAX_GAP = 250;
const OBSTACLE_SPAWN_DISTANCE = 400;

const TERRAIN_HEIGHT = 50;
const TERRAIN_VARIATION = 20;

// Near-miss detection margin (pixels from obstacle edge)
const NEARMISS_MARGIN = 25;

// Distance milestones for popups
const DISTANCE_MILESTONES = [100, 250, 500, 1000, 2000, 5000, 10000];

interface Obstacle {
  x: number;
  topHeight: number;
  bottomHeight: number;
  gapY: number;
  gapHeight: number;
  passed?: boolean;  // For near-miss detection
}

interface GameState {
  phase: "before" | "playing" | "gameover";
  heliY: number;
  velocityY: number;
  obstacles: Obstacle[];
  distance: number;
  highScore: number;
  speed: number;
  isHolding: boolean;
  ceilingOffset: number;
  floorOffset: number;
  lastMilestone: number;      // For milestone tracking
  isNewHighScore: boolean;    // For confetti trigger
}

function createObstacle(startX: number, canvasHeight: number): Obstacle {
  const gapHeight = OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);
  const minGapY = TERRAIN_HEIGHT + 30;
  const maxGapY = canvasHeight - TERRAIN_HEIGHT - gapHeight - 30;
  const gapY = minGapY + Math.random() * (maxGapY - minGapY);
  
  return {
    x: startX,
    topHeight: gapY,
    bottomHeight: canvasHeight - gapY - gapHeight,
    gapY,
    gapHeight,
  };
}

function checkCollision(
  heliY: number,
  obstacles: Obstacle[],
  ceilingOffset: number,
  floorOffset: number
): boolean {
  const heliLeft = HELI_X;
  const heliRight = HELI_X + HELI_WIDTH;
  const heliTop = heliY;
  const heliBottom = heliY + HELI_HEIGHT;

  // Ceiling collision
  const ceilingY = TERRAIN_HEIGHT + ceilingOffset;
  if (heliTop < ceilingY) return true;

  // Floor collision
  const floorY = CANVAS_HEIGHT - TERRAIN_HEIGHT - floorOffset;
  if (heliBottom > floorY) return true;

  // Obstacle collision
  for (const obs of obstacles) {
    if (heliRight > obs.x && heliLeft < obs.x + OBSTACLE_WIDTH) {
      // Check top obstacle
      if (heliTop < obs.topHeight) return true;
      // Check bottom obstacle
      if (heliBottom > CANVAS_HEIGHT - obs.bottomHeight) return true;
    }
  }

  return false;
}

// Check if helicopter had a near-miss with an obstacle
function checkNearMiss(
  heliY: number,
  obstacle: Obstacle
): boolean {
  const heliTop = heliY;
  const heliBottom = heliY + HELI_HEIGHT;
  
  // Check if very close to top or bottom of gap
  const distFromTop = heliTop - obstacle.topHeight;
  const distFromBottom = (CANVAS_HEIGHT - obstacle.bottomHeight) - heliBottom;
  
  return distFromTop < NEARMISS_MARGIN || distFromBottom < NEARMISS_MARGIN;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  
  // Dopamine effects hooks
  const { particles, sparkle, explosion, confetti } = useParticles();
  const { playTone, playSweep, playBonus, playExplosion, playCelebrate, playNoise } = useAudio();
  
  // Popup state
  const [popup, setPopup] = useState<{ text: string; key: number; variant: PopupVariant } | null>(null);

  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: "before",
    heliY: CANVAS_HEIGHT / 2 - HELI_HEIGHT / 2,
    velocityY: 0,
    obstacles: [],
    distance: 0,
    highScore: parseInt(localStorage.getItem("helicopter_highscore") || "0"),
    speed: INITIAL_SPEED,
    isHolding: false,
    ceilingOffset: 0,
    floorOffset: 0,
    lastMilestone: 0,
    isNewHighScore: false,
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

      // Apply physics
      let newVelocityY = state.velocityY;
      if (state.isHolding) {
        newVelocityY += LIFT;
      } else {
        newVelocityY += GRAVITY;
      }
      newVelocityY = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, newVelocityY));
      const newHeliY = state.heliY + newVelocityY;

      // Update speed
      const newSpeed = Math.min(MAX_SPEED, state.speed + SPEED_INCREMENT);

      // Update terrain variation
      const newCeilingOffset = Math.sin(state.distance * 0.01) * TERRAIN_VARIATION;
      const newFloorOffset = Math.cos(state.distance * 0.008) * TERRAIN_VARIATION;

      // Update obstacles
      const updatedObstacles = state.obstacles
        .map((obs) => ({ ...obs, x: obs.x - newSpeed }))
        .filter((obs) => obs.x > -OBSTACLE_WIDTH);

      // Spawn new obstacles
      const lastObstacle = updatedObstacles[updatedObstacles.length - 1];
      const spawnX = lastObstacle
        ? lastObstacle.x + OBSTACLE_SPAWN_DISTANCE + Math.random() * 100
        : CANVAS_WIDTH + 100;

      if (!lastObstacle || lastObstacle.x < CANVAS_WIDTH - 200) {
        updatedObstacles.push(createObstacle(spawnX, CANVAS_HEIGHT));
      }

      // Check collision
      if (checkCollision(newHeliY, updatedObstacles, newCeilingOffset, newFloorOffset)) {
        const finalScore = Math.floor(state.distance);
        const newHighScore = Math.max(finalScore, state.highScore);
        const isNewRecord = finalScore > state.highScore;
        
        if (newHighScore > state.highScore) {
          localStorage.setItem("helicopter_highscore", newHighScore.toString());
        }
        
        // Crash effects - get helicopter position for particles
        const heliCenterX = HELI_X + HELI_WIDTH / 2;
        const heliCenterY = newHeliY + HELI_HEIGHT / 2;
        explosion(heliCenterX, heliCenterY, 30);
        playExplosion();
        shakeRef.current?.shake("heavy", 400);
        
        setGameState((prev) => ({
          ...prev,
          phase: "gameover",
          distance: finalScore,
          highScore: newHighScore,
          isNewHighScore: isNewRecord,
        }));
        return;
      }

      // Update distance
      const newDistance = state.distance + newSpeed * 0.1;
      
      // Check for near-miss (passed obstacles with close call)
      let nearMissOccurred = false;
      const finalObstacles = updatedObstacles.map((obs) => {
        // Check if helicopter just passed this obstacle
        if (!obs.passed && obs.x + OBSTACLE_WIDTH < HELI_X) {
          // Check if it was a near-miss
          if (checkNearMiss(newHeliY, obs)) {
            nearMissOccurred = true;
          }
          return { ...obs, passed: true };
        }
        return obs;
      });
      
      // Near-miss effect
      if (nearMissOccurred) {
        sparkle(HELI_X + HELI_WIDTH, newHeliY + HELI_HEIGHT / 2, 12);
        playBonus();
        setPopup({ text: "NEAR MISS! +10", key: Date.now(), variant: "bonus" });
      }
      
      // Check for distance milestones
      let newLastMilestone = state.lastMilestone;
      for (const milestone of DISTANCE_MILESTONES) {
        if (state.distance < milestone && newDistance >= milestone) {
          newLastMilestone = milestone;
          setPopup({ text: `🎯 ${milestone}m!`, key: Date.now(), variant: "level" });
          playSweep(400, 800, 0.3, "sine", 0.25);
          playTone(1047, 0.2, "triangle", 0.2, 0.15);
          break;
        }
      }

      setGameState((prev) => ({
        ...prev,
        heliY: newHeliY,
        velocityY: newVelocityY,
        obstacles: finalObstacles,
        distance: newDistance,
        speed: newSpeed,
        ceilingOffset: newCeilingOffset,
        floorOffset: newFloorOffset,
        lastMilestone: newLastMilestone,
      }));

      animationRef.current = requestAnimationFrame(updateGame);
    };

    animationRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.phase, explosion, playExplosion, sparkle, playBonus, playSweep, playTone]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(0.5, "#16213e");
    bgGradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    const starOffset = (gameState.distance * 0.2) % CANVAS_WIDTH;
    for (let i = 0; i < 30; i++) {
      const x = ((i * 27 + starOffset) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      const y = (i * 41) % CANVAS_HEIGHT;
      const size = (i % 3) + 1;
      ctx.fillRect(x, y, size, size);
    }

    // Ceiling terrain
    const ceilingY = TERRAIN_HEIGHT + gameState.ceilingOffset;
    ctx.fillStyle = "#2d4a22";
    ctx.fillRect(0, 0, CANVAS_WIDTH, ceilingY);
    ctx.fillStyle = "#3d6a32";
    ctx.fillRect(0, ceilingY - 5, CANVAS_WIDTH, 5);

    // Floor terrain
    const floorY = CANVAS_HEIGHT - TERRAIN_HEIGHT - gameState.floorOffset;
    ctx.fillStyle = "#2d4a22";
    ctx.fillRect(0, floorY, CANVAS_WIDTH, CANVAS_HEIGHT - floorY);
    ctx.fillStyle = "#3d6a32";
    ctx.fillRect(0, floorY, CANVAS_WIDTH, 5);

    // Obstacles
    ctx.fillStyle = "#4a7c59";
    for (const obs of gameState.obstacles) {
      // Top obstacle
      ctx.fillRect(obs.x, 0, OBSTACLE_WIDTH, obs.topHeight);
      // Bottom obstacle
      ctx.fillRect(obs.x, CANVAS_HEIGHT - obs.bottomHeight, OBSTACLE_WIDTH, obs.bottomHeight);
      
      // Highlight
      ctx.fillStyle = "#5a9c69";
      ctx.fillRect(obs.x, 0, 5, obs.topHeight);
      ctx.fillRect(obs.x, CANVAS_HEIGHT - obs.bottomHeight, 5, obs.bottomHeight);
      ctx.fillStyle = "#4a7c59";
    }

    // Helicopter
    const heliY = gameState.heliY;
    
    // Thrust particles (when holding/ascending)
    if (gameState.isHolding && gameState.phase === "playing") {
      ctx.fillStyle = "rgba(255, 200, 100, 0.6)";
      for (let i = 0; i < 5; i++) {
        const px = HELI_X + 10 + Math.random() * 20;
        const py = heliY + HELI_HEIGHT + Math.random() * 15;
        const size = Math.random() * 6 + 2;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Exhaust trail
      ctx.fillStyle = "rgba(255, 150, 50, 0.4)";
      for (let i = 0; i < 3; i++) {
        const px = HELI_X + 15 + Math.random() * 10;
        const py = heliY + HELI_HEIGHT + 10 + Math.random() * 20;
        const size = Math.random() * 4 + 1;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Body
    ctx.fillStyle = "#ff6b35";
    ctx.fillRect(HELI_X + 10, heliY + 5, 30, 15);
    
    // Cockpit
    ctx.fillStyle = "#87ceeb";
    ctx.beginPath();
    ctx.arc(HELI_X + 38, heliY + 12, 8, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    
    // Tail
    ctx.fillStyle = "#ff6b35";
    ctx.fillRect(HELI_X, heliY + 8, 15, 8);
    ctx.fillRect(HELI_X - 5, heliY + 2, 8, 10);
    
    // Rotor (animated) - faster spin when holding
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    const rotorSpeed = gameState.isHolding ? 10 : 30;
    const rotorPhase = (Date.now() / rotorSpeed) % (Math.PI * 2);
    const rotorX = HELI_X + 25;
    const rotorY = heliY + 2;
    
    // Enhanced rotor blur effect when ascending
    if (gameState.isHolding && gameState.phase === "playing") {
      ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const blurPhase = rotorPhase + (i * Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(rotorX - Math.cos(blurPhase) * 25, rotorY);
        ctx.lineTo(rotorX + Math.cos(blurPhase) * 25, rotorY);
        ctx.stroke();
      }
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 3;
    }
    
    ctx.beginPath();
    ctx.moveTo(rotorX - Math.cos(rotorPhase) * 25, rotorY);
    ctx.lineTo(rotorX + Math.cos(rotorPhase) * 25, rotorY);
    ctx.stroke();
    
    // Tail rotor
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(HELI_X - 5, heliY + 2 + Math.sin(rotorPhase * 2) * 5);
    ctx.lineTo(HELI_X - 5, heliY + 12 - Math.sin(rotorPhase * 2) * 5);
    ctx.stroke();

    // Skids
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(HELI_X + 12, heliY + 20);
    ctx.lineTo(HELI_X + 12, heliY + 24);
    ctx.lineTo(HELI_X + 8, heliY + 24);
    ctx.lineTo(HELI_X + 40, heliY + 24);
    ctx.moveTo(HELI_X + 35, heliY + 20);
    ctx.lineTo(HELI_X + 35, heliY + 24);
    ctx.stroke();

    // Score display
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "left";
    ctx.fillText("距離: " + Math.floor(gameState.distance) + "m", 20, 35);
    ctx.fillText("BEST: " + gameState.highScore + "m", 20, 65);

    // Speed indicator
    ctx.fillStyle = "#aaa";
    ctx.font = "16px Arial";
    ctx.textAlign = "right";
    ctx.fillText("速度: " + gameState.speed.toFixed(1), CANVAS_WIDTH - 20, 35);
  }, [gameState]);

  const startGame = useCallback(() => {
    // Play start sound
    playTone(523, 0.1, "sine", 0.2);
    playTone(659, 0.1, "sine", 0.2, 0.1);
    playTone(784, 0.15, "sine", 0.25, 0.2);
    
    setPopup(null);
    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      heliY: CANVAS_HEIGHT / 2 - HELI_HEIGHT / 2,
      velocityY: 0,
      obstacles: [createObstacle(CANVAS_WIDTH + 200, CANVAS_HEIGHT)],
      distance: 0,
      speed: INITIAL_SPEED,
      isHolding: false,
      ceilingOffset: 0,
      floorOffset: 0,
      lastMilestone: 0,
      isNewHighScore: false,
    }));
  }, [playTone]);

  // Fly sound effect ref for continuous playing
  const flySoundRef = useRef<{ stop: () => void } | null>(null);
  
  const setHolding = useCallback((holding: boolean) => {
    if (holding && !flySoundRef.current) {
      // Start subtle fly sound
      playNoise(0.05, 0.08, 2000);
    }
    setGameState((prev) => ({
      ...prev,
      isHolding: holding,
    }));
  }, [playNoise]);

  const handlePointerDown = useCallback(() => {
    if (gameState.phase === "playing") {
      setHolding(true);
    }
  }, [gameState.phase, setHolding]);

  const handlePointerUp = useCallback(() => {
    if (gameState.phase === "playing") {
      setHolding(false);
    }
  }, [gameState.phase, setHolding]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState.phase === "playing") {
          setHolding(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState.phase === "playing") {
          setHolding(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState.phase, setHolding]);

  // High score confetti effect
  useEffect(() => {
    if (gameState.phase === "gameover" && gameState.isNewHighScore) {
      confetti(60);
      playCelebrate();
    }
  }, [gameState.phase, gameState.isNewHighScore, confetti, playCelebrate]);

  return (
    <GameShell gameId="helicopter" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="helicopter-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="helicopter-canvas"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          
          {/* Particle effects layer */}
          <ParticleLayer particles={particles} />
          
          {/* Score popup */}
          {popup && (
            <ScorePopup
              text={popup.text}
              popupKey={popup.key}
              x="50%"
              y="30%"
              variant={popup.variant}
              size="lg"
            />
          )}

          {gameState.phase === "before" && (
            <div className="helicopter-overlay">
              <h1 className="helicopter-title">HELICOPTER</h1>
              <p className="helicopter-instruction">
                長押し / スペースキー で上昇
                <br />
                天井・床・障害物を避けて飛び続けろ！
              </p>
              <button className="helicopter-start-btn" onClick={startGame}>
                START
              </button>
            </div>
          )}

          {gameState.phase === "gameover" && (
            <div className="helicopter-overlay">
              <h1 className="helicopter-gameover">GAME OVER</h1>
              <p className="helicopter-final-score">距離: {Math.floor(gameState.distance)}m</p>
              {gameState.isNewHighScore && (
                <p className="helicopter-new-record">🎉 NEW RECORD! 🎉</p>
              )}
              <ShareButton score={Math.floor(gameState.distance)} gameTitle="Helicopter" gameId="helicopter" />
              <GameRecommendations currentGameId="helicopter" />
              <button className="helicopter-start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}