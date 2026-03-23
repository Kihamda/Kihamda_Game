import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import "./App.css";

// Canvas dimensions
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 700;

// Road settings
const ROAD_LEFT = 50;
const ROAD_WIDTH = 300;
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;

// Player car settings
const CAR_WIDTH = 50;
const CAR_HEIGHT = 90;
const PLAYER_Y = CANVAS_HEIGHT - 150;

// Enemy car settings
const ENEMY_HEIGHT = 90;
const MIN_SPAWN_INTERVAL = 800;
const MAX_SPAWN_INTERVAL = 1800;

// Game physics
const INITIAL_SPEED = 5;
const MAX_SPEED = 15;
const SPEED_INCREMENT = 0.003;

// Car colors
const PLAYER_COLOR = "#ff4444";
const ENEMY_COLORS = ["#4444ff", "#44ff44", "#ffff44", "#ff44ff", "#44ffff"];

// Near miss detection settings
const NEAR_MISS_DISTANCE = 15;
const NEAR_MISS_COOLDOWN = 500;

// Milestone settings
const MILESTONE_INTERVAL = 500;

interface EnemyCar {
  lane: number;
  y: number;
  color: string;
  passedPlayer?: boolean;
}

interface GameState {
  phase: "before" | "playing" | "gameover";
  playerLane: number;
  enemies: EnemyCar[];
  distance: number;
  highScore: number;
  speed: number;
  maxSpeed: number;
  lastMilestone: number;
  nearMissCount: number;
}

interface PopupState {
  text: string | null;
  key: number;
  x: string;
  y: string;
  variant: "default" | "combo" | "bonus" | "critical" | "level";
}

function getLaneX(lane: number): number {
  return ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2 - CAR_WIDTH / 2;
}

function checkCollision(playerLane: number, enemy: EnemyCar): boolean {
  if (playerLane !== enemy.lane) return false;

  const playerTop = PLAYER_Y;
  const playerBottom = PLAYER_Y + CAR_HEIGHT;
  const enemyTop = enemy.y;
  const enemyBottom = enemy.y + ENEMY_HEIGHT;

  const margin = 10;
  return playerBottom - margin > enemyTop && playerTop + margin < enemyBottom;
}

function checkNearMiss(playerLane: number, enemy: EnemyCar): boolean {
  // Check if enemy car just passed player in adjacent lane
  const isAdjacent = Math.abs(playerLane - enemy.lane) === 1;
  const playerTop = PLAYER_Y;
  const playerBottom = PLAYER_Y + CAR_HEIGHT;
  const enemyTop = enemy.y;
  const enemyBottom = enemy.y + ENEMY_HEIGHT;

  // Near miss: adjacent lane and overlapping vertically within threshold
  const verticalOverlap =
    enemyBottom > playerTop - NEAR_MISS_DISTANCE &&
    enemyTop < playerBottom + NEAR_MISS_DISTANCE;

  return isAdjacent && verticalOverlap;
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  isPlayer: boolean
): void {
  // Car body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, CAR_WIDTH, CAR_HEIGHT, 8);
  ctx.fill();

  // Windshield
  ctx.fillStyle = isPlayer ? "#223" : "#334";
  const windshieldY = isPlayer ? y + 15 : y + CAR_HEIGHT - 35;
  ctx.beginPath();
  ctx.roundRect(x + 8, windshieldY, CAR_WIDTH - 16, 20, 4);
  ctx.fill();

  // Wheels
  ctx.fillStyle = "#222";
  const wheelOffset = isPlayer ? 0 : 0;
  ctx.fillRect(x - 4, y + 10 + wheelOffset, 8, 20);
  ctx.fillRect(x + CAR_WIDTH - 4, y + 10 + wheelOffset, 8, 20);
  ctx.fillRect(x - 4, y + CAR_HEIGHT - 30 + wheelOffset, 8, 20);
  ctx.fillRect(x + CAR_WIDTH - 4, y + CAR_HEIGHT - 30 + wheelOffset, 8, 20);

  // Headlights / Taillights
  if (isPlayer) {
    ctx.fillStyle = "#ffff88";
    ctx.fillRect(x + 8, y + 5, 10, 6);
    ctx.fillRect(x + CAR_WIDTH - 18, y + 5, 10, 6);
  } else {
    ctx.fillStyle = "#ff8888";
    ctx.fillRect(x + 8, y + CAR_HEIGHT - 10, 10, 6);
    ctx.fillRect(x + CAR_WIDTH - 18, y + CAR_HEIGHT - 10, 10, 6);
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const nextSpawnIntervalRef = useRef<number>(1500);
  const roadOffsetRef = useRef<number>(0);
  const lastNearMissRef = useRef<number>(0);
  const lastSpeedMilestoneRef = useRef<number>(INITIAL_SPEED);
  const engineSoundRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  // Effects hooks
  const { particles, sparkle, explosion } = useParticles();
  const {
    playTone,
    playSweep,
    playNoise,
    playExplosion,
    playLevelUp,
    getAudioCtx,
  } = useAudio();

  // Screen effects state
  const [screenShake, setScreenShake] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [motionBlur, setMotionBlur] = useState(0);
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    x: "50%",
    y: "50%",
    variant: "default",
  });

  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: "before",
    playerLane: 1,
    enemies: [],
    distance: 0,
    highScore: parseInt(localStorage.getItem("carrace_highscore") || "0"),
    speed: INITIAL_SPEED,
    maxSpeed: INITIAL_SPEED,
    lastMilestone: 0,
    nearMissCount: 0,
  }));

  // Sound effects
  const playEngineSound = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      engineSoundRef.current = { osc, gain };
    } catch {
      /* audio unavailable */
    }
  }, [getAudioCtx]);

  const updateEngineSound = useCallback((speed: number) => {
    if (!engineSoundRef.current) return;
    try {
      const { osc, gain } = engineSoundRef.current;
      const ctx = osc.context as AudioContext;
      const freq = 60 + speed * 8;
      const vol = 0.03 + (speed / MAX_SPEED) * 0.04;
      osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.1);
      gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.1);
    } catch {
      /* audio unavailable */
    }
  }, []);

  const stopEngineSound = useCallback(() => {
    if (engineSoundRef.current) {
      try {
        engineSoundRef.current.osc.stop();
      } catch {
        /* already stopped */
      }
      engineSoundRef.current = null;
    }
  }, []);

  const playNearMissSound = useCallback(() => {
    playTone(1200, 0.08, "sine", 0.3);
    playTone(1600, 0.1, "sine", 0.25, 0.05);
  }, [playTone]);

  const playCrashSound = useCallback(() => {
    playExplosion();
    playNoise(0.4, 0.5, 600);
    playSweep(300, 50, 0.4, "sawtooth", 0.3);
  }, [playExplosion, playNoise, playSweep]);

  const playMilestoneSound = useCallback(() => {
    playLevelUp();
  }, [playLevelUp]);

  const playSpeedUpSound = useCallback(() => {
    playTone(600, 0.1, "triangle", 0.15);
    playTone(800, 0.15, "sine", 0.2, 0.08);
  }, [playTone]);

  // Show popup helper
  const showPopup = useCallback(
    (
      text: string,
      variant: PopupState["variant"] = "default",
      x = "50%",
      y = "50%"
    ) => {
      setPopup((prev) => ({ text, key: prev.key + 1, x, y, variant }));
    },
    []
  );

  // Trigger effects
  const triggerNearMiss = useCallback(
    (enemyX: number, enemyY: number) => {
      playNearMissSound();
      sparkle(enemyX + CAR_WIDTH / 2, enemyY + ENEMY_HEIGHT / 2, 10);
      showPopup("+100 NEAR MISS!", "bonus", `${enemyX + CAR_WIDTH / 2}px`, `${enemyY}px`);
    },
    [playNearMissSound, sparkle, showPopup]
  );

  const triggerCrash = useCallback(
    (playerX: number) => {
      playCrashSound();
      explosion(playerX + CAR_WIDTH / 2, PLAYER_Y + CAR_HEIGHT / 2, 30);
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
    },
    [playCrashSound, explosion]
  );

  const triggerMilestone = useCallback(
    (distance: number) => {
      playMilestoneSound();
      setScreenFlash(true);
      setTimeout(() => setScreenFlash(false), 200);
      showPopup(`🏁 ${distance}m!`, "level", "50%", "30%");
    },
    [playMilestoneSound, showPopup]
  );

  const triggerSpeedUp = useCallback(
    (speed: number) => {
      playSpeedUpSound();
      setMotionBlur(Math.min((speed / MAX_SPEED) * 4, 4));
      setTimeout(() => setMotionBlur(0), 300);
      showPopup(`⚡ ${Math.floor(speed * 20)} km/h`, "combo", "80%", "20%");
    },
    [playSpeedUpSound, showPopup]
  );

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Game loop
  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const updateGame = (timestamp: number) => {
      const state = gameStateRef.current;
      if (!state || state.phase !== "playing") return;

      // Update speed
      const newSpeed = Math.min(MAX_SPEED, state.speed + SPEED_INCREMENT);
      const newMaxSpeed = Math.max(state.maxSpeed, newSpeed);

      // Update road animation offset
      roadOffsetRef.current = (roadOffsetRef.current + newSpeed) % 40;

      // Move enemies
      const updatedEnemies = state.enemies
        .map((e) => ({ ...e, y: e.y + newSpeed }))
        .filter((e) => e.y < CANVAS_HEIGHT + ENEMY_HEIGHT);

      // Spawn new enemies
      if (timestamp - lastSpawnRef.current > nextSpawnIntervalRef.current) {
        const availableLanes = [0, 1, 2].filter(
          (lane) =>
            !updatedEnemies.some(
              (e) => e.lane === lane && e.y < ENEMY_HEIGHT * 2
            )
        );

        if (availableLanes.length > 0) {
          const lane =
            availableLanes[Math.floor(Math.random() * availableLanes.length)];
          const color =
            ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
          updatedEnemies.push({ lane, y: -ENEMY_HEIGHT, color });
        }

        lastSpawnRef.current = timestamp;
        nextSpawnIntervalRef.current =
          MIN_SPAWN_INTERVAL +
          Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL);
      }

      // Check collision
      let collision = false;
      let collisionX = 0;
      for (const enemy of updatedEnemies) {
        if (checkCollision(state.playerLane, enemy)) {
          collision = true;
          collisionX = getLaneX(state.playerLane);
          break;
        }
      }

      if (collision) {
        const finalScore = Math.floor(state.distance);
        const newHighScore = Math.max(finalScore, state.highScore);
        if (newHighScore > state.highScore) {
          localStorage.setItem("carrace_highscore", newHighScore.toString());
        }
        triggerCrash(collisionX);
        stopEngineSound();
        setGameState((prev) => ({
          ...prev,
          phase: "gameover",
          distance: finalScore,
          highScore: newHighScore,
        }));
        return;
      }

      // Check near miss
      let nearMissDetected = false;
      let nearMissEnemy: EnemyCar | null = null;
      if (timestamp - lastNearMissRef.current > NEAR_MISS_COOLDOWN) {
        for (const enemy of updatedEnemies) {
          if (!enemy.passedPlayer && checkNearMiss(state.playerLane, enemy)) {
            nearMissDetected = true;
            nearMissEnemy = enemy;
            enemy.passedPlayer = true;
            break;
          }
        }
      }

      if (nearMissDetected && nearMissEnemy) {
        lastNearMissRef.current = timestamp;
        const enemyX = getLaneX(nearMissEnemy.lane);
        triggerNearMiss(enemyX, nearMissEnemy.y);
      }

      // Update distance
      const newDistance = state.distance + newSpeed * 0.1;

      // Check milestone
      const currentMilestone = Math.floor(newDistance / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
      if (currentMilestone > state.lastMilestone && currentMilestone > 0) {
        triggerMilestone(currentMilestone);
      }

      // Check speed milestone (every 2 speed increase)
      const speedMilestone = Math.floor(newSpeed / 2) * 2;
      if (speedMilestone > lastSpeedMilestoneRef.current && newSpeed > INITIAL_SPEED + 2) {
        lastSpeedMilestoneRef.current = speedMilestone;
        triggerSpeedUp(newSpeed);
      }

      // Update engine sound
      updateEngineSound(newSpeed);

      setGameState((prev) => ({
        ...prev,
        enemies: updatedEnemies,
        distance: newDistance,
        speed: newSpeed,
        maxSpeed: newMaxSpeed,
        lastMilestone: currentMilestone,
        nearMissCount: nearMissDetected
          ? prev.nearMissCount + 1
          : prev.nearMissCount,
      }));

      animationRef.current = requestAnimationFrame(updateGame);
    };

    animationRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    gameState.phase,
    triggerCrash,
    triggerMilestone,
    triggerNearMiss,
    triggerSpeedUp,
    stopEngineSound,
    updateEngineSound,
  ]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background (grass)
    ctx.fillStyle = "#2a5f2a";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Road
    ctx.fillStyle = "#444";
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, CANVAS_HEIGHT);

    // Road edges
    ctx.fillStyle = "#fff";
    ctx.fillRect(ROAD_LEFT - 5, 0, 5, CANVAS_HEIGHT);
    ctx.fillRect(ROAD_LEFT + ROAD_WIDTH, 0, 5, CANVAS_HEIGHT);

    // Lane markings (dashed)
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.setLineDash([30, 20]);

    const offset = roadOffsetRef.current;
    for (let i = 1; i < LANE_COUNT; i++) {
      const x = ROAD_LEFT + i * LANE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, -50 + offset);
      ctx.lineTo(x, CANVAS_HEIGHT + 50);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw enemies
    for (const enemy of gameState.enemies) {
      const x = getLaneX(enemy.lane);
      drawCar(ctx, x, enemy.y, enemy.color, false);
    }

    // Draw player
    const playerX = getLaneX(gameState.playerLane);
    drawCar(ctx, playerX, PLAYER_Y, PLAYER_COLOR, true);

    // Score display
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 150, 70);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.fillText("距離: " + Math.floor(gameState.distance) + "m", 20, 35);
    ctx.fillText("BEST: " + gameState.highScore + "m", 20, 58);

    // Speed indicator
    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "right";
    ctx.fillText(Math.floor(gameState.speed * 20) + " km/h", CANVAS_WIDTH - 20, 35);
  }, [gameState]);

  const moveLeft = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "playing" || prev.playerLane <= 0) return prev;
      return { ...prev, playerLane: prev.playerLane - 1 };
    });
  }, []);

  const moveRight = useCallback(() => {
    setGameState((prev) => {
      if (prev.phase !== "playing" || prev.playerLane >= LANE_COUNT - 1)
        return prev;
      return { ...prev, playerLane: prev.playerLane + 1 };
    });
  }, []);

  const startGame = useCallback(() => {
    lastSpawnRef.current = 0;
    nextSpawnIntervalRef.current = 1500;
    roadOffsetRef.current = 0;
    lastNearMissRef.current = 0;
    lastSpeedMilestoneRef.current = INITIAL_SPEED;
    playEngineSound();
    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      playerLane: 1,
      enemies: [],
      distance: 0,
      speed: INITIAL_SPEED,
      maxSpeed: INITIAL_SPEED,
      lastMilestone: 0,
      nearMissCount: 0,
    }));
  }, [playEngineSound]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.phase !== "playing") {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        moveLeft();
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        moveRight();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState.phase, moveLeft, moveRight, startGame]);

  // Touch controls
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (gameState.phase !== "playing") return;
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = touch.clientX - rect.left;
      const center = rect.width / 2;

      if (x < center) {
        moveLeft();
      } else {
        moveRight();
      }
    },
    [gameState.phase, moveLeft, moveRight]
  );

  return (
    <GameShell gameId="carrace" layout="immersive">
      <div
        className={`carrace-container ${screenShake ? "carrace-shake" : ""}`}
      >
        {/* Screen flash overlay */}
        {screenFlash && <div className="carrace-flash" />}

        {/* Motion blur overlay */}
        {motionBlur > 0 && (
          <div
            className="carrace-motion-blur"
            style={{ "--blur": `${motionBlur}px` } as React.CSSProperties}
          />
        )}

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="carrace-canvas"
          onTouchStart={handleTouchStart}
        />

        {/* Particle effects */}
        <ParticleLayer particles={particles} />

        {/* Score popup */}
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          x={popup.x}
          y={popup.y}
          variant={popup.variant}
        />

        {gameState.phase === "playing" && (
          <div className="carrace-controls">
            <button
              type="button"
              className="carrace-ctrl-btn"
              onClick={moveLeft}
              aria-label="左に移動"
            >
              ◀
            </button>
            <button
              type="button"
              className="carrace-ctrl-btn"
              onClick={moveRight}
              aria-label="右に移動"
            >
              ▶
            </button>
          </div>
        )}

        {gameState.phase === "before" && (
          <div className="carrace-overlay">
            <h1 className="carrace-title">CAR RACE</h1>
            <p className="carrace-instruction">
              左右キー / 画面タップ で車線変更
              <br />
              他の車を避けて走り続けろ！
            </p>
            <button
              type="button"
              className="carrace-start-btn"
              onClick={startGame}
            >
              START
            </button>
          </div>
        )}

        {gameState.phase === "gameover" && (
          <div className="carrace-overlay">
            <h1 className="carrace-gameover">GAME OVER</h1>
            <p className="carrace-final-score">
              距離: {Math.floor(gameState.distance)}m
            </p>
            <p className="carrace-final-speed">
              最高速度: {Math.floor(gameState.maxSpeed * 20)} km/h
            </p>
            {gameState.nearMissCount > 0 && (
              <p className="carrace-near-miss-count">
                🎯 NEAR MISS: {gameState.nearMissCount}回
              </p>
            )}
            {Math.floor(gameState.distance) === gameState.highScore &&
              gameState.distance > 0 && (
                <p className="carrace-new-record">🎉 NEW RECORD! 🎉</p>
              )}
            <button
              type="button"
              className="carrace-start-btn"
              onClick={startGame}
            >
              RETRY
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}