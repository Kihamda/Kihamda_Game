import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, useHighScore, ShareButton, GameRecommendations } from "@shared";
import { ParticleLayer, ComboCounter, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const GRAVITY = 0.25;
const CANNON_X = 60;
const CANNON_Y = CANVAS_HEIGHT - 50;
const CANNON_LENGTH = 50;
const BALL_RADIUS = 8;
const TARGET_RADIUS = 20;
const MAX_POWER = 20;
const MIN_POWER = 5;
const POWER_STEP = 0.3;

type GamePhase = "aiming" | "firing" | "cleared" | "failed";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
}

interface Target {
  x: number;
  y: number;
  hit: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Stage {
  targets: Target[];
  obstacles: Obstacle[];
  maxShots: number;
}

// ステージデータ
const STAGES: Stage[] = [
  {
    targets: [{ x: 600, y: CANVAS_HEIGHT - 40, hit: false }],
    obstacles: [],
    maxShots: 3,
  },
  {
    targets: [{ x: 650, y: CANVAS_HEIGHT - 40, hit: false }],
    obstacles: [{ x: 350, y: CANVAS_HEIGHT - 120, width: 30, height: 120 }],
    maxShots: 3,
  },
  {
    targets: [
      { x: 550, y: CANVAS_HEIGHT - 40, hit: false },
      { x: 700, y: CANVAS_HEIGHT - 40, hit: false },
    ],
    obstacles: [{ x: 400, y: CANVAS_HEIGHT - 150, width: 30, height: 150 }],
    maxShots: 4,
  },
  {
    targets: [{ x: 700, y: CANVAS_HEIGHT - 150, hit: false }],
    obstacles: [
      { x: 300, y: CANVAS_HEIGHT - 100, width: 30, height: 100 },
      { x: 500, y: CANVAS_HEIGHT - 200, width: 150, height: 30 },
    ],
    maxShots: 4,
  },
  {
    targets: [
      { x: 500, y: CANVAS_HEIGHT - 40, hit: false },
      { x: 700, y: 150, hit: false },
    ],
    obstacles: [
      { x: 350, y: CANVAS_HEIGHT - 180, width: 30, height: 180 },
      { x: 550, y: 80, width: 200, height: 30 },
    ],
    maxShots: 5,
  },
  {
    targets: [
      { x: 450, y: CANVAS_HEIGHT - 40, hit: false },
      { x: 600, y: CANVAS_HEIGHT - 40, hit: false },
      { x: 750, y: CANVAS_HEIGHT - 40, hit: false },
    ],
    obstacles: [
      { x: 350, y: CANVAS_HEIGHT - 100, width: 20, height: 100 },
      { x: 520, y: CANVAS_HEIGHT - 130, width: 20, height: 130 },
      { x: 670, y: CANVAS_HEIGHT - 80, width: 20, height: 80 },
    ],
    maxShots: 5,
  },
];

interface GameState {
  stageIndex: number;
  angle: number;
  power: number;
  powerDir: number;
  shotsRemaining: number;
  targets: Target[];
  obstacles: Obstacle[];
  ball: Ball | null;
  phase: GamePhase;
  score: number;
}

function createStageState(stageIndex: number): Omit<GameState, "score"> {
  const stage = STAGES[stageIndex];
  return {
    stageIndex,
    angle: -Math.PI / 4,
    power: 10,
    powerDir: 1,
    shotsRemaining: stage.maxShots,
    targets: stage.targets.map((t) => ({ ...t, hit: false })),
    obstacles: [...stage.obstacles],
    ball: null,
    phase: "aiming",
  };
}

function createInitialState(): GameState {
  return {
    ...createStageState(0),
    score: 0,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [combo, setCombo] = useState(0);

  // ScorePopup state
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    x: string;
    y: string;
    variant: PopupVariant;
    size: "sm" | "md" | "lg" | "xl";
  } | null>(null);
  const popupKeyRef = useRef(0);

  const showPopup = useCallback(
    (
      text: string,
      x: number,
      y: number,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md"
    ) => {
      popupKeyRef.current += 1;
      setPopup({
        text,
        key: popupKeyRef.current,
        x: `${x}px`,
        y: `${y}px`,
        variant,
        size,
      });
      setTimeout(() => setPopup(null), 1500);
    },
    []
  );

  // High score tracking
  const { best: highScore, update: updateHighScore } = useHighScore("cannonblast");
  const hasShownHighScoreRef = useRef(false);

  // Dopamine hooks
  const { particles, confetti, sparkle, explosion } = useParticles();
  const { playTone } = useAudio();
  const playHit = useCallback(() => playTone(600, 0.1, 'sine'), [playTone]);
  const playMiss = useCallback(() => playTone(200, 0.2, 'sawtooth'), [playTone]);
  const playClear = useCallback(() => playTone(880, 0.3, 'sine'), [playTone]);
  const playHighScore = useCallback(() => playTone(1200, 0.4, 'sine'), [playTone]);

  const fire = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase !== "aiming" || state.shotsRemaining <= 0) return;

    const speed = state.power;
    state.ball = {
      x: CANNON_X + Math.cos(state.angle) * CANNON_LENGTH,
      y: CANNON_Y + Math.sin(state.angle) * CANNON_LENGTH,
      vx: Math.cos(state.angle) * speed,
      vy: Math.sin(state.angle) * speed,
      trail: [],
    };
    state.shotsRemaining--;
    state.phase = "firing";
    setGameState({ ...state });
  }, []);

  const nextStage = useCallback(() => {
    const state = gameStateRef.current;
    const nextIndex = state.stageIndex + 1;
    if (nextIndex >= STAGES.length) {
      // 全ステージクリア - リセット
      gameStateRef.current = createInitialState();
      hasShownHighScoreRef.current = false;
      setCombo(0);
    } else {
      const newStageState = createStageState(nextIndex);
      gameStateRef.current = {
        ...newStageState,
        score: state.score,
      };
    }
    setGameState({ ...gameStateRef.current });
  }, []);

  const retry = useCallback(() => {
    const state = gameStateRef.current;
    const newStageState = createStageState(state.stageIndex);
    gameStateRef.current = {
      ...newStageState,
      score: state.score,
    };
    setGameState({ ...gameStateRef.current });
  }, []);

  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    hasShownHighScoreRef.current = false;
    setCombo(0);
    setGameState({ ...gameStateRef.current });
  }, []);

  // キーボード入力
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;

      if (state.phase === "aiming") {
        if (e.key === "ArrowUp") {
          state.angle = Math.max(state.angle - 0.05, -Math.PI / 2);
        }
        if (e.key === "ArrowDown") {
          state.angle = Math.min(state.angle + 0.05, 0);
        }
        if (e.key === " " || e.key === "Enter") {
          fire();
        }
      } else if (state.phase === "cleared") {
        if (e.key === " " || e.key === "Enter") {
          nextStage();
        }
      } else if (state.phase === "failed") {
        if (e.key === " " || e.key === "Enter") {
          retry();
        }
        if (e.key === "r" || e.key === "R") {
          resetGame();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fire, nextStage, retry, resetGame]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;

      // パワーゲージの自動変動
      if (state.phase === "aiming") {
        state.power += state.powerDir * POWER_STEP;
        if (state.power >= MAX_POWER) {
          state.power = MAX_POWER;
          state.powerDir = -1;
        } else if (state.power <= MIN_POWER) {
          state.power = MIN_POWER;
          state.powerDir = 1;
        }
      }

      // 描画
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景グラデーション
      const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGradient.addColorStop(0, "#87ceeb");
      skyGradient.addColorStop(1, "#e0f4ff");
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 地面
      ctx.fillStyle = "#8b7355";
      ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
      ctx.fillStyle = "#6b8e23";
      ctx.fillRect(0, CANVAS_HEIGHT - 25, CANVAS_WIDTH, 5);

      // 障害物
      for (const obs of state.obstacles) {
        ctx.fillStyle = "#4a4a4a";
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // 枠線
        ctx.strokeStyle = "#2a2a2a";
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      }

      // ターゲット
      for (const target of state.targets) {
        if (target.hit) continue;
        ctx.save();
        ctx.translate(target.x, target.y);

        // 外側の円
        ctx.beginPath();
        ctx.arc(0, 0, TARGET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4444";
        ctx.fill();

        // 中間の円
        ctx.beginPath();
        ctx.arc(0, 0, TARGET_RADIUS * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

        // 中心の円
        ctx.beginPath();
        ctx.arc(0, 0, TARGET_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4444";
        ctx.fill();

        ctx.restore();
      }

      // 大砲台座
      ctx.fillStyle = "#5a4a3a";
      ctx.beginPath();
      ctx.arc(CANNON_X, CANNON_Y, 25, 0, Math.PI * 2);
      ctx.fill();

      // 大砲
      ctx.save();
      ctx.translate(CANNON_X, CANNON_Y);
      ctx.rotate(state.angle);
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(0, -10, CANNON_LENGTH, 20);
      // 砲口
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(CANNON_LENGTH - 5, -12, 8, 24);
      ctx.restore();

      // 照準線（エイミング時のみ）
      if (state.phase === "aiming") {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 100, 100, 0.5)";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(
          CANNON_X + Math.cos(state.angle) * CANNON_LENGTH,
          CANNON_Y + Math.sin(state.angle) * CANNON_LENGTH
        );
        ctx.lineTo(
          CANNON_X + Math.cos(state.angle) * (CANNON_LENGTH + 150),
          CANNON_Y + Math.sin(state.angle) * (CANNON_LENGTH + 150)
        );
        ctx.stroke();
        ctx.restore();
      }

      // 弾丸と軌跡
      if (state.ball) {
        // 軌跡
        if (state.ball.trail.length > 1) {
          ctx.save();
          ctx.strokeStyle = "rgba(255, 200, 100, 0.6)";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(state.ball.trail[0].x, state.ball.trail[0].y);
          for (let i = 1; i < state.ball.trail.length; i++) {
            ctx.lineTo(state.ball.trail[i].x, state.ball.trail[i].y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // 弾丸
        ctx.save();
        ctx.shadowColor = "#ff6600";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#ff8800";
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // UI: パワーゲージ
      ctx.fillStyle = "#333";
      ctx.fillRect(20, 20, 150, 20);
      const powerRatio = (state.power - MIN_POWER) / (MAX_POWER - MIN_POWER);
      const powerColor = `hsl(${(1 - powerRatio) * 60}, 100%, 50%)`;
      ctx.fillStyle = powerColor;
      ctx.fillRect(22, 22, 146 * powerRatio, 16);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 150, 20);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`パワー: ${Math.round(state.power)}`, 25, 35);

      // UI: 残り弾数
      ctx.fillStyle = "#333";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`残り: ${state.shotsRemaining}発`, CANVAS_WIDTH - 20, 35);

      // UI: ステージ番号
      ctx.textAlign = "center";
      ctx.fillText(
        `ステージ ${state.stageIndex + 1} / ${STAGES.length}`,
        CANVAS_WIDTH / 2,
        35
      );

      // UI: スコア
      ctx.textAlign = "left";
      ctx.fillText(`スコア: ${state.score}`, 200, 35);

      // 弾丸更新
      if (state.phase === "firing" && state.ball) {
        // 軌跡追加
        state.ball.trail.push({ x: state.ball.x, y: state.ball.y });
        if (state.ball.trail.length > 50) {
          state.ball.trail.shift();
        }

        // 物理更新
        state.ball.vy += GRAVITY;
        state.ball.x += state.ball.vx;
        state.ball.y += state.ball.vy;

        // 障害物との衝突
        for (const obs of state.obstacles) {
          if (
            state.ball.x + BALL_RADIUS > obs.x &&
            state.ball.x - BALL_RADIUS < obs.x + obs.width &&
            state.ball.y + BALL_RADIUS > obs.y &&
            state.ball.y - BALL_RADIUS < obs.y + obs.height
          ) {
            // 弾消滅
            state.ball = null;
            break;
          }
        }

        // ターゲットとの衝突
        if (state.ball) {
          for (const target of state.targets) {
            if (target.hit) continue;
            const dx = state.ball.x - target.x;
            const dy = state.ball.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < BALL_RADIUS + TARGET_RADIUS) {
              target.hit = true;
              const baseScore = 100;
              const shotsBonus = state.shotsRemaining * 20;
              const hitScore = baseScore + shotsBonus;
              state.score += hitScore;
              
              // Dopamine effects
              playHit();
              sparkle(target.x, target.y);
              
              // Perfect shot (center hit)
              const isPerfect = dist < TARGET_RADIUS * 0.4;
              if (isPerfect) {
                state.score += 50;
                showPopup("PERFECT! +150", target.x, target.y - 30, "critical", "lg");
              } else {
                showPopup(`+${hitScore}`, target.x, target.y - 30, "default", "md");
              }
              
              setCombo(c => {
                const newCombo = c + 1;
                // Show combo popup on combo >= 2
                if (newCombo >= 2) {
                  const comboBonus = newCombo * 25;
                  state.score += comboBonus;
                  setTimeout(() => {
                    showPopup(`${newCombo}x COMBO! +${comboBonus}`, target.x, target.y - 60, "combo", "lg");
                  }, 200);
                }
                return newCombo;
              });
              
              state.ball = null;
              break;
            }
          }
        }

        // 画面外判定
        if (state.ball) {
          if (
            state.ball.x < -50 ||
            state.ball.x > CANVAS_WIDTH + 50 ||
            state.ball.y > CANVAS_HEIGHT + 50
          ) {
            state.ball = null;
            playMiss();
          }
        }

        // 弾が消えたらフェーズ判定
        if (!state.ball) {
          const allHit = state.targets.every((t) => t.hit);
          if (allHit) {
            state.phase = "cleared";
            const clearBonus = 200;
            const shotsLeftBonus = state.shotsRemaining * 50;
            state.score += clearBonus + shotsLeftBonus;
            playClear();
            confetti();
            
            // Level completion popup
            const isLastStage = state.stageIndex + 1 >= STAGES.length;
            if (isLastStage) {
              showPopup(`全クリア! +${clearBonus + shotsLeftBonus}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100, "level", "xl");
            } else {
              showPopup(`ステージクリア! +${clearBonus + shotsLeftBonus}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100, "level", "lg");
            }
            
            // Check for high score
            if (state.score > highScore && !hasShownHighScoreRef.current) {
              hasShownHighScoreRef.current = true;
              updateHighScore(state.score);
              playHighScore();
              setTimeout(() => {
                showPopup("🏆 NEW HIGH SCORE! 🏆", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 150, "critical", "xl");
              }, 500);
            }
            
            setGameState({ ...state });
          } else if (state.shotsRemaining <= 0) {
            state.phase = "failed";
            explosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            setCombo(0); // Reset combo on failure
            setGameState({ ...state });
          } else {
            state.phase = "aiming";
          }
        }
      }

      // オーバーレイメッセージ
      if (state.phase === "cleared") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("ステージクリア！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "24px sans-serif";
        if (state.stageIndex + 1 >= STAGES.length) {
          ctx.fillText(
            `全ステージクリア！ 合計スコア: ${state.score}`,
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 + 20
          );
          ctx.font = "20px sans-serif";
          ctx.fillText(
            "クリックでリスタート",
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 + 70
          );
        } else {
          ctx.fillText(
            `スコア: ${state.score}`,
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 + 20
          );
          ctx.font = "20px sans-serif";
          ctx.fillText(
            "クリックで次のステージへ",
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 + 70
          );
        }
      }

      if (state.phase === "failed") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#f87171";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("失敗...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "20px sans-serif";
        ctx.fillText(
          "クリックでリトライ / Rでリスタート",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 30
        );
      }

      // 初期説明（ステージ1の最初のみ）
      if (
        state.phase === "aiming" &&
        state.stageIndex === 0 &&
        state.shotsRemaining === STAGES[0].maxShots
      ) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT - 100, 400, 80);
        ctx.fillStyle = "#fff";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          "↑↓キー: 角度調整 / スペース: 発射",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT - 70
        );
        ctx.fillText(
          "パワーゲージが変動中！タイミングを見計らって発射！",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT - 45
        );
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [confetti, explosion, highScore, playClear, playHighScore, playHit, playMiss, showPopup, sparkle, updateHighScore]);

  // クリックハンドラー
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "aiming") {
      fire();
    } else if (state.phase === "cleared") {
      nextStage();
    } else if (state.phase === "failed") {
      retry();
    }
  }, [fire, nextStage, retry]);

  return (
    <GameShell gameId="cannonblast" layout="immersive">
      <div
        ref={containerRef}
        className="cannonblast-container"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, position: 'relative' }}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="cannonblast-canvas"
        />
        <ParticleLayer particles={particles} />
        {combo >= 2 && <ComboCounter combo={combo} />}
        <ScorePopup
          text={popup?.text ?? null}
          popupKey={popup?.key}
          x={popup?.x}
          y={popup?.y}
          variant={popup?.variant}
          size={popup?.size}
        />
        {/* Game Over/Clear ShareButton */}
        {(gameState.phase === "cleared" || gameState.phase === "failed") && (
          <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)" }}>
            <ShareButton score={gameState.score} gameTitle="Cannon Blast" gameId="cannonblast" />
            <GameRecommendations currentGameId="cannonblast" />
          </div>
        )}
      </div>
    </GameShell>
  );
}