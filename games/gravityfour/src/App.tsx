import { useState, useCallback, useEffect } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  createInitialState,
  dropPiece,
  canDropInColumn,
  getDropRow,
} from "./lib/game";
import type { GameState, DroppingPiece, Player } from "./lib/types";
import { COLS, ROWS } from "./lib/types";
import "./App.css";

export default function App() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [dropping, setDropping] = useState<DroppingPiece | null>(null);

  const handleColumnClick = useCallback(
    (col: number) => {
      if (state.winner || state.isDraw || dropping) return;
      if (!canDropInColumn(state.board, col)) return;

      const targetRow = getDropRow(state.board, col);
      if (targetRow === -1) return;

      // アニメーション開始
      setDropping({
        col,
        targetRow,
        player: state.currentPlayer,
      });
    },
    [state, dropping]
  );

  // アニメーション完了後に状態を更新
  useEffect(() => {
    if (!dropping) return;

    const timer = setTimeout(() => {
      setState((prev) => dropPiece(prev, dropping.col));
      setDropping(null);
    }, 400); // CSS transitionと同期

    return () => clearTimeout(timer);
  }, [dropping]);

  const handleReset = useCallback(() => {
    setState(createInitialState());
    setDropping(null);
    setHoveredCol(null);
  }, []);

  const handleCellHover = useCallback(
    (col: number) => {
      if (!state.winner && !state.isDraw && !dropping) {
        setHoveredCol(col);
      }
    },
    [state.winner, state.isDraw, dropping]
  );

  const handleBoardLeave = useCallback(() => {
    setHoveredCol(null);
  }, []);

  const isWinCell = (row: number, col: number): boolean => {
    if (!state.winLine) return false;
    return state.winLine.cells.some(([r, c]) => r === row && c === col);
  };

  const renderStatus = () => {
    if (state.winner) {
      return (
        <p
          className={`gravityfour-status gravityfour-status--player${state.winner} gravityfour-status--winner`}
        >
          🎉 プレイヤー{state.winner === 1 ? "1 (赤)" : "2 (黄)"} の勝利！
        </p>
      );
    }
    if (state.isDraw) {
      return (
        <p className="gravityfour-status gravityfour-status--draw">
          引き分けです
        </p>
      );
    }
    return (
      <p
        className={`gravityfour-status gravityfour-status--player${state.currentPlayer}`}
      >
        プレイヤー{state.currentPlayer === 1 ? "1 (赤)" : "2 (黄)"} の番
      </p>
    );
  };

  const getCellClassName = (row: number, col: number): string => {
    const cell = state.board[row][col];
    const classes = ["gravityfour-cell"];

    if (cell === 1) classes.push("gravityfour-cell--player1");
    if (cell === 2) classes.push("gravityfour-cell--player2");
    if (isWinCell(row, col)) classes.push("gravityfour-cell--win");

    return classes.join(" ");
  };

  const currentPlayer: Player = state.currentPlayer;

  return (
    <GameShell gameId="gravityfour" layout="default">
      <div className="gravityfour-root">
        <header className="gravityfour-header">
          <h1 className="gravityfour-title">重力四目</h1>
          {renderStatus()}
        </header>

        <div
          className="gravityfour-board-wrapper"
          onMouseLeave={handleBoardLeave}
        >
          {/* 列インジケーター */}
          <div className="gravityfour-column-indicator">
            {Array.from({ length: COLS }).map((_, col) => (
              <div
                key={col}
                className={`gravityfour-indicator ${
                  hoveredCol === col &&
                  canDropInColumn(state.board, col) &&
                  !dropping
                    ? "gravityfour-indicator--active"
                    : ""
                }`}
              >
                <div
                  className={`gravityfour-indicator-piece gravityfour-indicator-piece--player${currentPlayer}`}
                />
              </div>
            ))}
          </div>

          {/* ボード */}
          <div className="gravityfour-board">
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => (
                <div
                  key={`${row}-${col}`}
                  className={getCellClassName(row, col)}
                  onClick={() => handleColumnClick(col)}
                  onMouseEnter={() => handleCellHover(col)}
                />
              ))
            )}
          </div>

          {/* 落下アニメーション用オーバーレイ */}
          {dropping && (
            <div className="gravityfour-dropping-overlay">
              <div
                className={`gravityfour-dropping-piece gravityfour-dropping-piece--player${dropping.player}`}
                style={{
                  left: dropping.col * 76,
                  transform: `translateY(${dropping.targetRow * 76}px)`,
                }}
              />
            </div>
          )}
        </div>

        <footer className="gravityfour-footer">
          <button
            type="button"
            className="gravityfour-reset-btn"
            onClick={handleReset}
          >
            リセット
          </button>
        </footer>
      </div>
    </GameShell>
  );
}
