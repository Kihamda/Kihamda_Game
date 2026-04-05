import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScreenShake,
  ComboCounter,
  ScorePopup,
} from "@shared";

import type { ScreenShakeHandle, PopupVariant } from "@shared";

import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 700;
const LOG_CENTER_X = CANVAS_WIDTH / 2;
const LOG_CENTER_Y = 200;
const LOG_RADIUS = 100;
const KNIFE_LENGTH = 80;
const KNIFE_WIDTH = 8;
const KNIFE_START_Y = CANVAS_HEIGHT - 120;
const KNIFE_SPEED = 25;
const COLLISION_ANGLE = 0.15; // ナイフ同士の当たり判定角度（ラジアン）

type GamePhase = "ready" | "playing" | "cleared" | "failed";

interface Knife {
  angle: number; // 丸太に刺さった角度
  stuckDepth: number; // 刺さり深さ
}

interface FlyingKnife {
  y: number;
  isFlying: boolean;
}

interface StageConfig {
  knivesCount: number;
  rotationSpeed: number;
  preStuckKnives: number; // 最初から刺さっているナイフの数
}

// ステージ設定
const STAGES: StageConfig[] = [
  { knivesCount: 5, rotationSpeed: 0.02, preStuckKnives: 0 },
  { knivesCount: 6, rotationSpeed: 0.025, preStuckKnives: 1 },
  { knivesCount: 7, rotationSpeed: 0.03, preStuckKnives: 2 },
  { knivesCount: 8, rotationSpeed: 0.035, preStuckKnives: 3 },
  { knivesCount: 9, rotationSpeed: -0.03, preStuckKnives: 2 }, // 逆回転
  { knivesCount: 10, rotationSpeed: 0.04, preStuckKnives: 4 },
  { knivesCount: 10, rotationSpeed: -0.045, preStuckKnives: 5 }, // 逆回転
  { knivesCount: 12, rotationSpeed: 0.05, preStuckKnives: 4 },
];

interface GameState {
  phase: GamePhase;
  stageIndex: number;
  score: number;
  logRotation: number;
  stuckKnives: Knife[];
  flyingKnife: FlyingKnife | null;
  remainingKnives: number;
  hitFlashTime: number;
  combo: number;
  prevRotationSpeed: number; // 回転速度変化検出用
}

function generatePreStuckKnives(count: number): Knife[] {
  const knives: Knife[] = [];
  const angleStep = (Math.PI * 2) / Math.max(count * 3, 6); // 等間隔ではなくランダム感を出す
  for (let i = 0; i < count; i++) {
    knives.push({
      angle: angleStep * i * 2 + Math.random() * angleStep,
      stuckDepth: KNIFE_LENGTH * 0.3,
    });
  }
  return knives;
}

function createStageState(stageIndex: number, score: number): GameState {
  const stage = STAGES[stageIndex];
  return {
    phase: "playing",
    stageIndex,
    score,
    logRotation: 0,
    stuckKnives: generatePreStuckKnives(stage.preStuckKnives),
    flyingKnife: null,
    remainingKnives: stage.knivesCount,
    hitFlashTime: 0,
    combo: 0,
    prevRotationSpeed: stageIndex > 0 ? STAGES[stageIndex - 1].rotationSpeed : 0,
  };
}

function createInitialState(): GameState {
  return {
    phase: "ready",
    stageIndex: 0,
    score: 0,
    logRotation: 0,
    stuckKnives: [],
    flyingKnife: null,
    remainingKnives: STAGES[0].knivesCount,
    hitFlashTime: 0,
    combo: 0,
    prevRotationSpeed: 0,
  };
}

// ナイフ描画関数（コンポーネント外に配置）
function drawStuckKnife(ctx: CanvasRenderingContext2D, knife: Knife, logRotation: number) {
  ctx.save();
  ctx.translate(LOG_CENTER_X, LOG_CENTER_Y);
  ctx.rotate(knife.angle + logRotation);
  ctx.translate(0, LOG_RADIUS + KNIFE_LENGTH / 2 - knife.stuckDepth);

  // ナイフの刃
  ctx.fillStyle = "#c0c0c0";
  ctx.beginPath();
  ctx.moveTo(-KNIFE_WIDTH / 2, -KNIFE_LENGTH / 2);
  ctx.lineTo(KNIFE_WIDTH / 2, -KNIFE_LENGTH / 2);
  ctx.lineTo(KNIFE_WIDTH / 4, KNIFE_LENGTH / 4);
  ctx.lineTo(-KNIFE_WIDTH / 4, KNIFE_LENGTH / 4);
  ctx.closePath();
  ctx.fill();

  // ナイフの柄
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(-KNIFE_WIDTH / 2 - 2, KNIFE_LENGTH / 4, KNIFE_WIDTH + 4, KNIFE_LENGTH / 3);

  ctx.restore();
}

function drawFlyingKnife(ctx: CanvasRenderingContext2D, knife: FlyingKnife) {
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, knife.y);

  // ナイフの刃
  ctx.fillStyle = "#e0e0e0";
  ctx.beginPath();
  ctx.moveTo(-KNIFE_WIDTH / 2, -KNIFE_LENGTH / 2);
  ctx.lineTo(KNIFE_WIDTH / 2, -KNIFE_LENGTH / 2);
  ctx.lineTo(KNIFE_WIDTH / 4, KNIFE_LENGTH / 4);
  ctx.lineTo(-KNIFE_WIDTH / 4, KNIFE_LENGTH / 4);
  ctx.closePath();
  ctx.fill();

  // ハイライト
  ctx.fillStyle = "#fff";
  ctx.fillRect(-1, -KNIFE_LENGTH / 2 + 5, 2, KNIFE_LENGTH / 2 - 10);

  // ナイフの柄
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(-KNIFE_WIDTH / 2 - 2, KNIFE_LENGTH / 4, KNIFE_WIDTH + 4, KNIFE_LENGTH / 3);

  ctx.restore();
}

function drawWaitingKnife(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, KNIFE_START_Y);

  // ナイフの刃
  ctx.fillStyle = "#e0e0e0";
  ctx.beginPath();
  ctx.moveTo(-KNIFE_WIDTH / 2, -KNIFE_LENGTH / 2);
  ctx.lineTo(KNIFE_WIDTH / 2, -KNIFE_LENGTH / 2);
  ctx.lineTo(KNIFE_WIDTH / 4, KNIFE_LENGTH / 4);
  ctx.lineTo(-KNIFE_WIDTH / 4, KNIFE_LENGTH / 4);
  ctx.closePath();
  ctx.fill();

  // ハイライト
  ctx.fillStyle = "#fff";
  ctx.fillRect(-1, -KNIFE_LENGTH / 2 + 5, 2, KNIFE_LENGTH / 2 - 10);

  // ナイフの柄
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(-KNIFE_WIDTH / 2 - 2, KNIFE_LENGTH / 4, KNIFE_WIDTH + 4, KNIFE_LENGTH / 3);

  ctx.restore();
}

function drawRemainingKnives(ctx: CanvasRenderingContext2D, count: number) {
  const startX = 30;
  const startY = CANVAS_HEIGHT - 100;
  const spacing = 25;

  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(startX, startY + i * spacing);
    ctx.scale(0.4, 0.4);

    // 小さいナイフアイコン
    ctx.fillStyle = "#e0e0e0";
    ctx.beginPath();
    ctx.moveTo(-KNIFE_WIDTH / 2, -KNIFE_LENGTH / 2);
    ctx.lineTo(KNIFE_WIDTH / 2, -KNIFE_LENGTH / 2);
    ctx.lineTo(KNIFE_WIDTH / 4, KNIFE_LENGTH / 4);
    ctx.lineTo(-KNIFE_WIDTH / 4, KNIFE_LENGTH / 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#5a5a5a";
    ctx.fillRect(-KNIFE_WIDTH / 2 - 2, KNIFE_LENGTH / 4, KNIFE_WIDTH + 4, KNIFE_LENGTH / 3);

    ctx.restore();
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);

  // 演出用hooks
  const audio = useAudio();
  const { particles, sparkle, confetti } = useParticles();
  
  // コンボ表示用state
  const [combo, setCombo] = useState(0);
  // 回転速度アップグロー
  const [showSpeedGlow, setShowSpeedGlow] = useState(false);
  // ScorePopup用state
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    variant: PopupVariant;
  } | null>(null);

  const [, setTick] = useState(0);

  // ポップアップ表示用ヘルパー
  const showPopup = useCallback((text: string, variant: PopupVariant = "default") => {
    setPopup({ text, key: Date.now(), variant });
  }, []);

  const throwKnife = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase !== "playing" || state.flyingKnife?.isFlying || state.remainingKnives <= 0) {
      return;
    }
    state.flyingKnife = { y: KNIFE_START_Y, isFlying: true };
    // 投げ音
    audio.playTone(200, 0.1, "triangle", 0.15);
    setTick((t) => t + 1);
  }, [audio]);

  const startGame = useCallback(() => {
    gameStateRef.current = createStageState(0, 0);
    setCombo(0);
    audio.playClick();
    setTick((t) => t + 1);
  }, [audio]);

  const nextStage = useCallback(() => {
    const state = gameStateRef.current;
    const nextIndex = state.stageIndex + 1;
    if (nextIndex >= STAGES.length) {
      // 全ステージクリア - 最初から
      gameStateRef.current = createInitialState();
      gameStateRef.current.score = state.score;
    } else {
      gameStateRef.current = createStageState(nextIndex, state.score);
      // 回転速度が上がったらグロー
      const prevSpeed = Math.abs(STAGES[state.stageIndex].rotationSpeed);
      const newSpeed = Math.abs(STAGES[nextIndex].rotationSpeed);
      if (newSpeed > prevSpeed) {
        setShowSpeedGlow(true);
        setTimeout(() => setShowSpeedGlow(false), 1500);
        audio.playWarning();
      }
    }
    setCombo(0);
    setTick((t) => t + 1);
  }, [audio]);

  const retry = useCallback(() => {
    gameStateRef.current = createInitialState();
    setCombo(0);
    audio.playClick();
    setTick((t) => t + 1);
  }, [audio]);

  // キーボード入力
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (state.phase === "ready") {
          startGame();
        } else if (state.phase === "playing") {
          throwKnife();
        } else if (state.phase === "cleared") {
          nextStage();
        } else if (state.phase === "failed") {
          retry();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [startGame, throwKnife, nextStage, retry]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      const stage = STAGES[state.stageIndex];

      // 丸太の回転更新
      if (state.phase === "playing" || state.phase === "cleared") {
        state.logRotation += stage.rotationSpeed;
      }

      // フラッシュ時間減少
      if (state.hitFlashTime > 0) {
        state.hitFlashTime -= 1;
      }

      // 飛んでいるナイフの更新
      if (state.flyingKnife?.isFlying) {
        state.flyingKnife.y -= KNIFE_SPEED;

        // 丸太に到達したかチェック
        const knifeTopY = state.flyingKnife.y - KNIFE_LENGTH / 2;
        const distToLog = LOG_CENTER_Y + LOG_RADIUS;

        if (knifeTopY <= distToLog) {
          // 刺さる位置の角度を計算（下から刺さるので-PI/2）
          const stuckAngle = -state.logRotation - Math.PI / 2;
          const normalizedAngle = ((stuckAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

          // 他のナイフとの衝突判定
          let collision = false;
          for (const knife of state.stuckKnives) {
            const angleDiff = Math.abs(normalizedAngle - knife.angle);
            const minDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
            if (minDiff < COLLISION_ANGLE) {
              collision = true;
              break;
            }
          }

          if (collision) {
            // 衝突 - ゲームオーバー
            state.phase = "failed";
            state.hitFlashTime = 30;
            state.flyingKnife.isFlying = false;
            state.combo = 0;
            setCombo(0);
            // 演出: シェイク + 失敗音
            shakeRef.current?.shake("heavy", 400);
            audio.playGameOver();
            setTick((t) => t + 1);
          } else {
            // 刺さる
            state.stuckKnives.push({
              angle: normalizedAngle,
              stuckDepth: KNIFE_LENGTH * 0.3,
            });
            state.remainingKnives--;
            state.score += 10;
            state.combo++;
            setCombo(state.combo);
            state.flyingKnife = null;

            // 演出: sparkle + ヒット音 + コンボ音
            const container = containerRef.current;
            if (container) {
              const rect = container.getBoundingClientRect();
              sparkle(rect.left + LOG_CENTER_X, rect.top + LOG_CENTER_Y + LOG_RADIUS, 10);
            }
            audio.playSuccess();
            if (state.combo >= 3) {
              audio.playCombo(state.combo);
            }

            // ScorePopup: コンボ数に応じてvariantを変更
            if (state.combo >= 5) {
              showPopup(`+10 PERFECT x${state.combo}!`, "critical");
            } else if (state.combo >= 3) {
              showPopup(`+10 x${state.combo}`, "bonus");
            } else {
              showPopup("+10", "default");
            }

            // クリア判定
            if (state.remainingKnives <= 0) {
              state.phase = "cleared";
              const clearBonus = 50 + state.stageIndex * 20;
              state.score += clearBonus;
              // 演出: confetti + クリア音 + レベルクリアポップアップ
              confetti(60);
              audio.playCelebrate();
              // 少し遅延してクリアポップアップ表示
              setTimeout(() => {
                showPopup(`STAGE ${state.stageIndex + 1} CLEAR! +${clearBonus}`, "level");
              }, 300);
              setTick((t) => t + 1);
            }
          }
        }
      }

      // 描画開始
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景
      const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGradient.addColorStop(0, "#1a1a2e");
      bgGradient.addColorStop(1, "#16213e");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // ヒット時のフラッシュ
      if (state.hitFlashTime > 0) {
        ctx.fillStyle = `rgba(255, 100, 100, ${state.hitFlashTime / 60})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // 丸太を描画
      ctx.save();
      ctx.translate(LOG_CENTER_X, LOG_CENTER_Y);
      ctx.rotate(state.logRotation);

      // 丸太本体
      ctx.beginPath();
      ctx.arc(0, 0, LOG_RADIUS, 0, Math.PI * 2);
      const logGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, LOG_RADIUS);
      logGradient.addColorStop(0, "#8B4513");
      logGradient.addColorStop(0.3, "#A0522D");
      logGradient.addColorStop(1, "#654321");
      ctx.fillStyle = logGradient;
      ctx.fill();

      // 年輪
      ctx.strokeStyle = "#5D3A1A";
      ctx.lineWidth = 1;
      for (let r = 20; r < LOG_RADIUS; r += 15) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 中心点
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#3D2314";
      ctx.fill();

      ctx.restore();

      // 刺さっているナイフを描画
      for (const knife of state.stuckKnives) {
        drawStuckKnife(ctx, knife, state.logRotation);
      }

      // 飛んでいるナイフを描画
      if (state.flyingKnife) {
        drawFlyingKnife(ctx, state.flyingKnife);
      }

      // 待機中のナイフを描画
      if (state.phase === "playing" && !state.flyingKnife?.isFlying) {
        drawWaitingKnife(ctx);
      }

      // 残りナイフ表示
      drawRemainingKnives(ctx, state.remainingKnives);

      // UI: ステージ
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`STAGE ${state.stageIndex + 1}`, CANVAS_WIDTH / 2, 40);

      // UI: スコア
      ctx.font = "18px sans-serif";
      ctx.fillText(`Score: ${state.score}`, CANVAS_WIDTH / 2, 70);

      // 開始画面
      if (state.phase === "ready") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ナイフヒット", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        ctx.font = "20px sans-serif";
        ctx.fillText("回転する丸太にナイフを刺せ！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.fillText("他のナイフに当たるとミス", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);

        ctx.font = "bold 24px sans-serif";
        ctx.fillStyle = "#4ade80";
        ctx.fillText("タップしてスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      }

      // クリア画面
      if (state.phase === "cleared") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 40px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CLEAR!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "24px sans-serif";
        if (state.stageIndex + 1 >= STAGES.length) {
          ctx.fillText("全ステージクリア！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
          ctx.fillText(`Total Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
        } else {
          ctx.fillText(`Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        }

        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#4ade80";
        ctx.fillText("タップで次へ", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      }

      // 失敗画面
      if (state.phase === "failed") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#f87171";
        ctx.font = "bold 40px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MISS!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "24px sans-serif";
        ctx.fillText(`Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        ctx.fillText(`Stage ${state.stageIndex + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);

        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#f87171";
        ctx.fillText("タップでリトライ", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audio, sparkle, confetti, showPopup]);

  // クリックハンドラー
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "ready") {
      startGame();
    } else if (state.phase === "playing") {
      throwKnife();
    } else if (state.phase === "cleared") {
      nextStage();
    } else if (state.phase === "failed") {
      retry();
    }
  }, [startGame, throwKnife, nextStage, retry]);

  return (
    <GameShell gameId="knifehit" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div
          ref={containerRef}
          className={`knifehit-container${showSpeedGlow ? " speed-glow" : ""}`}
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onClick={handleClick}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="knifehit-canvas"
          />
          {/* コンボ表示 */}
          <ComboCounter combo={combo} position="top-right" threshold={3} />
          {/* スコアポップアップ */}
          <ScorePopup
            text={popup?.text ?? null}
            popupKey={popup?.key}
            variant={popup?.variant}
            y="35%"
            size="lg"
          />
          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />
        </div>
      </ScreenShake>
    </GameShell>
  );
}