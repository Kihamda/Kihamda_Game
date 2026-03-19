import { useCallback, useEffect, useState, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import type { GameState } from "./lib/types";
import { EMPTY_TILE } from "./lib/constants";
import {
  createInitialState,
  startGame,
  handleTileClick,
  formatTime,
  canMove,
  indexToRowCol,
} from "./lib/slidemaster";
import { loadBestScores, saveBestScores } from "./lib/storage";
import "./App.css";

export default function App() {
  const [game, setGame] = useState<GameState>(() => {
    const { moves, time } = loadBestScores();
    return createInitialState(moves, time);
  });

  const timerRef = useRef<number | null>(null);

  // タイマー更新
  useEffect(() => {
    if (game.phase === "playing" && game.startTime) {
      timerRef.current = window.setInterval(() => {
        setGame((prev) => ({
          ...prev,
          elapsedTime: Date.now() - (prev.startTime ?? 0),
        }));
      }, 50);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [game.phase, game.startTime]);

  // ベストスコア保存
  useEffect(() => {
    if (game.phase === "completed") {
      saveBestScores(game.bestMoves, game.bestTime);
    }
  }, [game.phase, game.bestMoves, game.bestTime]);

  const handleStart = useCallback(() => {
    setGame((prev) => startGame(prev));
  }, []);

  const handleClick = useCallback((index: number) => {
    setGame((prev) => handleTileClick(prev, index));
  }, []);

  const handleReset = useCallback(() => {
    const { moves, time } = loadBestScores();
    setGame(createInitialState(moves, time));
  }, []);

  return (
    <GameShell gameId="slidemaster" layout="default">
      <div className="slidemaster-container">
        <h1 className="slidemaster-title">Slide Master</h1>

        {/* スコア表示 */}
        <div className="slidemaster-stats">
          <div className="slidemaster-stat">
            <span className="slidemaster-stat-label">手数</span>
            <span className="slidemaster-stat-value">{game.moves}</span>
          </div>
          <div className="slidemaster-stat">
            <span className="slidemaster-stat-label">時間</span>
            <span className="slidemaster-stat-value">
              {formatTime(game.elapsedTime)}
            </span>
          </div>
        </div>

        {/* ベストスコア */}
        <div className="slidemaster-best">
          <span>
            Best: {game.bestMoves ?? "--"} 手 /{" "}
            {game.bestTime !== null ? formatTime(game.bestTime) : "--:--"}
          </span>
        </div>

        {/* ゲームボード */}
        <div className="slidemaster-board">
          {game.board.map((tile, index) => {
            const { row, col } = indexToRowCol(index);
            const movable = game.phase === "playing" && canMove(game.board, index);
            
            return (
              <button
                key={index}
                className={`slidemaster-tile ${
                  tile === EMPTY_TILE ? "slidemaster-tile--empty" : ""
                } ${movable ? "slidemaster-tile--movable" : ""}`}
                style={{
                  gridRow: row + 1,
                  gridColumn: col + 1,
                }}
                onClick={() => handleClick(index)}
                disabled={tile === EMPTY_TILE || game.phase !== "playing"}
                aria-label={tile === EMPTY_TILE ? "空きマス" : `タイル ${tile}`}
              >
                {tile !== EMPTY_TILE && tile}
              </button>
            );
          })}
        </div>

        {/* コントロール */}
        <div className="slidemaster-controls">
          {game.phase === "idle" && (
            <button className="slidemaster-btn slidemaster-btn--primary" onClick={handleStart}>
              ゲームスタート
            </button>
          )}
          {game.phase === "playing" && (
            <button className="slidemaster-btn" onClick={handleStart}>
              シャッフル
            </button>
          )}
          {game.phase === "completed" && (
            <>
              <div className="slidemaster-complete">
                🎉 クリア！ {game.moves} 手 / {formatTime(game.elapsedTime)}
              </div>
              <button className="slidemaster-btn slidemaster-btn--primary" onClick={handleStart}>
                もう一度プレイ
              </button>
              <button className="slidemaster-btn" onClick={handleReset}>
                タイトルへ
              </button>
            </>
          )}
        </div>

        <p className="slidemaster-instructions">
          {game.phase === "idle"
            ? "1〜15の数字を順番に並べよう"
            : "空きマスの隣のタイルをクリックして移動"}
        </p>
      </div>
    </GameShell>
  );
}
