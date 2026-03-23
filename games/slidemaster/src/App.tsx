import { useCallback, useEffect, useState, useRef } from "react";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
} from "@shared";
import type { PopupVariant } from "@shared";
import type { GameState } from "./lib/types";
import { EMPTY_TILE, GRID_SIZE } from "./lib/constants";
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
  const boardRef = useRef<HTMLDivElement>(null);

  // ドーパミンエフェクト用フック
  const audio = useAudio();
  const { particles, sparkle, confetti } = useParticles();
  
  // スコアポップアップ用state
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    variant: PopupVariant;
    x: string;
    y: string;
  } | null>(null);

  /** スコアポップアップ表示 */
  const showPopup = useCallback(
    (text: string, variant: PopupVariant = "default", x = "50%", y = "40%") => {
      setPopup({ text, key: Date.now(), variant, x, y });
      setTimeout(() => setPopup(null), 1500);
    },
    []
  );

  /** タイル位置からエフェクト座標を計算 */
  const getTilePosition = useCallback((index: number) => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const boardRect = boardRef.current.getBoundingClientRect();
    const { row, col } = indexToRowCol(index);
    const tileSize = boardRect.width / GRID_SIZE;
    return {
      x: boardRect.left + (col + 0.5) * tileSize,
      y: boardRect.top + (row + 0.5) * tileSize,
    };
  }, []);

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
    audio.playClick();
  }, [audio]);

  const handleClick = useCallback((index: number) => {
    setGame((prev) => {
      const next = handleTileClick(prev, index);
      
      // 移動が成功したか判定
      if (next.moves > prev.moves) {
        // タイル移動成功時
        audio.playClick();
        const pos = getTilePosition(index);
        sparkle(pos.x, pos.y, 6);

        // クリア判定
        if (next.phase === "completed") {
          // クリア時のエフェクト
          setTimeout(() => {
            confetti(60);
            
            // ベストスコア更新判定
            const isNewBestMoves = prev.bestMoves === null || next.moves < prev.bestMoves;
            const isNewBestTime = prev.bestTime === null || next.elapsedTime < prev.bestTime;
            
            if (isNewBestMoves || isNewBestTime) {
              audio.playPerfect();
              showPopup("🏆 NEW RECORD!", "critical");
            } else {
              audio.playCelebrate();
              showPopup("🎉 CLEAR!", "bonus");
            }
          }, 200);
        }
      }
      
      return next;
    });
  }, [audio, getTilePosition, sparkle, confetti, showPopup]);

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
        <div className="slidemaster-board" ref={boardRef}>
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

        {/* パーティクルエフェクト */}
        <ParticleLayer particles={particles} />
        
        {/* スコアポップアップ */}
        {popup && (
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            variant={popup.variant}
            x={popup.x}
            y={popup.y}
            size="lg"
          />
        )}
      </div>
    </GameShell>
  );
}
