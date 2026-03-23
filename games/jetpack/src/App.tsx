import { useRef, useEffect, useState, useCallback } from "react";
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

// Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 50;
const PLAYER_X = 100;
const GRAVITY = 0.5;
const THRUST = -0.8;
const MAX_VELOCITY = 8;
const SCROLL_SPEED = 4;
const OBSTACLE_WIDTH = 60;
const OBSTACLE_GAP = 180;
const OBSTACLE_SPAWN_DISTANCE = 400;
const COIN_SIZE = 20;
const COIN_VALUE = 10;
const DISTANCE_SCORE_RATE = 0.1;
const MILESTONE_INTERVAL = 500; // 距離マイルストーン間隔

type GamePhase = "ready" | "playing" | "gameover";

interface Obstacle {
  x: number;
  topHeight: number;
  passed: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface GameState {
  playerY: number;
  velocityY: number;
  isThrusting: boolean;
  obstacles: Obstacle[];
  coins: Coin[];
  particles: Particle[];
  distance: number;
  coinsCollected: number;
  lastObstacleX: number;
  lastMilestone: number; // 最後に通過したマイルストーン
}

function createInitialState(): GameState {
  return {
    playerY: CANVAS_HEIGHT / 2 - PLAYER_HEIGHT / 2,
    velocityY: 0,
    isThrusting: false,
    obstacles: [],
    coins: [],
    particles: [],
    distance: 0,
    coinsCollected: 0,
    lastObstacleX: CANVAS_WIDTH,
    lastMilestone: 0,
  };
}

function spawnObstacle(state: GameState): void {
  const minHeight = 50;
  const maxHeight = CANVAS_HEIGHT - OBSTACLE_GAP - minHeight;
  const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
  
  state.obstacles.push({
    x: state.lastObstacleX + OBSTACLE_SPAWN_DISTANCE,
    topHeight,
    passed: false,
  });
  
  // Spawn coins in the gap
  const gapCenterY = topHeight + OBSTACLE_GAP / 2;
  const coinX = state.lastObstacleX + OBSTACLE_SPAWN_DISTANCE + OBSTACLE_WIDTH / 2;
  
  // Random coin pattern
  const patterns = [
    [0],
    [-30, 30],
    [-40, 0, 40],
  ];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  
  for (const offset of pattern) {
    state.coins.push({
      x: coinX + (Math.random() - 0.5) * 20,
      y: gapCenterY + offset,
      collected: false,
    });
  }
  
  state.lastObstacleX += OBSTACLE_SPAWN_DISTANCE;
}

function spawnThrustParticle(state: GameState, playerY: number): void {
  for (let i = 0; i < 2; i++) {
    state.particles.push({
      x: PLAYER_X + PLAYER_WIDTH / 2 + (Math.random() - 0.5) * 10,
      y: playerY + PLAYER_HEIGHT + Math.random() * 5,
      vx: (Math.random() - 0.5) * 2 - SCROLL_SPEED * 0.3,
      vy: 2 + Math.random() * 3,
      life: 20 + Math.random() * 10,
      maxLife: 30,
    });
  }
}

function checkCollision(state: GameState): boolean {
  const playerRect = {
    x: PLAYER_X + 5,
    y: state.playerY + 5,
    width: PLAYER_WIDTH - 10,
    height: PLAYER_HEIGHT - 10,
  };
  
  // Check boundaries
  if (playerRect.y < 0 || playerRect.y + playerRect.height > CANVAS_HEIGHT) {
    return true;
  }
  
  // Check obstacles
  for (const obs of state.obstacles) {
    // Top obstacle
    if (
      playerRect.x < obs.x + OBSTACLE_WIDTH &&
      playerRect.x + playerRect.width > obs.x &&
      playerRect.y < obs.topHeight
    ) {
      return true;
    }
    
    // Bottom obstacle
    const bottomY = obs.topHeight + OBSTACLE_GAP;
    if (
      playerRect.x < obs.x + OBSTACLE_WIDTH &&
      playerRect.x + playerRect.width > obs.x &&
      playerRect.y + playerRect.height > bottomY
    ) {
      return true;
    }
  }
  
  return false;
}

interface CollectedCoinInfo {
  count: number;
  positions: Array<{ x: number; y: number }>;
}

function checkCoinCollision(state: GameState): CollectedCoinInfo {
  const result: CollectedCoinInfo = { count: 0, positions: [] };
  const playerCenterX = PLAYER_X + PLAYER_WIDTH / 2;
  const playerCenterY = state.playerY + PLAYER_HEIGHT / 2;
  
  for (const coin of state.coins) {
    if (coin.collected) continue;
    
    const dx = playerCenterX - coin.x;
    const dy = playerCenterY - coin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < PLAYER_WIDTH / 2 + COIN_SIZE / 2) {
      coin.collected = true;
      result.count++;
      result.positions.push({ x: coin.x, y: coin.y });
    }
  }
  
  return result;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const shakeRef = useRef<ScreenShakeHandle>(null);
  
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [score, setScore] = useState(0);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [displayCoins, setDisplayCoins] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("jetpack_highscore");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [flashAlpha, setFlashAlpha] = useState(0);
  
  // ポップアップ管理
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    x: string;
    y: string;
    variant: PopupVariant;
  } | null>(null);
  const popupKeyRef = useRef(0);
  
  // 共通フック
  const audio = useAudio();
  const { particles, sparkle, explosion, confetti, clear: clearParticles } = useParticles();
  
  const initGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    // Spawn initial obstacles
    for (let i = 0; i < 3; i++) {
      spawnObstacle(gameStateRef.current);
    }
    setScore(0);
    setDisplayDistance(0);
    setDisplayCoins(0);
    setIsNewHighScore(false);
    setFlashAlpha(0);
    setPopup(null);
    clearParticles();
  }, [clearParticles]);
  
  const startGame = useCallback(() => {
    initGame();
    setPhase("playing");
  }, [initGame]);
  
  // ポップアップ表示ヘルパー
  const showPopup = useCallback((text: string, x: number, y: number, variant: PopupVariant = "default") => {
    popupKeyRef.current++;
    // Canvas座標をパーセンテージに変換
    const xPercent = `${(x / CANVAS_WIDTH) * 100}%`;
    const yPercent = `${(y / CANVAS_HEIGHT) * 100}%`;
    setPopup({ text, key: popupKeyRef.current, x: xPercent, y: yPercent, variant });
    setTimeout(() => setPopup(null), 1000);
  }, []);
  
  const endGame = useCallback(() => {
    const state = gameStateRef.current;
    const finalScore = Math.floor(state.distance * DISTANCE_SCORE_RATE) + state.coinsCollected * COIN_VALUE;
    setScore(finalScore);
    setPhase("gameover");
    
    // 爆発演出
    const playerCenterX = PLAYER_X + PLAYER_WIDTH / 2;
    const playerCenterY = state.playerY + PLAYER_HEIGHT / 2;
    explosion(playerCenterX, playerCenterY);
    shakeRef.current?.shake("heavy", 400);
    audio.playExplosion();
    
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem("jetpack_highscore", String(finalScore));
      setIsNewHighScore(true);
      // ハイスコア更新演出 (少し遅延)
      setTimeout(() => {
        confetti(60);
        audio.playCelebrate();
      }, 500);
    }
  }, [highScore, explosion, confetti, audio]);
  
  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "ready" || phase === "gameover") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          startGame();
        }
        return;
      }
      
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        gameStateRef.current.isThrusting = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
        gameStateRef.current.isThrusting = false;
      }
    };
    
    const handlePointerDown = (e: PointerEvent) => {
      if (phase === "ready" || phase === "gameover") {
        return;
      }
      e.preventDefault();
      gameStateRef.current.isThrusting = true;
    };
    
    const handlePointerUp = () => {
      gameStateRef.current.isThrusting = false;
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [phase, startGame]);
  
  // Game loop
  useEffect(() => {
    if (phase !== "playing") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let animationId: number;
    let lastJetSoundTime = 0;
    
    const gameLoop = () => {
      const state = gameStateRef.current;
      const now = performance.now();
      
      // Update physics
      if (state.isThrusting) {
        state.velocityY += THRUST;
        spawnThrustParticle(state, state.playerY);
        // ジェット音 (間引き: 100ms間隔)
        if (now - lastJetSoundTime > 100) {
          audio.playTone(120 + Math.random() * 40, 0.08, "sawtooth", 0.08);
          lastJetSoundTime = now;
        }
      }
      state.velocityY += GRAVITY;
      state.velocityY = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, state.velocityY));
      state.playerY += state.velocityY;
      
      // Update distance
      state.distance += SCROLL_SPEED;
      
      // マイルストーンチェック
      const currentMilestone = Math.floor(state.distance / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
      if (currentMilestone > state.lastMilestone && currentMilestone > 0) {
        state.lastMilestone = currentMilestone;
        // 画面フラッシュ
        setFlashAlpha(0.4);
        setTimeout(() => setFlashAlpha(0), 150);
        // マイルストーン音とポップアップ
        audio.playLevelUp();
        showPopup(`${currentMilestone}m!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "level");
      }
      
      // Update obstacles
      for (const obs of state.obstacles) {
        obs.x -= SCROLL_SPEED;
        if (!obs.passed && obs.x + OBSTACLE_WIDTH < PLAYER_X) {
          obs.passed = true;
        }
      }
      
      // Update coins
      for (const coin of state.coins) {
        coin.x -= SCROLL_SPEED;
      }
      
      // Update particles
      for (const particle of state.particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
      }
      state.particles = state.particles.filter(p => p.life > 0);
      
      // Remove off-screen obstacles and coins
      state.obstacles = state.obstacles.filter(obs => obs.x + OBSTACLE_WIDTH > -50);
      state.coins = state.coins.filter(coin => coin.x > -50 && !coin.collected);
      
      // Spawn new obstacles
      const lastObs = state.obstacles[state.obstacles.length - 1];
      if (!lastObs || lastObs.x < CANVAS_WIDTH) {
        spawnObstacle(state);
      }
      
      // Check coin collection
      const collectedInfo = checkCoinCollision(state);
      if (collectedInfo.count > 0) {
        state.coinsCollected += collectedInfo.count;
        // コイン取得演出
        for (const pos of collectedInfo.positions) {
          sparkle(pos.x, pos.y, 10);
          showPopup(`+${COIN_VALUE}`, pos.x, pos.y, "bonus");
        }
        audio.playSuccess();
      }
      
      // Check collision
      if (checkCollision(state)) {
        endGame();
        return;
      }
      
      // Update display
      setDisplayDistance(Math.floor(state.distance));
      setDisplayCoins(state.coinsCollected);
      setScore(Math.floor(state.distance * DISTANCE_SCORE_RATE) + state.coinsCollected * COIN_VALUE);
      
      // Render
      render(ctx, state);
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    const render = (ctx: CanvasRenderingContext2D, state: GameState) => {
      // Background
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#1a1a3e");
      gradient.addColorStop(1, "#2d2d5a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Background stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      const starOffset = (state.distance * 0.5) % 100;
      for (let i = 0; i < 50; i++) {
        const x = ((i * 47 + 13) % CANVAS_WIDTH + CANVAS_WIDTH - starOffset) % CANVAS_WIDTH;
        const y = (i * 73 + 29) % CANVAS_HEIGHT;
        ctx.beginPath();
        ctx.arc(x, y, 1 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Particles
      for (const particle of state.particles) {
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = `rgba(255, 150, 50, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Obstacles
      for (const obs of state.obstacles) {
        // Top obstacle
        const topGradient = ctx.createLinearGradient(obs.x, 0, obs.x + OBSTACLE_WIDTH, 0);
        topGradient.addColorStop(0, "#4a9f4a");
        topGradient.addColorStop(0.5, "#5cb85c");
        topGradient.addColorStop(1, "#4a9f4a");
        ctx.fillStyle = topGradient;
        ctx.fillRect(obs.x, 0, OBSTACLE_WIDTH, obs.topHeight);
        
        // Top obstacle cap
        ctx.fillStyle = "#3d8b3d";
        ctx.fillRect(obs.x - 5, obs.topHeight - 20, OBSTACLE_WIDTH + 10, 20);
        
        // Bottom obstacle
        const bottomY = obs.topHeight + OBSTACLE_GAP;
        ctx.fillStyle = topGradient;
        ctx.fillRect(obs.x, bottomY, OBSTACLE_WIDTH, CANVAS_HEIGHT - bottomY);
        
        // Bottom obstacle cap
        ctx.fillStyle = "#3d8b3d";
        ctx.fillRect(obs.x - 5, bottomY, OBSTACLE_WIDTH + 10, 20);
      }
      
      // Coins
      for (const coin of state.coins) {
        if (coin.collected) continue;
        
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, COIN_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#ffec8b";
        ctx.beginPath();
        ctx.arc(coin.x - 3, coin.y - 3, COIN_SIZE / 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "#b8860b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, COIN_SIZE / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Player
      const px = PLAYER_X;
      const py = state.playerY;
      
      // Body
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.roundRect(px + 5, py + 5, PLAYER_WIDTH - 10, PLAYER_HEIGHT - 15, 8);
      ctx.fill();
      
      // Helmet
      ctx.fillStyle = "#4ecdc4";
      ctx.beginPath();
      ctx.arc(px + PLAYER_WIDTH / 2, py + 15, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Visor
      ctx.fillStyle = "#1a1a3e";
      ctx.beginPath();
      ctx.ellipse(px + PLAYER_WIDTH / 2 + 3, py + 15, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Jetpack
      ctx.fillStyle = "#666";
      ctx.fillRect(px - 5, py + 15, 12, 25);
      ctx.fillStyle = "#888";
      ctx.fillRect(px - 3, py + 17, 8, 21);
      
      // Thrust flame
      if (state.isThrusting) {
        const flameHeight = 15 + Math.random() * 10;
        const gradient = ctx.createLinearGradient(px, py + PLAYER_HEIGHT, px, py + PLAYER_HEIGHT + flameHeight);
        gradient.addColorStop(0, "#ff6b6b");
        gradient.addColorStop(0.5, "#ffa500");
        gradient.addColorStop(1, "rgba(255, 200, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(px + 5, py + PLAYER_HEIGHT - 5);
        ctx.lineTo(px + PLAYER_WIDTH / 2, py + PLAYER_HEIGHT + flameHeight);
        ctx.lineTo(px + PLAYER_WIDTH - 15, py + PLAYER_HEIGHT - 5);
        ctx.closePath();
        ctx.fill();
      }
    };
    
    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [phase, endGame, audio, sparkle, showPopup]);
  
  // Initial render
  useEffect(() => {
    if (phase !== "playing") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#1a1a3e");
      gradient.addColorStop(1, "#2d2d5a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      for (let i = 0; i < 50; i++) {
        const x = (i * 47 + 13) % CANVAS_WIDTH;
        const y = (i * 73 + 29) % CANVAS_HEIGHT;
        ctx.beginPath();
        ctx.arc(x, y, 1 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [phase]);
  
  return (
    <GameShell gameId="jetpack" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div
          className="jetpack-game"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="jetpack-canvas"
          />
          
          {/* 画面フラッシュ */}
          {flashAlpha > 0 && (
            <div
              className="jetpack-flash"
              style={{ opacity: flashAlpha }}
            />
          )}
          
          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />
          
          {/* スコアポップアップ */}
          {popup && (
            <ScorePopup
              text={popup.text}
              popupKey={popup.key}
              x={popup.x}
              y={popup.y}
              variant={popup.variant}
              size="md"
            />
          )}
          
          <div className="jetpack-hud">
            <div className="jetpack-score">Score: {score}</div>
            <div className="jetpack-stats">
              <span>🚀 {displayDistance}m</span>
              <span>🪙 {displayCoins}</span>
            </div>
            <div className="jetpack-highscore">Best: {highScore}</div>
          </div>
          
          {phase === "ready" && (
            <div className="jetpack-overlay">
              <h1 className="jetpack-title">🚀 Jetpack</h1>
              <p className="jetpack-instruction">
                タップ / スペース で上昇<br />
                コインを集めて障害物を避けよう！
              </p>
              <button className="jetpack-start-btn" onClick={startGame}>
                START
              </button>
              <p className="jetpack-hint">Space / Enter でスタート</p>
            </div>
          )}
          
          {phase === "gameover" && (
            <div className="jetpack-overlay jetpack-gameover">
              <h1 className="jetpack-gameover-title">Game Over</h1>
              <div className="jetpack-final-stats">
                <p>距離: {displayDistance}m</p>
                <p>コイン: {displayCoins} 枚</p>
                <p className="jetpack-final-score">Score: {score}</p>
              </div>
              {isNewHighScore && (
                <p className="jetpack-new-record">🏆 New Record!</p>
              )}
              <button className="jetpack-start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
