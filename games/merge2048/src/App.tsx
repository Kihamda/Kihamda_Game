import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import { initGame, moveWithResult } from "./lib/game";
import type { Direction, GameState, Tile, MergeInfo } from "./lib/game";
import "./App.css";

const BOARD_SIZE = 380; // board内部サイズ
const CELL_SIZE = (BOARD_SIZE - 30) / 4; // (board size - gaps) / 4
const GAP = 10;
const BOARD_PADDING = 10;

function getTilePosition(row: number, col: number): { top: number; left: number } {
  return {
    top: row * (CELL_SIZE + GAP),
    left: col * (CELL_SIZE + GAP),
  };
}

/** タイルの値に応じた色を取得（グラデーション対応） */
function getTileColor(value: number): { bg: string; text: string; glow?: string } {
  const colors: Record<number, { bg: string; text: string; glow?: string }> = {
    2: { bg: "#eee4da", text: "#776e65" },
    4: { bg: "#ede0c8", text: "#776e65" },
    8: { bg: "#f2b179", text: "#f9f6f2" },
    16: { bg: "#f59563", text: "#f9f6f2" },
    32: { bg: "#f67c5f", text: "#f9f6f2" },
    64: { bg: "#f65e3b", text: "#f9f6f2" },
    128: { bg: "linear-gradient(135deg, #edcf72 0%, #edcc61 100%)", text: "#f9f6f2", glow: "rgba(237, 207, 114, 0.5)" },
    256: { bg: "linear-gradient(135deg, #edcc61 0%, #edc850 100%)", text: "#f9f6f2", glow: "rgba(237, 204, 97, 0.6)" },
    512: { bg: "linear-gradient(135deg, #edc850 0%, #edc53f 100%)", text: "#f9f6f2", glow: "rgba(237, 200, 80, 0.7)" },
    1024: { bg: "linear-gradient(135deg, #edc53f 0%, #edc22e 100%)", text: "#f9f6f2", glow: "rgba(237, 197, 63, 0.8)" },
    2048: { bg: "linear-gradient(135deg, #edc22e 0%, #f9d423 50%, #edc22e 100%)", text: "#f9f6f2", glow: "rgba(249, 212, 35, 1)" },
  };
  // 4096以上は虹色グラデーション
  if (value > 2048) {
    return {
      bg: "linear-gradient(135deg, #ff6b6b 0%, #feca57 25%, #48dbfb 50%, #ff9ff3 75%, #54a0ff 100%)",
      text: "#f9f6f2",
      glow: "rgba(255, 255, 255, 0.8)",
    };
  }
  return colors[value] || { bg: "#3c3a32", text: "#f9f6f2" };
}

function TileComponent({ tile }: { tile: Tile }) {
  const { top, left } = getTilePosition(tile.row, tile.col);
  const { bg, text, glow } = getTileColor(tile.value);
  const className = [
    "merge2048-tile",
    tile.isNew && "merge2048-tile--new",
    tile.mergedFrom && "merge2048-tile--merged",
    tile.value >= 128 && "merge2048-tile--glow",
    tile.value >= 2048 && "merge2048-tile--super",
  ]
    .filter(Boolean)
    .join(" ");

  const fontSize = tile.value >= 1024 ? 26 : tile.value >= 128 ? 32 : 36;

  return (
    <div
      className={className}
      style={{
        top,
        left,
        background: bg,
        color: text,
        fontSize,
        ...(glow && { "--glow-color": glow } as React.CSSProperties),
      }}
    >
      {tile.value}
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState>(initGame);
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const [scorePopup, setScorePopup] = useState<{ value: number; id: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const popupIdRef = useRef(0);
  
  const { particles, burst, confetti, sparkle } = useParticles();
  const { playTone, playCelebrate, playClick } = useAudio();

  /** マージ位置を画面座標に変換 */
  const getMergeScreenPosition = useCallback((merge: MergeInfo) => {
    const boardEl = boardRef.current;
    if (!boardEl) return { x: 0, y: 0 };
    const rect = boardEl.getBoundingClientRect();
    const { top, left } = getTilePosition(merge.row, merge.col);
    return {
      x: rect.left + BOARD_PADDING + left + CELL_SIZE / 2,
      y: rect.top + BOARD_PADDING + top + CELL_SIZE / 2,
    };
  }, []);

  /** 効果音: スライド */
  const playSlideSfx = useCallback(() => {
    playTone(220, 0.06, "sine", 0.08);
  }, [playTone]);

  /** 効果音: マージ (値に応じて音程変化) */
  const playMergeSfx = useCallback((value: number) => {
    const baseFreq = 330;
    const level = Math.log2(value) - 1; // 2=1, 4=2, 8=3, ...
    const freq = baseFreq * Math.pow(1.12, level);
    playTone(freq, 0.12, "triangle", 0.2);
    playTone(freq * 1.5, 0.1, "sine", 0.15, 0.03);
  }, [playTone]);

  /** 効果音: ビッグマージ (128以上) */
  const playBigMergeSfx = useCallback((value: number) => {
    const baseFreq = 440;
    const level = Math.log2(value) - 6; // 128=1, 256=2, ...
    const freq = baseFreq * Math.pow(1.1, level);
    playTone(freq, 0.15, "sine", 0.25);
    playTone(freq * 1.25, 0.15, "triangle", 0.2, 0.05);
    playTone(freq * 1.5, 0.2, "sine", 0.15, 0.1);
  }, [playTone]);

  /** 効果音: 勝利 */
  const playWinSfx = useCallback(() => {
    playCelebrate();
  }, [playCelebrate]);

  const handleMove = useCallback((direction: Direction) => {
    setGame((prev) => {
      const result = moveWithResult(prev, direction);
      
      if (!result.moved) return prev;
      
      // スライド音
      playSlideSfx();
      
      // マージエフェクト
      for (const merge of result.merges) {
        const pos = getMergeScreenPosition(merge);
        
        if (merge.value >= 2048) {
          // 2048以上: 豪華エフェクト
          playBigMergeSfx(merge.value);
          sparkle(pos.x, pos.y, 16);
          burst(pos.x, pos.y, 20);
        } else if (merge.value >= 128) {
          // 128以上: ビッグマージ
          playBigMergeSfx(merge.value);
          sparkle(pos.x, pos.y, 10);
        } else {
          // 通常マージ
          playMergeSfx(merge.value);
          burst(pos.x, pos.y, 6);
        }
      }
      
      // スコアポップアップ
      if (result.scoreGained > 0) {
        popupIdRef.current++;
        setScorePopup({ value: result.scoreGained, id: popupIdRef.current });
        setTimeout(() => setScorePopup(null), 600);
      }
      
      // 勝利演出
      if (result.justWon) {
        setShowWinOverlay(true);
        playWinSfx();
        // 盛大な confetti
        confetti(80);
        setTimeout(() => confetti(50), 300);
        setTimeout(() => confetti(30), 600);
      }
      
      return result.state;
    });
  }, [playSlideSfx, playMergeSfx, playBigMergeSfx, playWinSfx, getMergeScreenPosition, burst, sparkle, confetti]);

  const handleNewGame = useCallback(() => {
    setGame(initGame());
    setShowWinOverlay(false);
    playClick();
  }, [playClick]);

  const continueGame = useCallback(() => {
    setShowWinOverlay(false);
    playClick();
  }, [playClick]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        handleMove(direction);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove]);

  // Touch/swipe controls
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const minSwipe = 30;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe) {
        handleMove(dx > 0 ? "right" : "left");
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipe) {
        handleMove(dy > 0 ? "down" : "up");
      }

      touchStartRef.current = null;
    };

    board.addEventListener("touchstart", handleTouchStart, { passive: true });
    board.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      board.removeEventListener("touchstart", handleTouchStart);
      board.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleMove]);

  return (
    <GameShell gameId="merge2048" layout="default">
      <ParticleLayer particles={particles} />
      <div className="merge2048-container">
        <header className="merge2048-header">
          <h1 className="merge2048-title">2048</h1>
          <div className="merge2048-scores">
            <div className="merge2048-score-box">
              <div className="merge2048-score-label">Score</div>
              <div className="merge2048-score-value">
                {game.score}
                {scorePopup && (
                  <span key={scorePopup.id} className="merge2048-score-popup">
                    +{scorePopup.value}
                  </span>
                )}
              </div>
            </div>
            <div className="merge2048-score-box">
              <div className="merge2048-score-label">Best</div>
              <div className="merge2048-score-value">{game.bestScore}</div>
            </div>
          </div>
        </header>

        <div className="merge2048-controls">
          <button className="merge2048-btn" onClick={handleNewGame}>
            New Game
          </button>
        </div>

        <div className="merge2048-board" ref={boardRef}>
          <div className="merge2048-grid">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="merge2048-cell" />
            ))}
          </div>

          <div className="merge2048-tiles">
            {game.tiles.map((tile) => (
              <TileComponent key={tile.id} tile={tile} />
            ))}
          </div>

          {game.gameOver && (
            <div className="merge2048-overlay">
              <p className="merge2048-overlay-text">Game Over!</p>
              <button className="merge2048-btn" onClick={handleNewGame}>
                Try Again
              </button>
            </div>
          )}

          {showWinOverlay && (
            <div className="merge2048-overlay merge2048-overlay--won">
              <p className="merge2048-overlay-text">🎉 You Win! 🎉</p>
              <button className="merge2048-btn" onClick={continueGame}>
                Continue
              </button>
              <button className="merge2048-btn" onClick={handleNewGame}>
                New Game
              </button>
            </div>
          )}
        </div>

        <p className="merge2048-instructions">
          矢印キー / WASD / スワイプ で移動
        </p>
      </div>
    </GameShell>
  );
}
