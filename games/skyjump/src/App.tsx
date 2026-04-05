import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles } from "@shared/hooks/useParticles";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { ShareButton } from "@shared/components/ShareButton";
import { GameRecommendations } from "@shared/components/GameRecommendations";
import type { PopupVariant } from "@shared/components/ScorePopup";
import "./App.css";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 700;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const PLATFORM_WIDTH = 70;
const PLATFORM_HEIGHT = 15;
const GRAVITY = 0.35;
const JUMP_VELOCITY = -12;
const INITIAL_PLATFORMS = 10;
const PLATFORM_SPACING = 70;

interface Platform {
  id: number;
  x: number;
  y: number;
  width: number;
  type: "normal" | "moving" | "breaking";
  broken: boolean;
  direction?: number;
}

interface Player {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  facingRight: boolean;
}

interface GameState {
  phase: "before" | "playing" | "gameover";
  player: Player;
  platforms: Platform[];
  score: number;
  maxHeight: number;
  highScore: number;
  cameraY: number;
  platformIdCounter: number;
  combo: number;
  lastLandingPlatformId: number | null;
}

interface PopupInfo {
  text: string;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
}

function createPlatform(
  id: number,
  y: number,
  heightLevel: number
): Platform {
  const x = Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH);
  const baseType: Platform["type"] =
    heightLevel > 500 && Math.random() < 0.2
      ? "moving"
      : heightLevel > 1000 && Math.random() < 0.15
        ? "breaking"
        : "normal";

  return {
    id,
    x,
    y,
    width: PLATFORM_WIDTH,
    type: baseType,
    broken: false,
    direction: baseType === "moving" ? (Math.random() < 0.5 ? -1 : 1) : undefined,
  };
}

function generateInitialPlatforms(): { platforms: Platform[]; counter: number } {
  const platforms: Platform[] = [];
  let counter = 0;

  // Ground platform
  platforms.push({
    id: counter++,
    x: CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2,
    y: CANVAS_HEIGHT - 50,
    width: PLATFORM_WIDTH * 1.5,
    type: "normal",
    broken: false,
  });

  for (let i = 1; i < INITIAL_PLATFORMS; i++) {
    const y = CANVAS_HEIGHT - 50 - i * PLATFORM_SPACING;
    platforms.push(createPlatform(counter++, y, 0));
  }

  return { platforms, counter };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const targetXRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState | null>(null);

  // Dopamine hooks
  const { playClick, playSuccess, playCombo, playMiss, playGameOver, playBonus, playCelebrate } = useAudio();
  const { particles, burst, sparkle, confetti } = useParticles();
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const popupKeyRef = useRef(0);

  const showPopup = useCallback((text: string, x: string, y: string, variant: PopupVariant = "default") => {
    popupKeyRef.current += 1;
    setPopup({ text, key: popupKeyRef.current, x, y, variant });
    setTimeout(() => setPopup(null), 1000);
  }, []);

  const [gameState, setGameState] = useState<GameState>(() => {
    const { platforms, counter } = generateInitialPlatforms();
    return {
      phase: "before",
      player: {
        x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
        y: CANVAS_HEIGHT - 100,
        velocityX: 0,
        velocityY: 0,
        facingRight: true,
      },
      platforms,
      score: 0,
      maxHeight: 0,
      highScore: parseInt(localStorage.getItem("skyjump_highscore") || "0"),
      cameraY: 0,
      platformIdCounter: counter,
      combo: 0,
      lastLandingPlatformId: null,
    };
  });

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Game loop
  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const updateGame = () => {
      const state = gameStateRef.current;
      if (!state || state.phase !== "playing") return;

      let { x, y, velocityX, velocityY, facingRight } = state.player;
      let { cameraY, platforms, maxHeight, platformIdCounter, combo, lastLandingPlatformId } = state;
      let landedOnPlatform: Platform | null = null;

      // Horizontal movement
      const moveSpeed = 6;
      if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) {
        velocityX = -moveSpeed;
        facingRight = false;
      } else if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) {
        velocityX = moveSpeed;
        facingRight = true;
      } else if (targetXRef.current !== null) {
        const targetX = targetXRef.current - PLAYER_WIDTH / 2;
        const diff = targetX - x;
        if (Math.abs(diff) > 5) {
          velocityX = Math.sign(diff) * moveSpeed;
          facingRight = diff > 0;
        } else {
          velocityX = 0;
        }
      } else {
        velocityX = 0;
      }

      // Apply gravity
      velocityY += GRAVITY;

      // Update position
      x += velocityX;
      y += velocityY;

      // Screen wrap
      if (x + PLAYER_WIDTH < 0) x = CANVAS_WIDTH;
      if (x > CANVAS_WIDTH) x = -PLAYER_WIDTH;

      // Update moving platforms
      platforms = platforms.map((p) => {
        if (p.type === "moving" && p.direction !== undefined) {
          const newX = p.x + p.direction * 2;
          if (newX < 0 || newX + p.width > CANVAS_WIDTH) {
            return { ...p, x: Math.max(0, Math.min(CANVAS_WIDTH - p.width, newX)), direction: -p.direction };
          }
          return { ...p, x: newX };
        }
        return p;
      });

      // Platform collision (only when falling)
      if (velocityY > 0) {
        for (const platform of platforms) {
          if (platform.broken) continue;

          const playerBottom = y + PLAYER_HEIGHT;
          const playerCenterX = x + PLAYER_WIDTH / 2;
          
          if (
            playerBottom >= platform.y &&
            playerBottom <= platform.y + PLATFORM_HEIGHT + velocityY &&
            playerCenterX >= platform.x &&
            playerCenterX <= platform.x + platform.width
          ) {
            y = platform.y - PLAYER_HEIGHT;
            velocityY = JUMP_VELOCITY;
            landedOnPlatform = platform;

            // Track combo for landing on different platforms
            if (lastLandingPlatformId !== platform.id) {
              combo += 1;
              lastLandingPlatformId = platform.id;
            }

            if (platform.type === "breaking") {
              platforms = platforms.map((p) =>
                p.id === platform.id ? { ...p, broken: true } : p
              );
            }
            break;
          }
        }
      }

      // Calculate height from initial position
      const currentHeight = Math.max(0, Math.floor((CANVAS_HEIGHT - 100 - y + cameraY) / 10));
      if (currentHeight > maxHeight) {
        maxHeight = currentHeight;
      }

      // Camera follow
      const targetCameraY = Math.max(0, (CANVAS_HEIGHT - 100 - y) - CANVAS_HEIGHT / 3);
      if (targetCameraY > cameraY) {
        cameraY = targetCameraY;
      }

      // Generate new platforms above
      const topPlatformY = Math.min(...platforms.map((p) => p.y));
      const visibleTop = -cameraY - 100;
      while (topPlatformY > visibleTop) {
        const newY = topPlatformY - PLATFORM_SPACING;
        platforms.push(createPlatform(platformIdCounter++, newY, maxHeight));
        break;
      }

      // Generate more if needed
      const highestPlatform = Math.min(...platforms.map((p) => p.y));
      if (highestPlatform > visibleTop) {
        for (let i = 0; i < 3; i++) {
          const newY = highestPlatform - (i + 1) * PLATFORM_SPACING;
          platforms.push(createPlatform(platformIdCounter++, newY, maxHeight));
        }
      }

      // Remove platforms below screen
      const screenBottom = CANVAS_HEIGHT + cameraY + 100;
      platforms = platforms.filter((p) => p.y < screenBottom);

      // Game over check
      const playerScreenY = y + cameraY;
      if (playerScreenY > CANVAS_HEIGHT + 50) {
        const finalScore = maxHeight;
        const newHighScore = Math.max(finalScore, state.highScore);
        if (newHighScore > state.highScore) {
          localStorage.setItem("skyjump_highscore", newHighScore.toString());
        }
        // Game over effects
        playMiss();
        playGameOver();
        setGameState((prev) => ({
          ...prev,
          phase: "gameover",
          score: finalScore,
          highScore: newHighScore,
        }));
        return;
      }

      // Handle landing effects (after all state updates)
      if (landedOnPlatform) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = rect.width / CANVAS_WIDTH;
          const scaleY = rect.height / CANVAS_HEIGHT;
          const screenX = rect.left + (landedOnPlatform.x + landedOnPlatform.width / 2) * scaleX;
          const screenY = rect.top + (landedOnPlatform.y + cameraY) * scaleY;

          // Play jump sound
          playClick();

          // Different effects based on platform type
          if (landedOnPlatform.type === "moving") {
            // Special platform: sparkle + bonus sound
            playBonus();
            sparkle(screenX, screenY, 10);
            showPopup("+10 BONUS!", `${(x + PLAYER_WIDTH / 2) / CANVAS_WIDTH * 100}%`, "40%", "bonus");
          } else if (landedOnPlatform.type === "breaking") {
            // Breaking platform: burst + combo sound
            playSuccess();
            burst(screenX, screenY, 8);
            showPopup("BREAKING!", `${(x + PLAYER_WIDTH / 2) / CANVAS_WIDTH * 100}%`, "40%", "critical");
          } else {
            // Normal platform
            burst(screenX, screenY, 6);
          }

          // Combo effects
          if (combo > 0 && combo % 5 === 0) {
            playCombo(combo);
            showPopup(`${combo} COMBO!`, "50%", "30%", "combo");
          }

          // Height milestone effects
          if (maxHeight > 0 && maxHeight % 100 === 0) {
            playCelebrate();
            confetti(30);
            showPopup(`${maxHeight}m!`, "50%", "25%", "level");
          }
        }
      }

      setGameState((prev) => ({
        ...prev,
        player: { x, y, velocityX, velocityY, facingRight },
        platforms,
        cameraY,
        maxHeight,
        score: maxHeight,
        platformIdCounter,
        combo,
        lastLandingPlatformId,
      }));

      animationRef.current = requestAnimationFrame(updateGame);
    };

    animationRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.phase, playClick, playSuccess, playCombo, playMiss, playGameOver, playBonus, playCelebrate, burst, sparkle, confetti, showPopup]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { player, platforms, cameraY, score, highScore } = gameState;

    // Sky gradient based on height
    const heightFactor = Math.min(1, score / 500);
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, `hsl(${200 + heightFactor * 40}, 70%, ${70 - heightFactor * 40}%)`);
    skyGradient.addColorStop(1, `hsl(${180 + heightFactor * 60}, 60%, ${50 - heightFactor * 30}%)`);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Stars at higher altitudes
    if (score > 200) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.8, (score - 200) / 300)})`;
      for (let i = 0; i < 50; i++) {
        const starX = (i * 73 + cameraY * 0.1) % CANVAS_WIDTH;
        const starY = (i * 47 + cameraY * 0.05) % CANVAS_HEIGHT;
        ctx.beginPath();
        ctx.arc(starX, starY, 1 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(0, cameraY);

    // Draw platforms
    for (const platform of platforms) {
      if (platform.broken) continue;

      const colors = {
        normal: { top: "#4ade80", side: "#22c55e" },
        moving: { top: "#60a5fa", side: "#3b82f6" },
        breaking: { top: "#f87171", side: "#ef4444" },
      };
      const color = colors[platform.type];

      // Platform shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(platform.x + 3, platform.y + 3, platform.width, PLATFORM_HEIGHT);

      // Platform body
      ctx.fillStyle = color.side;
      ctx.fillRect(platform.x, platform.y, platform.width, PLATFORM_HEIGHT);

      // Platform top highlight
      ctx.fillStyle = color.top;
      ctx.fillRect(platform.x, platform.y, platform.width, PLATFORM_HEIGHT / 2);

      // Grass effect on normal platforms
      if (platform.type === "normal") {
        ctx.fillStyle = "#86efac";
        for (let i = 0; i < platform.width; i += 6) {
          ctx.fillRect(platform.x + i, platform.y - 2, 3, 3);
        }
      }
    }

    // Draw player
    const px = player.x;
    const py = player.y;

    // Player shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(px + PLAYER_WIDTH / 2, py + PLAYER_HEIGHT + 5, PLAYER_WIDTH / 2.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(px + PLAYER_WIDTH / 2, py + PLAYER_HEIGHT / 2, PLAYER_WIDTH / 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#1f2937";
    const eyeOffsetX = player.facingRight ? 6 : -6;
    ctx.beginPath();
    ctx.arc(px + PLAYER_WIDTH / 2 + eyeOffsetX - 5, py + PLAYER_HEIGHT / 2 - 3, 4, 0, Math.PI * 2);
    ctx.arc(px + PLAYER_WIDTH / 2 + eyeOffsetX + 5, py + PLAYER_HEIGHT / 2 - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px + PLAYER_WIDTH / 2 + eyeOffsetX - 4, py + PLAYER_HEIGHT / 2 - 4, 1.5, 0, Math.PI * 2);
    ctx.arc(px + PLAYER_WIDTH / 2 + eyeOffsetX + 6, py + PLAYER_HEIGHT / 2 - 4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + PLAYER_WIDTH / 2 + eyeOffsetX, py + PLAYER_HEIGHT / 2 + 5, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.restore();

    // UI
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText("HEIGHT: " + score + "m", 15, 30);
    ctx.fillText("BEST: " + highScore + "m", 15, 55);
    ctx.shadowBlur = 0;
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (gameState.phase !== "playing") return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      targetXRef.current = (e.clientX - rect.left) * scaleX;
    },
    [gameState.phase]
  );

  const handlePointerLeave = useCallback(() => {
    targetXRef.current = null;
  }, []);

  const startGame = useCallback(() => {
    const { platforms, counter } = generateInitialPlatforms();
    targetXRef.current = null;
    keysRef.current.clear();
    playClick();

    setGameState({
      phase: "playing",
      player: {
        x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
        y: CANVAS_HEIGHT - 100,
        velocityX: 0,
        velocityY: JUMP_VELOCITY,
        facingRight: true,
      },
      platforms,
      score: 0,
      maxHeight: 0,
      highScore: parseInt(localStorage.getItem("skyjump_highscore") || "0"),
      cameraY: 0,
      platformIdCounter: counter,
      combo: 0,
      lastLandingPlatformId: null,
    });
  }, [playClick]);

  const handleCanvasClick = useCallback(() => {
    if (gameState.phase !== "playing") {
      startGame();
    }
  }, [gameState.phase, startGame]);

  return (
    <GameShell gameId="skyjump" layout="immersive">
      <div className="skyjump-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="skyjump-canvas"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleCanvasClick}
        />

        {/* Particle effects layer */}
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
          <div className="skyjump-overlay">
            <h1 className="skyjump-title">SKY JUMP</h1>
            <p className="skyjump-instruction">
              ← → キーまたはマウス/タッチで移動
              <br />
              プラットフォームに着地してジャンプ！
              <br />
              どこまで高く登れるか挑戦しよう
            </p>
            <div className="skyjump-platforms-info">
              <span className="skyjump-platform-type normal">■ 通常</span>
              <span className="skyjump-platform-type moving">■ 動く</span>
              <span className="skyjump-platform-type breaking">■ 壊れる</span>
            </div>
            <button className="skyjump-start-btn" onClick={startGame}>
              START
            </button>
          </div>
        )}

        {gameState.phase === "gameover" && (
          <div className="skyjump-overlay">
            <h1 className="skyjump-gameover">GAME OVER</h1>
            <p className="skyjump-final-score">HEIGHT: {gameState.score}m</p>
            {gameState.score === gameState.highScore && gameState.score > 0 && (
              <p className="skyjump-new-record">🎉 NEW RECORD! 🎉</p>
            )}
            <button className="skyjump-start-btn" onClick={startGame}>
              RETRY
            </button>
            <ShareButton score={gameState.score} gameTitle="Sky Jump" gameId="skyjump" />
            <GameRecommendations currentGameId="skyjump" />
          </div>
        )}
      </div>
    </GameShell>
  );
}
