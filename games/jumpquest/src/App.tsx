import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 40;
const PLAYER_SPEED = 5;
const JUMP_FORCE = -14;
const GRAVITY = 0.6;
const MAX_FALL_SPEED = 15;

const COIN_SIZE = 20;
const PLATFORM_HEIGHT = 20;
const GOAL_WIDTH = 40;
const GOAL_HEIGHT = 60;

type GamePhase = "before" | "in_progress" | "after";

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facingRight: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  type: "normal" | "moving" | "breakable";
  originalX?: number;
  moveRange?: number;
  moveSpeed?: number;
  broken?: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface Goal {
  x: number;
  y: number;
}

interface Level {
  platforms: Platform[];
  coins: Coin[];
  goal: Goal;
  playerStart: { x: number; y: number };
  width: number;
}

interface GameState {
  player: Player;
  level: Level;
  score: number;
  phase: GamePhase;
  currentLevel: number;
  cameraX: number;
  timeLeft: number;
  totalCoins: number;
  collectedCoins: number;
}

// レベル生成
function createLevel(levelNum: number): Level {
  const platforms: Platform[] = [];
  const coins: Coin[] = [];
  const levelWidth = 1600 + levelNum * 400;
  
  // 地面
  platforms.push({ x: 0, y: CANVAS_HEIGHT - 20, width: 200, type: "normal" });
  
  // プラットフォーム生成
  let lastX = 150;
  let lastY = CANVAS_HEIGHT - 100;
  
  while (lastX < levelWidth - 200) {
    const gapX = 80 + Math.random() * 120;
    const deltaY = Math.random() * 100 - 50;
    const newY = Math.max(100, Math.min(CANVAS_HEIGHT - 100, lastY + deltaY));
    const width = 80 + Math.random() * 120;
    
    // プラットフォームタイプをランダムに選択
    let pType: Platform["type"] = "normal";
    if (levelNum > 1 && Math.random() < 0.2) {
      pType = "moving";
    } else if (levelNum > 2 && Math.random() < 0.15) {
      pType = "breakable";
    }
    
    const platform: Platform = {
      x: lastX + gapX,
      y: newY,
      width,
      type: pType,
    };
    
    if (pType === "moving") {
      platform.originalX = platform.x;
      platform.moveRange = 60 + Math.random() * 40;
      platform.moveSpeed = 1 + Math.random() * 1.5;
    }
    
    platforms.push(platform);
    
    // コインを配置
    if (Math.random() < 0.7) {
      coins.push({
        x: platform.x + width / 2,
        y: platform.y - 40,
        collected: false,
      });
    }
    
    lastX = platform.x + width;
    lastY = newY;
  }
  
  // ゴール用のプラットフォーム
  platforms.push({
    x: levelWidth - 100,
    y: CANVAS_HEIGHT - 100,
    width: 100,
    type: "normal",
  });
  
  return {
    platforms,
    coins,
    goal: { x: levelWidth - 60, y: CANVAS_HEIGHT - 100 - GOAL_HEIGHT },
    playerStart: { x: 50, y: CANVAS_HEIGHT - 100 },
    width: levelWidth,
  };
}

// 初期状態
function createInitialState(levelNum: number = 1): GameState {
  const level = createLevel(levelNum);
  return {
    player: {
      x: level.playerStart.x,
      y: level.playerStart.y,
      vx: 0,
      vy: 0,
      onGround: false,
      facingRight: true,
    },
    level,
    score: 0,
    phase: "before",
    currentLevel: levelNum,
    cameraX: 0,
    timeLeft: 90 + levelNum * 30,
    totalCoins: level.coins.length,
    collectedCoins: 0,
  };
}

// 衝突判定 (AABB)
function rectCollision(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// プレイヤー描画
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facingRight: boolean,
  onGround: boolean
) {
  ctx.save();
  ctx.translate(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2);
  if (!facingRight) ctx.scale(-1, 1);
  
  // 体
  ctx.fillStyle = "#3498db";
  ctx.fillRect(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2 + 10, PLAYER_WIDTH, PLAYER_HEIGHT - 10);
  
  // 頭
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(0, -PLAYER_HEIGHT / 2 + 10, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // 目
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.arc(4, -PLAYER_HEIGHT / 2 + 8, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // 足
  ctx.fillStyle = "#8b4513";
  if (onGround) {
    ctx.fillRect(-12, PLAYER_HEIGHT / 2 - 8, 10, 8);
    ctx.fillRect(2, PLAYER_HEIGHT / 2 - 8, 10, 8);
  } else {
    // ジャンプ中は足を曲げる
    ctx.fillRect(-12, PLAYER_HEIGHT / 2 - 12, 10, 8);
    ctx.fillRect(2, PLAYER_HEIGHT / 2 - 4, 10, 8);
  }
  
  ctx.restore();
}

// コイン描画
function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const bounce = Math.sin(time * 0.005) * 3;
  const scale = 0.8 + Math.abs(Math.sin(time * 0.003)) * 0.2;
  
  ctx.save();
  ctx.translate(x, y + bounce);
  ctx.scale(scale, 1);
  
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(0, 0, COIN_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = "#e67e22";
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = "#e67e22";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", 0, 0);
  
  ctx.restore();
}

// ゴール描画
function drawGoal(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  // 旗竿
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(x + GOAL_WIDTH / 2 - 3, y, 6, GOAL_HEIGHT);
  
  // 旗
  const wave = Math.sin(time * 0.003) * 5;
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(x + GOAL_WIDTH / 2 + 3, y + 5);
  ctx.lineTo(x + GOAL_WIDTH / 2 + 35 + wave, y + 15);
  ctx.lineTo(x + GOAL_WIDTH / 2 + 3, y + 30);
  ctx.closePath();
  ctx.fill();
  
  // 星
  ctx.fillStyle = "#f1c40f";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("★", x + GOAL_WIDTH / 2 + 18, y + 20);
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number>(0);
  const timerRef = useRef<number>(0);

  const [, setTick] = useState(0);
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    variant: PopupVariant;
    x: string;
    y: string;
  } | null>(null);

  const showPopup = useCallback(
    (text: string, variant: PopupVariant = "default", x = "50%", y = "40%") => {
      setPopup({ text, key: Date.now(), variant, x, y });
    },
    []
  );

  const { playTone } = useAudio();
  const { particles, sparkle, confetti, burst } = useParticles();

  // Audio refs for game loop
  const playJumpRef = useRef<() => void>(() => {});
  const playCoinRef = useRef<() => void>(() => {});
  const playLevelRef = useRef<() => void>(() => {});
  const playDeathRef = useRef<() => void>(() => {});
  const sparkleRef = useRef<typeof sparkle>(sparkle);
  const burstRef = useRef<typeof burst>(burst);
  const confettiRef = useRef<typeof confetti>(confetti);
  const showPopupRef = useRef<typeof showPopup>(showPopup);
  const coinComboRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  useEffect(() => {
    playJumpRef.current = () => playTone(500, 0.08, "sine");
    playCoinRef.current = () => playTone(880, 0.1, "sine");
    playLevelRef.current = () => playTone(660, 0.3, "sine");
    playDeathRef.current = () => playTone(200, 0.3, "sawtooth");
    sparkleRef.current = sparkle;
    burstRef.current = burst;
    confettiRef.current = confetti;
    showPopupRef.current = showPopup;
  }, [playTone, sparkle, burst, confetti, showPopup]);

  const startGame = useCallback(() => {
    gameStateRef.current = createInitialState(1);
    gameStateRef.current.phase = "in_progress";
    lastTimeRef.current = performance.now();
    timerRef.current = 0;
    setTick((t) => t + 1);
  }, []);

  const nextLevel = useCallback(() => {
    const currentLevel = gameStateRef.current.currentLevel;
    const currentScore = gameStateRef.current.score;
    const bonusScore = gameStateRef.current.timeLeft * 10 + gameStateRef.current.collectedCoins * 50;
    gameStateRef.current = createInitialState(currentLevel + 1);
    gameStateRef.current.score = currentScore;
    gameStateRef.current.phase = "in_progress";
    lastTimeRef.current = performance.now();
    timerRef.current = 0;
    coinComboRef.current = { count: 0, lastTime: 0 };
    confettiRef.current();
    playLevelRef.current();
    showPopupRef.current(`LEVEL ${currentLevel} CLEAR! +${bonusScore}`, "level");
    setTick((t) => t + 1);
  }, []);

  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    setTick((t) => t + 1);
  }, []);

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      
      const state = gameStateRef.current;
      
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (state.phase === "before") {
          startGame();
        } else if (state.phase === "in_progress" && state.player.onGround) {
          state.player.vy = JUMP_FORCE;
          state.player.onGround = false;
          playJumpRef.current();
        }
      }
      
      if (e.code === "Enter" && state.phase === "after") {
        resetGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startGame, resetGame]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = (currentTime: number) => {
      const state = gameStateRef.current;
      const keys = keysRef.current;
      
      // タイマー更新
      if (state.phase === "in_progress") {
        const deltaTime = currentTime - lastTimeRef.current;
        timerRef.current += deltaTime;
        
        if (timerRef.current >= 1000) {
          state.timeLeft -= Math.floor(timerRef.current / 1000);
          timerRef.current = timerRef.current % 1000;
          
          if (state.timeLeft <= 0) {
            state.phase = "after";
            setTick((t) => t + 1);
          }
        }
        lastTimeRef.current = currentTime;
      }

      // 描画クリア
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景 (グラデーション空)
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(0.5, "#16213e");
      gradient.addColorStop(1, "#0f3460");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // 背景の星
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 50; i++) {
        const sx = ((i * 137 + state.cameraX * 0.1) % (CANVAS_WIDTH + 100)) - 50;
        const sy = (i * 73) % CANVAS_HEIGHT;
        const size = (i % 3) + 1;
        ctx.fillRect(sx, sy, size, size);
      }
      
      // 背景の山
      ctx.fillStyle = "#1a3d5c";
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      for (let x = 0; x <= CANVAS_WIDTH; x += 100) {
        const mountainX = x + (state.cameraX * 0.2) % 100;
        const height = 100 + Math.sin(mountainX * 0.01) * 50;
        ctx.lineTo(x, CANVAS_HEIGHT - height);
      }
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // カメラ変換
      ctx.save();
      ctx.translate(-state.cameraX, 0);

      // プラットフォーム描画・更新
      for (const platform of state.level.platforms) {
        if (platform.broken) continue;
        
        // 動くプラットフォームの更新
        if (platform.type === "moving" && platform.originalX !== undefined && platform.moveRange && platform.moveSpeed) {
          platform.x = platform.originalX + Math.sin(currentTime * 0.002 * platform.moveSpeed) * platform.moveRange;
        }
        
        // 画面外のプラットフォームはスキップ
        if (platform.x + platform.width < state.cameraX - 50 || platform.x > state.cameraX + CANVAS_WIDTH + 50) {
          continue;
        }
        
        // プラットフォームの色
        let color = "#27ae60"; // normal
        if (platform.type === "moving") color = "#9b59b6";
        else if (platform.type === "breakable") color = "#e67e22";
        
        ctx.fillStyle = color;
        ctx.fillRect(platform.x, platform.y, platform.width, PLATFORM_HEIGHT);
        
        // プラットフォームの縁取り
        ctx.strokeStyle = "#2c3e50";
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, PLATFORM_HEIGHT);
        
        // 草
        if (platform.type === "normal") {
          ctx.fillStyle = "#2ecc71";
          for (let gx = platform.x; gx < platform.x + platform.width; gx += 10) {
            ctx.fillRect(gx, platform.y - 4, 6, 4);
          }
        }
      }

      // コイン描画
      for (const coin of state.level.coins) {
        if (coin.collected) continue;
        if (coin.x < state.cameraX - 50 || coin.x > state.cameraX + CANVAS_WIDTH + 50) continue;
        drawCoin(ctx, coin.x, coin.y, currentTime);
      }

      // ゴール描画
      const goal = state.level.goal;
      drawGoal(ctx, goal.x, goal.y, currentTime);

      // プレイヤー描画
      drawPlayer(
        ctx,
        state.player.x,
        state.player.y,
        state.player.facingRight,
        state.player.onGround
      );

      ctx.restore();

      // UI表示
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, 50);
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE: ${String(state.score).padStart(6, "0")}`, 20, 32);
      ctx.fillText(`LEVEL: ${state.currentLevel}`, 220, 32);
      ctx.fillText(`COINS: ${state.collectedCoins}/${state.totalCoins}`, 360, 32);
      
      // タイマー
      const timeColor = state.timeLeft <= 10 ? "#e74c3c" : "#fff";
      ctx.fillStyle = timeColor;
      ctx.fillText(`TIME: ${Math.max(0, state.timeLeft)}`, 540, 32);
      
      // 進行度バー
      const progress = state.player.x / state.level.width;
      ctx.fillStyle = "#333";
      ctx.fillRect(660, 15, 120, 20);
      ctx.fillStyle = "#3498db";
      ctx.fillRect(660, 15, 120 * progress, 20);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(660, 15, 120, 20);

      // ゲーム中の更新
      if (state.phase === "in_progress") {
        const player = state.player;
        
        // 横移動
        player.vx = 0;
        if (keys.has("ArrowLeft") || keys.has("KeyA")) {
          player.vx = -PLAYER_SPEED;
          player.facingRight = false;
        }
        if (keys.has("ArrowRight") || keys.has("KeyD")) {
          player.vx = PLAYER_SPEED;
          player.facingRight = true;
        }
        
        // 重力
        player.vy += GRAVITY;
        if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
        
        // 移動適用
        player.x += player.vx;
        player.y += player.vy;
        
        // 左端制限
        if (player.x < 0) player.x = 0;
        
        // 地面判定
        player.onGround = false;
        
        for (const platform of state.level.platforms) {
          if (platform.broken) continue;
          
          // プレイヤーの足元がプラットフォームに触れているかチェック
          if (
            player.vy >= 0 &&
            player.x + PLAYER_WIDTH > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + PLAYER_HEIGHT >= platform.y &&
            player.y + PLAYER_HEIGHT <= platform.y + PLATFORM_HEIGHT + player.vy
          ) {
            player.y = platform.y - PLAYER_HEIGHT;
            player.vy = 0;
            player.onGround = true;
            
            // 壊れるプラットフォーム
            if (platform.type === "breakable") {
              platform.broken = true;
            }
            
            // 動くプラットフォームに乗ると一緒に動く
            if (platform.type === "moving" && platform.originalX !== undefined && platform.moveRange && platform.moveSpeed) {
              const platformVx = Math.cos(currentTime * 0.002 * platform.moveSpeed) * platform.moveRange * 0.002 * platform.moveSpeed;
              player.x += platformVx;
            }
          }
        }
        
        // 落下死
        if (player.y > CANVAS_HEIGHT + 100) {
          state.phase = "after";
          playDeathRef.current();
          setTick((t) => t + 1);
        }
        
        // コイン収集
        for (const coin of state.level.coins) {
          if (coin.collected) continue;
          
          if (rectCollision(
            player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT,
            coin.x - COIN_SIZE / 2, coin.y - COIN_SIZE / 2, COIN_SIZE, COIN_SIZE
          )) {
            coin.collected = true;
            state.collectedCoins++;
            playCoinRef.current();
            sparkleRef.current(coin.x - state.cameraX, coin.y);
            
            // コンボ判定 (1秒以内に連続取得)
            const now = currentTime;
            if (now - coinComboRef.current.lastTime < 1000) {
              coinComboRef.current.count++;
            } else {
              coinComboRef.current.count = 1;
            }
            coinComboRef.current.lastTime = now;
            
            // スコア計算とポップアップ
            const comboCount = coinComboRef.current.count;
            const basePoints = 100;
            const comboBonus = comboCount > 1 ? (comboCount - 1) * 50 : 0;
            const totalPoints = basePoints + comboBonus;
            state.score += totalPoints;
            
            // ポップアップ位置 (コイン位置をキャンバス内相対位置に変換)
            const popupX = `${((coin.x - state.cameraX) / CANVAS_WIDTH) * 100}%`;
            const popupY = `${(coin.y / CANVAS_HEIGHT) * 100}%`;
            
            if (comboCount >= 5) {
              // ビッグコンボ
              showPopupRef.current(`COMBO x${comboCount}! +${totalPoints}`, "critical", popupX, popupY);
            } else if (comboCount >= 2) {
              // コンボ中
              showPopupRef.current(`x${comboCount} +${totalPoints}`, "bonus", popupX, popupY);
            } else {
              // 通常
              showPopupRef.current(`+${totalPoints}`, "default", popupX, popupY);
            }
          }
        }
        
        // ゴール判定
        if (rectCollision(
          player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT,
          goal.x, goal.y, GOAL_WIDTH, GOAL_HEIGHT
        )) {
          state.score += state.timeLeft * 10;
          state.score += state.collectedCoins * 50;
          nextLevel();
          return;
        }
        
        // カメラ追従
        const targetCameraX = player.x - CANVAS_WIDTH / 3;
        state.cameraX = Math.max(0, Math.min(state.level.width - CANVAS_WIDTH, targetCameraX));
      }

      // ゲーム開始前
      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#3498db";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillText("JUMP QUEST", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
        ctx.fillStyle = "#fff";
        ctx.font = "18px monospace";
        ctx.fillText("← → / A D で移動", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.fillText("↑ / W / SPACE でジャンプ", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        ctx.fillText("コインを集めてゴールを目指せ！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 24px monospace";
        ctx.fillText("CLICK OR PRESS SPACE TO START", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110);
      }

      // ゲームオーバー
      if (state.phase === "after") {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#e74c3c";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        ctx.fillStyle = "#fff";
        ctx.font = "24px monospace";
        ctx.fillText(`FINAL SCORE: ${String(state.score).padStart(6, "0")}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.fillText(`LEVEL REACHED: ${state.currentLevel}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.fillStyle = "#f1c40f";
        ctx.font = "20px monospace";
        ctx.fillText("CLICK TO RESTART", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [nextLevel]);

  // クリック・タッチイベント
  const handleInteraction = useCallback((clientX: number) => {
    const state = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (state.phase === "before") {
      startGame();
    } else if (state.phase === "in_progress") {
      // タップ位置でジャンプ or 移動
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      
      if (state.player.onGround) {
        state.player.vy = JUMP_FORCE;
        state.player.onGround = false;
      }
      
      // 画面の左右で移動方向を決める
      if (x < CANVAS_WIDTH / 3) {
        keysRef.current.add("ArrowLeft");
        setTimeout(() => keysRef.current.delete("ArrowLeft"), 100);
      } else if (x > CANVAS_WIDTH * 2 / 3) {
        keysRef.current.add("ArrowRight");
        setTimeout(() => keysRef.current.delete("ArrowRight"), 100);
      }
    } else if (state.phase === "after") {
      resetGame();
    }
  }, [startGame, resetGame]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    handleInteraction(e.clientX);
  }, [handleInteraction]);

  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX);
    }
  }, [handleInteraction]);

  return (
    <GameShell gameId="jumpquest" layout="immersive">
      <div
        ref={containerRef}
        className="jumpquest-container"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        onClick={handleClick}
        onTouchStart={handleTouch}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="jumpquest-canvas"
        />
        <ParticleLayer particles={particles} />
        {popup && (
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            variant={popup.variant}
            x={popup.x}
            y={popup.y}
          />
        )}
      </div>
    </GameShell>
  );
}
