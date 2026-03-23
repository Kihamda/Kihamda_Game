import { useState, useEffect, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useHighScore } from "@shared/hooks/useHighScore";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles } from "@shared/hooks/useParticles";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import type { PopupVariant } from "@shared/components/ScorePopup";
import "./App.css";

// ゲーム定数
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const INITIAL_BLOCK_WIDTH = 200;
const BLOCK_HEIGHT = 30;
const PERFECT_THRESHOLD = 3; // パーフェクト判定の閾値（px）
const SPEED_BASE = 3;
const SPEED_INCREMENT = 0.15;
const MAX_SPEED = 10;
const BLOCKS_TO_WIN = 30;

// 色パレット
const COLORS = [
  "#FF6B6B", "#FF8E53", "#FFC107", "#4CAF50", "#2196F3",
  "#9C27B0", "#E91E63", "#00BCD4", "#8BC34A", "#FF5722"
];

interface Block {
  x: number;
  y: number;
  width: number;
  color: string;
}

interface MovingBlock {
  x: number;
  width: number;
  direction: 1 | -1;
}

type GamePhase = "start" | "playing" | "gameover" | "win";

function getBlockColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("start");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [movingBlock, setMovingBlock] = useState<MovingBlock | null>(null);
  const [score, setScore] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [showPerfect, setShowPerfect] = useState(false);
  const [cameraOffset, setCameraOffset] = useState(0);
  const { best: highScore, update: saveHighScore } = useHighScore("towerstack");

  // Dopamine hooks
  const { playClick, playPerfect, playCombo, playCelebrate, playGameOver } = useAudio();
  const { particles, burst, sparkle, confetti } = useParticles();
  
  // ScorePopup state
  const [popup, setPopup] = useState<{ text: string; key: number; variant: PopupVariant } | null>(null);
  const popupKeyRef = useRef(0);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // オーバーラップ計算
  const calculateOverlap = (moving: MovingBlock, base: Block): number => {
    const movingLeft = moving.x;
    const movingRight = moving.x + moving.width;
    const baseLeft = base.x;
    const baseRight = base.x + base.width;

    const overlapLeft = Math.max(movingLeft, baseLeft);
    const overlapRight = Math.min(movingRight, baseRight);

    return overlapRight - overlapLeft;
  };

  // ブロック落下処理
  const dropBlock = useCallback(() => {
    if (!movingBlock || phase !== "playing") return;

    const topBlock = blocks[blocks.length - 1];
    const overlap = calculateOverlap(movingBlock, topBlock);

    if (overlap <= 0) {
      setPhase("gameover");
      saveHighScore(score);
      playGameOver();
      return;
    }

    const isPerfect = Math.abs(movingBlock.x - topBlock.x) <= PERFECT_THRESHOLD &&
                      Math.abs(movingBlock.width - topBlock.width) <= PERFECT_THRESHOLD;

    const newBlockY = topBlock.y - BLOCK_HEIGHT;
    let newWidth = overlap;
    let newX = Math.max(movingBlock.x, topBlock.x);

    // Calculate block center for particle effects (relative to game area)
    const blockCenterX = newX + newWidth / 2;
    // Adjust Y position for camera offset and convert to screen coordinates
    const particleY = newBlockY + cameraOffset + BLOCK_HEIGHT / 2;

    if (isPerfect) {
      newWidth = Math.min(topBlock.width + 2, INITIAL_BLOCK_WIDTH);
      newX = topBlock.x - (newWidth - topBlock.width) / 2;
      const newStreak = perfectStreak + 1;
      setPerfectStreak(newStreak);
      setShowPerfect(true);
      setTimeout(() => setShowPerfect(false), 500);
      
      // Audio effects for perfect
      playPerfect();
      if (newStreak > 1) {
        playCombo(newStreak);
      }
      
      // Sparkle effect at block position
      sparkle(blockCenterX, particleY, 12);
    } else {
      setPerfectStreak(0);
      // Normal placement effects
      playClick();
      burst(blockCenterX, particleY, 8);
    }

    const newBlock: Block = {
      x: newX,
      y: newBlockY,
      width: newWidth,
      color: getBlockColor(blocks.length),
    };

    setBlocks(prev => [...prev, newBlock]);
    
    const baseScore = 10;
    const perfectBonus = isPerfect ? 25 : 0;
    const streakBonus = isPerfect ? perfectStreak * 5 : 0;
    const totalScore = baseScore + perfectBonus + streakBonus;
    setScore(prev => prev + totalScore);

    // Show score popup
    popupKeyRef.current += 1;
    if (isPerfect) {
      if (perfectStreak + 1 > 1) {
        setPopup({ text: `PERFECT! ×${perfectStreak + 1}`, key: popupKeyRef.current, variant: "combo" });
      } else {
        setPopup({ text: "PERFECT!", key: popupKeyRef.current, variant: "bonus" });
      }
    } else {
      setPopup({ text: `+${totalScore}`, key: popupKeyRef.current, variant: "default" });
    }
    setTimeout(() => setPopup(null), 1000);

    const visibleBlocks = Math.floor(GAME_HEIGHT / BLOCK_HEIGHT) - 2;
    if (blocks.length >= visibleBlocks) {
      setCameraOffset(prev => prev + BLOCK_HEIGHT);
    }

    if (blocks.length + 1 >= BLOCKS_TO_WIN) {
      setPhase("win");
      saveHighScore(score + totalScore);
      playCelebrate();
      confetti(60);
      return;
    }

    setMovingBlock({
      x: -newWidth,
      width: newWidth,
      direction: 1,
    });
  }, [movingBlock, blocks, phase, perfectStreak, score, cameraOffset, saveHighScore, playClick, playPerfect, playCombo, playCelebrate, playGameOver, burst, sparkle, confetti]);

  // ゲームループ
  useEffect(() => {
    if (phase !== "playing" || !movingBlock) return;

    const speed = Math.min(SPEED_BASE + blocks.length * SPEED_INCREMENT, MAX_SPEED);

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setMovingBlock(prev => {
        if (!prev) return prev;

        let newX = prev.x + prev.direction * speed * (delta / 16);
        let newDirection = prev.direction;

        if (newX + prev.width > GAME_WIDTH) {
          newX = GAME_WIDTH - prev.width;
          newDirection = -1;
        } else if (newX < 0) {
          newX = 0;
          newDirection = 1;
        }

        return {
          ...prev,
          x: newX,
          direction: newDirection as 1 | -1,
        };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [phase, movingBlock, blocks.length]);

  // ゲーム開始
  const startGame = useCallback(() => {
    const baseBlock: Block = {
      x: (GAME_WIDTH - INITIAL_BLOCK_WIDTH) / 2,
      y: GAME_HEIGHT - BLOCK_HEIGHT,
      width: INITIAL_BLOCK_WIDTH,
      color: getBlockColor(0),
    };

    setBlocks([baseBlock]);
    setMovingBlock({
      x: 0,
      width: INITIAL_BLOCK_WIDTH,
      direction: 1,
    });
    setScore(0);
    setPerfectStreak(0);
    setCameraOffset(0);
    setPhase("playing");
    lastTimeRef.current = 0;
  }, []);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && phase === "playing") {
        e.preventDefault();
        dropBlock();
      } else if (e.code === "Space" && (phase === "start" || phase === "gameover" || phase === "win")) {
        e.preventDefault();
        startGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, dropBlock, startGame]);

  const handleClick = () => {
    if (phase === "playing") {
      dropBlock();
    } else if (phase === "start" || phase === "gameover" || phase === "win") {
      startGame();
    }
  };

  return (
    <GameShell gameId="towerstack" layout="immersive">
      <div className="towerstack-container">
        <header className="towerstack-header">
          <div className="towerstack-score-box">
            <span className="towerstack-label">SCORE</span>
            <span className="towerstack-value">{score}</span>
          </div>
          <div className="towerstack-score-box">
            <span className="towerstack-label">HIGH</span>
            <span className="towerstack-value">{highScore}</span>
          </div>
          <div className="towerstack-score-box">
            <span className="towerstack-label">LEVEL</span>
            <span className="towerstack-value">{blocks.length}</span>
          </div>
        </header>

        <div className="towerstack-game-area" onClick={handleClick}>
          <div 
            className="towerstack-game-inner"
            style={{ transform: `translateY(${cameraOffset}px)` }}
          >
            {blocks.map((block, index) => (
              <div
                key={index}
                className="towerstack-block"
                style={{
                  left: block.x,
                  top: block.y,
                  width: block.width,
                  height: BLOCK_HEIGHT,
                  backgroundColor: block.color,
                }}
              />
            ))}

            {movingBlock && phase === "playing" && (
              <div
                className="towerstack-block towerstack-block--moving"
                style={{
                  left: movingBlock.x,
                  top: blocks[blocks.length - 1].y - BLOCK_HEIGHT,
                  width: movingBlock.width,
                  height: BLOCK_HEIGHT,
                  backgroundColor: getBlockColor(blocks.length),
                }}
              />
            )}
          </div>

          {showPerfect && (
            <div className="towerstack-perfect">
              PERFECT! 🎯
              {perfectStreak > 1 && <span className="towerstack-streak">×{perfectStreak}</span>}
            </div>
          )}

          {/* Dopamine effects */}
          <ParticleLayer particles={particles} />
          {popup && (
            <ScorePopup
              text={popup.text}
              popupKey={popup.key}
              variant={popup.variant}
              y="30%"
              size="lg"
            />
          )}

          {phase === "start" && (
            <div className="towerstack-overlay">
              <h1 className="towerstack-title">Tower Stack</h1>
              <p className="towerstack-instruction">
                タイミングよくタップして<br />ブロックを積み上げよう！
              </p>
              <button className="towerstack-btn" onClick={startGame}>
                スタート
              </button>
              <p className="towerstack-hint">タップ or スペースキー</p>
            </div>
          )}

          {phase === "gameover" && (
            <div className="towerstack-overlay">
              <h2 className="towerstack-result-title">GAME OVER</h2>
              <div className="towerstack-result-score">{score}</div>
              <div className="towerstack-result-label">SCORE</div>
              <div className="towerstack-stats">
                <div className="towerstack-stat">
                  <span className="towerstack-stat-value">{blocks.length}</span>
                  <span className="towerstack-stat-label">ブロック数</span>
                </div>
                <div className="towerstack-stat">
                  <span className="towerstack-stat-value">{highScore}</span>
                  <span className="towerstack-stat-label">ハイスコア</span>
                </div>
              </div>
              <button className="towerstack-btn" onClick={startGame}>
                もう一度
              </button>
            </div>
          )}

          {phase === "win" && (
            <div className="towerstack-overlay towerstack-overlay--win">
              <h2 className="towerstack-result-title">🎉 CLEAR! 🎉</h2>
              <div className="towerstack-result-score">{score}</div>
              <div className="towerstack-result-label">SCORE</div>
              <p className="towerstack-congrats">
                {BLOCKS_TO_WIN}段のタワー完成！
              </p>
              <button className="towerstack-btn" onClick={startGame}>
                もう一度
              </button>
            </div>
          )}
        </div>

        <footer className="towerstack-footer">
          <p>タップでブロックを落とす</p>
        </footer>
      </div>
    </GameShell>
  );
}
