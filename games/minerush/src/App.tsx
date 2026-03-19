import { useState, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  createGame,
  revealCell,
  toggleFlag,
  getNumberColor,
} from "./lib/game";
import type { GameState, Cell } from "./lib/game";
import "./App.css";

const ROWS = 9;
const COLS = 9;
const MINE_COUNT = 10;
const LONG_PRESS_DURATION = 400;

export default function App() {
  const [game, setGame] = useState<GameState>(() =>
    createGame(ROWS, COLS, MINE_COUNT)
  );

  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const handleReset = useCallback(() => {
    setGame(createGame(ROWS, COLS, MINE_COUNT));
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (longPressTriggered.current) {
        longPressTriggered.current = false;
        return;
      }
      setGame((prev) => revealCell(prev, row, col));
    },
    []
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      e.preventDefault();
      setGame((prev) => toggleFlag(prev, row, col));
    },
    []
  );

  const handleTouchStart = useCallback(
    (row: number, col: number) => {
      longPressTriggered.current = false;
      longPressTimer.current = window.setTimeout(() => {
        longPressTriggered.current = true;
        setGame((prev) => toggleFlag(prev, row, col));
      }, LONG_PRESS_DURATION);
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const renderCell = (cell: Cell, row: number, col: number) => {
    let content: React.ReactNode = null;
    let className = "minerush-cell";

    if (cell.isRevealed) {
      if (cell.isMine) {
        className += " minerush-cell--mine";
        content = "💣";
      } else {
        className += " minerush-cell--revealed";
        if (cell.adjacentMines > 0) {
          content = (
            <span style={{ color: getNumberColor(cell.adjacentMines) }}>
              {cell.adjacentMines}
            </span>
          );
        }
      }
    } else if (cell.isFlagged) {
      className += " minerush-cell--hidden minerush-cell--flagged";
      content = "🚩";
    } else {
      className += " minerush-cell--hidden";
    }

    return (
      <button
        key={`${row}-${col}`}
        className={className}
        onClick={() => handleCellClick(row, col)}
        onContextMenu={(e) => handleContextMenu(e, row, col)}
        onTouchStart={() => handleTouchStart(row, col)}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        disabled={game.status !== "playing" && !cell.isRevealed}
        aria-label={`セル ${row + 1}-${col + 1}`}
      >
        {content}
      </button>
    );
  };

  const getFaceEmoji = () => {
    if (game.status === "won") return "😎";
    if (game.status === "lost") return "😵";
    return "🙂";
  };

  const remainingMines = game.mineCount - game.flaggedCount;

  return (
    <GameShell gameId="minerush" layout="default">
      <div className="minerush-container">
        <header className="minerush-header">
          <div className="minerush-info">
            💣 <span>{remainingMines}</span>
          </div>
          <button
            className="minerush-reset-btn"
            onClick={handleReset}
            aria-label="リセット"
          >
            {getFaceEmoji()}
          </button>
          <div className="minerush-info">
            🚩 <span>{game.flaggedCount}</span>
          </div>
        </header>

        <div
          className="minerush-grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 36px)`,
            gridTemplateRows: `repeat(${ROWS}, 36px)`,
          }}
        >
          {game.grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => renderCell(cell, rowIdx, colIdx))
          )}
        </div>

        {game.status !== "playing" && (
          <div
            className={`minerush-status minerush-status--${game.status}`}
          >
            {game.status === "won" ? "🎉 クリア！" : "💥 ゲームオーバー"}
          </div>
        )}
      </div>
    </GameShell>
  );
}
