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

// ============================================================
// 定数
// ============================================================
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 700;
const CELL_SIZE = 28;
const COLS = 21;
const ROWS = 23;
const MAZE_OFFSET_X = (CANVAS_WIDTH - COLS * CELL_SIZE) / 2;
const MAZE_OFFSET_Y = 56;

const PLAYER_SPEED = 3;
const GHOST_SPEED = 2;
const GHOST_SCARED_SPEED = 1.5;
const POWER_DURATION = 8000;
const GHOST_RESPAWN_TIME = 3000;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT" | "NONE";
type GamePhase = "ready" | "playing" | "gameover" | "cleared";

interface Point {
  x: number;
  y: number;
}

interface Entity extends Point {
  direction: Direction;
  nextDirection: Direction;
}

interface Ghost extends Entity {
  color: string;
  isScared: boolean;
  isEaten: boolean;
  respawnTimer: number;
}

// 迷路データ: 1=壁, 0=通路+ドット, 2=パワーペレット, 3=ゴーストホーム, 4=空(ドットなし)
const MAZE_DATA: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,2,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,2,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,1],
  [4,4,4,1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,4,4,4],
  [1,1,1,1,0,1,0,1,1,3,3,3,1,1,0,1,0,1,1,1,1],
  [4,4,4,4,0,0,0,1,3,3,3,3,3,1,0,0,0,4,4,4,4],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [4,4,4,1,0,1,0,0,0,0,4,0,0,0,0,1,0,1,4,4,4],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,0,1],
  [1,2,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const GHOST_COLORS = ["#ff0000", "#00ffff", "#ffb8ff", "#ffb852"];
const GHOST_START_POSITIONS = [
  { x: 10, y: 9 },
  { x: 9, y: 9 },
  { x: 11, y: 9 },
  { x: 10, y: 10 },
];

function canMove(maze: number[][], x: number, y: number): boolean {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  const cell = maze[y]?.[x];
  return cell !== 1;
}

function getDirectionDelta(dir: Direction): Point {
  switch (dir) {
    case "UP": return { x: 0, y: -1 };
    case "DOWN": return { x: 0, y: 1 };
    case "LEFT": return { x: -1, y: 0 };
    case "RIGHT": return { x: 1, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

function isAtCellCenter(pos: number): boolean {
  const offset = pos % CELL_SIZE;
  return offset < PLAYER_SPEED || offset > CELL_SIZE - PLAYER_SPEED;
}

function snapToGrid(pos: number): number {
  return Math.round(pos / CELL_SIZE) * CELL_SIZE;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  
  // ドーパミン演出フック
  const { playTone, playSweep, playArpeggio, playNoise, playCelebrate } = useAudio();
  const { particles, sparkle, confetti, explosion } = useParticles();
  
  // スコアポップアップ状態
  const [popup, setPopup] = useState<{
    text: string | null;
    key: number;
    x: string;
    y: string;
    variant: PopupVariant;
  }>({ text: null, key: 0, x: "50%", y: "50%", variant: "default" });
  
  // 画面フラッシュ状態
  const [flash, setFlash] = useState<string | null>(null);
  
  const gameStateRef = useRef({
    player: { x: 10 * CELL_SIZE, y: 15 * CELL_SIZE, direction: "NONE" as Direction, nextDirection: "NONE" as Direction },
    ghosts: [] as Ghost[],
    maze: MAZE_DATA.map(row => [...row]),
    dots: 0,
    totalDots: 0,
    score: 0,
    lives: 3,
    powerTimer: 0,
    ghostsEatenCombo: 0,
  });

  const [phase, setPhase] = useState<GamePhase>("ready");
  const [score, setScore] = useState(0);
  const [, setLives] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("dotmuncher_highscore");
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // === 効果音プリセット ===
  const playEatSound = useCallback(() => {
    playTone(880, 0.04, "sine", 0.15);
  }, [playTone]);
  
  const playPowerSound = useCallback(() => {
    playSweep(220, 880, 0.3, "square", 0.2);
    playArpeggio([523, 659, 784, 1047], 0.1, "sine", 0.18, 0.05);
  }, [playSweep, playArpeggio]);
  
  const playGhostEatSound = useCallback(() => {
    playTone(330, 0.1, "square", 0.2);
    playTone(440, 0.12, "sine", 0.22, 0.08);
    playTone(660, 0.15, "triangle", 0.2, 0.16);
  }, [playTone]);
  
  const playDieSound = useCallback(() => {
    playSweep(400, 80, 0.4, "sawtooth", 0.25);
    playNoise(0.2, 0.2, 600);
  }, [playSweep, playNoise]);
  
  const playClearSound = useCallback(() => {
    playCelebrate();
  }, [playCelebrate]);
  
  // 画面フラッシュを発動
  const triggerFlash = useCallback((color: string, duration = 150) => {
    setFlash(color);
    setTimeout(() => setFlash(null), duration);
  }, []);
  
  // スコアポップアップを発動
  const showPopup = useCallback((text: string, x: number, y: number, variant: PopupVariant = "default") => {
    setPopup({
      text,
      key: Date.now(),
      x: `${x}px`,
      y: `${y}px`,
      variant,
    });
  }, []);
  
  // useEffect内で使えるようにrefに最新のコールバックを保持
  const effectCallbacksRef = useRef({
    playEatSound,
    playPowerSound,
    playGhostEatSound,
    triggerFlash,
    sparkle,
    explosion,
    showPopup,
  });
  useEffect(() => {
    effectCallbacksRef.current = {
      playEatSound,
      playPowerSound,
      playGhostEatSound,
      triggerFlash,
      sparkle,
      explosion,
      showPopup,
    };
  }, [playEatSound, playPowerSound, playGhostEatSound, triggerFlash, sparkle, explosion, showPopup]);

  const initGame = useCallback(() => {
    const state = gameStateRef.current;
    state.maze = MAZE_DATA.map(row => [...row]);
    state.player = { x: 10 * CELL_SIZE, y: 15 * CELL_SIZE, direction: "NONE", nextDirection: "NONE" };
    state.ghosts = GHOST_START_POSITIONS.map((pos, i) => ({
      x: pos.x * CELL_SIZE,
      y: pos.y * CELL_SIZE,
      direction: "UP" as Direction,
      nextDirection: "UP" as Direction,
      color: GHOST_COLORS[i],
      isScared: false,
      isEaten: false,
      respawnTimer: 0,
    }));
    
    let dotCount = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (state.maze[y][x] === 0 || state.maze[y][x] === 2) {
          dotCount++;
        }
      }
    }
    state.totalDots = dotCount;
    state.dots = 0;
    state.score = 0;
    state.lives = 3;
    state.powerTimer = 0;
    state.ghostsEatenCombo = 0;
    setScore(0);
    setLives(3);
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setPhase("playing");
  }, [initGame]);

  const resetPositions = useCallback(() => {
    const state = gameStateRef.current;
    state.player = { x: 10 * CELL_SIZE, y: 15 * CELL_SIZE, direction: "NONE", nextDirection: "NONE" };
    state.ghosts = GHOST_START_POSITIONS.map((pos, i) => ({
      x: pos.x * CELL_SIZE,
      y: pos.y * CELL_SIZE,
      direction: "UP" as Direction,
      nextDirection: "UP" as Direction,
      color: GHOST_COLORS[i],
      isScared: false,
      isEaten: false,
      respawnTimer: 0,
    }));
    state.powerTimer = 0;
    state.ghostsEatenCombo = 0;
  }, []);

  const loseLife = useCallback(() => {
    const state = gameStateRef.current;
    state.lives--;
    setLives(state.lives);
    
    // 死亡演出
    playDieSound();
    shakeRef.current?.shake("heavy", 400);
    triggerFlash("rgba(255, 0, 0, 0.4)", 200);
    
    if (state.lives <= 0) {
      if (state.score > highScore) {
        setHighScore(state.score);
        localStorage.setItem("dotmuncher_highscore", String(state.score));
      }
      setPhase("gameover");
    } else {
      resetPositions();
    }
  }, [highScore, resetPositions, playDieSound, triggerFlash]);

  const winGame = useCallback(() => {
    const state = gameStateRef.current;
    if (state.score > highScore) {
      setHighScore(state.score);
      localStorage.setItem("dotmuncher_highscore", String(state.score));
    }
    // クリア演出
    playClearSound();
    confetti(60);
    triggerFlash("rgba(255, 255, 0, 0.3)", 300);
    setPhase("cleared");
  }, [highScore, playClearSound, confetti, triggerFlash]);

  // キー入力ハンドリング
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "ready" || phase === "gameover" || phase === "cleared") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          startGame();
        }
        return;
      }

      const state = gameStateRef.current;
      const keyMap: Record<string, Direction> = {
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",
        w: "UP",
        s: "DOWN",
        a: "LEFT",
        d: "RIGHT",
      };

      const newDir = keyMap[e.key];
      if (newDir) {
        e.preventDefault();
        state.player.nextDirection = newDir;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, startGame]);

  // ゲームループ
  useEffect(() => {
    if (phase !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let lastTime = 0;

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      const state = gameStateRef.current;

      // パワーペレットタイマー更新
      if (state.powerTimer > 0) {
        state.powerTimer -= deltaTime;
        if (state.powerTimer <= 0) {
          state.powerTimer = 0;
          state.ghostsEatenCombo = 0;
          state.ghosts.forEach(g => { g.isScared = false; });
        }
      }

      // プレイヤー移動
      const player = state.player;
      const pCellX = Math.round(player.x / CELL_SIZE);
      const pCellY = Math.round(player.y / CELL_SIZE);

      // 方向転換のチェック
      if (player.nextDirection !== "NONE" && player.nextDirection !== player.direction) {
        const nextDelta = getDirectionDelta(player.nextDirection);
        const nextCellX = pCellX + nextDelta.x;
        const nextCellY = pCellY + nextDelta.y;
        
        if (canMove(state.maze, nextCellX, nextCellY)) {
          if (isAtCellCenter(player.x) && isAtCellCenter(player.y)) {
            player.x = snapToGrid(player.x);
            player.y = snapToGrid(player.y);
            player.direction = player.nextDirection;
          }
        }
      }

      // 移動実行
      if (player.direction !== "NONE") {
        const delta = getDirectionDelta(player.direction);
        const nextX = player.x + delta.x * PLAYER_SPEED;
        const nextY = player.y + delta.y * PLAYER_SPEED;
        const nextCellX = Math.round(nextX / CELL_SIZE);
        const nextCellY = Math.round(nextY / CELL_SIZE);

        // ワープトンネル
        if (nextCellX < 0) {
          player.x = (COLS - 1) * CELL_SIZE;
        } else if (nextCellX >= COLS) {
          player.x = 0;
        } else if (canMove(state.maze, nextCellX, nextCellY)) {
          player.x = nextX;
          player.y = nextY;
        } else {
          player.x = snapToGrid(player.x);
          player.y = snapToGrid(player.y);
          player.direction = "NONE";
        }
      }

      // ドット収集
      const collectCellX = Math.round(player.x / CELL_SIZE);
      const collectCellY = Math.round(player.y / CELL_SIZE);
      if (collectCellX >= 0 && collectCellX < COLS && collectCellY >= 0 && collectCellY < ROWS) {
        const cell = state.maze[collectCellY]?.[collectCellX];
        const cb = effectCallbacksRef.current;
        if (cell === 0) {
          state.maze[collectCellY][collectCellX] = 4;
          state.dots++;
          state.score += 10;
          setScore(state.score);
          // ドット食べ演出
          cb.playEatSound();
          const sparkleX = MAZE_OFFSET_X + collectCellX * CELL_SIZE + CELL_SIZE / 2;
          const sparkleY = MAZE_OFFSET_Y + collectCellY * CELL_SIZE + CELL_SIZE / 2;
          cb.sparkle(sparkleX, sparkleY, 4);
        } else if (cell === 2) {
          state.maze[collectCellY][collectCellX] = 4;
          state.dots++;
          state.score += 50;
          setScore(state.score);
          state.powerTimer = POWER_DURATION;
          state.ghostsEatenCombo = 0;
          state.ghosts.forEach(g => {
            if (!g.isEaten) g.isScared = true;
          });
          // パワーペレット演出
          cb.playPowerSound();
          cb.triggerFlash("rgba(0, 100, 255, 0.35)", 200);
          const sparkleX = MAZE_OFFSET_X + collectCellX * CELL_SIZE + CELL_SIZE / 2;
          const sparkleY = MAZE_OFFSET_Y + collectCellY * CELL_SIZE + CELL_SIZE / 2;
          cb.sparkle(sparkleX, sparkleY, 12);
        }
      }

      // クリア判定
      if (state.dots >= state.totalDots) {
        winGame();
        return;
      }

      // ゴースト更新
      state.ghosts.forEach(ghost => {
        if (ghost.isEaten) {
          ghost.respawnTimer -= deltaTime;
          if (ghost.respawnTimer <= 0) {
            ghost.isEaten = false;
            ghost.x = 10 * CELL_SIZE;
            ghost.y = 9 * CELL_SIZE;
          }
          return;
        }

        const gCellX = Math.round(ghost.x / CELL_SIZE);
        const gCellY = Math.round(ghost.y / CELL_SIZE);
        const speed = ghost.isScared ? GHOST_SCARED_SPEED : GHOST_SPEED;

        // セル中心で方向決定
        if (isAtCellCenter(ghost.x) && isAtCellCenter(ghost.y)) {
          ghost.x = snapToGrid(ghost.x);
          ghost.y = snapToGrid(ghost.y);

          const directions: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
          const validDirs: Direction[] = [];
          const opposite = ghost.direction === "UP" ? "DOWN" : ghost.direction === "DOWN" ? "UP" : ghost.direction === "LEFT" ? "RIGHT" : "LEFT";

          for (const dir of directions) {
            if (dir === opposite) continue;
            const d = getDirectionDelta(dir);
            if (canMove(state.maze, gCellX + d.x, gCellY + d.y)) {
              validDirs.push(dir);
            }
          }

          if (validDirs.length === 0) {
            const d = getDirectionDelta(opposite);
            if (canMove(state.maze, gCellX + d.x, gCellY + d.y)) {
              validDirs.push(opposite);
            }
          }

          if (validDirs.length > 0) {
            // 追跡ロジック（怖がり中は逃げる）
            const targetX = ghost.isScared ? (pCellX > 10 ? 0 : COLS - 1) * CELL_SIZE : player.x;
            const targetY = ghost.isScared ? (pCellY > 11 ? 0 : ROWS - 1) * CELL_SIZE : player.y;

            let bestDir = validDirs[0];
            let bestDist = ghost.isScared ? -Infinity : Infinity;

            for (const dir of validDirs) {
              const d = getDirectionDelta(dir);
              const nx = (gCellX + d.x) * CELL_SIZE;
              const ny = (gCellY + d.y) * CELL_SIZE;
              const dist = Math.abs(nx - targetX) + Math.abs(ny - targetY);

              if (ghost.isScared ? dist > bestDist : dist < bestDist) {
                bestDist = dist;
                bestDir = dir;
              }
            }

            // ランダム性を加える
            if (Math.random() < 0.2 && validDirs.length > 1) {
              bestDir = validDirs[Math.floor(Math.random() * validDirs.length)];
            }

            ghost.direction = bestDir;
          }
        }

        // 移動
        const delta = getDirectionDelta(ghost.direction);
        const nextX = ghost.x + delta.x * speed;
        const nextY = ghost.y + delta.y * speed;
        const nextCellX = Math.round(nextX / CELL_SIZE);
        const nextCellY = Math.round(nextY / CELL_SIZE);

        // ワープ
        if (nextCellX < 0) {
          ghost.x = (COLS - 1) * CELL_SIZE;
        } else if (nextCellX >= COLS) {
          ghost.x = 0;
        } else if (canMove(state.maze, nextCellX, nextCellY)) {
          ghost.x = nextX;
          ghost.y = nextY;
        }
      });

      // 衝突判定
      const playerCX = player.x + CELL_SIZE / 2;
      const playerCY = player.y + CELL_SIZE / 2;

      for (const ghost of state.ghosts) {
        if (ghost.isEaten) continue;

        const ghostCX = ghost.x + CELL_SIZE / 2;
        const ghostCY = ghost.y + CELL_SIZE / 2;
        const dist = Math.hypot(playerCX - ghostCX, playerCY - ghostCY);

        if (dist < CELL_SIZE * 0.8) {
          if (ghost.isScared) {
            ghost.isEaten = true;
            ghost.isScared = false;
            ghost.respawnTimer = GHOST_RESPAWN_TIME;
            state.ghostsEatenCombo++;
            const bonus = 200 * Math.pow(2, state.ghostsEatenCombo - 1);
            state.score += bonus;
            setScore(state.score);
            
            // ゴースト食べ演出
            const cb = effectCallbacksRef.current;
            cb.playGhostEatSound();
            const explosionX = MAZE_OFFSET_X + ghost.x + CELL_SIZE / 2;
            const explosionY = MAZE_OFFSET_Y + ghost.y + CELL_SIZE / 2;
            cb.explosion(explosionX, explosionY, 16);
            cb.showPopup(`+${bonus}`, explosionX, explosionY, state.ghostsEatenCombo >= 3 ? "critical" : "bonus");
          } else {
            loseLife();
            return;
          }
        }
      }

      // 描画
      render(ctx, state);
      animationId = requestAnimationFrame(gameLoop);
    };

    const render = (ctx: CanvasRenderingContext2D, state: typeof gameStateRef.current) => {
      // 背景
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px Arial";
      ctx.fillText("SCORE: " + state.score, 20, 32);
      ctx.fillStyle = "#ffd700";
      ctx.fillText("HIGH: " + Math.max(state.score, highScore), CANVAS_WIDTH - 160, 32);

      // ライフ表示
      for (let i = 0; i < state.lives; i++) {
        ctx.fillStyle = "#ffff00";
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2 - 40 + i * 30, 28, 10, 0.2 * Math.PI, 1.8 * Math.PI);
        ctx.lineTo(CANVAS_WIDTH / 2 - 40 + i * 30, 28);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(MAZE_OFFSET_X, MAZE_OFFSET_Y);

      // 迷路描画
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const cell = state.maze[y][x];
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;

          if (cell === 1) {
            ctx.fillStyle = "#1a1aff";
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = "#3333ff";
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          } else if (cell === 0) {
            ctx.fillStyle = "#ffccaa";
            ctx.beginPath();
            ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell === 2) {
            ctx.fillStyle = "#ffccaa";
            ctx.beginPath();
            ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // プレイヤー描画
      const player = state.player;
      const mouthAngle = (Math.sin(Date.now() / 80) + 1) * 0.15 + 0.05;
      let startAngle = mouthAngle * Math.PI;
      let endAngle = (2 - mouthAngle) * Math.PI;

      if (player.direction === "UP") {
        startAngle = (1.5 + mouthAngle) * Math.PI;
        endAngle = (1.5 - mouthAngle) * Math.PI;
      } else if (player.direction === "DOWN") {
        startAngle = (0.5 + mouthAngle) * Math.PI;
        endAngle = (0.5 - mouthAngle) * Math.PI;
      } else if (player.direction === "LEFT") {
        startAngle = (1 + mouthAngle) * Math.PI;
        endAngle = (1 - mouthAngle) * Math.PI;
      }

      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.moveTo(player.x + CELL_SIZE / 2, player.y + CELL_SIZE / 2);
      ctx.arc(player.x + CELL_SIZE / 2, player.y + CELL_SIZE / 2, CELL_SIZE / 2 - 2, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // ゴースト描画
      state.ghosts.forEach(ghost => {
        if (ghost.isEaten) return;

        const gx = ghost.x + CELL_SIZE / 2;
        const gy = ghost.y + CELL_SIZE / 2;
        const size = CELL_SIZE / 2 - 2;

        // 体
        if (ghost.isScared) {
          const blinkFast = state.powerTimer < 2000 && Math.floor(Date.now() / 150) % 2 === 0;
          ctx.fillStyle = blinkFast ? "#fff" : "#2121de";
        } else {
          ctx.fillStyle = ghost.color;
        }

        ctx.beginPath();
        ctx.arc(gx, gy - 2, size, Math.PI, 0);
        ctx.lineTo(gx + size, gy + size - 2);
        
        // 波形の下部
        const waveCount = 4;
        const waveWidth = (size * 2) / waveCount;
        for (let i = 0; i < waveCount; i++) {
          const wx = gx + size - waveWidth * (i + 0.5);
          const wy = gy + size - 2 + (i % 2 === 0 ? -4 : 0);
          ctx.lineTo(wx, wy);
        }
        ctx.lineTo(gx - size, gy + size - 2);
        ctx.closePath();
        ctx.fill();

        // 目
        if (ghost.isScared) {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(gx - 5, gy - 4, 3, 0, Math.PI * 2);
          ctx.arc(gx + 5, gy - 4, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(gx - 5, gy - 4, 5, 0, Math.PI * 2);
          ctx.arc(gx + 5, gy - 4, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#00f";
          const eyeDir = getDirectionDelta(ghost.direction);
          ctx.beginPath();
          ctx.arc(gx - 5 + eyeDir.x * 2, gy - 4 + eyeDir.y * 2, 2, 0, Math.PI * 2);
          ctx.arc(gx + 5 + eyeDir.x * 2, gy - 4 + eyeDir.y * 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [phase, highScore, loseLife, winGame]);

  // 初期描画
  useEffect(() => {
    if (phase !== "playing") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      ctx.translate(MAZE_OFFSET_X, MAZE_OFFSET_Y);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const cell = MAZE_DATA[y][x];
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;

          if (cell === 1) {
            ctx.fillStyle = "#1a1aff";
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = "#3333ff";
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          }
        }
      }

      ctx.restore();
    }
  }, [phase]);

  return (
    <GameShell gameId="dotmuncher" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="dotmuncher-game" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="dotmuncher-canvas"
          />
          
          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />
          
          {/* スコアポップアップ */}
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            x={popup.x}
            y={popup.y}
            variant={popup.variant}
            size="lg"
          />
          
          {/* 画面フラッシュ */}
          {flash && (
            <div
              className="dotmuncher-flash"
              style={{ backgroundColor: flash }}
            />
          )}

          {phase === "ready" && (
            <div className="dotmuncher-overlay">
              <h1 className="dotmuncher-title">Dot Muncher</h1>
              <p className="dotmuncher-instruction">矢印キー / WASD で移動</p>
              <p className="dotmuncher-instruction">ドットを全て食べてクリア！</p>
              <p className="dotmuncher-instruction">パワーペレットでゴーストを逆襲</p>
              <button className="dotmuncher-start-btn" onClick={startGame}>
                START
              </button>
              <p className="dotmuncher-hint">Space / Enter to start</p>
            </div>
          )}

          {phase === "gameover" && (
            <div className="dotmuncher-overlay dotmuncher-gameover">
              <h1 className="dotmuncher-gameover-title">GAME OVER</h1>
              <p className="dotmuncher-final-score">Score: {score}</p>
              {score >= highScore && score > 0 && (
                <p className="dotmuncher-new-record">🏆 New Record!</p>
              )}
              <button className="dotmuncher-start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}

          {phase === "cleared" && (
            <div className="dotmuncher-overlay dotmuncher-cleared">
              <h1 className="dotmuncher-cleared-title">🎉 CLEAR!</h1>
              <p className="dotmuncher-final-score">Score: {score}</p>
              {score >= highScore && score > 0 && (
                <p className="dotmuncher-new-record">🏆 New Record!</p>
              )}
              <button className="dotmuncher-start-btn" onClick={startGame}>
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
