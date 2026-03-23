import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 700;

const BALL_RADIUS = 8;
const BALL_SPEED = 6;
const BALL_SPEED_INCREASE = 0.15;
const MAX_BALL_SPEED = 12;

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const PADDLE_Y = CANVAS_HEIGHT - 40;
const PADDLE_SPEED = 10;
const PADDLE_WIDE_WIDTH = 160;

const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_WIDTH = 54;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 4;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = (CANVAS_WIDTH - (BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP)) / 2;

const INITIAL_LIVES = 3;
const POWERUP_CHANCE = 0.15;
const POWERUP_SPEED = 3;
const POWERUP_SIZE = 20;
const POWERUP_DURATION = 10000;

// コンボ設定
const COMBO_TIMEOUT = 1500; // ms - コンボ継続判定時間
const TRAIL_LENGTH = 8; // トレイルの長さ

type GamePhase = "before" | "in_progress" | "cleared" | "gameover";
type PowerUpType = "multiball" | "wide";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: Array<{ x: number; y: number }>;
}

interface Brick {
  x: number;
  y: number;
  color: string;
  alive: boolean;
  hits: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
}

// パーティクルシステム
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

// コンボ表示
interface ComboDisplay {
  count: number;
  x: number;
  y: number;
  life: number;
}

interface GameState {
  balls: Ball[];
  paddle: { x: number; width: number; flashTime: number };
  bricks: Brick[];
  powerUps: PowerUp[];
  particles: Particle[];
  comboDisplays: ComboDisplay[];
  score: number;
  lives: number;
  phase: GamePhase;
  widePaddleEndTime: number | null;
  leftPressed: boolean;
  rightPressed: boolean;
  combo: number;
  lastBreakTime: number;
  currentSpeed: number;
  speedUpFlash: number;
}

const BRICK_COLORS = [
  "#ff6b6b",
  "#ffa94d",
  "#ffd43b",
  "#69db7c",
  "#4dabf7",
  "#cc5de8",
];

function createBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_GAP),
        y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        color: BRICK_COLORS[row % BRICK_COLORS.length],
        alive: true,
        hits: row < 2 ? 2 : 1,
      });
    }
  }
  return bricks;
}

function createInitialBall(): Ball {
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
  return {
    x: CANVAS_WIDTH / 2,
    y: PADDLE_Y - BALL_RADIUS - 5,
    vx: Math.cos(angle) * BALL_SPEED,
    vy: Math.sin(angle) * BALL_SPEED,
    trail: [],
  };
}

// パーティクル生成
function createParticles(x: number, y: number, color: string, count: number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: Math.random() * 4 + 2,
      life: 1,
      maxLife: 1,
    };
  });
}

function createInitialState(): GameState {
  return {
    balls: [createInitialBall()],
    paddle: { x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2, width: PADDLE_WIDTH, flashTime: 0 },
    bricks: createBricks(),
    powerUps: [],
    particles: [],
    comboDisplays: [],
    score: 0,
    lives: INITIAL_LIVES,
    phase: "before",
    widePaddleEndTime: null,
    leftPressed: false,
    rightPressed: false,
    combo: 0,
    lastBreakTime: 0,
    currentSpeed: BALL_SPEED,
    speedUpFlash: 0,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  
  // 効果音
  const { playTone, playCombo, playLevelUp, playCelebrate, playMiss } = useAudio();
  
  // パーティクルエフェクト（共有システム）
  const { particles: sharedParticles, burst, sparkle, explosion, confetti } = useParticles();

  const [, setTick] = useState(0);

  // ScorePopup用のステート
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    x: string;
    y: string;
    variant: PopupVariant;
    size: "sm" | "md" | "lg" | "xl";
  } | null>(null);
  const popupKeyRef = useRef(0);

  // ポップアップ表示ヘルパー
  const showPopup = useCallback(
    (
      text: string,
      canvasX: number,
      canvasY: number,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md"
    ) => {
      popupKeyRef.current += 1;
      // Canvas座標をパーセンテージに変換
      const xPercent = `${(canvasX / CANVAS_WIDTH) * 100}%`;
      const yPercent = `${(canvasY / CANVAS_HEIGHT) * 100}%`;
      setPopup({
        text,
        key: popupKeyRef.current,
        x: xPercent,
        y: yPercent,
        variant,
        size,
      });
    },
    []
  );

  // 効果音ヘルパー
  const playHit = useCallback(() => {
    playTone(440, 0.05, "sine", 0.15);
  }, [playTone]);
  
  const playBreak = useCallback(() => {
    playTone(660, 0.1, "triangle", 0.2);
    playTone(880, 0.08, "sine", 0.15, 0.03);
  }, [playTone]);

  const startGame = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "before") {
      state.phase = "in_progress";
      setTick((t) => t + 1);
    }
  }, []);

  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    setTick((t) => t + 1);
  }, []);

  // キーボード入力
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        state.leftPressed = true;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        state.rightPressed = true;
      }
      if (e.key === " " || e.key === "Enter") {
        if (state.phase === "before") {
          startGame();
        } else if (state.phase === "gameover" || state.phase === "cleared") {
          resetGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        state.leftPressed = false;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        state.rightPressed = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startGame, resetGame]);

  // マウス/タッチ操作
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMove = (clientX: number) => {
      const rect = container.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const x = (clientX - rect.left) * scaleX;
      const state = gameStateRef.current;
      state.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - state.paddle.width, x - state.paddle.width / 2));
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      const now = Date.now();

      // コンボタイムアウトチェック
      if (state.combo > 0 && now - state.lastBreakTime > COMBO_TIMEOUT) {
        state.combo = 0;
      }

      // パワーアップ時間チェック
      if (state.widePaddleEndTime && now > state.widePaddleEndTime) {
        state.paddle.width = PADDLE_WIDTH;
        state.widePaddleEndTime = null;
      }

      // パーティクル更新
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // 重力
        p.life -= 0.02;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
        }
      }

      // コンボ表示更新
      for (let i = state.comboDisplays.length - 1; i >= 0; i--) {
        const c = state.comboDisplays[i];
        c.life -= 0.02;
        c.y -= 1;
        if (c.life <= 0) {
          state.comboDisplays.splice(i, 1);
        }
      }

      // フラッシュ減衰
      if (state.paddle.flashTime > 0) {
        state.paddle.flashTime -= 0.08;
      }
      if (state.speedUpFlash > 0) {
        state.speedUpFlash -= 0.03;
      }

      // 描画
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // スピードアップフラッシュ
      if (state.speedUpFlash > 0) {
        ctx.fillStyle = `rgba(255, 200, 100, ${state.speedUpFlash * 0.2})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // ブリック描画
      for (const brick of state.bricks) {
        if (!brick.alive) continue;
        ctx.save();
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
        ctx.restore();

        // 耐久度表示
        if (brick.hits > 1) {
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.fillRect(brick.x + 2, brick.y + 2, BRICK_WIDTH - 4, BRICK_HEIGHT - 4);
        }
      }

      // パーティクル描画
      for (const p of state.particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // パワーアップ描画
      for (const powerUp of state.powerUps) {
        ctx.save();
        ctx.shadowBlur = 15;
        if (powerUp.type === "multiball") {
          ctx.shadowColor = "#4dabf7";
          ctx.fillStyle = "#4dabf7";
        } else {
          ctx.shadowColor = "#69db7c";
          ctx.fillStyle = "#69db7c";
        }
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, POWERUP_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // アイコン
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(powerUp.type === "multiball" ? "M" : "W", powerUp.x, powerUp.y);
      }

      // パドル描画（フラッシュ対応）
      ctx.save();
      const paddleFlashIntensity = Math.max(0, state.paddle.flashTime);
      const paddleColor = paddleFlashIntensity > 0
        ? `rgb(${Math.round(76 + 179 * paddleFlashIntensity)}, ${Math.round(201 + 54 * paddleFlashIntensity)}, ${Math.round(240 + 15 * paddleFlashIntensity)})`
        : "#4cc9f0";
      ctx.shadowColor = paddleFlashIntensity > 0 ? "#fff" : "#4cc9f0";
      ctx.shadowBlur = 15 + paddleFlashIntensity * 20;
      ctx.fillStyle = paddleColor;
      ctx.beginPath();
      ctx.roundRect(state.paddle.x, PADDLE_Y, state.paddle.width, PADDLE_HEIGHT, 8);
      ctx.fill();
      ctx.restore();

      // ボール描画（トレイル付き）
      for (const ball of state.balls) {
        // トレイル描画
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        const showTrail = speed > BALL_SPEED * 1.3;
        if (showTrail && ball.trail.length > 0) {
          for (let t = 0; t < ball.trail.length; t++) {
            const trailPoint = ball.trail[t];
            const alpha = (t / ball.trail.length) * 0.5;
            const size = BALL_RADIUS * (0.3 + (t / ball.trail.length) * 0.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = speed > BALL_SPEED * 1.5 ? "#ffa94d" : "#4dabf7";
            ctx.beginPath();
            ctx.arc(trailPoint.x, trailPoint.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // ボール本体
        ctx.save();
        ctx.shadowColor = showTrail ? "#ffa94d" : "#fff";
        ctx.shadowBlur = showTrail ? 25 : 15;
        ctx.fillStyle = showTrail ? "#ffe066" : "#e0e0e0";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ハイライト
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, BALL_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // コンボ表示描画
      for (const c of state.comboDisplays) {
        ctx.save();
        ctx.globalAlpha = c.life;
        ctx.fillStyle = "#ffe066";
        ctx.font = `bold ${20 + c.count * 2}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#ffa94d";
        ctx.shadowBlur = 10;
        ctx.fillText(`${c.count} COMBO!`, c.x, c.y);
        ctx.restore();
      }

      // スコア表示
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`SCORE: ${state.score}`, 15, 15);

      // コンボ表示（UI）
      if (state.combo > 1) {
        ctx.save();
        ctx.fillStyle = "#ffe066";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";
        ctx.shadowColor = "#ffa94d";
        ctx.shadowBlur = 5;
        ctx.fillText(`COMBO: ${state.combo}x`, 15, 40);
        ctx.restore();
      }

      // ライフ表示
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`LIFE: ${"●".repeat(state.lives)}`, CANVAS_WIDTH - 15, 15);

      // パワーアップ状態表示
      if (state.widePaddleEndTime) {
        const remaining = Math.ceil((state.widePaddleEndTime - now) / 1000);
        ctx.textAlign = "center";
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#69db7c";
        ctx.fillText(`WIDE: ${remaining}s`, CANVAS_WIDTH / 2, 15);
      }

      // ゲーム中のみ更新
      if (state.phase === "in_progress") {
        // パドル移動（キーボード）
        if (state.leftPressed) {
          state.paddle.x = Math.max(0, state.paddle.x - PADDLE_SPEED);
        }
        if (state.rightPressed) {
          state.paddle.x = Math.min(CANVAS_WIDTH - state.paddle.width, state.paddle.x + PADDLE_SPEED);
        }

        // パワーアップ移動
        for (let i = state.powerUps.length - 1; i >= 0; i--) {
          const powerUp = state.powerUps[i];
          powerUp.y += POWERUP_SPEED;

          // パドルとの衝突
          if (
            powerUp.y + POWERUP_SIZE / 2 > PADDLE_Y &&
            powerUp.y - POWERUP_SIZE / 2 < PADDLE_Y + PADDLE_HEIGHT &&
            powerUp.x > state.paddle.x &&
            powerUp.x < state.paddle.x + state.paddle.width
          ) {
            if (powerUp.type === "multiball") {
              // マルチボール：ボールを2つ追加
              const newBalls: Ball[] = [];
              for (const ball of state.balls) {
                newBalls.push({
                  x: ball.x,
                  y: ball.y,
                  vx: ball.vx * 0.8 + 2,
                  vy: ball.vy,
                  trail: [],
                });
                newBalls.push({
                  x: ball.x,
                  y: ball.y,
                  vx: ball.vx * 0.8 - 2,
                  vy: ball.vy,
                  trail: [],
                });
              }
              state.balls.push(...newBalls);
            } else if (powerUp.type === "wide") {
              // ワイドパドル
              state.paddle.width = PADDLE_WIDE_WIDTH;
              state.widePaddleEndTime = now + POWERUP_DURATION;
              state.paddle.x = Math.min(state.paddle.x, CANVAS_WIDTH - PADDLE_WIDE_WIDTH);
            }
            state.powerUps.splice(i, 1);
            state.score += 50;
            playLevelUp();
            // パワーアップ取得ポップアップ
            showPopup("+50", powerUp.x, powerUp.y - 20, "bonus", "md");
            continue;
          }

          // 画面外
          if (powerUp.y > CANVAS_HEIGHT) {
            state.powerUps.splice(i, 1);
          }
        }

        // ボール移動・衝突処理
        for (let i = state.balls.length - 1; i >= 0; i--) {
          const ball = state.balls[i];

          // トレイル更新
          ball.trail.push({ x: ball.x, y: ball.y });
          if (ball.trail.length > TRAIL_LENGTH) {
            ball.trail.shift();
          }

          ball.x += ball.vx;
          ball.y += ball.vy;

          // 壁との衝突
          if (ball.x - BALL_RADIUS < 0) {
            ball.x = BALL_RADIUS;
            ball.vx = Math.abs(ball.vx);
          }
          if (ball.x + BALL_RADIUS > CANVAS_WIDTH) {
            ball.x = CANVAS_WIDTH - BALL_RADIUS;
            ball.vx = -Math.abs(ball.vx);
          }
          if (ball.y - BALL_RADIUS < 0) {
            ball.y = BALL_RADIUS;
            ball.vy = Math.abs(ball.vy);
          }

          // パドルとの衝突
          if (
            ball.vy > 0 &&
            ball.y + BALL_RADIUS > PADDLE_Y &&
            ball.y - BALL_RADIUS < PADDLE_Y + PADDLE_HEIGHT &&
            ball.x > state.paddle.x &&
            ball.x < state.paddle.x + state.paddle.width
          ) {
            // 反射角度をパドルの当たり位置で変更
            const hitPos = (ball.x - state.paddle.x) / state.paddle.width;
            const angle = (hitPos - 0.5) * Math.PI * 0.7 - Math.PI / 2;
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            ball.vx = Math.cos(angle) * speed;
            ball.vy = Math.sin(angle) * speed;
            ball.y = PADDLE_Y - BALL_RADIUS;
            
            // パドルヒットフラッシュ
            state.paddle.flashTime = 1;
            playHit();
            
            // sparkle パーティクル（パドルヒット時）
            sparkle(ball.x, PADDLE_Y, 6);
            
            // コンボリセット
            state.combo = 0;
          }

          // ブリックとの衝突
          for (const brick of state.bricks) {
            if (!brick.alive) continue;

            if (
              ball.x + BALL_RADIUS > brick.x &&
              ball.x - BALL_RADIUS < brick.x + BRICK_WIDTH &&
              ball.y + BALL_RADIUS > brick.y &&
              ball.y - BALL_RADIUS < brick.y + BRICK_HEIGHT
            ) {
              // 衝突面の判定
              const overlapLeft = ball.x + BALL_RADIUS - brick.x;
              const overlapRight = brick.x + BRICK_WIDTH - (ball.x - BALL_RADIUS);
              const overlapTop = ball.y + BALL_RADIUS - brick.y;
              const overlapBottom = brick.y + BRICK_HEIGHT - (ball.y - BALL_RADIUS);

              const minOverlapX = Math.min(overlapLeft, overlapRight);
              const minOverlapY = Math.min(overlapTop, overlapBottom);

              if (minOverlapX < minOverlapY) {
                ball.vx = -ball.vx;
              } else {
                ball.vy = -ball.vy;
              }

              brick.hits -= 1;
              if (brick.hits <= 0) {
                brick.alive = false;
                
                // コンボ更新
                state.combo += 1;
                state.lastBreakTime = now;
                
                // コンボボーナス
                const comboBonus = Math.min(state.combo, 10) * 10;
                const points = 100 + comboBonus;
                state.score += points;
                
                // パーティクル生成（ブロック色）
                const particles = createParticles(
                  brick.x + BRICK_WIDTH / 2,
                  brick.y + BRICK_HEIGHT / 2,
                  brick.color,
                  12
                );
                state.particles.push(...particles);
                
                // 共有パーティクル: burst（ブリック破壊時）
                burst(brick.x + BRICK_WIDTH / 2, brick.y + BRICK_HEIGHT / 2, 10);
                
                // 効果音
                playBreak();
                
                // スコアポップアップ
                if (state.combo > 1) {
                  playCombo(state.combo);
                  // コンボ表示追加
                  state.comboDisplays.push({
                    count: state.combo,
                    x: brick.x + BRICK_WIDTH / 2,
                    y: brick.y,
                    life: 1,
                  });
                  
                  // コンボポップアップ（3コンボ以上でより強調）
                  if (state.combo >= 3) {
                    explosion(brick.x + BRICK_WIDTH / 2, brick.y + BRICK_HEIGHT / 2, 16 + state.combo * 2);
                    showPopup(
                      `+${points} ${state.combo}x`,
                      brick.x + BRICK_WIDTH / 2,
                      brick.y - 10,
                      "combo",
                      state.combo >= 5 ? "lg" : "md"
                    );
                  } else {
                    showPopup(`+${points}`, brick.x + BRICK_WIDTH / 2, brick.y - 10, "default", "sm");
                  }
                } else {
                  // 通常破壊ポップアップ
                  showPopup(`+${points}`, brick.x + BRICK_WIDTH / 2, brick.y - 10, "default", "sm");
                }
                
                // スピードアップ（5コンボごと）
                if (state.combo % 5 === 0 && state.currentSpeed < MAX_BALL_SPEED) {
                  state.currentSpeed = Math.min(state.currentSpeed + BALL_SPEED_INCREASE, MAX_BALL_SPEED);
                  state.speedUpFlash = 1;
                  playLevelUp();
                  
                  // 全ボールのスピード調整
                  for (const b of state.balls) {
                    const currentBallSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                    const factor = state.currentSpeed / currentBallSpeed;
                    b.vx *= factor;
                    b.vy *= factor;
                  }
                }

                // パワーアップドロップ
                if (Math.random() < POWERUP_CHANCE) {
                  state.powerUps.push({
                    x: brick.x + BRICK_WIDTH / 2,
                    y: brick.y + BRICK_HEIGHT / 2,
                    type: Math.random() < 0.5 ? "multiball" : "wide",
                  });
                }
              } else {
                state.score += 10;
                playHit();
              }
              break;
            }
          }

          // 落下判定
          if (ball.y > CANVAS_HEIGHT + BALL_RADIUS) {
            state.balls.splice(i, 1);
          }
        }

        // すべてのボールが落下
        if (state.balls.length === 0) {
          state.lives -= 1;
          state.combo = 0;
          playMiss();
          if (state.lives <= 0) {
            state.phase = "gameover";
            setTick((t) => t + 1);
          } else {
            state.balls = [createInitialBall()];
            state.currentSpeed = BALL_SPEED;
            // パワーアップリセット
            state.paddle.width = PADDLE_WIDTH;
            state.widePaddleEndTime = null;
            state.powerUps = [];
          }
        }

        // クリア判定
        if (state.bricks.every((b) => !b.alive)) {
          state.phase = "cleared";
          state.score += 1000;
          playCelebrate();
          confetti(60); // クリア時のconfettiエフェクト
          // クリアポップアップ
          showPopup("CLEAR! +1000", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "level", "xl");
          setTick((t) => t + 1);
        }
      }

      // 開始前メッセージ
      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("ブリックアウト", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
        ctx.font = "20px sans-serif";
        ctx.fillText("← / → / マウス: パドル移動", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.fillText("M: マルチボール / W: ワイドパドル", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("クリック / スペースでスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
      }

      // ゲームオーバー
      if (state.phase === "gameover") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.fillStyle = "#fff";
        ctx.font = "28px sans-serif";
        ctx.fillText(`SCORE: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.font = "20px sans-serif";
        ctx.fillText("クリックでリスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
      }

      // クリア
      if (state.phase === "cleared") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#69db7c";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CLEAR!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.fillStyle = "#fff";
        ctx.font = "28px sans-serif";
        ctx.fillText(`SCORE: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.font = "20px sans-serif";
        ctx.fillText("クリックでリスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [playHit, playBreak, playCombo, playLevelUp, playMiss, playCelebrate, burst, sparkle, explosion, confetti, showPopup]);

  // クリックハンドラー
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "before") {
      startGame();
    } else if (state.phase === "gameover" || state.phase === "cleared") {
      resetGame();
    }
  }, [startGame, resetGame]);

  return (
    <GameShell gameId="brickout" layout="immersive">
      <div
        ref={containerRef}
        className="brickout-container"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="brickout-canvas"
        />
        <ParticleLayer particles={sharedParticles} />
        <ScorePopup
          text={popup?.text ?? null}
          popupKey={popup?.key}
          x={popup?.x}
          y={popup?.y}
          variant={popup?.variant}
          size={popup?.size}
        />
      </div>
    </GameShell>
  );
}
