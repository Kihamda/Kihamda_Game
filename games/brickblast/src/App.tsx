import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScreenShake,
  ComboCounter,
  ScorePopup,
  ShareButton,
  GameRecommendations,
} from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";
import "./App.css";

// スコアポップアップ用の型
interface ScorePopupData {
  text: string;
  x: number;
  y: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  key: number;
}

// ゲーム定数
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const PADDLE_Y = CANVAS_HEIGHT - 40;

const BALL_RADIUS = 8;
const BALL_SPEED = 6;

const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_WIDTH = 70;
const BRICK_HEIGHT = 25;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT =
  (CANVAS_WIDTH - (BRICK_WIDTH + BRICK_PADDING) * BRICK_COLS + BRICK_PADDING) /
  2;

const BRICK_COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7"];

const INITIAL_LIVES = 3;
const COMBO_TIMEOUT = 60; // フレーム数

// ポイント設定
const POINTS_PER_BRICK = 10;
const COMBO_BONUS_MULTIPLIER = 5; // コンボボーナス: comboCount * COMBO_BONUS_MULTIPLIER
const CLEAR_BONUS = 500;

type GamePhase = "before" | "in_progress" | "after";

interface Brick {
  x: number;
  y: number;
  visible: boolean;
  color: string;
}

interface GameState {
  paddleX: number;
  ballX: number;
  ballY: number;
  ballDX: number;
  ballDY: number;
  bricks: Brick[];
  score: number;
  lives: number;
  phase: GamePhase;
  isWin: boolean;
  comboCount: number;
  comboTimer: number;
}

function createBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
        visible: true,
        color: BRICK_COLORS[row % BRICK_COLORS.length],
      });
    }
  }
  return bricks;
}

function createInitialState(): GameState {
  return {
    paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    ballX: CANVAS_WIDTH / 2,
    ballY: PADDLE_Y - BALL_RADIUS - 5,
    ballDX: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    ballDY: -BALL_SPEED,
    bricks: createBricks(),
    score: 0,
    lives: INITIAL_LIVES,
    phase: "before",
    isWin: false,
    comboCount: 0,
    comboTimer: 0,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [combo, setCombo] = useState(0);
  const [popups, setPopups] = useState<ScorePopupData[]>([]);
  const popupKeyRef = useRef(0);

  // ドーパミンエフェクト用hooks
  const { particles, sparkle, confetti } = useParticles();
  const { playTone, playGameOver: playGameOverSound, playCombo } = useAudio();

  // サウンドヘルパー
  const playBrickHit = useCallback(
    () => playTone(600 + Math.random() * 200, 0.08, "square"),
    [playTone]
  );

  // スコアポップアップ追加ヘルパー
  const addPopup = useCallback(
    (
      text: string,
      x: number,
      y: number,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md"
    ) => {
      popupKeyRef.current++;
      const newPopup: ScorePopupData = {
        text,
        x,
        y,
        variant,
        size,
        key: popupKeyRef.current,
      };
      setPopups((prev) => [...prev, newPopup]);
      // ポップアップを1.5秒後に削除
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.key !== newPopup.key));
      }, 1500);
    },
    []
  );

  // パドル移動（マウス/タッチ）
  const handlePointerMove = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const relativeX = (clientX - rect.left) * scaleX;
    const paddleX = Math.max(
      0,
      Math.min(CANVAS_WIDTH - PADDLE_WIDTH, relativeX - PADDLE_WIDTH / 2)
    );

    gameStateRef.current.paddleX = paddleX;
  }, []);

  // ゲーム開始
  const startGame = useCallback(() => {
    gameStateRef.current.phase = "in_progress";
    setGameState({ ...gameStateRef.current });
  }, []);

  // リセット
  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    setCombo(0);
    setGameState({ ...gameStateRef.current });
  }, []);

  // ボールリセット（ライフ減少時）
  const resetBall = useCallback(() => {
    const state = gameStateRef.current;
    state.ballX = CANVAS_WIDTH / 2;
    state.ballY = PADDLE_Y - BALL_RADIUS - 5;
    state.ballDX = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    state.ballDY = -BALL_SPEED;
    state.phase = "before";
    state.comboCount = 0;
    state.comboTimer = 0;
    setCombo(0);
    setGameState({ ...state });
  }, []);

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
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // ブロック描画
      for (const brick of state.bricks) {
        if (!brick.visible) continue;
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        ctx.strokeRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
      }

      // パドル描画
      ctx.fillStyle = "#4cc9f0";
      ctx.beginPath();
      ctx.roundRect(
        state.paddleX,
        PADDLE_Y,
        PADDLE_WIDTH,
        PADDLE_HEIGHT,
        PADDLE_HEIGHT / 2
      );
      ctx.fill();

      // ボール描画
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(state.ballX, state.ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // スコア表示
      ctx.fillStyle = "#fff";
      ctx.font = "20px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${state.score}`, 20, 30);

      // ライフ表示
      ctx.textAlign = "right";
      ctx.fillText(`Lives: ${"❤️".repeat(state.lives)}`, CANVAS_WIDTH - 20, 30);

      // ゲーム中のみ更新
      if (state.phase === "in_progress") {
        // コンボタイマー更新
        if (state.comboTimer > 0) {
          state.comboTimer--;
          if (state.comboTimer <= 0) {
            state.comboCount = 0;
            setCombo(0);
          }
        }

        // ボール移動
        state.ballX += state.ballDX;
        state.ballY += state.ballDY;

        // 壁との衝突（左右）
        if (
          state.ballX - BALL_RADIUS <= 0 ||
          state.ballX + BALL_RADIUS >= CANVAS_WIDTH
        ) {
          state.ballDX = -state.ballDX;
          state.ballX = Math.max(
            BALL_RADIUS,
            Math.min(CANVAS_WIDTH - BALL_RADIUS, state.ballX)
          );
        }

        // 壁との衝突（上）
        if (state.ballY - BALL_RADIUS <= 0) {
          state.ballDY = -state.ballDY;
          state.ballY = BALL_RADIUS;
        }

        // パドルとの衝突
        if (
          state.ballDY > 0 &&
          state.ballY + BALL_RADIUS >= PADDLE_Y &&
          state.ballY - BALL_RADIUS <= PADDLE_Y + PADDLE_HEIGHT &&
          state.ballX >= state.paddleX &&
          state.ballX <= state.paddleX + PADDLE_WIDTH
        ) {
          // 当たった位置で角度を変える
          const hitPos = (state.ballX - state.paddleX) / PADDLE_WIDTH - 0.5;
          const angle = hitPos * (Math.PI / 3); // -60° ~ +60°
          const speed = Math.sqrt(
            state.ballDX * state.ballDX + state.ballDY * state.ballDY
          );
          state.ballDX = Math.sin(angle) * speed;
          state.ballDY = -Math.abs(Math.cos(angle) * speed);
          state.ballY = PADDLE_Y - BALL_RADIUS;
        }

        // ブロックとの衝突
        for (const brick of state.bricks) {
          if (!brick.visible) continue;

          const brickLeft = brick.x;
          const brickRight = brick.x + BRICK_WIDTH;
          const brickTop = brick.y;
          const brickBottom = brick.y + BRICK_HEIGHT;

          // 矩形とボールの衝突判定
          const closestX = Math.max(
            brickLeft,
            Math.min(state.ballX, brickRight)
          );
          const closestY = Math.max(
            brickTop,
            Math.min(state.ballY, brickBottom)
          );

          const distX = state.ballX - closestX;
          const distY = state.ballY - closestY;
          const distSq = distX * distX + distY * distY;

          if (distSq <= BALL_RADIUS * BALL_RADIUS) {
            brick.visible = false;

            // スコア計算（コンボボーナス付き）
            const basePoints = POINTS_PER_BRICK;
            const comboBonus =
              state.comboCount > 0 ? state.comboCount * COMBO_BONUS_MULTIPLIER : 0;
            const totalPoints = basePoints + comboBonus;
            state.score += totalPoints;

            // コンボ更新
            state.comboCount++;
            state.comboTimer = COMBO_TIMEOUT;
            setCombo(state.comboCount);

            // ドーパミンエフェクト: ブロック破壊
            const brickCenterX = brick.x + BRICK_WIDTH / 2;
            const brickCenterY = brick.y + BRICK_HEIGHT / 2;
            sparkle(brickCenterX, brickCenterY, 6);
            playBrickHit();

            // スコアポップアップ: ブロック破壊
            addPopup(`+${totalPoints}`, brickCenterX, brickCenterY, "default", "sm");

            // コンボエフェクト
            if (state.comboCount >= 3) {
              playCombo(state.comboCount);
              // コンボポップアップ（コンボ3以上で表示）
              const comboSize: "md" | "lg" | "xl" =
                state.comboCount >= 10 ? "xl" : state.comboCount >= 5 ? "lg" : "md";
              addPopup(
                `${state.comboCount} COMBO!`,
                CANVAS_WIDTH / 2,
                CANVAS_HEIGHT / 2 - 50,
                "combo",
                comboSize
              );
            }

            // 衝突方向を判定して反射
            const overlapLeft = state.ballX + BALL_RADIUS - brickLeft;
            const overlapRight = brickRight - (state.ballX - BALL_RADIUS);
            const overlapTop = state.ballY + BALL_RADIUS - brickTop;
            const overlapBottom = brickBottom - (state.ballY - BALL_RADIUS);

            const minOverlapX = Math.min(overlapLeft, overlapRight);
            const minOverlapY = Math.min(overlapTop, overlapBottom);

            if (minOverlapX < minOverlapY) {
              state.ballDX = -state.ballDX;
            } else {
              state.ballDY = -state.ballDY;
            }

            break; // 1フレームで1つのブロックのみ
          }
        }

        // ボール落下
        if (state.ballY + BALL_RADIUS >= CANVAS_HEIGHT) {
          state.lives -= 1;

          // ドーパミンエフェクト: ボールロスト
          shakeRef.current?.shake("medium", 300);
          playGameOverSound();

          if (state.lives <= 0) {
            state.phase = "after";
            state.isWin = false;
            setGameState({ ...state });
          } else {
            resetBall();
            return;
          }
        }

        // 全ブロック破壊
        const remainingBricks = state.bricks.filter((b) => b.visible).length;
        if (remainingBricks === 0) {
          state.phase = "after";
          state.isWin = true;

          // クリアボーナス加算
          state.score += CLEAR_BONUS;

          // ドーパミンエフェクト: ステージクリア
          confetti(60);

          // レベルクリアポップアップ
          addPopup(
            "🎉 STAGE CLEAR! 🎉",
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 - 100,
            "level",
            "xl"
          );
          // クリアボーナスポップアップ
          setTimeout(() => {
            addPopup(
              `+${CLEAR_BONUS} BONUS!`,
              CANVAS_WIDTH / 2,
              CANVAS_HEIGHT / 2 - 40,
              "bonus",
              "lg"
            );
          }, 300);

          setGameState({ ...state });
        }
      }

      // ゲーム開始前のメッセージ
      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("クリックでスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      // ゲーム終了メッセージ
      if (state.phase === "after") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          state.isWin ? "🎉 CLEAR! 🎉" : "GAME OVER",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 - 30
        );
        ctx.font = "24px sans-serif";
        ctx.fillText(
          `Score: ${state.score}`,
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 20
        );
        ctx.font = "20px sans-serif";
        ctx.fillText(
          "クリックでリスタート",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 60
        );
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    resetBall,
    sparkle,
    playBrickHit,
    playCombo,
    confetti,
    playGameOverSound,
    addPopup,
  ]);

  // イベントハンドラー
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "before") {
      startGame();
    } else if (state.phase === "after") {
      resetGame();
    }
  }, [startGame, resetGame]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handlePointerMove(e.clientX);
    },
    [handlePointerMove]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX);
      }
    },
    [handlePointerMove]
  );

  return (
    <GameShell
      gameId="brickblast"
      layout="immersive"
    >
      <ScreenShake ref={shakeRef}>
        <div
          ref={containerRef}
          className="brickblast-container"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            position: "relative",
          }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="brickblast-canvas"
          />
          <ParticleLayer particles={particles} />
          <ComboCounter combo={combo} position="top-right" threshold={3} />
          {/* スコアポップアップレイヤー */}
          {popups.map((popup) => (
            <ScorePopup
              key={popup.key}
              text={popup.text}
              popupKey={popup.key}
              x={`${popup.x}px`}
              y={`${popup.y}px`}
              variant={popup.variant}
              size={popup.size}
            />
          ))}
          {/* Game Over ShareButton */}
          {gameState.phase === "after" && (
            <div style={{ position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)" }}>
              <ShareButton score={gameState.score} gameTitle="Brick Blast" gameId="brickblast" />
              <GameRecommendations currentGameId="brickblast" />
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
