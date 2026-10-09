import { useState, useRef, useCallback, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ComboCounter,
  ScorePopup,
  ShareButton,
  GameRecommendations,
} from "@shared";
import type { PopupVariant } from "@shared";
import {
  initializeGame,
  getSelectedWord,
  isValidSelection,
  checkWord,
  getWordCells,
  formatTime,
} from "./lib/wordsearch";
import { loadBestTime, saveBestTime } from "./lib/storage";
import { DEFAULT_CATEGORY, GRID_SIZE, CELL_SIZE } from "./lib/constants";
import type { Position, GamePhase, GameState } from "./lib/types";
import "./App.css";

// --- 型定義 ---
interface FoundWordCells {
  word: string;
  cells: Position[];
}

interface PopupState {
  text: string | null;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

// スコア計算
const calculateWordScore = (word: string): number => {
  // 基本点: 単語の長さ × 10
  // 長い単語ボーナス: 5文字以上で追加点
  const baseScore = word.length * 10;
  const lengthBonus = word.length >= 5 ? (word.length - 4) * 15 : 0;
  return baseScore + lengthBonus;
};

const calculateComboBonus = (combo: number): number => {
  // コンボボーナス: コンボ数 × 20
  return combo >= 2 ? combo * 20 : 0;
};

const calculateTimeBonus = (elapsedMs: number, timeLimit: number): number => {
  // 残り時間の割合に応じたボーナス
  const remainingRatio = (timeLimit - elapsedMs) / timeLimit;
  if (remainingRatio > 0.7) return 500; // 70%以上残りで500点
  if (remainingRatio > 0.5) return 300; // 50%以上残りで300点
  if (remainingRatio > 0.3) return 100; // 30%以上残りで100点
  return 0;
};

// --- App本体 ---
const App = () => {
  const [phase, setPhase] = useState<GamePhase>("start");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [game, setGame] = useState<GameState | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(loadBestTime);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  // ScorePopup state
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    x: "50%",
    y: "40%",
    variant: "default",
    size: "md",
  });

  // Show popup helper
  const showPopup = useCallback(
    (
      text: string,
      options: {
        x?: string;
        y?: string;
        variant?: PopupVariant;
        size?: "sm" | "md" | "lg" | "xl";
      } = {}
    ) => {
      setPopup((prev) => ({
        text,
        key: prev.key + 1,
        x: options.x ?? "50%",
        y: options.y ?? "40%",
        variant: options.variant ?? "default",
        size: options.size ?? "md",
      }));
    },
    []
  );

  // ドーパミン演出: コンボ管理
  const [combo, setCombo] = useState(0);
  const lastFoundTimeRef = useRef<number>(0);
  const COMBO_TIMEOUT = 5000; // 5秒以内に次の単語を見つけるとコンボ継続

  // ドーパミン演出: 最近見つけた単語のセル（ハイライト用）
  const [recentFoundCells, setRecentFoundCells] = useState<FoundWordCells | null>(null);

  // ドーパミン演出: トレイル用（ドラッグ軌跡）
  const [trailPoints, setTrailPoints] = useState<Position[]>([]);

  // タイマー残り少ない時のパルス (90秒制限)
  const TIME_LIMIT = 90000;
  const WARNING_THRESHOLD = 15000;

  const gridRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // 共有フック
  const audio = useAudio();
  const { particles, sparkle, confetti } = useParticles();

  // タイマー
  useEffect(() => {
    if (phase !== "playing" || !game) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - game.startTime;
      setCurrentTime(elapsed);
      
      // タイムアップ
      if (elapsed >= TIME_LIMIT) {
        clearInterval(interval);
        setPhase("timeout" as GamePhase);
        audio.playWarning();
        return;
      }
      
      // タイマー警告
      if (TIME_LIMIT - elapsed <= WARNING_THRESHOLD && TIME_LIMIT - elapsed > WARNING_THRESHOLD - 100) {
        audio.playWarning();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase, game, audio]);

  // 単語発見時のsparkle + ラインハイライト処理 + ScorePopup
  const handleWordFound = useCallback(
    (word: string, cells: Position[], currentCombo: number) => {
      if (!gridRef.current) return;
      
      // セルの中心座標を取得
      const gridRect = gridRef.current.getBoundingClientRect();
      const centerCell = cells[Math.floor(cells.length / 2)];
      const cellX = gridRect.left + centerCell.col * (CELL_SIZE + 2) + CELL_SIZE / 2 + 8;
      const cellY = gridRect.top + centerCell.row * (CELL_SIZE + 2) + CELL_SIZE / 2 + 8;

      // sparkleエフェクト
      sparkle(cellX, cellY, 12);

      // ラインハイライト（最近見つけた単語）
      setRecentFoundCells({ word, cells });
      setTimeout(() => setRecentFoundCells(null), 800);

      // スコア計算
      const wordScore = calculateWordScore(word);
      const comboBonus = calculateComboBonus(currentCombo);
      const totalPoints = wordScore + comboBonus;
      
      // スコア加算
      setTotalScore((prev) => prev + totalPoints);

      // ScorePopup表示
      if (word.length >= 6) {
        // 長い単語（6文字以上）は特別演出
        showPopup(`🌟 ${word}! +${totalPoints}`, {
          variant: "critical",
          size: "lg",
          y: "35%",
        });
      } else if (currentCombo >= 3) {
        // コンボ3以上
        showPopup(`🔥 ${currentCombo}コンボ! +${totalPoints}`, {
          variant: "combo",
          size: "lg",
          y: "35%",
        });
      } else if (word.length >= 5) {
        // 5文字の単語
        showPopup(`✨ +${totalPoints}`, {
          variant: "bonus",
          size: "md",
          y: "38%",
        });
      } else {
        // 通常の単語
        showPopup(`+${totalPoints}`, {
          variant: "default",
          size: "md",
          y: "40%",
        });
      }

      // コンボ判定
      const now = Date.now();
      if (now - lastFoundTimeRef.current < COMBO_TIMEOUT) {
        setCombo((c) => {
          const newCombo = c + 1;
          audio.playCombo(newCombo);
          return newCombo;
        });
      } else {
        setCombo(1);
        audio.playSuccess();
      }
      lastFoundTimeRef.current = now;
    },
    [sparkle, audio, showPopup]
  );

  // 全単語発見時
  const handleComplete = useCallback(
    (elapsed: number) => {
      setPhase("complete");
      confetti(80);
      audio.playCelebrate();

      // タイムボーナス計算
      const timeBonus = calculateTimeBonus(elapsed, TIME_LIMIT);
      if (timeBonus > 0) {
        setTotalScore((prev) => prev + timeBonus);
        // タイムボーナス表示（少し遅らせて表示）
        setTimeout(() => {
          showPopup(`⏱️ タイムボーナス +${timeBonus}!`, {
            variant: "bonus",
            size: "lg",
            y: "45%",
          });
        }, 500);
      }

      // ベストタイム更新チェック
      const isNewBest = bestTime === null || elapsed < bestTime;
      if (isNewBest) {
        saveBestTime(elapsed);
        setBestTime(elapsed);
        setIsNewRecord(true);
        audio.playPerfect();
        // 新記録表示（さらに遅らせて表示）
        setTimeout(() => {
          showPopup("🏆 NEW RECORD! 🏆", {
            variant: "level",
            size: "xl",
            y: "35%",
          });
        }, 1200);
      } else {
        // クリア表示
        setTimeout(() => {
          showPopup("🎉 COMPLETE!", {
            variant: "level",
            size: "xl",
            y: "35%",
          });
        }, 1200);
      }
    },
    [confetti, audio, bestTime, showPopup]
  );

  // セルのマウス/タッチ座標からグリッド座標を取得
  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number): Position | null => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      const x = clientX - rect.left - 8; // padding分を引く
      const y = clientY - rect.top - 8;
      const col = Math.floor(x / (CELL_SIZE + 2));
      const row = Math.floor(y / (CELL_SIZE + 2));
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
      return { row, col };
    },
    []
  );

  // ドラッグ開始
  const handleDragStart = useCallback(
    (pos: Position) => {
      if (!game || phase !== "playing") return;
      isDragging.current = true;
      setGame((prev) => (prev ? { ...prev, selectedCells: [pos] } : prev));
      setTrailPoints([pos]);
      audio.playClick();
    },
    [game, phase, audio]
  );

  // ドラッグ中
  const handleDragMove = useCallback(
    (pos: Position) => {
      if (!isDragging.current || !game) return;
      setGame((prev) => {
        if (!prev) return prev;
        const alreadySelected = prev.selectedCells.some(
          (c) => c.row === pos.row && c.col === pos.col
        );
        if (alreadySelected) return prev;

        const newCells = [...prev.selectedCells, pos];
        if (!isValidSelection(newCells)) return prev;
        return { ...prev, selectedCells: newCells };
      });
      setTrailPoints((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.row === pos.row && last.col === pos.col) return prev;
        return [...prev, pos];
      });
    },
    [game]
  );

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    if (!isDragging.current || !game) return;
    isDragging.current = false;

    const selectedWord = getSelectedWord(game.grid, game.selectedCells);
    const newState = checkWord(game, selectedWord);

    if (newState.foundWords.length > game.foundWords.length) {
      // 単語が見つかった
      const foundWord = newState.words.find(
        (w) => w.found && !game.words.find((gw) => gw.word === w.word)?.found
      );
      if (foundWord) {
        // コンボ判定（handleWordFound内で更新する前の現在値を渡す）
        const now = Date.now();
        const isCombo = now - lastFoundTimeRef.current < COMBO_TIMEOUT;
        const currentCombo = isCombo ? combo + 1 : 1;
        handleWordFound(foundWord.word, getWordCells(foundWord), currentCombo);
      }

      if (newState.isComplete) {
        handleComplete(newState.elapsedTime);
      }
    } else {
      // 見つからなかった場合は選択クリア
      audio.playTone(200, 0.1, "sine", 0.1);
    }

    setGame({ ...newState, selectedCells: [] });
    setTrailPoints([]);
  }, [game, handleWordFound, handleComplete, audio, combo]);

  // マウスイベント
  const handleMouseDown = (e: ReactMouseEvent) => {
    const pos = getCellFromPoint(e.clientX, e.clientY);
    if (pos) handleDragStart(pos);
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    const pos = getCellFromPoint(e.clientX, e.clientY);
    if (pos) handleDragMove(pos);
  };

  const handleMouseUp = () => handleDragEnd();
  const handleMouseLeave = () => handleDragEnd();

  // タッチイベント
  const handleTouchStart = (e: ReactTouchEvent) => {
    const touch = e.touches[0];
    const pos = getCellFromPoint(touch.clientX, touch.clientY);
    if (pos) handleDragStart(pos);
  };

  const handleTouchMove = (e: ReactTouchEvent) => {
    const touch = e.touches[0];
    const pos = getCellFromPoint(touch.clientX, touch.clientY);
    if (pos) handleDragMove(pos);
  };

  const handleTouchEnd = () => handleDragEnd();

  // ゲーム開始
  const startGame = () => {
    const newGame = initializeGame(category);
    setGame(newGame);
    setPhase("playing");
    setCurrentTime(0);
    setCombo(0);
    setTotalScore(0);
    setIsNewRecord(false);
    lastFoundTimeRef.current = 0;
    audio.playClick();
  };

  // リスタート
  const restartGame = () => {
    setPhase("start");
    setGame(null);
  };

  // セルがfoundかどうかチェック
  const isCellFound = useCallback(
    (row: number, col: number): boolean => {
      if (!game) return false;
      return game.words.some((w) => {
        if (!w.found) return false;
        return getWordCells(w).some((c) => c.row === row && c.col === col);
      });
    },
    [game]
  );

  // セルが選択中かどうか
  const isCellSelected = useCallback(
    (row: number, col: number): boolean => {
      if (!game) return false;
      return game.selectedCells.some((c) => c.row === row && c.col === col);
    },
    [game]
  );

  // セルが最近見つけた単語か
  const isCellRecentFound = useCallback(
    (row: number, col: number): boolean => {
      if (!recentFoundCells) return false;
      return recentFoundCells.cells.some((c) => c.row === row && c.col === col);
    },
    [recentFoundCells]
  );

  // 残り時間
  const remainingTime = TIME_LIMIT - currentTime;
  const isWarning = remainingTime <= WARNING_THRESHOLD && remainingTime > 0;

  // トレイルエフェクトのパス生成
  const trailPath = trailPoints
    .map((p, i) => {
      const x = p.col * (CELL_SIZE + 2) + CELL_SIZE / 2 + 8;
      const y = p.row * (CELL_SIZE + 2) + CELL_SIZE / 2 + 8;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <GameShell gameId="wordsearch" layout="default">
    <div className="wordsearch-root">
      <ParticleLayer particles={particles} />

      {/* スタート画面 */}
      {phase === "start" && (
        <div className="wordsearch-start">
          <h1>🔍 ワードサーチ</h1>
          <p>隠された単語を見つけよう！</p>

          <div className="wordsearch-categories">
            {["animals", "food", "nature"].map((cat) => (
              <button
                key={cat}
                className={`wordsearch-category-btn ${category === cat ? "active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat === "animals" ? "🐾 動物" : cat === "food" ? "🍎 食べ物" : "🌿 自然"}
              </button>
            ))}
          </div>

          {bestTime && (
            <p style={{ color: "#fbbf24", marginBottom: 16 }}>
              ベストタイム: {formatTime(bestTime)}
            </p>
          )}

          <button className="wordsearch-btn" onClick={startGame}>
            スタート
          </button>
        </div>
      )}

      {/* プレイ画面 */}
      {phase === "playing" && game && (
        <>
          <div className="wordsearch-header">
            <h2 className="wordsearch-title">ワードサーチ</h2>
            <div className="wordsearch-stats">
              <span>🎯 {game.foundWords.length}/{game.words.length}</span>
              <span>💎 {totalScore}</span>
              <span className={isWarning ? "timer-warning" : ""}>
                ⏱️ {formatTime(Math.max(0, remainingTime))}
              </span>
            </div>
          </div>

          <ComboCounter combo={combo} position="top-right" threshold={2} />
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            x={popup.x}
            y={popup.y}
            variant={popup.variant}
            size={popup.size}
          />

          <div className="wordsearch-main">
            {/* グリッド */}
            <div
              ref={gridRef}
              className="wordsearch-grid"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* トレイルエフェクト SVG */}
              {trailPoints.length > 1 && (
                <svg className="wordsearch-trail">
                  <path d={trailPath} className="trail-line" />
                </svg>
              )}

              {game.grid.map((row, r) =>
                row.map((char, c) => {
                  const found = isCellFound(r, c);
                  const selected = isCellSelected(r, c);
                  const recentFound = isCellRecentFound(r, c);
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`wordsearch-cell ${found ? "found" : ""} ${selected ? "selected" : ""} ${recentFound ? "recent-found" : ""}`}
                    >
                      {char}
                    </div>
                  );
                })
              )}
            </div>

            {/* 単語リスト */}
            <div className="wordsearch-wordlist">
              <h3>探す単語</h3>
              <ul>
                {game.words.map((w) => (
                  <li key={w.word} className={`wordsearch-word ${w.found ? "found" : ""}`}>
                    {w.word}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 選択中の単語表示 */}
          <div className="wordsearch-selected-word">
            {game.selectedCells.length > 0 && getSelectedWord(game.grid, game.selectedCells)}
          </div>
        </>
      )}

      {/* 完了画面 */}
      {phase === "complete" && game && (
        <div className="wordsearch-complete">
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            x={popup.x}
            y={popup.y}
            variant={popup.variant}
            size={popup.size}
          />
          <h2>🎉 クリア！</h2>
          <p>おめでとうございます！</p>
          <div className="score">スコア: {totalScore}</div>
          <div className="time">{formatTime(game.elapsedTime)}</div>
          {isNewRecord && <div className="newrecord">🏆 NEW RECORD! 🏆</div>}
          {bestTime && !isNewRecord && (
            <div className="best">ベストタイム: {formatTime(bestTime)}</div>
          )}
          <button className="wordsearch-btn" onClick={restartGame}>
            もう一度
          </button>
        </div>
      )}

      {/* タイムアップ画面 */}
      {phase === "timeout" && game && (
        <div className="wordsearch-complete">
          <h2>⏰ タイムアップ！</h2>
          <p>時間切れです</p>
          <div className="score">スコア: {totalScore}</div>
          <div className="found-count">
            見つけた単語: {game.foundWords.length} / {game.words.length}
          </div>
          <button className="wordsearch-btn" onClick={restartGame}>
            もう一度
          </button>
          <ShareButton score={totalScore} gameTitle="Word Search" gameId="wordsearch" />
          <GameRecommendations currentGameId="wordsearch" />
        </div>
      )}
    </div>
    </GameShell>
  );
};

export default App;
