import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScreenShake } from "@shared/components/ScreenShake";
import { ComboCounter } from "@shared/components/ComboCounter";
import { ShareButton } from "@shared/components/ShareButton";
import { GameRecommendations } from "@shared/components/GameRecommendations";
import { ScorePopup } from "@shared";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import "./App.css";

interface Popup {
  id: number;
  value: string;
  x: string;
  y: string;
  variant?: "default" | "combo" | "bonus" | "critical" | "level";
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 600;

// Physics constants
const GRAVITY = 0.5;
const AIR_RESISTANCE = 0.995;
const BOUNCE_FACTOR = 0.3;
const ROTATION_DAMPING = 0.92;

// Bottle constants
const BOTTLE_WIDTH = 40;
const BOTTLE_HEIGHT = 100;
const BOTTLE_NECK_WIDTH = 16;
const BOTTLE_NECK_HEIGHT = 25;

// Table constants
const TABLE_HEIGHT = 80;
const TABLE_TOP = CANVAS_HEIGHT - TABLE_HEIGHT;

// Game constants
const MIN_POWER = 5;
const MAX_POWER = 18;
const POWER_CHARGE_RATE = 0.3;

interface Bottle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number; // radians
  angularVelocity: number;
  isFlipping: boolean;
  isLanded: boolean;
  landedUpright: boolean;
}

interface GameState {
  phase: "before" | "charging" | "flipping" | "result";
  bottle: Bottle;
  power: number;
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  attempts: number;
  successes: number;
}

function createInitialBottle(): Bottle {
  return {
    x: CANVAS_WIDTH / 2,
    y: TABLE_TOP - BOTTLE_HEIGHT / 2,
    velocityX: 0,
    velocityY: 0,
    rotation: 0,
    angularVelocity: 0,
    isFlipping: false,
    isLanded: false,
    landedUpright: false,
  };
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

// Trail point for bottle rotation effect
interface TrailPoint {
  x: number;
  y: number;
  rotation: number;
  alpha: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const prevHighScoreRef = useRef<number>(0);

  // Shared hooks
  const { particles, confetti, sparkle, burst } = useParticles();
  const {
    playTone,
    playSweep,
    playCombo,
    playCelebrate,
    playMiss,
  } = useAudio();

  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: "before",
    bottle: createInitialBottle(),
    power: 0,
    score: 0,
    highScore: parseInt(localStorage.getItem("bottleflip_highscore") || "0"),
    combo: 0,
    maxCombo: parseInt(localStorage.getItem("bottleflip_maxcombo") || "0"),
    attempts: 0,
    successes: 0,
  }));

  const [popups, setPopups] = useState<Popup[]>([]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Initialize prevHighScoreRef
  useEffect(() => {
    prevHighScoreRef.current = gameState.highScore;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sound effects based on phase changes and results
  useEffect(() => {
    if (gameState.phase === "result") {
      if (gameState.bottle.landedUpright) {
        // Success sound
        playTone(880, 0.1, "sine", 0.2);
        playTone(1100, 0.15, "sine", 0.25, 0.08);
        
        // Combo sound
        if (gameState.combo > 1) {
          playCombo(gameState.combo);
        }
        
        // Highscore celebration
        if (gameState.score > prevHighScoreRef.current && gameState.score > 0) {
          playCelebrate();
        }
        
        // Update prevHighScoreRef
        prevHighScoreRef.current = gameState.highScore;
        
        // Particles - landing position
        const landX = gameState.bottle.x;
        const landY = gameState.bottle.y + BOTTLE_HEIGHT / 2;
        sparkle(landX, landY - 20, 12);
        burst(landX, landY - 10, 8);
        
        // Big confetti for highscore
        if (gameState.score === gameState.highScore && gameState.score > 0) {
          confetti(80);
        } else if (gameState.combo >= 3) {
          confetti(30);
        }
      } else {
        // Fail sound & shake
        playMiss();
        shakeRef.current?.shake("light", 200);
      }
    }
  }, [gameState.phase, gameState.bottle.landedUpright, gameState.combo, gameState.score, gameState.highScore, gameState.bottle.x, gameState.bottle.y, playTone, playCombo, playCelebrate, playMiss, sparkle, burst, confetti]);

  // Flip sound when flipping starts
  useEffect(() => {
    if (gameState.phase === "flipping") {
      // Flip whoosh sound
      playSweep(300, 600, 0.3, "sine", 0.15);
      // Reset trail
      trailRef.current = [];
    }
  }, [gameState.phase, playSweep]);

  // Trail effect during flipping
  const bottleX = gameState.bottle.x;
  const bottleY = gameState.bottle.y;
  const bottleRotation = gameState.bottle.rotation;
  const currentPhase = gameState.phase;
  
  useEffect(() => {
    if (currentPhase !== "flipping") return;
    
    // Add current position to trail
    trailRef.current.push({
      x: bottleX,
      y: bottleY,
      rotation: bottleRotation,
      alpha: 1,
    });
    
    // Keep max 8 trail points
    if (trailRef.current.length > 8) {
      trailRef.current.shift();
    }
    
    // Fade out older points
    trailRef.current = trailRef.current.map((p, i) => ({
      ...p,
      alpha: (i + 1) / trailRef.current.length * 0.5,
    }));
  }, [currentPhase, bottleX, bottleY, bottleRotation]);

  // Charging animation
  useEffect(() => {
    if (gameState.phase !== "charging") return;

    const chargeInterval = setInterval(() => {
      setGameState((prev) => {
        const newPower = prev.power + POWER_CHARGE_RATE;
        if (newPower >= MAX_POWER) {
          return { ...prev, power: MAX_POWER };
        }
        return { ...prev, power: newPower };
      });
    }, 16);

    return () => clearInterval(chargeInterval);
  }, [gameState.phase]);

  // Physics simulation
  useEffect(() => {
    if (gameState.phase !== "flipping") return;

    const updatePhysics = () => {
      const state = gameStateRef.current;
      if (!state || state.phase !== "flipping") return;

      let { x, y, velocityX, velocityY, rotation, angularVelocity, isLanded } =
        state.bottle;

      // Apply gravity
      velocityY += GRAVITY;

      // Apply air resistance
      velocityX *= AIR_RESISTANCE;
      velocityY *= AIR_RESISTANCE;
      angularVelocity *= ROTATION_DAMPING;

      // Update position
      x += velocityX;
      y += velocityY;
      rotation += angularVelocity;

      // Normalize rotation
      rotation = normalizeAngle(rotation);

      // Check landing
      const bottleBottom = y + BOTTLE_HEIGHT / 2;
      const bottleTop = y - BOTTLE_HEIGHT / 2;

      if (bottleBottom >= TABLE_TOP && !isLanded) {
        // Check if landing upright
        const normalizedRot = Math.abs(normalizeAngle(rotation));
        const isUpright =
          normalizedRot < Math.PI / 6 || normalizedRot > (5 * Math.PI) / 6;
        const isUpsideDown =
          normalizedRot > (2 * Math.PI) / 3 &&
          normalizedRot < (4 * Math.PI) / 3;

        if (isUpright || isUpsideDown) {
          // Successful landing
          y = TABLE_TOP - BOTTLE_HEIGHT / 2;
          velocityY = 0;
          velocityX = 0;
          angularVelocity = 0;
          rotation = isUpsideDown ? Math.PI : 0;
          isLanded = true;

          const newCombo = state.combo + 1;
          const newScore = state.score + 100 * newCombo;
          const newHighScore = Math.max(newScore, state.highScore);
          const newMaxCombo = Math.max(newCombo, state.maxCombo);
          const scoreGained = 100 * newCombo;

          if (newHighScore > state.highScore) {
            localStorage.setItem("bottleflip_highscore", newHighScore.toString());
          }
          if (newMaxCombo > state.maxCombo) {
            localStorage.setItem("bottleflip_maxcombo", newMaxCombo.toString());
          }

          // Show score popup
          const popupVariant = newCombo >= 5 ? "critical" : newCombo >= 3 ? "combo" : "bonus";
          const popupId = Date.now();
          setPopups((p) => [
            ...p,
            {
              id: popupId,
              value: `+${scoreGained}`,
              x: `${x}px`,
              y: `${y - BOTTLE_HEIGHT / 2 - 20}px`,
              variant: popupVariant,
            },
          ]);
          // Auto-remove popup after animation
          setTimeout(() => {
            setPopups((p) => p.filter((pp) => pp.id !== popupId));
          }, 1500);

          setGameState((prev) => ({
            ...prev,
            phase: "result",
            bottle: {
              ...prev.bottle,
              x,
              y,
              velocityX,
              velocityY,
              rotation,
              angularVelocity,
              isLanded: true,
              landedUpright: true,
            },
            score: newScore,
            highScore: newHighScore,
            combo: newCombo,
            maxCombo: newMaxCombo,
            successes: prev.successes + 1,
          }));
          return;
        } else {
          // Bounce or fall
          if (Math.abs(velocityY) > 3) {
            velocityY = -velocityY * BOUNCE_FACTOR;
            y = TABLE_TOP - BOTTLE_HEIGHT / 2;
            angularVelocity *= 0.7;
          } else {
            // Failed - bottle fell
            isLanded = true;
            setGameState((prev) => ({
              ...prev,
              phase: "result",
              bottle: {
                ...prev.bottle,
                x,
                y: TABLE_TOP - 20,
                velocityX: 0,
                velocityY: 0,
                rotation: Math.PI / 2,
                angularVelocity: 0,
                isLanded: true,
                landedUpright: false,
              },
              combo: 0,
            }));
            return;
          }
        }
      }

      // Boundary checks
      if (x < BOTTLE_WIDTH / 2) {
        x = BOTTLE_WIDTH / 2;
        velocityX = -velocityX * BOUNCE_FACTOR;
      }
      if (x > CANVAS_WIDTH - BOTTLE_WIDTH / 2) {
        x = CANVAS_WIDTH - BOTTLE_WIDTH / 2;
        velocityX = -velocityX * BOUNCE_FACTOR;
      }

      // Check if bottle went off screen (top)
      if (bottleTop > CANVAS_HEIGHT + 100) {
        setGameState((prev) => ({
          ...prev,
          phase: "result",
          bottle: {
            ...prev.bottle,
            isLanded: true,
            landedUpright: false,
          },
          combo: 0,
        }));
        return;
      }

      setGameState((prev) => ({
        ...prev,
        bottle: {
          ...prev.bottle,
          x,
          y,
          velocityX,
          velocityY,
          rotation,
          angularVelocity,
          isLanded,
        },
      }));

      animationRef.current = requestAnimationFrame(updatePhysics);
    };

    animationRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.phase]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { bottle, score, combo, highScore } = gameState;

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, "#0f172a");
    bgGradient.addColorStop(0.6, "#1e293b");
    bgGradient.addColorStop(1, "#334155");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw table
    const tableGradient = ctx.createLinearGradient(
      0,
      TABLE_TOP,
      0,
      CANVAS_HEIGHT,
    );
    tableGradient.addColorStop(0, "#78350f");
    tableGradient.addColorStop(0.1, "#92400e");
    tableGradient.addColorStop(1, "#451a03");
    ctx.fillStyle = tableGradient;
    ctx.fillRect(0, TABLE_TOP, CANVAS_WIDTH, TABLE_HEIGHT);

    // Table top highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, TABLE_TOP, CANVAS_WIDTH, 3);

    // Wood grain lines
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, TABLE_TOP + 15 + i * 15);
      ctx.lineTo(CANVAS_WIDTH, TABLE_TOP + 15 + i * 15);
      ctx.stroke();
    }

    // Draw trail effect during flipping
    if (gameState.phase === "flipping" && trailRef.current.length > 0) {
      trailRef.current.forEach((tp) => {
        ctx.save();
        ctx.translate(tp.x, tp.y);
        ctx.rotate(tp.rotation);
        ctx.globalAlpha = tp.alpha;
        
        // Draw ghost bottle (simplified)
        ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
        ctx.beginPath();
        ctx.roundRect(
          -BOTTLE_WIDTH / 2,
          -BOTTLE_HEIGHT / 2 + BOTTLE_NECK_HEIGHT,
          BOTTLE_WIDTH,
          BOTTLE_HEIGHT - BOTTLE_NECK_HEIGHT,
          [0, 0, 8, 8],
        );
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(
          -BOTTLE_NECK_WIDTH / 2,
          -BOTTLE_HEIGHT / 2,
          BOTTLE_NECK_WIDTH,
          BOTTLE_NECK_HEIGHT + 5,
          [4, 4, 0, 0],
        );
        ctx.fill();
        
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }

    // Draw bottle
    ctx.save();
    ctx.translate(bottle.x, bottle.y);
    ctx.rotate(bottle.rotation);

    // Bottle shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(3, BOTTLE_HEIGHT / 2 + 3, BOTTLE_WIDTH / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bottle body
    const bottleGradient = ctx.createLinearGradient(
      -BOTTLE_WIDTH / 2,
      0,
      BOTTLE_WIDTH / 2,
      0,
    );
    bottleGradient.addColorStop(0, "#60a5fa");
    bottleGradient.addColorStop(0.3, "#93c5fd");
    bottleGradient.addColorStop(0.5, "#bfdbfe");
    bottleGradient.addColorStop(0.7, "#93c5fd");
    bottleGradient.addColorStop(1, "#3b82f6");
    ctx.fillStyle = bottleGradient;

    // Main body
    ctx.beginPath();
    ctx.roundRect(
      -BOTTLE_WIDTH / 2,
      -BOTTLE_HEIGHT / 2 + BOTTLE_NECK_HEIGHT,
      BOTTLE_WIDTH,
      BOTTLE_HEIGHT - BOTTLE_NECK_HEIGHT,
      [0, 0, 8, 8],
    );
    ctx.fill();

    // Neck
    ctx.beginPath();
    ctx.roundRect(
      -BOTTLE_NECK_WIDTH / 2,
      -BOTTLE_HEIGHT / 2,
      BOTTLE_NECK_WIDTH,
      BOTTLE_NECK_HEIGHT + 5,
      [4, 4, 0, 0],
    );
    ctx.fill();

    // Cap
    ctx.fillStyle = "#1e40af";
    ctx.beginPath();
    ctx.roundRect(
      -BOTTLE_NECK_WIDTH / 2 - 2,
      -BOTTLE_HEIGHT / 2 - 8,
      BOTTLE_NECK_WIDTH + 4,
      12,
      4,
    );
    ctx.fill();

    // Water inside (partial fill)
    ctx.fillStyle = "rgba(59, 130, 246, 0.5)";
    ctx.beginPath();
    ctx.roundRect(
      -BOTTLE_WIDTH / 2 + 4,
      0,
      BOTTLE_WIDTH - 8,
      BOTTLE_HEIGHT / 2 - BOTTLE_NECK_HEIGHT + 15,
      [0, 0, 4, 4],
    );
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.roundRect(
      -BOTTLE_WIDTH / 2 + 5,
      -BOTTLE_HEIGHT / 2 + BOTTLE_NECK_HEIGHT + 5,
      8,
      BOTTLE_HEIGHT - BOTTLE_NECK_HEIGHT - 15,
      4,
    );
    ctx.fill();

    ctx.restore();

    // HUD
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "right";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText("SCORE: " + score, CANVAS_WIDTH - 20, 35);

    ctx.font = "bold 18px Arial";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("BEST: " + highScore, CANVAS_WIDTH - 20, 60);

    if (combo > 0 && gameState.phase !== "result") {
      ctx.font = "bold 28px Arial";
      ctx.fillStyle = "#fbbf24";
      ctx.textAlign = "center";
      ctx.fillText(combo + "x COMBO!", CANVAS_WIDTH / 2, 80);
    }

    ctx.shadowBlur = 0;
  }, [gameState]);

  const startCharging = useCallback(() => {
    if (
      gameState.phase === "before" ||
      gameState.phase === "result"
    ) {
      setGameState((prev) => ({
        ...prev,
        phase: "charging",
        power: MIN_POWER,
        bottle: createInitialBottle(),
        attempts: prev.phase === "result" ? prev.attempts : prev.attempts + 1,
      }));
    }
  }, [gameState.phase]);

  const releaseFlip = useCallback(() => {
    if (gameState.phase !== "charging") return;

    const power = Math.max(MIN_POWER, Math.min(MAX_POWER, gameState.power));
    const angle = -Math.PI / 4; // 45 degrees up

    setGameState((prev) => ({
      ...prev,
      phase: "flipping",
      bottle: {
        ...prev.bottle,
        velocityX: Math.cos(angle) * power * 0.3,
        velocityY: Math.sin(angle) * power,
        angularVelocity: (power / MAX_POWER) * 0.4 + 0.15,
        isFlipping: true,
      },
    }));
  }, [gameState.phase, gameState.power]);

  const continueGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      phase: "charging",
      power: MIN_POWER,
      bottle: createInitialBottle(),
      attempts: prev.attempts + 1,
    }));
  }, []);

  // Touch/Mouse handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (gameState.phase === "before") {
        startCharging();
      } else if (gameState.phase === "result") {
        continueGame();
      } else if (gameState.phase === "charging") {
        // Already charging
      }
    },
    [gameState.phase, startCharging, continueGame],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (gameState.phase === "charging") {
        releaseFlip();
      }
    },
    [gameState.phase, releaseFlip],
  );

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (gameState.phase === "before") {
          startCharging();
        } else if (gameState.phase === "result") {
          continueGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (gameState.phase === "charging") {
          releaseFlip();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState.phase, startCharging, continueGame, releaseFlip]);

  const powerPercent = ((gameState.power - MIN_POWER) / (MAX_POWER - MIN_POWER)) * 100;

  return (
    <GameShell gameId="bottleflip" layout="default">
      <ScreenShake ref={shakeRef}>
        <div className="bottleflip-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="bottleflip-canvas"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />

          <ParticleLayer particles={particles} />
          
          <ComboCounter
            combo={gameState.combo}
            position="top-left"
            threshold={2}
            style={{ top: 90, left: 20 }}
          />

          {gameState.phase === "charging" && (
            <>
              <div className="bottleflip-power-bar">
                <div
                  className="bottleflip-power-fill"
                  style={{ height: powerPercent + "%" }}
                />
              </div>
              <div className="bottleflip-power-label">POWER</div>
            </>
          )}

          {gameState.phase === "before" && (
            <div className="bottleflip-overlay">
              <div className="bottleflip-icon">🍾</div>
              <h1 className="bottleflip-title">ボトルフリップ</h1>
              <p className="bottleflip-instruction">
                長押しでパワーをチャージ
                <br />
                離してフリップ！
                <br />
                ボトルを立たせよう
              </p>
              <button className="bottleflip-start-btn" onClick={startCharging}>
                START
              </button>
            </div>
          )}

          {gameState.phase === "result" && (
            <div className="bottleflip-overlay bottleflip-result-overlay">
              {gameState.bottle.landedUpright ? (
                <>
                  <h1 className="bottleflip-success">🎉 SUCCESS!</h1>
                  {gameState.combo > 1 && (
                    <p className="bottleflip-combo">{gameState.combo}x COMBO!</p>
                  )}
                </>
              ) : (
                <h1 className="bottleflip-gameover">💔 MISS...</h1>
              )}
              <p className="bottleflip-score">SCORE: {gameState.score}</p>
              <p className="bottleflip-best">BEST: {gameState.highScore}</p>
              {gameState.score === gameState.highScore && gameState.score > 0 && (
                <p className="bottleflip-new-record">🏆 NEW RECORD!</p>
              )}
              <button className="bottleflip-start-btn" onClick={continueGame}>
                {gameState.bottle.landedUpright ? "CONTINUE" : "RETRY"}
              </button>
              <ShareButton score={gameState.score} gameTitle="Bottle Flip" gameId="bottleflip" />
              <GameRecommendations currentGameId="bottleflip" />
            </div>
          )}

          {popups.map((p) => (
            <ScorePopup
              key={p.id}
              popupKey={p.id}
              text={p.value}
              x={p.x}
              y={p.y}
              variant={p.variant}
            />
          ))}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
