import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  ScreenShake,
  ComboCounter,
} from "@shared";
import type { ScreenShakeHandle } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 700;

const BLOCK_HEIGHT = 30;
const INITIAL_BLOCK_WIDTH = 200;
const BLOCK_SPEED_INITIAL = 3;
const BLOCK_SPEED_INCREMENT = 0.15;
const PERFECT_THRESHOLD = 5;

type GamePhase = "before" | "in_progress" | "after";

interface Block {
  x: number;
  y: number;
  width: number;
  color: string;
  settled: boolean;
  bounceOffset?: number; // バウンス効果用
  bounceTime?: number;
}

interface FallingPiece {
  x: number;
  y: number;
  width: number;
  color: string;
  velocityY: number;
}

// 落下パーティクル
interface FallingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface GameState {
  blocks: Block[];
  currentBlock: Block | null;
  fallingPieces: FallingPiece[];
  fallingParticles: FallingParticle[];
  movingDirection: number;
  speed: number;
  score: number;
  perfectCount: number;
  phase: GamePhase;
  highScore: number;
  cameraY: number;
}

function loadHighScore(): number {
  try {
    const saved = localStorage.getItem("stacktower_highscore");
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem("stacktower_highscore", String(score));
  } catch {
    // ignore
  }
}

function getBlockColor(index: number): string {
  const colors = [
    "#ff6b6b",
    "#ffa502",
    "#ffd93d",
    "#6bcb77",
    "#4d96ff",
    "#845ec2",
    "#ff78f0",
  ];
  return colors[index % colors.length];
}

function createInitialState(): GameState {
  const baseBlock: Block = {
    x: CANVAS_WIDTH / 2 - INITIAL_BLOCK_WIDTH / 2,
    y: CANVAS_HEIGHT - BLOCK_HEIGHT - 50,
    width: INITIAL_BLOCK_WIDTH,
    color: getBlockColor(0),
    settled: true,
  };

  return {
    blocks: [baseBlock],
    currentBlock: null,
    fallingPieces: [],
    fallingParticles: [],
    movingDirection: 1,
    speed: BLOCK_SPEED_INITIAL,
    score: 0,
    perfectCount: 0,
    phase: "before",
    highScore: loadHighScore(),
    cameraY: 0,
  };
}

function spawnNewBlock(state: GameState): void {
  const lastBlock = state.blocks[state.blocks.length - 1];
  const newBlockY = lastBlock.y - BLOCK_HEIGHT;
  const startX = state.movingDirection > 0 ? -lastBlock.width : CANVAS_WIDTH;

  state.currentBlock = {
    x: startX,
    y: newBlockY,
    width: lastBlock.width,
    color: getBlockColor(state.blocks.length),
    settled: false,
  };
}

// 落下パーティクルを生成
function createFallingParticles(
  x: number,
  y: number,
  width: number,
  color: string
): FallingParticle[] {
  const particles: FallingParticle[] = [];
  const count = Math.max(3, Math.floor(width / 15));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + Math.random() * width,
      y: y + Math.random() * BLOCK_HEIGHT,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * -3 - 1,
      color,
      size: Math.random() * 5 + 3,
      life: 1,
    });
  }
  return particles;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const shakeRef = useRef<ScreenShakeHandle>(null);

  // ドーパミン演出用
  const { playTone, playPerfect, playCombo, playGameOver, playSweep } = useAudio();
  const { particles, confetti, burst, sparkle } = useParticles();
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);
  const [displayCombo, setDisplayCombo] = useState(0);

  const [, setTick] = useState(0);

  // ブロック落下
  const dropBlock = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase !== "in_progress" || !state.currentBlock) return;

    const currentBlock = state.currentBlock;
    const lastBlock = state.blocks[state.blocks.length - 1];

    // 重なり計算
    const overlapLeft = Math.max(currentBlock.x, lastBlock.x);
    const overlapRight = Math.min(
      currentBlock.x + currentBlock.width,
      lastBlock.x + lastBlock.width
    );
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      // 完全に外れた場合 → ゲームオーバー
      state.fallingPieces.push({
        x: currentBlock.x,
        y: currentBlock.y,
        width: currentBlock.width,
        color: currentBlock.color,
        velocityY: 0,
      });
      // 落下パーティクル追加
      state.fallingParticles.push(
        ...createFallingParticles(
          currentBlock.x,
          currentBlock.y,
          currentBlock.width,
          currentBlock.color
        )
      );
      state.currentBlock = null;
      state.phase = "after";
      // ゲームオーバー演出
      playGameOver();
      shakeRef.current?.shake("heavy", 500);
      setDisplayCombo(0);
      if (state.score > state.highScore) {
        state.highScore = state.score;
        saveHighScore(state.score);
      }
      setTick((t) => t + 1);
      return;
    }

    // パーフェクト判定
    const isPerfect = Math.abs(currentBlock.width - overlapWidth) < PERFECT_THRESHOLD;

    if (isPerfect) {
      state.perfectCount++;
      // パーフェクト時はブロック幅を維持
      currentBlock.x = lastBlock.x;
      currentBlock.width = lastBlock.width;

      // パーフェクト演出
      if (state.perfectCount >= 2) {
        // コンボ演出
        playCombo(state.perfectCount);
        setPopupText(`PERFECT x${state.perfectCount}!`);
        setDisplayCombo(state.perfectCount);
        sparkle(CANVAS_WIDTH / 2, 150, 12);
      } else {
        playPerfect();
        setPopupText("PERFECT!");
        setDisplayCombo(1);
      }
      setPopupKey((k) => k + 1);
      confetti(30);
    } else {
      state.perfectCount = 0;
      setDisplayCombo(0);
      // 通常着地音
      playTone(220, 0.1, "sine", 0.2);

      // 左側がはみ出た場合
      if (currentBlock.x < lastBlock.x) {
        const cutWidth = lastBlock.x - currentBlock.x;
        state.fallingPieces.push({
          x: currentBlock.x,
          y: currentBlock.y,
          width: cutWidth,
          color: currentBlock.color,
          velocityY: 0,
        });
        // カット時のパーティクル＆音
        state.fallingParticles.push(
          ...createFallingParticles(
            currentBlock.x,
            currentBlock.y,
            cutWidth,
            currentBlock.color
          )
        );
        playSweep(400, 150, 0.2, "sawtooth", 0.15);
      }

      // 右側がはみ出た場合
      if (currentBlock.x + currentBlock.width > lastBlock.x + lastBlock.width) {
        const cutStart = lastBlock.x + lastBlock.width;
        const cutWidth = currentBlock.x + currentBlock.width - cutStart;
        state.fallingPieces.push({
          x: cutStart,
          y: currentBlock.y,
          width: cutWidth,
          color: currentBlock.color,
          velocityY: 0,
        });
        // カット時のパーティクル＆音
        state.fallingParticles.push(
          ...createFallingParticles(cutStart, currentBlock.y, cutWidth, currentBlock.color)
        );
        playSweep(400, 150, 0.2, "sawtooth", 0.15);
      }

      // ブロックを切り詰め
      currentBlock.x = overlapLeft;
      currentBlock.width = overlapWidth;
    }

    // バウンス効果を設定
    currentBlock.bounceOffset = -8;
    currentBlock.bounceTime = performance.now();

    currentBlock.settled = true;
    state.blocks.push(currentBlock);
    state.currentBlock = null;

    // 着地時のバースト
    burst(currentBlock.x + currentBlock.width / 2, currentBlock.y + BLOCK_HEIGHT / 2, 6);

    // スコア加算
    state.score++;
    if (isPerfect) {
      state.score += state.perfectCount; // ボーナス
    }

    // スピードアップ
    state.speed += BLOCK_SPEED_INCREMENT;

    // 方向反転
    state.movingDirection *= -1;

    // 次のブロックを生成
    spawnNewBlock(state);

    setTick((t) => t + 1);
  }, [playTone, playPerfect, playCombo, playGameOver, playSweep, confetti, burst, sparkle]);

  // ゲーム開始
  const startGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    gameStateRef.current.phase = "in_progress";
    spawnNewBlock(gameStateRef.current);
    setTick((t) => t + 1);
  }, []);

  // リセット
  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    setTick((t) => t + 1);
  }, []);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;

      // カメラ追従
      if (state.blocks.length > 5) {
        const targetCameraY = (state.blocks.length - 5) * BLOCK_HEIGHT;
        state.cameraY += (targetCameraY - state.cameraY) * 0.1;
      }

      // 描画
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景グラデーション
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#0f0f2e");
      gradient.addColorStop(1, "#1a1a4e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 星を描画
      ctx.fillStyle = "#ffffff44";
      for (let i = 0; i < 50; i++) {
        const starX = (i * 127) % CANVAS_WIDTH;
        const starY = ((i * 251 + state.cameraY * 0.2) % CANVAS_HEIGHT);
        const size = (i % 3) + 1;
        ctx.beginPath();
        ctx.arc(starX, starY, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(0, state.cameraY);

      // 積まれたブロック描画
      const now = performance.now();
      for (const block of state.blocks) {
        // バウンス効果計算
        let bounceY = 0;
        if (block.bounceTime !== undefined && block.bounceOffset !== undefined) {
          const elapsed = now - block.bounceTime;
          if (elapsed < 300) {
            // バウンスアニメーション（減衰するサイン波）
            const progress = elapsed / 300;
            const decay = 1 - progress;
            bounceY = block.bounceOffset * decay * Math.cos(progress * Math.PI * 3);
          }
        }

        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y + bounceY, block.width, BLOCK_HEIGHT);
        
        // ブロックのハイライト
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(block.x, block.y + bounceY, block.width, 5);
        
        // ブロックの影
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(block.x, block.y + bounceY + BLOCK_HEIGHT - 5, block.width, 5);
      }

      // 現在移動中のブロック描画
      if (state.currentBlock) {
        const block = state.currentBlock;
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y, block.width, BLOCK_HEIGHT);
        
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(block.x, block.y, block.width, 5);
        
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(block.x, block.y + BLOCK_HEIGHT - 5, block.width, 5);
      }

      // 落下中のピース描画
      for (const piece of state.fallingPieces) {
        ctx.fillStyle = piece.color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(piece.x, piece.y, piece.width, BLOCK_HEIGHT);
        ctx.globalAlpha = 1;
      }

      // 落下パーティクル描画
      for (const particle of state.fallingParticles) {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // UI描画（カメラ影響なし）
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${state.score}`, 20, 35);

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#aaa";
      ctx.fillText(`High: ${state.highScore}`, 20, 60);

      // ゲーム中のみ更新
      if (state.phase === "in_progress" && state.currentBlock) {
        // ブロック移動
        state.currentBlock.x += state.speed * state.movingDirection;

        // 壁に当たったら反転
        if (state.currentBlock.x <= -state.currentBlock.width / 2) {
          state.movingDirection = 1;
        }
        if (state.currentBlock.x >= CANVAS_WIDTH - state.currentBlock.width / 2) {
          state.movingDirection = -1;
        }

        // 落下中のピース更新
        for (const piece of state.fallingPieces) {
          piece.velocityY += 0.5;
          piece.y += piece.velocityY;
        }

        // 画面外のピースを削除
        state.fallingPieces = state.fallingPieces.filter(
          (p) => p.y < CANVAS_HEIGHT + state.cameraY + 100
        );
      }

      // 落下パーティクル更新（ゲーム中/ゲームオーバー時共通）
      for (const particle of state.fallingParticles) {
        particle.vy += 0.3; // 重力
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
      }
      state.fallingParticles = state.fallingParticles.filter((p) => p.life > 0);

      // ゲーム開始前のメッセージ
      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("スタックタワー", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#ccc";
        ctx.fillText("ブロックを積み上げよう", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
        ctx.fillText("タップでブロックを落とす", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.fillText("ぴったり重ねてパーフェクト!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("タップでスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110);
      }

      // ゲーム終了メッセージ
      if (state.phase === "after") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#ff4757";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "28px sans-serif";
        ctx.fillText(`Score: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        if (state.score >= state.highScore && state.score > 0) {
          ctx.fillStyle = "#ffd700";
          ctx.font = "20px sans-serif";
          ctx.fillText("🏆 NEW HIGH SCORE! 🏆", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55);
        }

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("タップでリトライ", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // イベントハンドラー
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "before") {
      startGame();
    } else if (state.phase === "in_progress") {
      dropBlock();
    } else if (state.phase === "after") {
      resetGame();
    }
  }, [startGame, dropBlock, resetGame]);

  return (
    <GameShell gameId="stacktower" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div
          ref={containerRef}
          className="stacktower-container"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onClick={handleClick}
          onTouchStart={(e) => {
            e.preventDefault();
            handleClick();
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="stacktower-canvas"
          />
          {/* パーティクル演出 */}
          <ParticleLayer particles={particles} />
          {/* スコアポップアップ (PERFECT!) */}
          <ScorePopup
            text={popupText}
            popupKey={popupKey}
            x="50%"
            y="15%"
            variant={displayCombo >= 2 ? "combo" : "bonus"}
            size="lg"
          />
          {/* コンボカウンター */}
          <ComboCounter
            combo={displayCombo}
            position="top-right"
            threshold={2}
            style={{ top: 70, right: 10 }}
          />
        </div>
      </ScreenShake>
    </GameShell>
  );
}
