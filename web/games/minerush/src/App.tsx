import { useState, useCallback, useRef, useEffect } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer, useAudio, useParticles, ScorePopup } from "@shared";
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
const SAFE_CELL_COUNT = ROWS * COLS - MINE_COUNT;
const LONG_PRESS_DURATION = 400;

export default function App() {
  const [game, setGame] = useState<GameState>(() =>
    createGame(ROWS, COLS, MINE_COUNT)
  );

  const longPressTimer = useRef<number | null>(null);
  const activeTouchCell = useRef<string | null>(null);
  const suppressedTouchCells = useRef(new Set<string>());
  const [flagMode, setFlagMode] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);
  const interruptTouch = useCallback(() => {
    cancelLongPress();
    if (activeTouchCell.current !== null) {
      suppressedTouchCells.current.add(activeTouchCell.current);
      activeTouchCell.current = null;
    }
  }, [cancelLongPress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) interruptTouch();
    };
    window.addEventListener("blur", interruptTouch);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelLongPress();
      window.removeEventListener("blur", interruptTouch);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cancelLongPress, interruptTouch]);

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
  const { particles, sparkle, confetti, explosion, clear: clearParticles } = useParticles();

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
    cancelLongPress();
    activeTouchCell.current = null;
    suppressedTouchCells.current.clear();
    setPopupText(null);
    clearParticles();
    setGame(createGame(ROWS, COLS, MINE_COUNT));
  }, [cancelLongPress, clearParticles]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const prevRevealedCount = game.revealedCount;
      const newGame = revealCell(game, row, col);
      if (newGame === game) return;
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
    (e: React.SyntheticEvent, row: number, col: number) => {
      e.preventDefault();
      cancelLongPress();
      const cellKey = `${row}-${col}`;
      const touchMenu = e.type === "contextmenu" &&
        (activeTouchCell.current === cellKey ||
          ("pointerType" in e.nativeEvent && e.nativeEvent.pointerType === "touch"));
      if (touchMenu) {
        if (suppressedTouchCells.current.has(cellKey)) return;
        suppressedTouchCells.current.add(cellKey);
      }
      const cell = game.grid[row][col];
      if (game.status === "playing" && !cell.isRevealed) {
        setGame((prev) => toggleFlag(prev, row, col));
        playFlag();
        if (!cell.isFlagged) {
          showPopup("🚩 Flagged!", "bonus", "sm");
        }
      }
    },
    [game.grid, game.status, cancelLongPress, playFlag, showPopup]
  );

  const handleTouchStart = useCallback(
    (row: number, col: number) => {
      cancelLongPress();
      activeTouchCell.current = `${row}-${col}`;
      suppressedTouchCells.current.clear();
      longPressTimer.current = window.setTimeout(() => {
        suppressedTouchCells.current.add(`${row}-${col}`);
        const cell = game.grid[row][col];
        if (game.status === "playing" && !cell.isRevealed) {
          setGame((prev) => toggleFlag(prev, row, col));
          playFlag();
          if (!cell.isFlagged) {
            showPopup("🚩 Flagged!", "bonus", "sm");
          }
        }
      }, LONG_PRESS_DURATION);
    },
    [game.grid, game.status, cancelLongPress, playFlag, showPopup]
  );

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
        onClick={(e) => {
          if (e.detail !== 0 && suppressedTouchCells.current.has(`${row}-${col}`)) {
            suppressedTouchCells.current.delete(`${row}-${col}`);
            return;
          }
          suppressedTouchCells.current.clear();
          if (flagMode) handleContextMenu(e, row, col);
          else handleCellClick(row, col);
        }}
        onKeyDown={(e) => {
          if (e.key.toLowerCase() === "f") {
            e.preventDefault();
            if (!e.repeat) handleContextMenu(e, row, col);
          }
          const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLS, ArrowDown: COLS };
          if (e.key in delta) {
            e.preventDefault();
            const index = row * COLS + col;
            const next = index + delta[e.key];
            if (next >= 0 && next < ROWS * COLS &&
                (!(e.key === "ArrowLeft" || e.key === "ArrowRight") || Math.floor(next / COLS) === row)) {
              gridRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
            }
          }
        }}
        onContextMenu={(e) => handleContextMenu(e, row, col)}
        onTouchStart={(e) => {
          if (e.touches.length === 1) handleTouchStart(row, col);
          else {
            cancelLongPress();
            if (activeTouchCell.current !== null) {
              suppressedTouchCells.current.add(activeTouchCell.current);
            }
            suppressedTouchCells.current.add(`${row}-${col}`);
          }
        }}
        onTouchMove={() => {
          cancelLongPress();
          suppressedTouchCells.current.add(`${row}-${col}`);
        }}
        onTouchEnd={() => {
          cancelLongPress();
          activeTouchCell.current = null;
        }}
        onTouchCancel={() => {
          cancelLongPress();
          suppressedTouchCells.current.add(`${row}-${col}`);
        }}
        disabled={game.status !== "playing" && !cell.isRevealed}
        aria-label={`セル ${row + 1}-${col + 1} ${cell.isRevealed ? cell.isMine ? "地雷" : `開いたマス ${cell.adjacentMines}` : cell.isFlagged ? "旗あり" : "未開封"}`}
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
    <GameShell gameId="minerush" layout="default" mobileScroll
      rules={<div className="minerush-rules">
        <p>地雷を避けて、安全な{SAFE_CELL_COUNT}マスをすべて開くとクリア。数字は、斜めを含む周囲8マスの地雷の数です。</p>
        <details>
          <summary>初めて遊ぶときのヒント</summary>
          <ul>
            <li>最初に開くマスとその周囲には地雷がありません。好きなマスから始められます。</li>
            <li>たとえば「1」の周囲には地雷が1個あります。数字を手がかりに、次に開くマスを考えます。</li>
            <li>旗は地雷がありそうなマスに付ける目印です。旗のあるマスは開けません。もう一度旗を切り替えると外せます。</li>
            <li>旗を付けるだけではクリアになりません。地雷以外のマスをすべて開きます。</li>
          </ul>
        </details>
      </div>}
      controlHints={["矢印キーで移動、クリック・Enterで開く", "F・右クリック・長押しで旗。旗モードならタップで切替", "途中の盤面は保存しません。再読み込みで最初から始まります。"]}>
      <div className="minerush-container">
        <header className="minerush-header">
          <div className="minerush-counters">
            <div className="minerush-info">
              {game.status === "playing" ? <>💣 <span>{remainingMines}</span></> : <span role="status">{game.status === "won" ? "クリア！" : "ゲームオーバー"}</span>}
            </div>
            <div className="minerush-progress" aria-label={`開いた安全マス ${game.revealedCount} / ${SAFE_CELL_COUNT}`}>
              安全マス {game.revealedCount} / {SAFE_CELL_COUNT}
            </div>
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

        <button className="minerush-mode-btn" aria-pressed={flagMode} onClick={() => setFlagMode((value) => !value)}>
          {flagMode ? "旗モード：マスを押して旗を切替" : "開くモード：押すと開く"}
        </button>

        <div
          className="minerush-grid"
          ref={gridRef}
          style={{
            gridTemplateColumns: `repeat(${COLS}, 36px)`,
            gridTemplateRows: `repeat(${ROWS}, 36px)`,
          }}
        >
          {game.grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => renderCell(cell, rowIdx, colIdx))
          )}
        </div>

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
