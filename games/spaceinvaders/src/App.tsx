import { useRef, useEffect, useState, useCallback } from "react";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  ScreenShake,
  ComboCounter,
} from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 700;

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 30;
const PLAYER_Y = CANVAS_HEIGHT - 50;
const PLAYER_SPEED = 8;

const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 15;
const BULLET_SPEED = 10;

const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 30;
const ENEMY_ROWS = 5;
const ENEMY_COLS = 10;
const ENEMY_PADDING = 10;
const ENEMY_OFFSET_TOP = 60;
const ENEMY_OFFSET_LEFT =
  (CANVAS_WIDTH - (ENEMY_WIDTH + ENEMY_PADDING) * ENEMY_COLS + ENEMY_PADDING) /
  2;
const ENEMY_MOVE_INTERVAL = 500; // ms
const ENEMY_DROP_DISTANCE = 20;
const ENEMY_HORIZONTAL_SPEED = 15;

// ボス関連
const BOSS_INTERVAL = 15000; // 15秒ごとにボス出現
const BOSS_WIDTH = 80;
const BOSS_HEIGHT = 40;
const BOSS_SPEED = 3;
const BOSS_SCORE = 500;

const ENEMY_COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7"];
const ENEMY_SCORES = [50, 40, 30, 20, 10];

// コンボ維持時間
const COMBO_TIMEOUT = 1500;

type GamePhase = "before" | "in_progress" | "after";

interface Enemy {
  x: number;
  y: number;
  alive: boolean;
  row: number;
}

interface Boss {
  x: number;
  y: number;
  alive: boolean;
  direction: 1 | -1;
}

interface Bullet {
  x: number;
  y: number;
}

interface Explosion {
  x: number;
  y: number;
  time: number;
  isBoss: boolean;
}

interface GameState {
  playerX: number;
  bullets: Bullet[];
  enemies: Enemy[];
  boss: Boss | null;
  lastBossTime: number;
  explosions: Explosion[];
  score: number;
  phase: GamePhase;
  isWin: boolean;
  enemyDirection: 1 | -1;
  lastEnemyMoveTime: number;
  combo: number;
  lastHitTime: number;
  isHit: boolean; // 自機被弾フラグ
}

function createEnemies(): Enemy[] {
  const enemies: Enemy[] = [];
  for (let row = 0; row < ENEMY_ROWS; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      enemies.push({
        x: ENEMY_OFFSET_LEFT + col * (ENEMY_WIDTH + ENEMY_PADDING),
        y: ENEMY_OFFSET_TOP + row * (ENEMY_HEIGHT + ENEMY_PADDING),
        alive: true,
        row,
      });
    }
  }
  return enemies;
}

function createInitialState(): GameState {
  return {
    playerX: (CANVAS_WIDTH - PLAYER_WIDTH) / 2,
    bullets: [],
    enemies: createEnemies(),
    boss: null,
    lastBossTime: 0,
    explosions: [],
    score: 0,
    phase: "before",
    isWin: false,
    enemyDirection: 1,
    lastEnemyMoveTime: 0,
    combo: 0,
    lastHitTime: 0,
    isHit: false,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const [, setTick] = useState(0);
  const [combo, setCombo] = useState(0);
  const [scorePopup, setScorePopup] = useState<{
    text: string;
    key: number;
    x: string;
    y: string;
    variant: PopupVariant;
  } | null>(null);
  const [flash, setFlash] = useState(false);

  // 共通フック
  const audio = useAudio();
  const { particles, explosion: triggerExplosion, burst, sparkle } = useParticles();

  // スコアポップアップ表示
  const showScorePopup = useCallback(
    (score: number, x: number, y: number, variant: PopupVariant = "default") => {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      const pxX = `${((x / CANVAS_WIDTH) * rect.width)}px`;
      const pxY = `${((y / CANVAS_HEIGHT) * rect.height)}px`;
      setScorePopup({
        text: `+${score}`,
        key: Date.now(),
        x: pxX,
        y: pxY,
        variant,
      });
    },
    []
  );

  // ゲーム開始
  const startGame = useCallback(() => {
    const now = performance.now();
    gameStateRef.current.phase = "in_progress";
    gameStateRef.current.lastEnemyMoveTime = now;
    gameStateRef.current.lastBossTime = now;
    setTick((t) => t + 1);
  }, []);

  // リセット
  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    setCombo(0);
    setTick((t) => t + 1);
  }, []);

  // 弾発射
  const fireBullet = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase !== "in_progress") return;

    // 発射数制限（最大3発）
    if (state.bullets.length >= 3) return;

    state.bullets.push({
      x: state.playerX + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
      y: PLAYER_Y - BULLET_HEIGHT,
    });

    // 発射音
    audio.playTone(800, 0.05, "square", 0.15);
  }, [audio]);

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);

      if (e.code === "Space") {
        e.preventDefault();
        const state = gameStateRef.current;
        if (state.phase === "before") {
          startGame();
        } else if (state.phase === "in_progress") {
          fireBullet();
        } else if (state.phase === "after") {
          resetGame();
        }
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
  }, [startGame, fireBullet, resetGame]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = (currentTime: number) => {
      const state = gameStateRef.current;
      const keys = keysRef.current;

      // コンボ維持タイムアウトチェック
      if (
        state.phase === "in_progress" &&
        state.combo > 0 &&
        currentTime - state.lastHitTime > COMBO_TIMEOUT
      ) {
        state.combo = 0;
        setCombo(0);
      }

      // 描画クリア
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 星を描画（背景装飾）
      ctx.fillStyle = "#444";
      for (let i = 0; i < 50; i++) {
        const x = (i * 97 + 13) % CANVAS_WIDTH;
        const y = (i * 73 + 29) % CANVAS_HEIGHT;
        ctx.fillRect(x, y, 2, 2);
      }

      // 爆発エフェクト描画（キャンバス上）
      state.explosions = state.explosions.filter((exp) => {
        const elapsed = currentTime - exp.time;
        const duration = exp.isBoss ? 600 : 300;
        if (elapsed > duration) return false;

        const progress = elapsed / duration;
        const radius = exp.isBoss
          ? 20 + progress * 60
          : 10 + progress * 30;
        const alpha = 1 - progress;

        // 複数の円を描画して爆発感を出す
        const colors = exp.isBoss
          ? ["#ff0", "#f80", "#f00"]
          : ["#ff6b6b", "#ffa94d", "#fff"];
        colors.forEach((color, i) => {
          ctx.beginPath();
          ctx.arc(
            exp.x,
            exp.y,
            radius * (1 - i * 0.2),
            0,
            Math.PI * 2
          );
          ctx.fillStyle =
            color +
            Math.floor(alpha * 255 * (1 - i * 0.3))
              .toString(16)
              .padStart(2, "0");
          ctx.fill();
        });

        return true;
      });

      // プレイヤー描画（被弾時は点滅）
      const showPlayer = !state.isHit || Math.floor(currentTime / 100) % 2 === 0;
      if (showPlayer) {
        ctx.fillStyle = state.isHit ? "#f00" : "#4cc9f0";
        ctx.beginPath();
        ctx.moveTo(state.playerX + PLAYER_WIDTH / 2, PLAYER_Y - 10);
        ctx.lineTo(state.playerX, PLAYER_Y + PLAYER_HEIGHT);
        ctx.lineTo(state.playerX + PLAYER_WIDTH, PLAYER_Y + PLAYER_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }

      // 弾描画
      ctx.fillStyle = "#fff";
      for (const bullet of state.bullets) {
        ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
      }

      // 敵描画
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        ctx.fillStyle = ENEMY_COLORS[enemy.row % ENEMY_COLORS.length];

        // シンプルなインベーダー風デザイン
        ctx.fillRect(enemy.x + 5, enemy.y, ENEMY_WIDTH - 10, ENEMY_HEIGHT - 5);
        ctx.fillRect(enemy.x, enemy.y + 5, ENEMY_WIDTH, ENEMY_HEIGHT - 10);
        ctx.fillRect(enemy.x + 5, enemy.y + ENEMY_HEIGHT - 10, 8, 10);
        ctx.fillRect(
          enemy.x + ENEMY_WIDTH - 13,
          enemy.y + ENEMY_HEIGHT - 10,
          8,
          10
        );
      }

      // ボス描画
      if (state.boss && state.boss.alive) {
        const boss = state.boss;
        ctx.fillStyle = "#f0f";
        // ボスの本体
        ctx.fillRect(boss.x, boss.y + 10, BOSS_WIDTH, BOSS_HEIGHT - 20);
        ctx.fillRect(boss.x + 10, boss.y, BOSS_WIDTH - 20, BOSS_HEIGHT);
        // ボスの装飾
        ctx.fillStyle = "#ff0";
        ctx.fillRect(boss.x + 20, boss.y + 12, 10, 10);
        ctx.fillRect(boss.x + BOSS_WIDTH - 30, boss.y + 12, 10, 10);
      }

      // スコア表示
      ctx.fillStyle = "#fff";
      ctx.font = "20px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE: ${String(state.score).padStart(6, "0")}`, 20, 35);

      // ゲーム中の更新
      if (state.phase === "in_progress") {
        // プレイヤー移動（キーボード）
        if (keys.has("ArrowLeft") || keys.has("KeyA")) {
          state.playerX = Math.max(0, state.playerX - PLAYER_SPEED);
        }
        if (keys.has("ArrowRight") || keys.has("KeyD")) {
          state.playerX = Math.min(
            CANVAS_WIDTH - PLAYER_WIDTH,
            state.playerX + PLAYER_SPEED
          );
        }

        // 弾移動
        state.bullets = state.bullets.filter((bullet) => {
          bullet.y -= BULLET_SPEED;
          return bullet.y > -BULLET_HEIGHT;
        });

        // ボス出現ロジック
        if (
          !state.boss &&
          currentTime - state.lastBossTime >= BOSS_INTERVAL
        ) {
          state.boss = {
            x: -BOSS_WIDTH,
            y: 25,
            alive: true,
            direction: 1,
          };
          state.lastBossTime = currentTime;
          // ボス出現時の画面フラッシュ
          setFlash(true);
          setTimeout(() => setFlash(false), 150);
          audio.playWarning();
        }

        // ボス移動
        if (state.boss && state.boss.alive) {
          state.boss.x += BOSS_SPEED * state.boss.direction;
          // 画面外に出たら消す（タイマーもリセット）
          if (
            state.boss.x > CANVAS_WIDTH ||
            state.boss.x + BOSS_WIDTH < 0
          ) {
            state.boss = null;
            state.lastBossTime = currentTime; // Reset timer to prevent immediate respawn
          }
        }

        // 敵移動
        if (currentTime - state.lastEnemyMoveTime >= ENEMY_MOVE_INTERVAL) {
          state.lastEnemyMoveTime = currentTime;

          // 端に達したかチェック
          const aliveEnemies = state.enemies.filter((e) => e.alive);
          let shouldDrop = false;

          for (const enemy of aliveEnemies) {
            const nextX =
              enemy.x + ENEMY_HORIZONTAL_SPEED * state.enemyDirection;
            if (nextX <= 0 || nextX + ENEMY_WIDTH >= CANVAS_WIDTH) {
              shouldDrop = true;
              break;
            }
          }

          if (shouldDrop) {
            // 下に移動して方向転換
            for (const enemy of aliveEnemies) {
              enemy.y += ENEMY_DROP_DISTANCE;
            }
            state.enemyDirection = (state.enemyDirection * -1) as 1 | -1;
          } else {
            // 横に移動
            for (const enemy of aliveEnemies) {
              enemy.x += ENEMY_HORIZONTAL_SPEED * state.enemyDirection;
            }
          }
        }

        // 弾と敵の衝突判定
        for (const bullet of state.bullets) {
          let bulletHit = false;
          
          // 通常敵との衝突
          for (const enemy of state.enemies) {
            if (!enemy.alive || bulletHit) continue;

            if (
              bullet.x < enemy.x + ENEMY_WIDTH &&
              bullet.x + BULLET_WIDTH > enemy.x &&
              bullet.y < enemy.y + ENEMY_HEIGHT &&
              bullet.y + BULLET_HEIGHT > enemy.y
            ) {
              enemy.alive = false;
              bullet.y = -999; // 弾を消す
              bulletHit = true;

              const baseScore = ENEMY_SCORES[enemy.row % ENEMY_SCORES.length];
              const newCombo = state.combo + 1;
              state.combo = newCombo;
              state.lastHitTime = currentTime;
              setCombo(newCombo);

              // コンボボーナス計算
              const comboMultiplier = 1 + Math.floor(newCombo / 5) * 0.5;
              const earnedScore = Math.floor(baseScore * comboMultiplier);
              state.score += earnedScore;

              // 爆発エフェクト（キャンバス）
              state.explosions.push({
                x: enemy.x + ENEMY_WIDTH / 2,
                y: enemy.y + ENEMY_HEIGHT / 2,
                time: currentTime,
                isBoss: false,
              });

              // パーティクル（HTML）
              const containerEl = containerRef.current;
              if (containerEl) {
                const rect = containerEl.getBoundingClientRect();
                const px =
                  ((enemy.x + ENEMY_WIDTH / 2) / CANVAS_WIDTH) *
                  rect.width;
                const py =
                  ((enemy.y + ENEMY_HEIGHT / 2) / CANVAS_HEIGHT) *
                  rect.height;
                burst(px, py, 8);
              }

              // スコアポップアップ
              const variant: PopupVariant =
                newCombo >= 10
                  ? "critical"
                  : newCombo >= 5
                    ? "combo"
                    : "default";
              showScorePopup(
                earnedScore,
                enemy.x + ENEMY_WIDTH / 2,
                enemy.y,
                variant
              );

              // 効果音
              if (newCombo >= 5) {
                audio.playCombo(newCombo);
              } else {
                audio.playSuccess();
              }
              
              break; // Exit inner loop - one bullet can only hit one enemy
            }
          }

          // ボスとの衝突 (skip if bullet already hit something)
          if (!bulletHit && state.boss && state.boss.alive) {
            const boss = state.boss;
            if (
              bullet.x < boss.x + BOSS_WIDTH &&
              bullet.x + BULLET_WIDTH > boss.x &&
              bullet.y < boss.y + BOSS_HEIGHT &&
              bullet.y + BULLET_HEIGHT > boss.y
            ) {
              state.boss.alive = false;
              bullet.y = -999;
              state.score += BOSS_SCORE;

              // ボス爆発
              state.explosions.push({
                x: boss.x + BOSS_WIDTH / 2,
                y: boss.y + BOSS_HEIGHT / 2,
                time: currentTime,
                isBoss: true,
              });

              // パーティクル（大きな爆発）
              const containerEl = containerRef.current;
              if (containerEl) {
                const rect = containerEl.getBoundingClientRect();
                const px =
                  ((boss.x + BOSS_WIDTH / 2) / CANVAS_WIDTH) *
                  rect.width;
                const py =
                  ((boss.y + BOSS_HEIGHT / 2) / CANVAS_HEIGHT) *
                  rect.height;
                triggerExplosion(px, py, 30);
                sparkle(px, py, 16);
              }

              // スコアポップアップ
              showScorePopup(
                BOSS_SCORE,
                boss.x + BOSS_WIDTH / 2,
                boss.y,
                "bonus"
              );

              // 画面シェイク
              shakeRef.current?.shake("heavy", 400);

              // 効果音
              audio.playExplosion();
              audio.playBonus();

              // ボスを消す
              setTimeout(() => {
                if (gameStateRef.current.boss?.alive === false) {
                  gameStateRef.current.boss = null;
                }
              }, 100);
            }
          }
        }

        // 画面外の弾を削除
        state.bullets = state.bullets.filter((b) => b.y > -BULLET_HEIGHT);

        // 敵が下端に到達したかチェック
        const aliveEnemies = state.enemies.filter((e) => e.alive);
        for (const enemy of aliveEnemies) {
          if (enemy.y + ENEMY_HEIGHT >= PLAYER_Y) {
            state.phase = "after";
            state.isWin = false;
            state.isHit = true;

            // 被弾演出
            shakeRef.current?.shake("extreme", 500);
            audio.playGameOver();

            setTick((t) => t + 1);
            break;
          }
        }

        // 全敵撃破チェック
        if (aliveEnemies.length === 0) {
          state.phase = "after";
          state.isWin = true;

          // 勝利演出
          audio.playLevelUp();
          const containerEl = containerRef.current;
          if (containerEl) {
            const rect = containerEl.getBoundingClientRect();
            triggerExplosion(rect.width / 2, rect.height / 2, 40);
          }

          setTick((t) => t + 1);
        }
      }

      // ゲーム開始前のメッセージ
      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#0f0";
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          "SPACE INVADERS",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 - 60
        );
        ctx.fillStyle = "#fff";
        ctx.font = "18px monospace";
        ctx.fillText(
          "← → または A D キーで移動",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2
        );
        ctx.fillText(
          "SPACE / クリックで発射",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 30
        );
        ctx.fillStyle = "#ff0";
        ctx.font = "bold 24px monospace";
        ctx.fillText(
          "CLICK TO START",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 80
        );
      }

      // ゲーム終了メッセージ
      if (state.phase === "after") {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = state.isWin ? "#0f0" : "#f00";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          state.isWin ? "YOU WIN!" : "GAME OVER",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 - 40
        );
        ctx.fillStyle = "#fff";
        ctx.font = "24px monospace";
        ctx.fillText(
          `SCORE: ${String(state.score).padStart(6, "0")}`,
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 20
        );
        ctx.fillStyle = "#ff0";
        ctx.font = "20px monospace";
        ctx.fillText(
          "CLICK TO RESTART",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 70
        );
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audio, burst, sparkle, triggerExplosion, showScorePopup]);

  // クリックイベント
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "before") {
      startGame();
    } else if (state.phase === "in_progress") {
      fireBullet();
    } else if (state.phase === "after") {
      resetGame();
    }
  }, [startGame, fireBullet, resetGame]);

  // タッチ移動
  const handlePointerMove = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const state = gameStateRef.current;
    if (state.phase !== "in_progress") return;

    const rect = container.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const relativeX = (clientX - rect.left) * scaleX;
    const playerX = Math.max(
      0,
      Math.min(CANVAS_WIDTH - PLAYER_WIDTH, relativeX - PLAYER_WIDTH / 2)
    );

    state.playerX = playerX;
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

  return (
    <GameShell gameId="spaceinvaders" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div
          ref={containerRef}
          className="spaceinvaders-container"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          {/* フラッシュエフェクト */}
          {flash && <div className="spaceinvaders-flash" />}

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="spaceinvaders-canvas"
          />

          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />

          {/* スコアポップアップ */}
          {scorePopup && (
            <ScorePopup
              key={scorePopup.key}
              text={scorePopup.text}
              x={scorePopup.x}
              y={scorePopup.y}
              variant={scorePopup.variant}
            />
          )}

          {/* コンボカウンター */}
          {combo > 0 && (
            <ComboCounter combo={combo} className="spaceinvaders-combo" />
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
