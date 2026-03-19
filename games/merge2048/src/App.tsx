import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "@shared/components/GameShell";
import { initGame, move } from "./lib/game";
import type { Direction, GameState, Tile } from "./lib/game";
import "./App.css";

const CELL_SIZE = (380 - 30) / 4; // (board size - gaps) / 4
const GAP = 10;

function getTilePosition(row: number, col: number): { top: number; left: number } {
  return {
    top: row * (CELL_SIZE + GAP),
    left: col * (CELL_SIZE + GAP),
  };
}

function TileComponent({ tile }: { tile: Tile }) {
  const { top, left } = getTilePosition(tile.row, tile.col);
  const className = [
    "merge2048-tile",
    tile.isNew && "merge2048-tile--new",
    tile.mergedFrom && "merge2048-tile--merged",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      data-value={tile.value}
      style={{ top, left }}
    >
      {tile.value}
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState>(initGame);
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleMove = useCallback((direction: Direction) => {
    setGame((prev) => {
      const next = move(prev, direction);
      // Show win overlay once when first reaching 2048
      if (next.won && !prev.won) {
        setShowWinOverlay(true);
      }
      return next;
    });
  }, []);

  const handleNewGame = useCallback(() => {
    setGame(initGame());
    setShowWinOverlay(false);
  }, []);

  const continueGame = useCallback(() => {
    setShowWinOverlay(false);
  }, []);

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
      <div className="merge2048-container">
        <header className="merge2048-header">
          <h1 className="merge2048-title">2048</h1>
          <div className="merge2048-scores">
            <div className="merge2048-score-box">
              <div className="merge2048-score-label">Score</div>
              <div className="merge2048-score-value">{game.score}</div>
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
              <p className="merge2048-overlay-text">You Win!</p>
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
