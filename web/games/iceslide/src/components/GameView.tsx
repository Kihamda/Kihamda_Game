import { useEffect, useRef, useCallback } from "react";
import type { Stage, GameState, Direction } from "../lib/types";
import { CELL_SIZE } from "../lib/constants";

interface Props {
  stage: Stage;
  gameState: GameState;
  onMove: (direction: Direction) => void;
  onUndo: () => void;
  onReset: () => void;
  onMenu: () => void;
}

export function GameView({
  stage,
  gameState,
  onMove,
  onUndo,
  onReset,
  onMenu,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          onMove("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          onMove("down");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          onMove("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          onMove("right");
          break;
        case "z":
        case "Z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onUndo();
          }
          break;
        case "r":
        case "R":
          e.preventDefault();
          onReset();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onMove, onUndo, onReset]);

  // スワイプ操作
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const minSwipeDistance = 30;

      if (absDx > absDy && absDx > minSwipeDistance) {
        onMove(dx > 0 ? "right" : "left");
      } else if (absDy > absDx && absDy > minSwipeDistance) {
        onMove(dy > 0 ? "down" : "up");
      }

      touchStartRef.current = null;
    },
    [onMove]
  );

  const boardWidth = stage.width * CELL_SIZE;
  const boardHeight = stage.height * CELL_SIZE;

  return (
    <div className="is-game">
      <div className="is-hud">
        <span className="is-stage-name">
          Stage {stage.id}: {stage.name}
        </span>
        <span className="is-moves">
          手数: {gameState.moves} (パー: {stage.par})
        </span>
      </div>

      <div
        ref={containerRef}
        className="is-board-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="is-board"
          style={{
            width: boardWidth,
            height: boardHeight,
          }}
        >
          {/* セル描画 */}
          {stage.cells.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`is-cell is-cell--${cell}`}
                style={{
                  left: x * CELL_SIZE,
                  top: y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              >
                {cell === "goal" && <span className="is-goal">🚩</span>}
              </div>
            ))
          )}

          {/* プレイヤー */}
          <div
            className="is-player"
            style={{
              left: gameState.player.x * CELL_SIZE,
              top: gameState.player.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
            }}
          >
            🐧
          </div>
        </div>
      </div>

      <div className="is-game-buttons">
        <button className="is-btn is-btn--small" onClick={onUndo}>
          ↩ 戻す
        </button>
        <button className="is-btn is-btn--small" onClick={onReset}>
          🔄 リセット
        </button>
        <button className="is-btn is-btn--small" onClick={onMenu}>
          📋 メニュー
        </button>
      </div>

      <div className="is-direction-buttons">
        <button
          className="is-dir-btn is-dir-btn--up"
          onClick={() => onMove("up")}
        >
          ▲
        </button>
        <div className="is-dir-row">
          <button
            className="is-dir-btn is-dir-btn--left"
            onClick={() => onMove("left")}
          >
            ◀
          </button>
          <button
            className="is-dir-btn is-dir-btn--down"
            onClick={() => onMove("down")}
          >
            ▼
          </button>
          <button
            className="is-dir-btn is-dir-btn--right"
            onClick={() => onMove("right")}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
