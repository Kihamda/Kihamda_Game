import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  useHighScore,
  ParticleLayer,
  ScorePopup,
  ScreenShake,
} from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 800;

const BALL_RADIUS = 10;
const BALL_INITIAL_SPEED = 8;
const GRAVITY = 0.15;
const MAX_BALL_SPEED = 15;

const FLIPPER_WIDTH = 80;
const FLIPPER_HEIGHT = 15;
const FLIPPER_Y = CANVAS_HEIGHT - 100;
const FLIPPER_LEFT_X = 100;
const FLIPPER_RIGHT_X = CANVAS_WIDTH - 100 - FLIPPER_WIDTH;
const FLIPPER_ROTATION_SPEED = 0.3;
const FLIPPER_MAX_ANGLE = Math.PI / 4;
const FLIPPER_KICK_POWER = 18;

const BUMPER_RADIUS = 25;
const BUMPER_SCORE = 100;

const WALL_THICKNESS = 20;

const INITIAL_LIVES = 3;
const MULTIBALL_THRESHOLD = 1000; // このスコアでマルチボール演出

type GamePhase = "before" | "in_progress" | "after";

interface Vec2 {
  x: number;
  y: number;
}

interface Bumper {
  x: number;
  y: number;
  radius: number;
  color: string;
  flashTimer: number;
}

// スコアポップアップ用
interface ScorePopupData {
  text: string;
  x: number;
  y: number;
  key: number;
  variant: PopupVariant;
}

interface GameState {
  ball: Vec2;
  ballVel: Vec2;
  leftFlipperAngle: number;
  rightFlipperAngle: number;
  leftFlipperActive: boolean;
  rightFlipperActive: boolean;
  bumpers: Bumper[];
  score: number;
  lives: number;
  phase: GamePhase;
  isLaunched: boolean;
  multiballTriggered: boolean;
  comboCount: number;
  comboTimer: number;
}

function createBumpers(): Bumper[] {
  return [
    { x: 150, y: 200, radius: BUMPER_RADIUS, color: "#ff6b6b", flashTimer: 0 },
    { x: 250, y: 150, radius: BUMPER_RADIUS, color: "#4dabf7", flashTimer: 0 },
    { x: 350, y: 200, radius: BUMPER_RADIUS, color: "#ffd43b", flashTimer: 0 },
    { x: 180, y: 320, radius: BUMPER_RADIUS, color: "#69db7c", flashTimer: 0 },
    { x: 320, y: 320, radius: BUMPER_RADIUS, color: "#cc5de8", flashTimer: 0 },
    { x: 250, y: 280, radius: BUMPER_RADIUS * 0.8, color: "#ff922b", flashTimer: 0 },
  ];
}

function createInitialState(): GameState {
  return {
    ball: { x: CANVAS_WIDTH - 40, y: CANVAS_HEIGHT - 200 },
    ballVel: { x: 0, y: 0 },
    leftFlipperAngle: 0,
    rightFlipperAngle: 0,
    leftFlipperActive: false,
    rightFlipperActive: false,
    bumpers: createBumpers(),
    score: 0,
    lives: INITIAL_LIVES,
    phase: "before",
    isLaunched: false,
    multiballTriggered: false,
    comboCount: 0,
    comboTimer: 0,
  };
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function reflect(v: Vec2, n: Vec2): Vec2 {
  const d = dot(v, n);
  return { x: v.x - 2 * d * n.x, y: v.y - 2 * d * n.y };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const popupKeyRef = useRef(0);

  const [, setTick] = useState(0);
  const [scorePopup, setScorePopup] = useState<ScorePopupData | null>(null);

  // ドーパミン演出用フック
  const { playTone, playMiss, playBonus, playCelebrate, playClick } = useAudio();
  const { particles, sparkle, confetti, burst } = useParticles();
  const { best, update: updateHighScore } = useHighScore("pinball");

  // 効果音プリセット
  const playFlipperSound = useCallback(() => {
    playTone(440, 0.05, "square", 0.15);
  }, [playTone]);

  const playBumperSound = useCallback(() => {
    playTone(880, 0.08, "sine", 0.25);
    playTone(1100, 0.06, "triangle", 0.15, 0.03);
  }, [playTone]);

  const playTargetSound = useCallback(() => {
    playTone(660, 0.1, "sine", 0.2);
    playTone(990, 0.08, "sine", 0.18, 0.05);
  }, [playTone]);

  const playDrainSound = useCallback(() => {
    playMiss();
  }, [playMiss]);

  const playMultiballSound = useCallback(() => {
    playBonus();
  }, [playBonus]);

  // スコアポップアップ表示
  const showScorePopup = useCallback((score: number, x: number, y: number, variant: PopupVariant = "default") => {
    popupKeyRef.current += 1;
    setScorePopup({
      text: `+${score}`,
      x,
      y,
      key: popupKeyRef.current,
      variant,
    });
    setTimeout(() => setScorePopup(null), 800);
  }, []);

  const launchBall = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.isLaunched && state.phase === "in_progress") {
      state.ballVel = { x: -3, y: -BALL_INITIAL_SPEED };
      state.isLaunched = true;
      playClick();
    }
  }, [playClick]);

  const startGame = useCallback(() => {
    gameStateRef.current.phase = "in_progress";
    setTick((t) => t + 1);
  }, []);

  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    setTick((t) => t + 1);
  }, []);

  const resetBall = useCallback(() => {
    const state = gameStateRef.current;
    state.ball = { x: CANVAS_WIDTH - 40, y: CANVAS_HEIGHT - 200 };
    state.ballVel = { x: 0, y: 0 };
    state.isLaunched = false;
    state.phase = "in_progress";
    state.comboCount = 0;
    state.comboTimer = 0;
    state.bumpers = state.bumpers.map((b) => ({ ...b, flashTimer: 0 }));
    setTick((t) => t + 1);
  }, []);

  // キーボード入力
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (e.key === "ArrowLeft" || e.key === "z" || e.key === "Z") {
        if (!state.leftFlipperActive) {
          state.leftFlipperActive = true;
          playFlipperSound();
          // フリッパーエフェクト
          burst(FLIPPER_LEFT_X + FLIPPER_WIDTH / 2, FLIPPER_Y, 4);
        }
      }
      if (e.key === "ArrowRight" || e.key === "/" || e.key === "x" || e.key === "X") {
        if (!state.rightFlipperActive) {
          state.rightFlipperActive = true;
          playFlipperSound();
          // フリッパーエフェクト
          burst(FLIPPER_RIGHT_X + FLIPPER_WIDTH / 2, FLIPPER_Y, 4);
        }
      }
      if (e.key === " " || e.key === "Enter") {
        if (state.phase === "before") {
          startGame();
        } else if (state.phase === "in_progress" && !state.isLaunched) {
          launchBall();
        } else if (state.phase === "after") {
          resetGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (e.key === "ArrowLeft" || e.key === "z" || e.key === "Z") {
        state.leftFlipperActive = false;
      }
      if (e.key === "ArrowRight" || e.key === "/" || e.key === "x" || e.key === "X") {
        state.rightFlipperActive = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startGame, launchBall, resetGame, playFlipperSound, burst]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;

      // 描画
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 壁
      ctx.fillStyle = "#3d5a80";
      ctx.fillRect(0, 0, WALL_THICKNESS, CANVAS_HEIGHT); // 左
      ctx.fillRect(CANVAS_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, CANVAS_HEIGHT - 200); // 右（発射レーン部分除く）
      ctx.fillRect(0, 0, CANVAS_WIDTH, WALL_THICKNESS); // 上

      // 発射レーン
      ctx.fillStyle = "#2d4a6f";
      ctx.fillRect(CANVAS_WIDTH - 60, 0, 60, CANVAS_HEIGHT);
      ctx.fillStyle = "#3d5a80";
      ctx.fillRect(CANVAS_WIDTH - 60, 0, 5, CANVAS_HEIGHT - 100);

      // バンパー描画
      for (const bumper of state.bumpers) {
        const flash = bumper.flashTimer > 0 ? 0.5 : 0;
        ctx.save();
        ctx.shadowColor = bumper.color;
        ctx.shadowBlur = 20 + flash * 30;
        ctx.fillStyle = bumper.color;
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 内側の円
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(bumper.x, bumper.y, bumper.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        if (bumper.flashTimer > 0) {
          bumper.flashTimer -= 1;
        }
      }

      // フリッパー描画
      const drawFlipper = (x: number, y: number, angle: number, isLeft: boolean) => {
        ctx.save();
        ctx.translate(x + (isLeft ? 0 : FLIPPER_WIDTH), y);
        ctx.rotate(isLeft ? -angle : angle);
        ctx.fillStyle = "#4cc9f0";
        ctx.shadowColor = "#4cc9f0";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        if (isLeft) {
          ctx.roundRect(0, -FLIPPER_HEIGHT / 2, FLIPPER_WIDTH, FLIPPER_HEIGHT, 8);
        } else {
          ctx.roundRect(-FLIPPER_WIDTH, -FLIPPER_HEIGHT / 2, FLIPPER_WIDTH, FLIPPER_HEIGHT, 8);
        }
        ctx.fill();
        ctx.restore();

        // 支点
        ctx.fillStyle = "#98c1d9";
        ctx.beginPath();
        ctx.arc(x + (isLeft ? 0 : FLIPPER_WIDTH), y, 8, 0, Math.PI * 2);
        ctx.fill();
      };

      drawFlipper(FLIPPER_LEFT_X, FLIPPER_Y, state.leftFlipperAngle, true);
      drawFlipper(FLIPPER_RIGHT_X, FLIPPER_Y, state.rightFlipperAngle, false);

      // ボール描画
      ctx.save();
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#e0e0e0";
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ボールのハイライト
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(state.ball.x - 3, state.ball.y - 3, BALL_RADIUS * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // スコア表示
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE: ${state.score}`, 30, 50);

      // ライフ表示
      ctx.textAlign = "right";
      ctx.fillText(`BALL: ${"●".repeat(state.lives)}`, CANVAS_WIDTH - 80, 50);

      // ゲーム中のみ更新
      if (state.phase === "in_progress") {
        // フリッパー角度更新
        if (state.leftFlipperActive) {
          state.leftFlipperAngle = Math.min(FLIPPER_MAX_ANGLE, state.leftFlipperAngle + FLIPPER_ROTATION_SPEED);
        } else {
          state.leftFlipperAngle = Math.max(0, state.leftFlipperAngle - FLIPPER_ROTATION_SPEED * 0.5);
        }
        if (state.rightFlipperActive) {
          state.rightFlipperAngle = Math.min(FLIPPER_MAX_ANGLE, state.rightFlipperAngle + FLIPPER_ROTATION_SPEED);
        } else {
          state.rightFlipperAngle = Math.max(0, state.rightFlipperAngle - FLIPPER_ROTATION_SPEED * 0.5);
        }

        if (state.isLaunched) {
          // 重力
          state.ballVel.y += GRAVITY;

          // 速度制限
          const speed = Math.sqrt(state.ballVel.x ** 2 + state.ballVel.y ** 2);
          if (speed > MAX_BALL_SPEED) {
            const ratio = MAX_BALL_SPEED / speed;
            state.ballVel.x *= ratio;
            state.ballVel.y *= ratio;
          }

          // ボール移動
          state.ball.x += state.ballVel.x;
          state.ball.y += state.ballVel.y;

          // 壁との衝突
          // 左壁
          if (state.ball.x - BALL_RADIUS < WALL_THICKNESS) {
            state.ball.x = WALL_THICKNESS + BALL_RADIUS;
            state.ballVel.x = Math.abs(state.ballVel.x) * 0.9;
          }
          // 右壁（発射レーン入口上部）
          if (state.ball.x + BALL_RADIUS > CANVAS_WIDTH - 60 && state.ball.y < CANVAS_HEIGHT - 200) {
            state.ball.x = CANVAS_WIDTH - 60 - BALL_RADIUS;
            state.ballVel.x = -Math.abs(state.ballVel.x) * 0.9;
          }
          // 発射レーン左壁
          if (state.ball.x - BALL_RADIUS < CANVAS_WIDTH - 60 && state.ball.x > CANVAS_WIDTH - 70 && state.ball.y > CANVAS_HEIGHT - 200) {
            state.ball.x = CANVAS_WIDTH - 60 + BALL_RADIUS;
            state.ballVel.x = Math.abs(state.ballVel.x) * 0.9;
          }
          // 発射レーン右壁
          if (state.ball.x + BALL_RADIUS > CANVAS_WIDTH - WALL_THICKNESS) {
            state.ball.x = CANVAS_WIDTH - WALL_THICKNESS - BALL_RADIUS;
            state.ballVel.x = -Math.abs(state.ballVel.x) * 0.9;
          }
          // 上壁
          if (state.ball.y - BALL_RADIUS < WALL_THICKNESS) {
            state.ball.y = WALL_THICKNESS + BALL_RADIUS;
            state.ballVel.y = Math.abs(state.ballVel.y) * 0.9;
          }

          // バンパーとの衝突
          for (const bumper of state.bumpers) {
            const dx = state.ball.x - bumper.x;
            const dy = state.ball.y - bumper.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = BALL_RADIUS + bumper.radius;

            if (dist < minDist && dist > 0) {
              // 反射方向を計算
              const normal = normalize({ x: dx, y: dy });
              
              // 既存速度を反射 + バンパーの反発力を加算
              const reflected = reflect(state.ballVel, normal);
              const kickSpeed = 8;
              state.ballVel.x = reflected.x + normal.x * kickSpeed;
              state.ballVel.y = reflected.y + normal.y * kickSpeed;

              // 位置補正
              state.ball.x = bumper.x + normal.x * (minDist + 1);
              state.ball.y = bumper.y + normal.y * (minDist + 1);

              // コンボ更新
              state.comboCount += 1;
              state.comboTimer = 60; // 約1秒

              // スコア計算（コンボボーナス）
              const comboMultiplier = Math.min(state.comboCount, 5);
              const actualScore = BUMPER_SCORE * comboMultiplier;
              state.score += actualScore;
              bumper.flashTimer = 10;

              // ドーパミン演出
              playBumperSound();
              sparkle(bumper.x, bumper.y, 10);
              const variant: PopupVariant = state.comboCount >= 3 ? "combo" : "default";
              showScorePopup(actualScore, bumper.x, bumper.y, variant);

              // マルチボール演出（スコア閾値突破時）
              if (!state.multiballTriggered && state.score >= MULTIBALL_THRESHOLD) {
                state.multiballTriggered = true;
                playMultiballSound();
                confetti(60);
              }
            }
          }

          // コンボタイマー減算
          if (state.comboTimer > 0) {
            state.comboTimer -= 1;
            if (state.comboTimer === 0) {
              state.comboCount = 0;
            }
          }

          // フリッパーとの衝突
          const checkFlipperCollision = (flipperX: number, angle: number, isLeft: boolean) => {
            const pivotX = flipperX + (isLeft ? 0 : FLIPPER_WIDTH);
            const pivotY = FLIPPER_Y;
            
            // フリッパーの端の位置を計算
            const endX = pivotX + (isLeft ? FLIPPER_WIDTH : -FLIPPER_WIDTH) * Math.cos(isLeft ? -angle : angle);
            const endY = pivotY - FLIPPER_WIDTH * Math.sin(angle);

            // ボールとフリッパー線分の距離
            const lineX = endX - pivotX;
            const lineY = endY - pivotY;
            const lineLen = Math.sqrt(lineX * lineX + lineY * lineY);
            
            const ballToPivotX = state.ball.x - pivotX;
            const ballToPivotY = state.ball.y - pivotY;
            
            let t = (ballToPivotX * lineX + ballToPivotY * lineY) / (lineLen * lineLen);
            t = Math.max(0, Math.min(1, t));
            
            const closestX = pivotX + t * lineX;
            const closestY = pivotY + t * lineY;
            
            const distX = state.ball.x - closestX;
            const distY = state.ball.y - closestY;
            const dist = Math.sqrt(distX * distX + distY * distY);

            if (dist < BALL_RADIUS + FLIPPER_HEIGHT / 2) {
              // 法線方向
              const normal = normalize({ x: distX, y: distY });
              
              // フリッパーが上昇中なら強く弾く
              const isActive = isLeft ? state.leftFlipperActive : state.rightFlipperActive;
              const kickPower = isActive ? FLIPPER_KICK_POWER : 8;
              
              // ボールを上に弾く（フリッパーの角度を考慮）
              const launchAngle = isLeft ? -0.8 - angle * 0.5 : -0.8 + angle * 0.5;
              state.ballVel.x = Math.sin(launchAngle * (isLeft ? -1 : 1)) * kickPower;
              state.ballVel.y = Math.cos(launchAngle) * -kickPower;

              // 位置補正
              state.ball.x = closestX + normal.x * (BALL_RADIUS + FLIPPER_HEIGHT / 2 + 2);
              state.ball.y = closestY + normal.y * (BALL_RADIUS + FLIPPER_HEIGHT / 2 + 2);

              // フリッパーヒット音
              if (isActive) {
                playTargetSound();
              }
            }
          };

          checkFlipperCollision(FLIPPER_LEFT_X, state.leftFlipperAngle, true);
          checkFlipperCollision(FLIPPER_RIGHT_X, state.rightFlipperAngle, false);

          // 落下判定
          if (state.ball.y > CANVAS_HEIGHT + BALL_RADIUS) {
            state.lives -= 1;
            
            // ドレイン演出
            playDrainSound();
            shakeRef.current?.shake("heavy", 400);
            
            if (state.lives <= 0) {
              state.phase = "after";
              // ハイスコア判定
              const isNewRecord = updateHighScore(state.score);
              if (isNewRecord) {
                confetti(100);
                playCelebrate();
              }
              setTick((t) => t + 1);
            } else {
              resetBall();
            }
          }
        }
      }

      // 開始前メッセージ
      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ピンボール", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        ctx.font = "20px sans-serif";
        ctx.fillText("← / Z: 左フリッパー", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.fillText("→ / X: 右フリッパー", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("クリック / スペースでスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 90);
      }

      // 発射前メッセージ
      if (state.phase === "in_progress" && !state.isLaunched) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("クリック / スペースで発射！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      // ゲームオーバー
      if (state.phase === "after") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        ctx.font = "28px sans-serif";
        ctx.fillText(`SCORE: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        // ハイスコア表示
        ctx.fillStyle = "#ffd700";
        ctx.font = "20px sans-serif";
        ctx.fillText(`BEST: ${best}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
        
        ctx.fillStyle = "#fff";
        ctx.fillText("クリックでリスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [resetBall, playBumperSound, playTargetSound, playDrainSound, playMultiballSound, playCelebrate, sparkle, confetti, showScorePopup, updateHighScore, best]);

  // クリックハンドラー
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "before") {
      startGame();
    } else if (state.phase === "in_progress" && !state.isLaunched) {
      launchBall();
    } else if (state.phase === "after") {
      resetGame();
    }
  }, [startGame, launchBall, resetGame]);

  // タッチ操作
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const state = gameStateRef.current;
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const relativeX = x / rect.width;

    if (relativeX < 0.5) {
      if (!state.leftFlipperActive) {
        state.leftFlipperActive = true;
        playFlipperSound();
        burst(FLIPPER_LEFT_X + FLIPPER_WIDTH / 2, FLIPPER_Y, 4);
      }
    } else {
      if (!state.rightFlipperActive) {
        state.rightFlipperActive = true;
        playFlipperSound();
        burst(FLIPPER_RIGHT_X + FLIPPER_WIDTH / 2, FLIPPER_Y, 4);
      }
    }
  }, [playFlipperSound, burst]);

  const handleTouchEnd = useCallback(() => {
    const state = gameStateRef.current;
    state.leftFlipperActive = false;
    state.rightFlipperActive = false;
  }, []);

  return (
    <GameShell gameId="pinball" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div
          ref={containerRef}
          className="pinball-container"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="pinball-canvas"
          />
          <ParticleLayer particles={particles} />
          {scorePopup && (
            <ScorePopup
              text={scorePopup.text}
              popupKey={scorePopup.key}
              x={`${scorePopup.x}px`}
              y={`${scorePopup.y}px`}
              variant={scorePopup.variant}
              size="md"
            />
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
