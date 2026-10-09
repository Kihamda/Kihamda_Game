import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ScreenShake } from "@shared/components/ScreenShake";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { ShareButton } from "@shared/components/ShareButton";
import { GameRecommendations } from "@shared/components/GameRecommendations";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import "./App.css";

// Constants - 600x400 as specified
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const BIRD_WIDTH = 34;
const BIRD_HEIGHT = 24;
const BIRD_X = 80;
const GRAVITY = 0.4;
const FLAP_POWER = -7;
const SCROLL_SPEED = 3;
const PIPE_WIDTH = 52;
const PIPE_GAP = 140;
const PIPE_SPAWN_DISTANCE = 220;
const COIN_SIZE = 18;
const COIN_VALUE = 10;
const DISTANCE_SCORE_RATE = 0.1;

type GamePhase = "ready" | "playing" | "gameover";

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface GameState {
  birdY: number;
  velocityY: number;
  rotation: number;
  pipes: Pipe[];
  coins: Coin[];
  distance: number;
  coinsCollected: number;
  lastPipeX: number;
  wingFrame: number;
  wingTimer: number;
}

function createInitialState(): GameState {
  return {
    birdY: CANVAS_HEIGHT / 2 - BIRD_HEIGHT / 2,
    velocityY: 0,
    rotation: 0,
    pipes: [],
    coins: [],
    distance: 0,
    coinsCollected: 0,
    lastPipeX: CANVAS_WIDTH + 100,
    wingFrame: 0,
    wingTimer: 0,
  };
}

function spawnPipe(state: GameState): void {
  const minHeight = 50;
  const maxHeight = CANVAS_HEIGHT - PIPE_GAP - minHeight - 30;
  const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
  
  state.pipes.push({
    x: state.lastPipeX + PIPE_SPAWN_DISTANCE,
    topHeight,
    passed: false,
  });
  
  // Spawn coins in the gap
  const gapCenterY = topHeight + PIPE_GAP / 2;
  const coinX = state.lastPipeX + PIPE_SPAWN_DISTANCE + PIPE_WIDTH / 2;
  
  // Random coin pattern
  const patterns = [
    [0],
    [-25, 25],
    [-35, 0, 35],
  ];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  
  for (const offset of pattern) {
    state.coins.push({
      x: coinX,
      y: gapCenterY + offset,
      collected: false,
    });
  }
  
  state.lastPipeX += PIPE_SPAWN_DISTANCE;
}

function checkCollision(state: GameState): boolean {
  const birdRect = {
    x: BIRD_X + 4,
    y: state.birdY + 4,
    width: BIRD_WIDTH - 8,
    height: BIRD_HEIGHT - 8,
  };
  
  // Check boundaries
  if (birdRect.y < 0 || birdRect.y + birdRect.height > CANVAS_HEIGHT) {
    return true;
  }
  
  // Check pipes
  for (const pipe of state.pipes) {
    // Top pipe
    if (
      birdRect.x < pipe.x + PIPE_WIDTH &&
      birdRect.x + birdRect.width > pipe.x &&
      birdRect.y < pipe.topHeight
    ) {
      return true;
    }
    
    // Bottom pipe
    const bottomY = pipe.topHeight + PIPE_GAP;
    if (
      birdRect.x < pipe.x + PIPE_WIDTH &&
      birdRect.x + birdRect.width > pipe.x &&
      birdRect.y + birdRect.height > bottomY
    ) {
      return true;
    }
  }
  
  return false;
}

function checkCoinCollision(state: GameState): number {
  let collected = 0;
  const birdCenterX = BIRD_X + BIRD_WIDTH / 2;
  const birdCenterY = state.birdY + BIRD_HEIGHT / 2;
  
  for (const coin of state.coins) {
    if (coin.collected) continue;
    
    const dx = birdCenterX - coin.x;
    const dy = birdCenterY - coin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < BIRD_WIDTH / 2 + COIN_SIZE / 2) {
      coin.collected = true;
      collected++;
    }
  }
  
  return collected;
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
    const saved = localStorage.getItem("birdfly_highscore");
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // ドーパミン演出用
  const [birdScale, setBirdScale] = useState(1);
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const prevHighScore = useRef(highScore);
  
  // イベントコールバック用ref
  const onPipePassRef = useRef<(() => void) | null>(null);
  const onCoinCollectRef = useRef<((count: number) => void) | null>(null);
  
  const { particles, sparkle, confetti } = useParticles();
  const { playTone, playSweep, playArpeggio, playNoise } = useAudio();
  
  // パイプ通過時の演出
  const handlePipePass = useCallback(() => {
    // sparkle エフェクト (鳥の位置)
    const state = gameStateRef.current;
    sparkle(BIRD_X + BIRD_WIDTH / 2, state.birdY + BIRD_HEIGHT / 2, 10);
    
    // スコアポップアップ
    setPopupText("+1");
    setPopupKey(k => k + 1);
    
    // 通過音
    playTone(660, 0.08, "sine", 0.2);
    playTone(880, 0.1, "sine", 0.18, 0.05);
  }, [sparkle, playTone]);
  
  // コイン取得時の演出
  const handleCoinCollect = useCallback((count: number) => {
    const state = gameStateRef.current;
    sparkle(BIRD_X + BIRD_WIDTH / 2, state.birdY + BIRD_HEIGHT / 2, 6);
    
    // コイン取得音
    playTone(1047, 0.06, "sine", 0.2);
    playTone(1319, 0.08, "sine", 0.22, 0.04);
    
    // スコアポップアップ
    setPopupText(`+${count * COIN_VALUE}`);
    setPopupKey(k => k + 1);
  }, [sparkle, playTone]);
  
  // コールバックをrefに設定
  useEffect(() => {
    onPipePassRef.current = handlePipePass;
    onCoinCollectRef.current = handleCoinCollect;
  }, [handlePipePass, handleCoinCollect]);
  
  const initGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    // Spawn initial pipes
    for (let i = 0; i < 3; i++) {
      spawnPipe(gameStateRef.current);
    }
    setScore(0);
    setDisplayDistance(0);
    setDisplayCoins(0);
    setIsNewHighScore(false);
    prevHighScore.current = highScore;
  }, [highScore]);
  
  const startGame = useCallback(() => {
    initGame();
    setPhase("playing");
  }, [initGame]);
  
  const flap = useCallback(() => {
    if (phase !== "playing") return;
    gameStateRef.current.velocityY = FLAP_POWER;
    gameStateRef.current.wingFrame = 2;
    
    // ジャンプ音
    playTone(440, 0.08, "sine", 0.15);
    playTone(550, 0.06, "sine", 0.12, 0.04);
    
    // スケールアニメーション
    setBirdScale(1.15);
    setTimeout(() => setBirdScale(1), 100);
  }, [phase, playTone]);
  
  const endGame = useCallback(() => {
    const state = gameStateRef.current;
    const finalScore = Math.floor(state.distance * DISTANCE_SCORE_RATE) + state.coinsCollected * COIN_VALUE;
    setScore(finalScore);
    setPhase("gameover");
    
    // 衝突時の画面シェイク + クラッシュ音
    shakeRef.current?.shake("heavy", 400);
    playNoise(0.25, 0.4, 600);
    playSweep(300, 80, 0.4, "sawtooth", 0.25);
    
    if (finalScore > prevHighScore.current) {
      setHighScore(finalScore);
      setIsNewHighScore(true);
      localStorage.setItem("birdfly_highscore", String(finalScore));
      
      // ハイスコア更新時のconfetti + ファンファーレ
      setTimeout(() => {
        confetti(60);
        playArpeggio([523, 659, 784, 1047, 1319], 0.25, "sine", 0.25, 0.1);
      }, 500);
    }
  }, [playNoise, playSweep, confetti, playArpeggio]);
  
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
        flap();
      }
    };
    
    const handlePointerDown = (e: PointerEvent) => {
      if (phase === "ready" || phase === "gameover") {
        return;
      }
      e.preventDefault();
      flap();
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [phase, startGame, flap]);
  
  // Game loop
  useEffect(() => {
    if (phase !== "playing") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let animationId: number;
    
    const gameLoop = () => {
      const state = gameStateRef.current;
      
      // Update physics
      state.velocityY += GRAVITY;
      state.velocityY = Math.min(state.velocityY, 10);
      state.birdY += state.velocityY;
      
      // Update rotation based on velocity
      state.rotation = Math.min(Math.max(state.velocityY * 3, -30), 90);
      
      // Update wing animation
      state.wingTimer++;
      if (state.wingTimer >= 6) {
        state.wingTimer = 0;
        state.wingFrame = (state.wingFrame + 1) % 3;
      }
      
      // Update distance
      state.distance += SCROLL_SPEED;
      
      // Update pipes
      for (const pipe of state.pipes) {
        pipe.x -= SCROLL_SPEED;
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          // パイプ通過イベント
          onPipePassRef.current?.();
        }
      }
      
      // Update coins
      for (const coin of state.coins) {
        coin.x -= SCROLL_SPEED;
      }
      
      // Remove off-screen pipes and coins
      state.pipes = state.pipes.filter(pipe => pipe.x + PIPE_WIDTH > -50);
      state.coins = state.coins.filter(coin => coin.x > -50 && !coin.collected);
      
      // Spawn new pipes
      const lastPipe = state.pipes[state.pipes.length - 1];
      if (!lastPipe || lastPipe.x < CANVAS_WIDTH) {
        spawnPipe(state);
      }
      
      // Check coin collection
      const collected = checkCoinCollision(state);
      if (collected > 0) {
        state.coinsCollected += collected;
        // コイン取得イベント
        onCoinCollectRef.current?.(collected);
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
      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#87ceeb");
      gradient.addColorStop(0.6, "#b0e0e6");
      gradient.addColorStop(1, "#98d8c8");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Background clouds
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      const cloudOffset = (state.distance * 0.3) % 200;
      for (let i = 0; i < 5; i++) {
        const x = ((i * 150 + 50) - cloudOffset + CANVAS_WIDTH) % (CANVAS_WIDTH + 100) - 50;
        const y = 30 + (i * 37) % 100;
        drawCloud(ctx, x, y, 30 + (i % 3) * 10);
      }
      
      // Ground
      ctx.fillStyle = "#8fbc8f";
      ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
      ctx.fillStyle = "#6b8e6b";
      ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 3);
      
      // Pipes
      for (const pipe of state.pipes) {
        // Top pipe
        drawPipe(ctx, pipe.x, 0, PIPE_WIDTH, pipe.topHeight, false);
        
        // Bottom pipe
        const bottomY = pipe.topHeight + PIPE_GAP;
        drawPipe(ctx, pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY, true);
      }
      
      // Coins
      for (const coin of state.coins) {
        if (coin.collected) continue;
        drawCoin(ctx, coin.x, coin.y, COIN_SIZE);
      }
      
      // Bird
      drawBird(ctx, BIRD_X, state.birdY, state.rotation, state.wingFrame);
    };
    
    const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.arc(x + size * 0.8, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
      ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    };
    
    const drawPipe = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isBottom: boolean) => {
      // Pipe body
      const pipeGradient = ctx.createLinearGradient(x, 0, x + w, 0);
      pipeGradient.addColorStop(0, "#4CAF50");
      pipeGradient.addColorStop(0.3, "#66BB6A");
      pipeGradient.addColorStop(0.7, "#66BB6A");
      pipeGradient.addColorStop(1, "#388E3C");
      ctx.fillStyle = pipeGradient;
      ctx.fillRect(x, y, w, h);
      
      // Pipe cap
      const capHeight = 20;
      const capWidth = w + 8;
      const capX = x - 4;
      const capY = isBottom ? y : y + h - capHeight;
      
      const capGradient = ctx.createLinearGradient(capX, 0, capX + capWidth, 0);
      capGradient.addColorStop(0, "#43A047");
      capGradient.addColorStop(0.3, "#66BB6A");
      capGradient.addColorStop(0.7, "#66BB6A");
      capGradient.addColorStop(1, "#2E7D32");
      ctx.fillStyle = capGradient;
      ctx.fillRect(capX, capY, capWidth, capHeight);
      
      // Cap border
      ctx.strokeStyle = "#2E7D32";
      ctx.lineWidth = 2;
      ctx.strokeRect(capX, capY, capWidth, capHeight);
    };
    
    const drawCoin = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#ffec8b";
      ctx.beginPath();
      ctx.arc(x - size / 6, y - size / 6, size / 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = "#b8860b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    };
    
    const drawBird = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, wingFrame: number) => {
      ctx.save();
      ctx.translate(x + BIRD_WIDTH / 2, y + BIRD_HEIGHT / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      
      const bx = -BIRD_WIDTH / 2;
      const by = -BIRD_HEIGHT / 2;
      
      // Body
      ctx.fillStyle = "#FFD93D";
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_WIDTH / 2, BIRD_HEIGHT / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Wing
      ctx.fillStyle = "#E8B830";
      const wingYOffset = wingFrame === 0 ? 0 : wingFrame === 1 ? -4 : 4;
      ctx.beginPath();
      ctx.ellipse(bx + 12, by + 14 + wingYOffset, 8, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Eye white
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(bx + 24, by + 8, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Eye pupil
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(bx + 26, by + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Beak
      ctx.fillStyle = "#FF6B35";
      ctx.beginPath();
      ctx.moveTo(bx + BIRD_WIDTH, by + 10);
      ctx.lineTo(bx + BIRD_WIDTH + 8, by + 14);
      ctx.lineTo(bx + BIRD_WIDTH, by + 18);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    };
    
    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [phase, endGame]);
  
  // Initial render
  useEffect(() => {
    if (phase !== "playing") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Sky
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#87ceeb");
      gradient.addColorStop(0.6, "#b0e0e6");
      gradient.addColorStop(1, "#98d8c8");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Clouds
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      for (let i = 0; i < 5; i++) {
        const x = (i * 150 + 50) % CANVAS_WIDTH;
        const y = 30 + (i * 37) % 100;
        ctx.beginPath();
        const size = 30 + (i % 3) * 10;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Ground
      ctx.fillStyle = "#8fbc8f";
      ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
    }
  }, [phase]);
  
  return (
    <GameShell gameId="birdfly" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div
          className="birdfly-game"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="birdfly-canvas"
            style={{ transform: `scale(${birdScale})`, transition: "transform 0.1s ease-out" }}
          />
          
          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />
          
          {/* スコアポップアップ */}
          <ScorePopup 
            text={popupText} 
            popupKey={popupKey}
            x={`${(BIRD_X + BIRD_WIDTH / 2) / CANVAS_WIDTH * 100}%`}
            y="30%"
            variant="bonus"
            size="lg"
          />
          
          <div className="birdfly-hud">
            <div className="birdfly-score">Score: {score}</div>
            <div className="birdfly-stats">
              <span>📏 {displayDistance}m</span>
              <span>🪙 {displayCoins}</span>
            </div>
            <div className="birdfly-highscore">Best: {highScore}</div>
          </div>
          
          {phase === "ready" && (
            <div className="birdfly-overlay">
              <h1 className="birdfly-title">🐦 Bird Fly</h1>
              <p className="birdfly-instruction">
                タップ / スペース で羽ばたく<br />
                コインを集めて障害物を避けよう！
              </p>
              <button className="birdfly-start-btn" onClick={startGame}>
                START
              </button>
              <p className="birdfly-hint">Space / Enter でスタート</p>
            </div>
          )}
          
          {phase === "gameover" && (
            <div className="birdfly-overlay birdfly-gameover">
              <h1 className="birdfly-gameover-title">Game Over</h1>
              <div className="birdfly-final-stats">
                <p>飛行距離: {displayDistance}m</p>
                <p>コイン: {displayCoins} 枚</p>
                <p className="birdfly-final-score">Score: {score}</p>
              </div>
              {isNewHighScore && score > 0 && (
                <p className="birdfly-new-record">🏆 New Record!</p>
              )}
              <button className="birdfly-start-btn" onClick={startGame}>
                RETRY
              </button>
              <ShareButton score={score} gameTitle="Bird Fly" gameId="birdfly" />
              <GameRecommendations currentGameId="birdfly" />
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
