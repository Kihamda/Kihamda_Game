import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup, type PopupVariant } from "@shared/components/ScorePopup";
import { ShareButton } from "@shared/components/ShareButton";
import { GameRecommendations } from "@shared/components/GameRecommendations";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import {
  initGame,
  movePiece,
  rotatePiece,
  dropPiece,
  hardDrop,
  getGhostPositions,
  getDropInterval,
} from "./lib/game";
import type { GameState, GamePhase, GameEvent } from "./lib/types";
import {
  BOARD_ROWS,
  BOARD_COLS,
  CELL_SIZE,
  TETROMINO_COLORS,
  TETROMINO_SHAPES,
} from "./lib/constants";
import "./App.css";

const BOARD_WIDTH = BOARD_COLS * CELL_SIZE;
const BOARD_HEIGHT = BOARD_ROWS * CELL_SIZE;

export default function App() {
  const [game, setGame] = useState<GameState>(initGame);
  const [phase, setPhase] = useState<GamePhase>("start");
  const dropIntervalRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // ドーパミン演出用フック
  const { particles, burst, confetti, explosion } = useParticles();
  const { playTone, playArpeggio, playLevelUp, playGameOver } = useAudio();

  // 画面フラッシュ用
  const [flashActive, setFlashActive] = useState(false);
  // バウンスアニメーション用
  const [bounceActive, setBounceActive] = useState(false);
  // レベルアップ表示用
  const [showLevelUp, setShowLevelUp] = useState(false);
  // 前回のレベル（レベルアップ検出用）
  const prevLevelRef = useRef(1);
  // スコアポップアップ用
  const [scorePopup, setScorePopup] = useState<{ text: string; variant: PopupVariant; key: number } | null>(null);
  const popupKeyRef = useRef(0);

  // 効果音再生関数
  const playDropSound = useCallback(() => {
    playTone(150, 0.08, "square", 0.2);
  }, [playTone]);

  const playClearSound = useCallback((lines: number) => {
    if (lines === 1) {
      playTone(523, 0.1, "sine", 0.25);
      playTone(659, 0.15, "sine", 0.2, 0.08);
    } else if (lines === 2) {
      playArpeggio([523, 659], 0.12, "sine", 0.25, 0.08);
    } else if (lines === 3) {
      playArpeggio([523, 659, 784], 0.12, "sine", 0.28, 0.08);
    }
  }, [playTone, playArpeggio]);

  const playTetrisSound = useCallback(() => {
    playArpeggio([523, 659, 784, 1047], 0.15, "sine", 0.3, 0.06);
    playArpeggio([784, 988, 1175, 1568], 0.2, "triangle", 0.25, 0.1);
  }, [playArpeggio]);

  // スコアポップアップを表示
  const showScorePopup = useCallback((text: string, variant: PopupVariant) => {
    popupKeyRef.current += 1;
    setScorePopup({ text, variant, key: popupKeyRef.current });
    setTimeout(() => setScorePopup(null), variant === "critical" ? 1200 : 800);
  }, []);

  // ライン消去時のスコア計算（レベル倍率込み）
  const getLineScore = useCallback((lines: number, level: number): number => {
    const baseScores: Record<number, number> = { 1: 100, 2: 300, 3: 500, 4: 800 };
    return (baseScores[lines] || 0) * level;
  }, []);

  // イベントに応じた演出処理
  const triggerEffects = useCallback((event: GameEvent) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    switch (event.type) {
      case "drop":
        playDropSound();
        setBounceActive(true);
        setTimeout(() => setBounceActive(false), 150);
        break;

      case "clear": {
        const lines = event.linesCleared || 1;
        playClearSound(lines);
        // スコアポップアップ
        const score = getLineScore(lines, game.level);
        const variant: PopupVariant = lines === 1 ? "default" : lines === 2 ? "combo" : "bonus";
        showScorePopup(`+${score}`, variant);
        // 消えた行の位置でパーティクル
        if (event.clearedRows) {
          event.clearedRows.forEach((row) => {
            const y = rect.top + row * CELL_SIZE + CELL_SIZE / 2;
            burst(centerX, y, 15);
          });
        }
        break;
      }

      case "tetris": {
        playTetrisSound();
        // スコアポップアップ (Tetris!)
        const score = getLineScore(4, game.level);
        showScorePopup(`TETRIS! +${score}`, "critical");
        // 画面フラッシュ
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 200);
        // confetti
        confetti(60);
        // 爆発パーティクル
        if (event.clearedRows) {
          event.clearedRows.forEach((row) => {
            const y = rect.top + row * CELL_SIZE + CELL_SIZE / 2;
            explosion(centerX, y, 20);
          });
        }
        break;
      }

      case "levelup":
        playLevelUp();
        // 消えた行があれば通常のパーティクルも
        if (event.clearedRows && event.linesCleared && event.linesCleared > 0) {
          event.clearedRows.forEach((row) => {
            const y = rect.top + row * CELL_SIZE + CELL_SIZE / 2;
            burst(centerX, y, 12);
          });
        }
        // レベルアップ表示
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 1500);
        // confetti
        confetti(40);
        break;
    }
  }, [playDropSound, playClearSound, playTetrisSound, playLevelUp, burst, confetti, explosion, showScorePopup, getLineScore, game.level]);

  // イベント監視（レベルアップも検出）
  // 最後のイベントIDを追跡してイベント重複処理を防ぐ
  const lastProcessedEventRef = useRef<string>("");
  
  useEffect(() => {
    if (game.lastEvent.type === "none") return;
    
    // イベントの一意キーを生成（同じイベントの重複処理を防ぐ）
    const eventKey = `${game.lastEvent.type}-${game.score}-${game.level}-${game.linesCleared}`;
    if (lastProcessedEventRef.current === eventKey) return;
    lastProcessedEventRef.current = eventKey;

    // レベルアップを検出（clearでレベルアップした場合はlevelupとして扱う）
    const effectEvent = game.level > prevLevelRef.current && game.lastEvent.type !== "levelup"
      ? { ...game.lastEvent, type: "levelup" as const }
      : game.lastEvent;
    
    // 次フレームで呼び出してカスケードレンダリングを回避
    const raf = requestAnimationFrame(() => {
      triggerEffects(effectEvent);
    });
    
    prevLevelRef.current = game.level;
    
    return () => cancelAnimationFrame(raf);
  }, [game.lastEvent, game.score, game.level, game.linesCleared, triggerEffects]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (phase !== "playing") return;

      switch (e.key) {
        case "ArrowLeft":
        case "a":
          e.preventDefault();
          setGame((prev) => movePiece(prev, -1));
          break;
        case "ArrowRight":
        case "d":
          e.preventDefault();
          setGame((prev) => movePiece(prev, 1));
          break;
        case "ArrowUp":
        case "w":
          e.preventDefault();
          setGame((prev) => rotatePiece(prev));
          break;
        case "ArrowDown":
        case "s":
          e.preventDefault();
          setGame((prev) => dropPiece(prev));
          break;
        case " ":
          e.preventDefault();
          setGame((prev) => hardDrop(prev));
          break;
        case "p":
        case "Escape":
          e.preventDefault();
          setPhase("paused");
          setGame((prev) => ({ ...prev, isPaused: true }));
          break;
      }
    },
    [phase]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (phase !== "playing" || game.gameOver) {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
      return;
    }

    const interval = getDropInterval(game.level);
    dropIntervalRef.current = window.setInterval(() => {
      setGame((prev) => {
        const newState = dropPiece(prev);
        if (newState.gameOver) {
          setPhase("gameover");
        }
        return newState;
      });
    }, interval);

    return () => {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
      }
    };
  }, [phase, game.level, game.gameOver]);

  // ゲームオーバー検出して演出をトリガー
  const gameOverPlayedRef = useRef(false);
  useEffect(() => {
    if (game.gameOver && phase === "gameover" && !gameOverPlayedRef.current) {
      gameOverPlayedRef.current = true;
      playGameOver();
    }
    if (!game.gameOver) {
      gameOverPlayedRef.current = false;
    }
  }, [game.gameOver, phase, playGameOver]);

  const startGame = useCallback(() => {
    setGame(initGame());
    setPhase("playing");
  }, []);

  const resumeGame = useCallback(() => {
    setPhase("playing");
    setGame((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const ghostPositions = getGhostPositions(game.board, game.currentPiece);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || phase !== "playing") return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    const minSwipe = 30;

    if (elapsed < 200 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      setGame((prev) => rotatePiece(prev));
    } else if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipe) {
        setGame((prev) => movePiece(prev, dx > 0 ? 1 : -1));
      }
    } else {
      if (dy > minSwipe) {
        if (dy > 100) {
          setGame((prev) => hardDrop(prev));
        } else {
          setGame((prev) => dropPiece(prev));
        }
      }
    }

    touchStartRef.current = null;
  }, [phase]);

  const renderNextPiece = () => {
    const shape = TETROMINO_SHAPES[game.nextPiece];
    const color = TETROMINO_COLORS[game.nextPiece];
    const previewSize = 20;

    const minCol = Math.min(...shape.map((p) => p.col));
    const maxCol = Math.max(...shape.map((p) => p.col));
    const minRow = Math.min(...shape.map((p) => p.row));
    const maxRow = Math.max(...shape.map((p) => p.row));
    const width = (maxCol - minCol + 1) * previewSize;
    const height = (maxRow - minRow + 1) * previewSize;

    return (
      <div
        className="fallingblocks-next-preview"
        style={{ width: 100, height: 80, position: "relative" }}
      >
        {shape.map((pos, i) => (
          <div
            key={i}
            className="fallingblocks-cell"
            style={{
              width: previewSize,
              height: previewSize,
              backgroundColor: color,
              position: "absolute",
              left: (50 - width / 2) + (pos.col - minCol) * previewSize,
              top: (40 - height / 2) + (pos.row - minRow) * previewSize,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <GameShell gameId="fallingblocks" layout="default">
      <div className="fallingblocks-container" style={{ width: 500, height: 700 }}>
        {phase === "start" && (
          <div className="fallingblocks-overlay">
            <h1 className="fallingblocks-title">Falling Blocks</h1>
            <p className="fallingblocks-instructions">
              ←→: 移動 / ↑: 回転 / ↓: 落下 / Space: 即落下
            </p>
            <button className="fallingblocks-btn" onClick={startGame}>
              スタート
            </button>
          </div>
        )}

        {phase === "paused" && (
          <div className="fallingblocks-overlay">
            <h2>一時停止</h2>
            <button className="fallingblocks-btn" onClick={resumeGame}>
              再開
            </button>
          </div>
        )}

        {phase === "gameover" && (
          <div className="fallingblocks-overlay">
            <h2>GAME OVER</h2>
            <p className="fallingblocks-final-score">Score: {game.score}</p>
            <ShareButton score={game.score} gameTitle="Falling Blocks" gameId="fallingblocks" />
            <GameRecommendations currentGameId="fallingblocks" />
            <button className="fallingblocks-btn" onClick={startGame}>
              もう一度
            </button>
          </div>
        )}

        <div className="fallingblocks-game-area">
          <div className="fallingblocks-info-panel">
            <div className="fallingblocks-info-box">
              <div className="fallingblocks-info-label">SCORE</div>
              <div className="fallingblocks-info-value">{game.score}</div>
            </div>
            <div className="fallingblocks-info-box">
              <div className="fallingblocks-info-label">LEVEL</div>
              <div className="fallingblocks-info-value">{game.level}</div>
            </div>
            <div className="fallingblocks-info-box">
              <div className="fallingblocks-info-label">LINES</div>
              <div className="fallingblocks-info-value">{game.linesCleared}</div>
            </div>
            <div className="fallingblocks-info-box">
              <div className="fallingblocks-info-label">NEXT</div>
              {renderNextPiece()}
            </div>
          </div>

          <div
            ref={boardRef}
            className={`fallingblocks-board ${bounceActive ? "fallingblocks-board--bounce" : ""}`}
            style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {Array.from({ length: BOARD_ROWS * BOARD_COLS }).map((_, i) => {
              const row = Math.floor(i / BOARD_COLS);
              const col = i % BOARD_COLS;
              return (
                <div
                  key={"bg-" + i}
                  className="fallingblocks-cell fallingblocks-cell--empty"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    position: "absolute",
                    left: col * CELL_SIZE,
                    top: row * CELL_SIZE,
                  }}
                />
              );
            })}

            {game.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                if (!cell) return null;
                return (
                  <div
                    key={"locked-" + rowIndex + "-" + colIndex}
                    className="fallingblocks-cell"
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: TETROMINO_COLORS[cell],
                      position: "absolute",
                      left: colIndex * CELL_SIZE,
                      top: rowIndex * CELL_SIZE,
                    }}
                  />
                );
              })
            )}

            {game.currentPiece &&
              ghostPositions.map((pos, i) => (
                <div
                  key={"ghost-" + i}
                  className="fallingblocks-cell fallingblocks-cell--ghost"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    borderColor: TETROMINO_COLORS[game.currentPiece!.type],
                    position: "absolute",
                    left: pos.col * CELL_SIZE,
                    top: pos.row * CELL_SIZE,
                  }}
                />
              ))}

            {game.currentPiece &&
              game.currentPiece.positions.map((pos, i) => (
                <div
                  key={"current-" + i}
                  className="fallingblocks-cell"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: TETROMINO_COLORS[game.currentPiece!.type],
                    position: "absolute",
                    left: pos.col * CELL_SIZE,
                    top: pos.row * CELL_SIZE,
                  }}
                />
              ))}
          </div>
        </div>

        {phase === "playing" && (
          <div className="fallingblocks-mobile-controls">
            <button
              className="fallingblocks-control-btn"
              onClick={() => setGame((prev) => movePiece(prev, -1))}
            >
              ←
            </button>
            <button
              className="fallingblocks-control-btn"
              onClick={() => setGame((prev) => rotatePiece(prev))}
            >
              ↻
            </button>
            <button
              className="fallingblocks-control-btn"
              onClick={() => setGame((prev) => dropPiece(prev))}
            >
              ↓
            </button>
            <button
              className="fallingblocks-control-btn"
              onClick={() => setGame((prev) => movePiece(prev, 1))}
            >
              →
            </button>
            <button
              className="fallingblocks-control-btn fallingblocks-control-btn--drop"
              onClick={() => setGame((prev) => hardDrop(prev))}
            >
              ⬇
            </button>
          </div>
        )}

        {/* 画面フラッシュ（テトリス時） */}
        {flashActive && <div className="fallingblocks-flash" />}

        {/* レベルアップ表示 */}
        {showLevelUp && (
          <div className="fallingblocks-levelup">
            <span>LEVEL UP!</span>
            <span className="fallingblocks-levelup-num">{game.level}</span>
          </div>
        )}

        {/* スコアポップアップ */}
        <ScorePopup
          text={scorePopup?.text ?? null}
          popupKey={scorePopup?.key ?? 0}
          x="50%"
          y="35%"
          variant={scorePopup?.variant ?? "default"}
          size={scorePopup?.variant === "critical" ? "lg" : "md"}
        />

        {/* パーティクル */}
        <ParticleLayer particles={particles} />
      </div>
    </GameShell>
  );
}