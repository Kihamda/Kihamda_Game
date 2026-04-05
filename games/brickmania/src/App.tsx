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
import type { GameState, Brick } from "./lib/types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BALL_RADIUS,
  COLORS,
} from "./lib/constants";
import {
  createInitialState,
  advanceStage,
  movePaddle,
  updateGame,
  fireLaser,
} from "./lib/brickmania";
import { loadHighScore, saveHighScore } from "./lib/storage";
import "./App.css";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const gameStateRef = useRef<GameState>(createInitialState(loadHighScore()));
  const animationFrameRef = useRef<number>(0);
  const laserCooldownRef = useRef<number>(0);

  // 前フレームの状態を追跡
  const prevBrickCountRef = useRef<number>(0);
  const prevLivesRef = useRef<number>(0);
  const prevPhaseRef = useRef<string>("");
  const prevPowerUpCountRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>(() => createInitialState(loadHighScore()));
  const [combo, setCombo] = useState(0);

  // ScorePopup用state
  interface PopupState {
    text: string;
    key: number;
    x: string;
    y: string;
    variant: PopupVariant;
    size: "sm" | "md" | "lg" | "xl";
  }
  const [popups, setPopups] = useState<PopupState[]>([]);
  const popupIdRef = useRef(0);

  // ポップアップを追加するヘルパー
  const addPopup = useCallback(
    (
      text: string,
      x: number,
      y: number,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md"
    ) => {
      const id = ++popupIdRef.current;
      const xPercent = `${(x / CANVAS_WIDTH) * 100}%`;
      const yPercent = `${(y / CANVAS_HEIGHT) * 100}%`;
      setPopups((prev) => [...prev, { text, key: id, x: xPercent, y: yPercent, variant, size }]);
      // 自動削除（アニメーション終了後）
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.key !== id));
      }, 1500);
    },
    []
  );

  // 前フレームのブリック状態を追跡（破壊位置特定用）
  const prevBricksRef = useRef<Brick[]>([]);

  // ドーパミンエフェクト用hooks
  const { particles, sparkle, confetti } = useParticles();
  const { playTone, playGameOver: playGameOverSound, playCombo, playBonus } = useAudio();

  // サウンドヘルパー
  const playBrickHit = useCallback(
    () => playTone(600 + Math.random() * 200, 0.08, "square"),
    [playTone]
  );

  const playPowerup = useCallback(
    () => playTone(880, 0.15, "sine"),
    [playTone]
  );

  // パドル移動
  const handlePointerMove = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const relativeX = (clientX - rect.left) * scaleX;

    gameStateRef.current = movePaddle(gameStateRef.current, relativeX);
  }, []);

  // クリック処理
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;

    if (state.phase === "start") {
      gameStateRef.current = { ...state, phase: "playing" };
      prevBrickCountRef.current = state.bricks.filter((b) => b.visible).length;
      prevLivesRef.current = state.lives;
      prevPhaseRef.current = "playing";
      prevPowerUpCountRef.current = state.powerUps.length;
      setGameState({ ...gameStateRef.current });
    } else if (state.phase === "cleared") {
      gameStateRef.current = advanceStage(state);
      const newState = gameStateRef.current;
      prevBrickCountRef.current = newState.bricks.filter((b) => b.visible).length;
      prevLivesRef.current = newState.lives;
      prevPhaseRef.current = "playing";
      prevPowerUpCountRef.current = 0;
      setCombo(0);
      setGameState({ ...newState });
    } else if (state.phase === "gameover") {
      saveHighScore(state.highScore);
      gameStateRef.current = createInitialState(state.highScore);
      const newState = gameStateRef.current;
      prevBrickCountRef.current = newState.bricks.filter((b) => b.visible).length;
      prevLivesRef.current = newState.lives;
      prevPhaseRef.current = "start";
      prevPowerUpCountRef.current = 0;
      setCombo(0);
      setGameState({ ...newState });
    } else if (state.phase === "playing" && state.laserActive) {
      if (laserCooldownRef.current <= 0) {
        gameStateRef.current = fireLaser(state);
        laserCooldownRef.current = 10;
      }
    }
  }, []);

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

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 初期状態を設定
    const initState = gameStateRef.current;
    prevBrickCountRef.current = initState.bricks.filter((b) => b.visible).length;
    prevLivesRef.current = initState.lives;
    prevPhaseRef.current = initState.phase;
    prevPowerUpCountRef.current = initState.powerUps.length;
    prevBricksRef.current = initState.bricks.map((b) => ({ ...b }));

    // ハイスコア更新追跡用
    let lastHighScore = initState.highScore;

    const gameLoop = () => {
      // 前の状態を保存
      const prevBrickCount = prevBrickCountRef.current;
      const prevLives = prevLivesRef.current;
      const prevPhase = prevPhaseRef.current;
      const prevPowerUpCount = prevPowerUpCountRef.current;
      const prevBricks = prevBricksRef.current;

      // 状態更新
      gameStateRef.current = updateGame(gameStateRef.current);
      const state = gameStateRef.current;

      // 現在の状態
      const currentBrickCount = state.bricks.filter((b) => b.visible).length;
      const bricksDestroyed = prevBrickCount - currentBrickCount;

      // レーザークールダウン
      if (laserCooldownRef.current > 0) {
        laserCooldownRef.current--;
      }

      // ドーパミンエフェクト: ブロック破壊
      if (bricksDestroyed > 0 && state.phase === "playing") {
        // 破壊されたブロックの正確な位置を特定してポップアップ表示
        for (let i = 0; i < state.bricks.length; i++) {
          const prevBrick = prevBricks[i];
          const currBrick = state.bricks[i];
          if (prevBrick && prevBrick.visible && !currBrick.visible) {
            // このブロックが今フレームで破壊された
            const brickCenterX = currBrick.x + currBrick.width / 2;
            const brickCenterY = currBrick.y + currBrick.height / 2;
            sparkle(brickCenterX, brickCenterY, 6);
            
            // スコア計算（コンボボーナス付き）
            const baseScore = 10 * currBrick.maxHp;
            const comboBonus = Math.floor(baseScore * state.comboCount * 0.5);
            const totalScore = baseScore + comboBonus;
            
            // コンボに応じてvariantを変える
            if (state.comboCount >= 5) {
              addPopup(`+${totalScore}`, brickCenterX, brickCenterY, "critical", "lg");
            } else if (state.comboCount >= 3) {
              addPopup(`+${totalScore}`, brickCenterX, brickCenterY, "combo", "md");
            } else {
              addPopup(`+${totalScore}`, brickCenterX, brickCenterY, "default", "sm");
            }
          }
        }
        playBrickHit();

        // コンボ更新
        setCombo(state.comboCount);

        // コンボエフェクト＆ポップアップ
        if (state.comboCount >= 3) {
          playCombo(state.comboCount);
          // コンボマイルストーンでポップアップ
          if (state.comboCount === 3 || state.comboCount === 5 || state.comboCount === 10 || state.comboCount % 10 === 0) {
            addPopup(`${state.comboCount} COMBO!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "combo", "lg");
          }
        }
      }

      // ドーパミンエフェクト: パワーアップ取得
      const currentPowerUpCount = state.powerUps.length;
      if (currentPowerUpCount < prevPowerUpCount && state.phase === "playing") {
        playPowerup();
        playBonus();
        confetti(20);
        // パワーアップ取得位置（パドル付近）
        addPopup("POWER UP!", state.paddle.x + state.paddle.width / 2, state.paddle.y - 20, "bonus", "md");
      }

      // ドーパミンエフェクト: ボールロスト
      if (state.lives < prevLives) {
        shakeRef.current?.shake("medium", 300);
        playGameOverSound();
        setCombo(0);
      }

      // ドーパミンエフェクト: ステージクリア
      if (state.phase === "cleared" && prevPhase === "playing") {
        confetti(60);
        addPopup(`STAGE ${state.stage} CLEAR!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80, "level", "xl");
      }

      // ハイスコア更新チェック
      if (state.highScore > lastHighScore) {
        addPopup("NEW HIGH SCORE!", CANVAS_WIDTH / 2, 100, "critical", "lg");
        lastHighScore = state.highScore;
      }

      // 状態を更新
      prevBrickCountRef.current = currentBrickCount;
      prevLivesRef.current = state.lives;
      prevPhaseRef.current = state.phase;
      prevPowerUpCountRef.current = currentPowerUpCount;
      prevBricksRef.current = state.bricks.map((b) => ({ ...b }));

      // 描画
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // ブロック
      for (const brick of state.bricks) {
        if (!brick.visible) continue;

        // 硬さに応じた明るさ調整
        const brightness = brick.hp < brick.maxHp ? 0.6 : 1;
        ctx.fillStyle = brick.color;
        ctx.globalAlpha = brightness;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        ctx.globalAlpha = 1;

        // 枠
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);

        // HP表示（2以上）
        if (brick.hp >= 2) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            String(brick.hp),
            brick.x + brick.width / 2,
            brick.y + brick.height / 2
          );
        }

        // パワーアップ表示
        if (brick.powerUp && brick.visible) {
          ctx.fillStyle = COLORS.powerUp[brick.powerUp];
          ctx.beginPath();
          ctx.arc(
            brick.x + brick.width / 2,
            brick.y + brick.height / 2,
            4,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      // パワーアップアイテム
      for (const p of state.powerUps) {
        ctx.fillStyle = COLORS.powerUp[p.type];
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
      }

      // レーザー
      for (const laser of state.lasers) {
        ctx.fillStyle = COLORS.laser;
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
      }

      // パドル
      ctx.fillStyle = state.paddle.isExpanded ? COLORS.paddleExpanded : COLORS.paddle;
      ctx.beginPath();
      ctx.roundRect(
        state.paddle.x,
        state.paddle.y,
        state.paddle.width,
        state.paddle.height,
        state.paddle.height / 2
      );
      ctx.fill();

      // レーザーモード表示
      if (state.laserActive) {
        ctx.fillStyle = COLORS.laser;
        ctx.beginPath();
        ctx.arc(
          state.paddle.x + state.paddle.width / 2,
          state.paddle.y + state.paddle.height / 2,
          4,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // ボール
      for (const ball of state.balls) {
        ctx.fillStyle = COLORS.ball;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      // UI
      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`STAGE ${state.stage}`, 15, 15);
      ctx.fillText(`SCORE: ${state.score}`, 15, 40);

      ctx.textAlign = "right";
      ctx.fillText(`HI: ${state.highScore}`, CANVAS_WIDTH - 15, 15);
      ctx.fillText("❤️".repeat(state.lives), CANVAS_WIDTH - 15, 40);

      // オーバーレイ
      if (state.phase === "start") {
        ctx.fillStyle = COLORS.overlay;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BRICK MANIA", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        ctx.font = "20px sans-serif";
        ctx.fillText(
          "マウスでパドル操作",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2
        );
        ctx.fillText(
          "クリックでレーザー発射",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 30
        );
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(
          "クリックでスタート",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 80
        );
      }

      if (state.phase === "cleared") {
        ctx.fillStyle = COLORS.overlay;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#ffd43b";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("STAGE CLEAR!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.fillStyle = COLORS.text;
        ctx.font = "24px sans-serif";
        ctx.fillText(`Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.font = "20px sans-serif";
        ctx.fillText(
          "クリックで次のステージへ",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 70
        );
      }

      if (state.phase === "gameover") {
        ctx.fillStyle = COLORS.overlay;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.fillStyle = COLORS.text;
        ctx.font = "24px sans-serif";
        ctx.fillText(`Final Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        ctx.fillText(`High Score: ${state.highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);
        ctx.font = "20px sans-serif";
        ctx.fillText(
          "クリックでリトライ",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 90
        );
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [sparkle, playBrickHit, playCombo, playPowerup, playBonus, confetti, playGameOverSound, addPopup]);

  return (
    <GameShell
      gameId="brickmania"
      layout="immersive"
    >
      <ScreenShake ref={shakeRef}>
        <div
          ref={containerRef}
          className="brickmania-container"
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
            className="brickmania-canvas"
          />
          <ParticleLayer particles={particles} />
          <ComboCounter combo={combo} position="top-right" threshold={3} style={{ top: 70 }} />
          {popups.map((popup) => (
            <ScorePopup
              key={popup.key}
              text={popup.text}
              popupKey={popup.key}
              x={popup.x}
              y={popup.y}
              variant={popup.variant}
              size={popup.size}
            />
          ))}
          {/* Game Over ShareButton */}
          {gameState.phase === "gameover" && (
            <div style={{ position: "absolute", bottom: 120, left: "50%", transform: "translateX(-50%)" }}>
              <ShareButton score={gameState.score} gameTitle="Brick Mania" gameId="brickmania" />
              <GameRecommendations currentGameId="brickmania" />
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
