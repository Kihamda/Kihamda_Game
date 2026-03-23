import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles, ParticleLayer, ScorePopup, useHighScore } from "@shared";
import type { PopupVariant } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 700;
const GRAVITY = 0.4;
const BALL_RADIUS = 18;
const HOOP_WIDTH = 70;
const HOOP_HEIGHT = 10;
const BACKBOARD_WIDTH = 8;
const BACKBOARD_HEIGHT = 100;
const NET_LENGTH = 40;
const GAME_DURATION = 60; // 秒
const BASE_SCORE = 100;
const STREAK_BONUS = 50;
const SWISH_BONUS = 50; // スウィッシュボーナス
const BANK_BONUS = 30; // バンクショットボーナス

// スコアマイルストーン
const MILESTONES = [500, 1000, 2000, 3000, 5000, 7500, 10000];

// ゴールの位置
const HOOP_X = CANVAS_WIDTH - 80;
const HOOP_Y = 200;

// ボールの初期位置
const BALL_START_X = 80;
const BALL_START_Y = CANVAS_HEIGHT - 150;

type GamePhase = "ready" | "aiming" | "flying" | "result";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

// パーティクルエフェクト
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: "sparkle" | "confetti" | "fire" | "trail";
}

// ネット揺れ状態
interface NetState {
  amplitude: number;
  phase: number;
  decay: number;
}

interface GameState {
  phase: GamePhase;
  ball: Ball;
  score: number;
  streak: number;
  bestStreak: number;
  timeRemaining: number;
  lastShotResult: "success" | "miss" | "swish" | "bank" | null;
  swipe: SwipeState;
  particles: Particle[];
  netState: NetState;
  hitRim: boolean; // リムに当たったかどうか
  hitBackboard: boolean; // バックボードに当たったかどうか
  showSwish: number; // SWISH表示の残り時間
  showCombo: number; // コンボ表示の残り時間
  lastMilestone: number; // 最後に達成したマイルストーン
}

function createBall(): Ball {
  return {
    x: BALL_START_X,
    y: BALL_START_Y,
    vx: 0,
    vy: 0,
    rotation: 0,
    rotationSpeed: 0,
    trail: [],
  };
}

function createInitialState(): GameState {
  return {
    phase: "ready",
    ball: createBall(),
    score: 0,
    streak: 0,
    bestStreak: 0,
    timeRemaining: GAME_DURATION,
    lastShotResult: null,
    swipe: {
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
    },
    particles: [],
    netState: { amplitude: 0, phase: 0, decay: 0.95 },
    hitRim: false,
    hitBackboard: false,
    showSwish: 0,
    showCombo: 0,
    lastMilestone: 0,
  };
}

// パーティクル生成ヘルパー
function createSparkles(x: number, y: number, count: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ["#ffd700", "#ffec8b", "#fff8dc", "#ffa500"];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      maxLife: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 3,
      type: "sparkle",
    });
  }
  return particles;
}

function createConfetti(x: number, y: number, count: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9", "#fd79a8", "#a29bfe"];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    particles.push({
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      life: 1,
      maxLife: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 6,
      type: "confetti",
    });
  }
  return particles;
}

function createFireParticles(x: number, y: number, count: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ["#ff4500", "#ff6347", "#ffa500", "#ffd700", "#ff8c00"];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + Math.random() * 10,
      vx: (Math.random() - 0.5) * 2,
      vy: -2 - Math.random() * 3,
      life: 1,
      maxLife: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6,
      type: "fire",
    });
  }
  return particles;
}

// ボールがリングを通過したかチェック
function checkGoal(ball: Ball, prevY: number): boolean {
  const hoopLeft = HOOP_X - HOOP_WIDTH / 2;
  const hoopRight = HOOP_X + HOOP_WIDTH / 2;
  
  // ボールが上から下に通過
  if (prevY < HOOP_Y && ball.y >= HOOP_Y && ball.vy > 0) {
    if (ball.x > hoopLeft + BALL_RADIUS && ball.x < hoopRight - BALL_RADIUS) {
      return true;
    }
  }
  return false;
}

// リングとの衝突判定
function checkRimCollision(ball: Ball): { hit: boolean; side: "left" | "right" | "none" } {
  const leftRimX = HOOP_X - HOOP_WIDTH / 2;
  const rightRimX = HOOP_X + HOOP_WIDTH / 2;
  const rimRadius = HOOP_HEIGHT / 2;
  
  // 左リム
  const dxLeft = ball.x - leftRimX;
  const dyLeft = ball.y - HOOP_Y;
  const distLeft = Math.sqrt(dxLeft * dxLeft + dyLeft * dyLeft);
  if (distLeft < BALL_RADIUS + rimRadius) {
    return { hit: true, side: "left" };
  }
  
  // 右リム
  const dxRight = ball.x - rightRimX;
  const dyRight = ball.y - HOOP_Y;
  const distRight = Math.sqrt(dxRight * dxRight + dyRight * dyRight);
  if (distRight < BALL_RADIUS + rimRadius) {
    return { hit: true, side: "right" };
  }
  
  return { hit: false, side: "none" };
}

// バックボードとの衝突
function checkBackboardCollision(ball: Ball): boolean {
  const boardX = HOOP_X + HOOP_WIDTH / 2 + 20;
  const boardTop = HOOP_Y - BACKBOARD_HEIGHT / 2;
  const boardBottom = HOOP_Y + BACKBOARD_HEIGHT / 2;
  
  if (
    ball.x + BALL_RADIUS > boardX &&
    ball.x - BALL_RADIUS < boardX + BACKBOARD_WIDTH &&
    ball.y > boardTop &&
    ball.y < boardBottom
  ) {
    return true;
  }
  return false;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [, setTick] = useState(0);
  
  // ScorePopup state
  const [popupState, setPopupState] = useState<{
    text: string | null;
    key: number;
    variant: PopupVariant;
    size: "sm" | "md" | "lg" | "xl";
    y: string;
  }>({ text: null, key: 0, variant: "default", size: "md", y: "30%" });
  
  // ハイスコア管理
  const { best: highScore, update: updateHighScore } = useHighScore("hoopshot");
  const [showHighScorePopup, setShowHighScorePopup] = useState(false);
  
  // オーディオ
  const { playTone, playSweep, playNoise, playSuccess, playCombo, playPerfect } = useAudio();
  
  // 共有パーティクルシステム（DOM ベースオーバーレイ）
  const { particles: sharedParticles, burst, sparkle, confetti, explosion } = useParticles();

  // 効果音
  const playThrowSound = useCallback(() => {
    playSweep(200, 400, 0.15, "sine", 0.15);
  }, [playSweep]);

  const playSwishSound = useCallback(() => {
    // ネットを通過する「シュッ」という音
    playNoise(0.15, 0.2, 2000);
    playPerfect();
  }, [playNoise, playPerfect]);

  const playScoreSound = useCallback((streak: number) => {
    playSuccess();
    if (streak >= 2) {
      playCombo(streak);
    }
  }, [playSuccess, playCombo]);

  const playMissSound = useCallback(() => {
    // 軽いバウンド音
    playTone(80, 0.1, "sine", 0.2);
    playTone(60, 0.15, "sine", 0.15, 0.1);
  }, [playTone]);

  const playRimHitSound = useCallback(() => {
    // リムに当たる金属音
    playTone(800, 0.05, "square", 0.1);
    playTone(600, 0.08, "triangle", 0.15, 0.02);
  }, [playTone]);

  const playBackboardSound = useCallback(() => {
    // バックボードに当たる音
    playTone(300, 0.08, "square", 0.15);
    playNoise(0.05, 0.1, 500);
  }, [playTone, playNoise]);

  // ScorePopup表示ヘルパー
  const showPopup = useCallback((
    text: string,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md",
    y: string = "30%"
  ) => {
    setPopupState((prev) => ({
      text,
      key: prev.key + 1,
      variant,
      size,
      y,
    }));
  }, []);

  // ゲーム開始
  const startGame = useCallback(() => {
    gameStateRef.current = {
      ...createInitialState(),
      phase: "aiming",
    };
    lastTimeRef.current = Date.now();
    setShowHighScorePopup(false);
    setTick((t) => t + 1);
  }, []);

  // ボールをリセット
  const resetBall = useCallback(() => {
    const state = gameStateRef.current;
    state.ball = createBall();
    state.phase = "aiming";
    state.lastShotResult = null;
    state.hitRim = false;
    state.hitBackboard = false;
    setTick((t) => t + 1);
  }, []);

  // シュート
  const shoot = useCallback((vx: number, vy: number) => {
    const state = gameStateRef.current;
    if (state.phase !== "aiming") return;

    const power = Math.sqrt(vx * vx + vy * vy);
    const maxPower = 25;
    const clampedPower = Math.min(power, maxPower);
    const ratio = clampedPower / power;

    state.ball.vx = vx * ratio;
    state.ball.vy = vy * ratio;
    state.ball.rotationSpeed = vx * 0.05;
    state.phase = "flying";
    state.hitRim = false;
    state.hitBackboard = false;
    playThrowSound();
    setTick((t) => t + 1);
  }, [playThrowSound]);

  // タッチ/マウスイベント
  const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const state = gameStateRef.current;
    
    if (state.phase === "ready") {
      startGame();
      return;
    }
    
    if (state.phase === "result") {
      startGame();
      return;
    }
    
    if (state.phase !== "aiming") return;

    const pos = getEventPos(e);
    state.swipe = {
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
      isDragging: true,
    };
    setTick((t) => t + 1);
  }, [startGame]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const state = gameStateRef.current;
    if (!state.swipe.isDragging) return;

    const pos = getEventPos(e);
    state.swipe.currentX = pos.x;
    state.swipe.currentY = pos.y;
    setTick((t) => t + 1);
  }, []);

  const handlePointerUp = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.swipe.isDragging) return;

    const dx = state.swipe.startX - state.swipe.currentX;
    const dy = state.swipe.startY - state.swipe.currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 20) {
      // スワイプ距離を速度に変換
      const vx = dx * 0.15;
      const vy = dy * 0.15;
      shoot(vx, vy);
    }

    state.swipe.isDragging = false;
    setTick((t) => t + 1);
  }, [shoot]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // パーティクル更新関数
    const updateParticles = (dt: number) => {
      const state = gameStateRef.current;
      state.particles = state.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 2;
        
        if (p.type === "confetti") {
          p.vy += 0.15; // 重力
          p.vx *= 0.98;
        } else if (p.type === "fire") {
          p.vy -= 0.05; // 上昇
          p.size *= 0.97;
        } else if (p.type === "sparkle") {
          p.vy += 0.1;
        }
        
        return p.life > 0;
      });
    };

    // パーティクル描画関数
    const drawParticles = () => {
      const state = gameStateRef.current;
      for (const p of state.particles) {
        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        
        if (p.type === "confetti") {
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate((Date.now() / 100 + p.x) % (Math.PI * 2));
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.type === "fire") {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          // 星形のスパークル
          const spikes = 4;
          for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const r = i % 2 === 0 ? p.size : p.size * 0.4;
            const px = p.x + Math.cos(angle) * r;
            const py = p.y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    };

    const gameLoop = () => {
      const state = gameStateRef.current;
      const now = Date.now();
      const dt = 1 / 60; // 固定デルタタイム
      
      // タイマー更新
      if (state.phase === "aiming" || state.phase === "flying") {
        const elapsed = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        state.timeRemaining -= elapsed;
        
        if (state.timeRemaining <= 0) {
          state.timeRemaining = 0;
          state.phase = "result";
          // ハイスコア更新チェック
          const wasUpdated = updateHighScore(state.score);
          if (wasUpdated) {
            setShowHighScorePopup(true);
            setTimeout(() => {
              showPopup("🏆 NEW HIGH SCORE!", "level", "xl", "35%");
              confetti(100);
            }, 500);
          }
          setTick((t) => t + 1);
        }
      }

      // エフェクトタイマー減少
      if (state.showSwish > 0) state.showSwish -= dt;
      if (state.showCombo > 0) state.showCombo -= dt;

      // パーティクル更新
      updateParticles(dt);

      // ネット揺れ減衰
      state.netState.amplitude *= state.netState.decay;
      state.netState.phase += 0.3;

      // 連続成功時の炎エフェクト追加
      if (state.streak >= 3 && state.phase === "aiming") {
        if (Math.random() < 0.3) {
          state.particles.push(...createFireParticles(BALL_START_X, BALL_START_Y - BALL_RADIUS, 1));
        }
      }

      // 描画
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景グラデーション（体育館風）
      const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGradient.addColorStop(0, "#2c1810");
      bgGradient.addColorStop(0.5, "#3d2317");
      bgGradient.addColorStop(1, "#1a0f0a");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // コートライン
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT, 200, Math.PI, 0);
      ctx.stroke();

      // バックボード
      const boardX = HOOP_X + HOOP_WIDTH / 2 + 20;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(boardX, HOOP_Y - BACKBOARD_HEIGHT / 2, BACKBOARD_WIDTH, BACKBOARD_HEIGHT);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.strokeRect(boardX, HOOP_Y - BACKBOARD_HEIGHT / 2, BACKBOARD_WIDTH, BACKBOARD_HEIGHT);

      // リング（前面部分は後で描画）
      ctx.strokeStyle = "#ff4400";
      ctx.lineWidth = 6;
      
      // リング後ろ部分
      ctx.beginPath();
      ctx.moveTo(HOOP_X + HOOP_WIDTH / 2, HOOP_Y);
      ctx.lineTo(boardX, HOOP_Y);
      ctx.stroke();

      // ネット（揺れるアニメーション付き）
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 1;
      const netSegments = 8;
      for (let i = 0; i <= netSegments; i++) {
        const x = HOOP_X - HOOP_WIDTH / 2 + (HOOP_WIDTH / netSegments) * i;
        ctx.beginPath();
        ctx.moveTo(x, HOOP_Y);
        // 波打つネット + 揺れエフェクト
        const baseOffset = Math.sin(Date.now() / 200 + i) * 5;
        const shakeOffset = Math.sin(state.netState.phase + i * 0.5) * state.netState.amplitude * 10;
        ctx.quadraticCurveTo(
          x + baseOffset + shakeOffset, 
          HOOP_Y + NET_LENGTH / 2 + state.netState.amplitude * 5, 
          HOOP_X + shakeOffset * 0.5, 
          HOOP_Y + NET_LENGTH + state.netState.amplitude * 3
        );
        ctx.stroke();
      }

      // ボール軌跡（アーク軌道トレイル）
      if (state.ball.trail.length > 1) {
        ctx.save();
        for (let i = 1; i < state.ball.trail.length; i++) {
          const t = state.ball.trail[i];
          const alpha = (i / state.ball.trail.length) * 0.6 * (t.alpha || 1);
          
          // グラデーショントレイル
          const gradient = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, BALL_RADIUS * 0.8);
          gradient.addColorStop(0, `rgba(255, 200, 50, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(255, 140, 0, ${alpha * 0.6})`);
          gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);
          
          ctx.fillStyle = gradient;
          const size = (i / state.ball.trail.length) * BALL_RADIUS * 1.2;
          ctx.beginPath();
          ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ボール（連続成功時は炎エフェクト付き）
      ctx.save();
      ctx.translate(state.ball.x, state.ball.y);
      
      // 連続成功3回以上で炎オーラ
      if (state.streak >= 3) {
        const fireGlow = ctx.createRadialGradient(0, 0, BALL_RADIUS, 0, 0, BALL_RADIUS * 2);
        fireGlow.addColorStop(0, `rgba(255, 100, 0, ${0.3 + Math.sin(Date.now() / 100) * 0.1})`);
        fireGlow.addColorStop(0.5, `rgba(255, 50, 0, ${0.15 + Math.sin(Date.now() / 80) * 0.05})`);
        fireGlow.addColorStop(1, "transparent");
        ctx.fillStyle = fireGlow;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.rotate(state.ball.rotation);
      
      // ボール本体
      const ballGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, BALL_RADIUS);
      ballGradient.addColorStop(0, "#ff8c00");
      ballGradient.addColorStop(0.8, "#e65c00");
      ballGradient.addColorStop(1, "#cc4400");
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // ボールの線
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      
      // 縦線
      ctx.beginPath();
      ctx.moveTo(0, -BALL_RADIUS);
      ctx.lineTo(0, BALL_RADIUS);
      ctx.stroke();
      
      // 横線
      ctx.beginPath();
      ctx.ellipse(0, 0, BALL_RADIUS, BALL_RADIUS * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // リング前面部分
      ctx.strokeStyle = "#ff4400";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(HOOP_X - HOOP_WIDTH / 2, HOOP_Y);
      ctx.lineTo(HOOP_X + HOOP_WIDTH / 2, HOOP_Y);
      ctx.stroke();

      // パーティクル描画
      drawParticles();

      // スワイプガイド
      if (state.swipe.isDragging && state.phase === "aiming") {
        const dx = state.swipe.startX - state.swipe.currentX;
        const dy = state.swipe.startY - state.swipe.currentY;
        
        // 矢印
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(state.ball.x, state.ball.y);
        ctx.lineTo(state.ball.x + dx * 2, state.ball.y + dy * 2);
        ctx.stroke();
        
        // パワーインジケーター
        const power = Math.sqrt(dx * dx + dy * dy);
        const maxPower = 150;
        const powerRatio = Math.min(power / maxPower, 1);
        ctx.setLineDash([]);
        ctx.fillStyle = `hsl(${(1 - powerRatio) * 120}, 100%, 50%)`;
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(powerRatio * 100)}%`, state.ball.x, state.ball.y - 40);
        ctx.restore();
      }

      // UI: スコア
      ctx.fillStyle = "#fff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${state.score}`, 20, 45);
      
      ctx.font = "16px sans-serif";
      ctx.fillText("SCORE", 20, 65);

      // UI: 連続成功（炎エフェクト付き）
      if (state.streak > 0) {
        ctx.save();
        ctx.textAlign = "center";
        
        // 3連続以上で炎エフェクト
        if (state.streak >= 3) {
          ctx.shadowColor = "#ff4500";
          ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 5;
        }
        
        ctx.fillStyle = state.streak >= 3 ? "#ff6b00" : "#ffd700";
        ctx.font = `bold ${24 + Math.min(state.streak, 5) * 2}px sans-serif`;
        ctx.fillText(`🔥 ${state.streak} 連続!`, CANVAS_WIDTH / 2, 50);
        ctx.restore();
      }

      // UI: タイマー
      ctx.fillStyle = state.timeRemaining <= 10 ? "#ff4444" : "#fff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.ceil(state.timeRemaining)}`, CANVAS_WIDTH - 20, 45);
      
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText("TIME", CANVAS_WIDTH - 20, 65);

      // SWISH! 表示
      if (state.showSwish > 0) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.font = "bold 56px sans-serif";
        const swishAlpha = Math.min(state.showSwish * 2, 1);
        const scale = 1 + (1 - state.showSwish) * 0.3;
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        ctx.scale(scale, scale);
        ctx.fillStyle = `rgba(0, 255, 200, ${swishAlpha})`;
        ctx.shadowColor = "#00ffc8";
        ctx.shadowBlur = 20;
        ctx.fillText("SWISH!", 0, 0);
        ctx.restore();
      }

      // コンボボーナス表示
      if (state.showCombo > 0 && state.streak >= 2) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.font = "bold 28px sans-serif";
        const comboAlpha = Math.min(state.showCombo * 2, 1);
        const yOffset = (1 - state.showCombo) * 30;
        ctx.fillStyle = `rgba(255, 215, 0, ${comboAlpha})`;
        ctx.fillText(`+${(state.streak - 1) * STREAK_BONUS} COMBO!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + yOffset);
        ctx.restore();
      }

      // シュート結果表示
      if (state.lastShotResult === "success" && state.showSwish <= 0) {
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("NICE!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      } else if (state.lastShotResult === "miss") {
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MISS", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      // スタート画面
      if (state.phase === "ready") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#ff8c00";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏀 フープショット", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

        ctx.fillStyle = "#fff";
        ctx.font = "24px sans-serif";
        ctx.fillText("スワイプでシュート!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.fillText("連続成功でボーナス!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#aaa";
        ctx.fillText(`制限時間: ${GAME_DURATION}秒`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("タップしてスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 130);
      }

      // 結果画面
      if (state.phase === "result") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TIME UP!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 120);

        ctx.fillStyle = "#fff";
        ctx.font = "36px sans-serif";
        ctx.fillText(`スコア: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

        ctx.font = "24px sans-serif";
        ctx.fillText(`最大連続: ${state.bestStreak}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        // ハイスコア表示
        ctx.font = "20px sans-serif";
        if (showHighScorePopup) {
          ctx.fillStyle = "#ffd700";
          ctx.shadowColor = "#ffd700";
          ctx.shadowBlur = 10;
          ctx.fillText(`🏆 NEW HIGH SCORE: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "#aaa";
          ctx.fillText(`ハイスコア: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        }

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("タップでリトライ", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      }

      // ボール物理更新
      if (state.phase === "flying") {
        const prevY = state.ball.y;

        // 軌跡追加（アルファ値付き）
        state.ball.trail.push({ x: state.ball.x, y: state.ball.y, alpha: 1 });
        if (state.ball.trail.length > 25) {
          state.ball.trail.shift();
        }
        // トレイルのアルファ減衰
        state.ball.trail.forEach((t, i) => {
          t.alpha = (i + 1) / state.ball.trail.length;
        });

        // 重力
        state.ball.vy += GRAVITY;
        state.ball.x += state.ball.vx;
        state.ball.y += state.ball.vy;
        state.ball.rotation += state.ball.rotationSpeed;

        // ゴール判定
        if (checkGoal(state.ball, prevY)) {
          state.streak++;
          if (state.streak > state.bestStreak) {
            state.bestStreak = state.streak;
          }
          
          // スウィッシュ判定（リムにもバックボードにも触れずにゴール）
          const isSwish = !state.hitRim && !state.hitBackboard;
          // バンクショット判定（バックボードに当たってゴール、リムは触れない）
          const isBank = state.hitBackboard && !state.hitRim;
          let scoreGain = BASE_SCORE + (state.streak - 1) * STREAK_BONUS;
          
          // キャンバスの位置を取得してDOM座標に変換
          const canvas = canvasRef.current;
          const rect = canvas?.getBoundingClientRect();
          const scaleX = rect ? rect.width / CANVAS_WIDTH : 1;
          const scaleY = rect ? rect.height / CANVAS_HEIGHT : 1;
          const domX = rect ? rect.left + HOOP_X * scaleX : HOOP_X;
          const domY = rect ? rect.top + (HOOP_Y + 30) * scaleY : HOOP_Y + 30;
          
          if (isSwish) {
            scoreGain += SWISH_BONUS;
            state.lastShotResult = "swish";
            state.showSwish = 1;
            state.particles.push(...createConfetti(HOOP_X, HOOP_Y + 30, 30));
            playSwishSound();
            // 共有パーティクル: スウィッシュ時はsparkle + burst
            sparkle(domX, domY, 12);
            burst(domX, domY, 16);
            // ScorePopup: スウィッシュ
            showPopup(`SWISH! +${scoreGain}`, "critical", "lg", "25%");
          } else if (isBank) {
            scoreGain += BANK_BONUS;
            state.lastShotResult = "bank";
            state.particles.push(...createSparkles(HOOP_X, HOOP_Y + 20, 20));
            playScoreSound(state.streak);
            // 共有パーティクル: バンクショット時
            burst(domX, domY, 12);
            // ScorePopup: バンクショット
            showPopup(`BANK! +${scoreGain}`, "bonus", "md", "30%");
          } else {
            state.lastShotResult = "success";
            state.particles.push(...createSparkles(HOOP_X, HOOP_Y + 20, 15));
            playScoreSound(state.streak);
            // 共有パーティクル: 通常ゴール時はburst
            burst(domX, domY, 10);
            // ScorePopup: 通常ゴール
            showPopup(`+${scoreGain}`, "default", "md", "30%");
          }
          
          // 連続ストリークボーナス時のエフェクト & ポップアップ
          if (state.streak === 3) {
            // 3連続でコンボ開始
            setTimeout(() => showPopup("🔥 3連続!", "combo", "lg", "45%"), 300);
          } else if (state.streak === 5) {
            // 5連続でconfetti
            confetti(40);
            setTimeout(() => showPopup("🔥🔥 5連続!", "combo", "xl", "45%"), 300);
          } else if (state.streak === 10) {
            // 10連続でexplosion + confetti
            explosion(domX, domY, 30);
            confetti(60);
            setTimeout(() => showPopup("🔥🔥🔥 10連続!", "critical", "xl", "45%"), 300);
          } else if (state.streak % 5 === 0 && state.streak > 10) {
            // それ以降5連続ごとにconfetti
            confetti(50);
            setTimeout(() => showPopup(`🔥 ${state.streak}連続!`, "critical", "lg", "45%"), 300);
          }
          
          const prevScore = state.score;
          state.score += scoreGain;
          state.showCombo = 1;
          
          // マイルストーン達成チェック
          for (const milestone of MILESTONES) {
            if (prevScore < milestone && state.score >= milestone && milestone > state.lastMilestone) {
              state.lastMilestone = milestone;
              setTimeout(() => {
                showPopup(`🎯 ${milestone}点達成!`, "level", "xl", "50%");
                confetti(80);
              }, 500);
              break;
            }
          }
          
          // ネット揺れ
          state.netState.amplitude = 1;
          state.netState.phase = 0;
          
          // 少し遅延してリセット
          setTimeout(() => resetBall(), 500);
        }

        // リム衝突
        const rimCollision = checkRimCollision(state.ball);
        if (rimCollision.hit) {
          if (!state.hitRim) {
            state.hitRim = true;
            playRimHitSound();
          }
          if (rimCollision.side === "left") {
            state.ball.vx = Math.abs(state.ball.vx) * 0.6;
          } else {
            state.ball.vx = -Math.abs(state.ball.vx) * 0.6;
          }
          state.ball.vy *= 0.6;
          state.ball.y = HOOP_Y - BALL_RADIUS - HOOP_HEIGHT / 2;
        }

        // バックボード衝突
        if (checkBackboardCollision(state.ball)) {
          if (!state.hitBackboard) {
            state.hitBackboard = true;
            playBackboardSound();
          }
          state.ball.vx = -state.ball.vx * 0.7;
          state.ball.x = HOOP_X + HOOP_WIDTH / 2 + 20 - BALL_RADIUS - 1;
        }

        // 画面外判定
        if (
          state.ball.y > CANVAS_HEIGHT + 50 ||
          state.ball.x < -50 ||
          state.ball.x > CANVAS_WIDTH + 50
        ) {
          if (state.lastShotResult !== "success" && state.lastShotResult !== "swish" && state.lastShotResult !== "bank") {
            state.streak = 0;
            state.lastShotResult = "miss";
            playMissSound();
          }
          setTimeout(() => resetBall(), 300);
        }
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [resetBall, playSwishSound, playScoreSound, playMissSound, playRimHitSound, playBackboardSound, burst, sparkle, confetti, explosion, showPopup, updateHighScore, highScore, showHighScorePopup]);

  return (
    <GameShell gameId="hoopshot" layout="immersive">
      <div
        className="hoopshot-container"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="hoopshot-canvas"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        <ParticleLayer particles={sharedParticles} />
        <ScorePopup
          text={popupState.text}
          popupKey={popupState.key}
          variant={popupState.variant}
          size={popupState.size}
          y={popupState.y}
        />
      </div>
    </GameShell>
  );
}
