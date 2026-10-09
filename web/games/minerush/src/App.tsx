import { useState, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer, useAudio, useParticles, ScorePopup, ShareButton, GameRecommendations } from "@shared";
import type { PopupVariant } from "@shared";
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

  // ScorePopup state
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);
  const [popupVariant, setPopupVariant] = useState<PopupVariant>("default");
  const [popupSize, setPopupSize] = useState<"sm" | "md" | "lg" | "xl">("md");

  const showPopup = useCallback(
    (text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md") => {
      setPopupText(text);
      setPopupVariant(variant);
      setPopupSize(size);
      setPopupKey((k) => k + 1);
    },
    []
  );

  const { playTone } = useAudio();
  const { particles, sparkle, confetti, explosion } = useParticles();

  const playReveal = useCallback(() => {
    playTone(600, 0.05, "sine");
  }, [playTone]);

  const playFlag = useCallback(() => {
    playTone(400, 0.08, "triangle");
  }, [playTone]);

  const playWin = useCallback(() => {
    playTone(880, 0.3, "sine");
  }, [playTone]);

  const playLose = useCallback(() => {
    playTone(200, 0.3, "sawtooth");
  }, [playTone]);

  const handleReset = useCallback(() => {
    setGame(createGame(ROWS, COLS, MINE_COUNT));
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (longPressTriggered.current) {
        longPressTriggered.current = false;
        return;
      }
      const prevRevealedCount = game.revealedCount;
      const newGame = revealCell(game, row, col);
      setGame(newGame);
      
      if (newGame.status === "won") {
        confetti();
        playWin();
        showPopup("🎉 YOU WIN!", "level", "xl");
      } else if (newGame.status === "lost") {
        explosion(col * 40, row * 40);
        playLose();
      } else {
        const cellsRevealed = newGame.revealedCount - prevRevealedCount;
        if (cellsRevealed > 0) {
          playReveal();
          sparkle(col * 40, row * 40);
          
          // Show popup based on cells revealed
          if (cellsRevealed >= 10) {
            showPopup(`💥 ${cellsRevealed} CELLS!`, "critical", "lg");
          } else if (cellsRevealed >= 5) {
            showPopup(`${cellsRevealed} CELLS!`, "combo", "md");
          } else if (cellsRevealed > 1) {
            showPopup(`+${cellsRevealed}`, "bonus", "sm");
          } else {
            showPopup("+1", "default", "sm");
          }
        }
      }
    },
    [game, playReveal, playWin, playLose, confetti, explosion, sparkle, showPopup]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      e.preventDefault();
      const cell = game.grid[row][col];
      if (!cell.isRevealed) {
        setGame((prev) => toggleFlag(prev, row, col));
        playFlag();
        if (!cell.isFlagged) {
          showPopup("🚩 Flagged!", "bonus", "sm");
        }
      }
    },
    [game.grid, playFlag, showPopup]
  );

  const handleTouchStart = useCallback(
    (row: number, col: number) => {
      longPressTriggered.current = false;
      longPressTimer.current = window.setTimeout(() => {
        longPressTriggered.current = true;
        const cell = game.grid[row][col];
        if (!cell.isRevealed) {
          setGame((prev) => toggleFlag(prev, row, col));
          playFlag();
          if (!cell.isFlagged) {
            showPopup("🚩 Flagged!", "bonus", "sm");
          }
        }
      }, LONG_PRESS_DURATION);
    },
    [game.grid, playFlag, showPopup]
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
            {game.status === "lost" && (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                padding: "15px",
                borderRadius: "8px",
                textAlign: "center",
                zIndex: 10,
                color: "#fff",
                minWidth: "150px"
              }}>
                <p style={{ marginBottom: "10px" }}>Revealed: {game.revealedCount}</p>
                <ShareButton score={game.revealedCount} gameTitle="Mine Rush" gameId="minerush" />
                <GameRecommendations currentGameId="minerush" />
              </div>
            )}
          </div>
        )}
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popupText}
          popupKey={popupKey}
          variant={popupVariant}
          size={popupSize}
        />
      </div>
    </GameShell>
  );
}
