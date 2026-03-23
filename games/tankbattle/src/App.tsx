import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  ScreenShake,
} from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const TANK_SIZE = 32;
const TANK_SPEED = 3;
const BULLET_RADIUS = 4;
const BULLET_SPEED = 8;

const ENEMY_COUNT = 5;
const ENEMY_SPEED = 1.5;
const ENEMY_SHOOT_INTERVAL = 2000;

const PLAYER_MAX_HP = 3;

type GamePhase = "before" | "in_progress" | "after";
type Direction = "up" | "down" | "left" | "right";

interface Tank {
  x: number;
  y: number;
  direction: Direction;
  hp: number;
}

interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  isPlayer: boolean;
}

interface Enemy {
  x: number;
  y: number;
  direction: Direction;
  lastShootTime: number;
  hp: number;
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

// マズルフラッシュ
interface MuzzleFlash {
  x: number;
  y: number;
  startTime: number;
}

// スコアポップアップ
interface ScorePopupData {
  id: number;
  text: string;
  x: number;
  y: number;
  variant: PopupVariant;
}

interface GameState {
  player: Tank;
  enemies: Enemy[];
  bullets: Bullet[];
  walls: Wall[];
  score: number;
  phase: GamePhase;
  isWin: boolean;
  wave: number;
  muzzleFlashes: MuzzleFlash[];
}

// 壁の生成
function createWalls(): Wall[] {
  const walls: Wall[] = [];
  
  // 外周の壁
  walls.push({ x: 0, y: 0, width: CANVAS_WIDTH, height: 20 });
  walls.push({ x: 0, y: CANVAS_HEIGHT - 20, width: CANVAS_WIDTH, height: 20 });
  walls.push({ x: 0, y: 0, width: 20, height: CANVAS_HEIGHT });
  walls.push({ x: CANVAS_WIDTH - 20, y: 0, width: 20, height: CANVAS_HEIGHT });
  
  // 障害物
  walls.push({ x: 150, y: 150, width: 100, height: 20 });
  walls.push({ x: 550, y: 150, width: 100, height: 20 });
  walls.push({ x: 150, y: 430, width: 100, height: 20 });
  walls.push({ x: 550, y: 430, width: 100, height: 20 });
  walls.push({ x: 350, y: 250, width: 100, height: 100 });
  walls.push({ x: 200, y: 280, width: 20, height: 80 });
  walls.push({ x: 580, y: 280, width: 20, height: 80 });
  
  return walls;
}

// 敵の生成
function createEnemies(count: number, walls: Wall[]): Enemy[] {
  const enemies: Enemy[] = [];
  const directions: Direction[] = ["up", "down", "left", "right"];
  
  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;
    
    do {
      x = 100 + Math.random() * (CANVAS_WIDTH - 200);
      y = 50 + Math.random() * (CANVAS_HEIGHT / 2 - 100);
      attempts++;
    } while (isCollidingWithWalls(x, y, TANK_SIZE, TANK_SIZE, walls) && attempts < 50);
    
    enemies.push({
      x,
      y,
      direction: directions[Math.floor(Math.random() * 4)],
      lastShootTime: performance.now() + Math.random() * 1000,
      hp: 1,
    });
  }
  
  return enemies;
}

// 壁との衝突判定
function isCollidingWithWalls(x: number, y: number, w: number, h: number, walls: Wall[]): boolean {
  for (const wall of walls) {
    if (
      x < wall.x + wall.width &&
      x + w > wall.x &&
      y < wall.y + wall.height &&
      y + h > wall.y
    ) {
      return true;
    }
  }
  return false;
}

// 初期状態の生成
function createInitialState(): GameState {
  const walls = createWalls();
  return {
    player: {
      x: CANVAS_WIDTH / 2 - TANK_SIZE / 2,
      y: CANVAS_HEIGHT - 100,
      direction: "up",
      hp: PLAYER_MAX_HP,
    },
    enemies: createEnemies(ENEMY_COUNT, walls),
    bullets: [],
    walls,
    score: 0,
    phase: "before",
    isWin: false,
    wave: 1,
    muzzleFlashes: [],
  };
}

// 方向から移動ベクトルを取得
function getDirectionVector(direction: Direction): { dx: number; dy: number } {
  switch (direction) {
    case "up": return { dx: 0, dy: -1 };
    case "down": return { dx: 0, dy: 1 };
    case "left": return { dx: -1, dy: 0 };
    case "right": return { dx: 1, dy: 0 };
  }
}

// 戦車を描画
function drawTank(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: Direction,
  color: string,
  turretColor: string
) {
  ctx.save();
  ctx.translate(x + TANK_SIZE / 2, y + TANK_SIZE / 2);
  
  // 方向に応じて回転
  const angles = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
  ctx.rotate(angles[direction]);
  
  // 車体
  ctx.fillStyle = color;
  ctx.fillRect(-TANK_SIZE / 2 + 4, -TANK_SIZE / 2 + 4, TANK_SIZE - 8, TANK_SIZE - 8);
  
  // キャタピラ
  ctx.fillStyle = "#333";
  ctx.fillRect(-TANK_SIZE / 2, -TANK_SIZE / 2, 6, TANK_SIZE);
  ctx.fillRect(TANK_SIZE / 2 - 6, -TANK_SIZE / 2, 6, TANK_SIZE);
  
  // 砲塔
  ctx.fillStyle = turretColor;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // 砲身
  ctx.fillStyle = turretColor;
  ctx.fillRect(-3, -TANK_SIZE / 2 - 4, 6, TANK_SIZE / 2);
  
  ctx.restore();
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const [, setTick] = useState(0);
  const [redFlash, setRedFlash] = useState(false);
  const [scorePopups, setScorePopups] = useState<ScorePopupData[]>([]);
  const popupIdRef = useRef(0);

  // 共通フック
  const audio = useAudio();
  const { particles, explosion, confetti, burst, clear: clearParticles } = useParticles();

  // スコアポップアップ追加
  const addScorePopup = useCallback(
    (text: string, x: number, y: number, variant: PopupVariant = "default") => {
      const id = popupIdRef.current++;
      setScorePopups((prev) => [...prev, { id, text, x, y, variant }]);
      setTimeout(() => {
        setScorePopups((prev) => prev.filter((p) => p.id !== id));
      }, 1200);
    },
    []
  );

  // ゲーム開始
  const startGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    gameStateRef.current.phase = "in_progress";
    clearParticles();
    setScorePopups([]);
    audio.playClick();
    setTick((t) => t + 1);
  }, [clearParticles, audio]);

  // リセット
  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    clearParticles();
    setScorePopups([]);
    setTick((t) => t + 1);
  }, [clearParticles]);

  // 弾発射
  const fireBullet = useCallback((isPlayer: boolean, tank: Tank | Enemy) => {
    const state = gameStateRef.current;
    if (state.phase !== "in_progress") return;
    
    const { dx, dy } = getDirectionVector(tank.direction);
    const bulletX = tank.x + TANK_SIZE / 2;
    const bulletY = tank.y + TANK_SIZE / 2;
    
    state.bullets.push({
      x: bulletX + dx * (TANK_SIZE / 2 + 5),
      y: bulletY + dy * (TANK_SIZE / 2 + 5),
      dx: dx * BULLET_SPEED,
      dy: dy * BULLET_SPEED,
      isPlayer,
    });

    // マズルフラッシュ追加
    state.muzzleFlashes.push({
      x: bulletX + dx * (TANK_SIZE / 2 + 10),
      y: bulletY + dy * (TANK_SIZE / 2 + 10),
      startTime: performance.now(),
    });

    // 発射音
    if (isPlayer) {
      audio.playTone(200, 0.08, "square", 0.15);
      audio.playNoise(0.05, 0.2, 2000);
    }
  }, [audio]);

  // 敵撃破処理
  const onEnemyDestroyed = useCallback(
    (x: number, y: number, scoreGain: number) => {
      // 爆発パーティクル
      explosion(x + TANK_SIZE / 2, y + TANK_SIZE / 2, 20);
      // 爆発音
      audio.playExplosion();
      // スコアポップアップ
      addScorePopup(`+${scoreGain}`, x + TANK_SIZE / 2, y, "bonus");
      // 軽いシェイク
      shakeRef.current?.shake("light", 150);
    },
    [explosion, audio, addScorePopup]
  );

  // プレイヤー被弾処理
  const onPlayerDamaged = useCallback(() => {
    // 画面シェイク
    shakeRef.current?.shake("heavy", 300);
    // 赤フラッシュ
    setRedFlash(true);
    setTimeout(() => setRedFlash(false), 150);
    // ダメージ音
    audio.playMiss();
    // パーティクル
    const state = gameStateRef.current;
    burst(state.player.x + TANK_SIZE / 2, state.player.y + TANK_SIZE / 2, 8);
  }, [audio, burst]);

  // ウェーブクリア処理
  const onWaveClear = useCallback(
    (wave: number) => {
      // レベルアップ音
      audio.playLevelUp();
      // スコアポップアップ
      addScorePopup(`WAVE ${wave} CLEAR!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50, "level");
      addScorePopup("+500", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "bonus");
      // 紙吹雪
      confetti(30);
    },
    [audio, addScorePopup, confetti]
  );

  // 勝利処理 (10ウェーブクリア)
  const onVictory = useCallback(() => {
    audio.playCelebrate();
    confetti(80);
    setTimeout(() => confetti(60), 500);
    setTimeout(() => confetti(60), 1000);
  }, [audio, confetti]);

  // ゲームオーバー処理
  const onGameOver = useCallback(() => {
    audio.playGameOver();
    shakeRef.current?.shake("extreme", 500);
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
          fireBullet(true, state.player);
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

      // 描画クリア
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景（地面）
      ctx.fillStyle = "#4a5c4e";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // 地面のテクスチャ
      ctx.fillStyle = "#3d4f42";
      for (let i = 0; i < 100; i++) {
        const x = (i * 79 + 13) % CANVAS_WIDTH;
        const y = (i * 53 + 29) % CANVAS_HEIGHT;
        ctx.fillRect(x, y, 3, 3);
      }

      // 壁描画
      ctx.fillStyle = "#8b7355";
      for (const wall of state.walls) {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        // 壁の縁取り
        ctx.strokeStyle = "#5a4a3a";
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      }

      // プレイヤー描画
      drawTank(ctx, state.player.x, state.player.y, state.player.direction, "#4cc9f0", "#3498db");

      // 敵描画
      for (const enemy of state.enemies) {
        if (enemy.hp > 0) {
          drawTank(ctx, enemy.x, enemy.y, enemy.direction, "#e74c3c", "#c0392b");
        }
      }

      // 弾描画
      for (const bullet of state.bullets) {
        ctx.fillStyle = bullet.isPlayer ? "#ffff00" : "#ff6600";
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      // UI表示
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE: ${String(state.score).padStart(6, "0")}`, 30, 45);
      ctx.fillText(`WAVE: ${state.wave}`, 200, 45);
      
      // HP表示
      ctx.fillStyle = "#fff";
      ctx.fillText("HP:", 350, 45);
      for (let i = 0; i < PLAYER_MAX_HP; i++) {
        ctx.fillStyle = i < state.player.hp ? "#e74c3c" : "#666";
        ctx.fillRect(400 + i * 25, 30, 20, 20);
      }

      // ゲーム中の更新
      if (state.phase === "in_progress") {
        // プレイヤー移動
        let newX = state.player.x;
        let newY = state.player.y;
        
        if (keys.has("ArrowUp") || keys.has("KeyW")) {
          newY -= TANK_SPEED;
          state.player.direction = "up";
        }
        if (keys.has("ArrowDown") || keys.has("KeyS")) {
          newY += TANK_SPEED;
          state.player.direction = "down";
        }
        if (keys.has("ArrowLeft") || keys.has("KeyA")) {
          newX -= TANK_SPEED;
          state.player.direction = "left";
        }
        if (keys.has("ArrowRight") || keys.has("KeyD")) {
          newX += TANK_SPEED;
          state.player.direction = "right";
        }
        
        // 壁との衝突判定
        if (!isCollidingWithWalls(newX, state.player.y, TANK_SIZE, TANK_SIZE, state.walls)) {
          state.player.x = newX;
        }
        if (!isCollidingWithWalls(state.player.x, newY, TANK_SIZE, TANK_SIZE, state.walls)) {
          state.player.y = newY;
        }

        // 敵の更新
        for (const enemy of state.enemies) {
          if (enemy.hp <= 0) continue;
          
          // 敵のAI：ランダムに移動
          if (Math.random() < 0.02) {
            const directions: Direction[] = ["up", "down", "left", "right"];
            enemy.direction = directions[Math.floor(Math.random() * 4)];
          }
          
          const { dx, dy } = getDirectionVector(enemy.direction);
          const enemyNewX = enemy.x + dx * ENEMY_SPEED;
          const enemyNewY = enemy.y + dy * ENEMY_SPEED;
          
          if (!isCollidingWithWalls(enemyNewX, enemyNewY, TANK_SIZE, TANK_SIZE, state.walls)) {
            enemy.x = enemyNewX;
            enemy.y = enemyNewY;
          } else {
            // 壁にぶつかったら方向転換
            const directions: Direction[] = ["up", "down", "left", "right"];
            enemy.direction = directions[Math.floor(Math.random() * 4)];
          }
          
          // 敵の射撃
          if (currentTime - enemy.lastShootTime >= ENEMY_SHOOT_INTERVAL) {
            enemy.lastShootTime = currentTime;
            fireBullet(false, enemy);
          }
        }

        // 弾の更新
        state.bullets = state.bullets.filter((bullet) => {
          bullet.x += bullet.dx;
          bullet.y += bullet.dy;
          
          // 画面外チェック
          if (
            bullet.x < 0 ||
            bullet.x > CANVAS_WIDTH ||
            bullet.y < 0 ||
            bullet.y > CANVAS_HEIGHT
          ) {
            return false;
          }
          
          // 壁との衝突
          if (isCollidingWithWalls(bullet.x - BULLET_RADIUS, bullet.y - BULLET_RADIUS, BULLET_RADIUS * 2, BULLET_RADIUS * 2, state.walls)) {
            return false;
          }
          
          return true;
        });

        // 弾と戦車の衝突判定
        state.bullets = state.bullets.filter((bullet) => {
          // プレイヤーの弾と敵
          if (bullet.isPlayer) {
            for (const enemy of state.enemies) {
              if (enemy.hp <= 0) continue;
              
              if (
                bullet.x > enemy.x &&
                bullet.x < enemy.x + TANK_SIZE &&
                bullet.y > enemy.y &&
                bullet.y < enemy.y + TANK_SIZE
              ) {
                enemy.hp--;
                if (enemy.hp <= 0) {
                  state.score += 100;
                  onEnemyDestroyed(enemy.x, enemy.y, 100);
                } else {
                  // ヒット音
                  audio.playTone(300, 0.1, "square", 0.2);
                }
                return false;
              }
            }
          } else {
            // 敵の弾とプレイヤー
            if (
              bullet.x > state.player.x &&
              bullet.x < state.player.x + TANK_SIZE &&
              bullet.y > state.player.y &&
              bullet.y < state.player.y + TANK_SIZE
            ) {
              state.player.hp--;
              onPlayerDamaged();
              setTick((t) => t + 1);
              
              if (state.player.hp <= 0) {
                state.phase = "after";
                state.isWin = false;
                onGameOver();
              }
              return false;
            }
          }
          
          return true;
        });

        // 全敵撃破チェック
        const aliveEnemies = state.enemies.filter((e) => e.hp > 0);
        if (aliveEnemies.length === 0) {
          // 次のウェーブ
          const clearedWave = state.wave;
          state.wave++;
          state.enemies = createEnemies(ENEMY_COUNT + state.wave, state.walls);
          state.score += 500;
          onWaveClear(clearedWave);
          
          // 10ウェーブクリアで勝利
          if (state.wave > 10) {
            state.phase = "after";
            state.isWin = true;
            onVictory();
          }
          setTick((t) => t + 1);
        }

        // マズルフラッシュの更新（50ms で消える）
        state.muzzleFlashes = state.muzzleFlashes.filter(
          (flash) => currentTime - flash.startTime < 50
        );
      }

      // マズルフラッシュ描画
      for (const flash of state.muzzleFlashes) {
        const alpha = 1 - (currentTime - flash.startTime) / 50;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffff00";
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ゲーム開始前のメッセージ
      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#4cc9f0";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillText("TANK BATTLE", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
        ctx.fillStyle = "#fff";
        ctx.font = "18px monospace";
        ctx.fillText("WASD / 矢印キー で移動", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.fillText("SPACE / クリック で発射", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        ctx.fillText("敵タンクを全て撃破せよ！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.fillStyle = "#ff0";
        ctx.font = "bold 24px monospace";
        ctx.fillText("CLICK TO START", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      }

      // ゲーム終了メッセージ
      if (state.phase === "after") {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = state.isWin ? "#0f0" : "#f00";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          state.isWin ? "VICTORY!" : "GAME OVER",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 - 60
        );
        ctx.fillStyle = "#fff";
        ctx.font = "24px monospace";
        ctx.fillText(
          `SCORE: ${String(state.score).padStart(6, "0")}`,
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2
        );
        ctx.fillText(
          `WAVE: ${state.wave}`,
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 40
        );
        ctx.fillStyle = "#ff0";
        ctx.font = "20px monospace";
        ctx.fillText(
          "CLICK TO RESTART",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 100
        );
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [fireBullet, onEnemyDestroyed, onPlayerDamaged, onWaveClear, onVictory, onGameOver, audio]);

  // クリックイベント
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "before") {
      startGame();
    } else if (state.phase === "in_progress") {
      fireBullet(true, state.player);
    } else if (state.phase === "after") {
      resetGame();
    }
  }, [startGame, fireBullet, resetGame]);

  return (
    <GameShell gameId="tankbattle" layout="immersive">
      <ScreenShake ref={shakeRef} className="tankbattle-shake-wrapper">
        <div
          ref={containerRef}
          className="tankbattle-container"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onClick={handleClick}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="tankbattle-canvas"
          />
          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />
          {/* スコアポップアップ */}
          {scorePopups.map((popup) => (
            <ScorePopup
              key={popup.id}
              text={popup.text}
              popupKey={popup.id}
              x={`${popup.x}px`}
              y={`${popup.y}px`}
              variant={popup.variant}
              size="lg"
            />
          ))}
          {/* 赤フラッシュ */}
          {redFlash && <div className="tankbattle-red-flash" />}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
