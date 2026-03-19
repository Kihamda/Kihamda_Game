import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell } from "@shared/components/GameShell";

/** 矢印方向 */
type Direction = "up" | "down" | "left" | "right";

/** ゲームフェーズ */
type Phase = "idle" | "playing" | "result";

/** 定数 */
const MAX_MISSES = 3;
const INITIAL_TIME_LIMIT = 2000;
const MIN_TIME_LIMIT = 400;
const TIME_DECREASE_PER_COMBO = 50;
const STORAGE_KEY = "arrowdash_highscore";

/** 矢印のマッピング */
const ARROW_MAP: Record<Direction, { icon: string; key: string }> = {
  up: { icon: "↑", key: "ArrowUp" },
  down: { icon: "↓", key: "ArrowDown" },
  left: { icon: "←", key: "ArrowLeft" },
  right: { icon: "→", key: "ArrowRight" },
};

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

/** ハイスコア読み込み */
function loadHighScore(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}

/** ハイスコア保存 */
function saveHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // ignore
  }
}

/** ランダムな矢印を取得 */
function getRandomDirection(): Direction {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
}

/** 制限時間を計算 */
function getTimeLimit(combo: number): number {
  const limit = INITIAL_TIME_LIMIT - combo * TIME_DECREASE_PER_COMBO;
  return Math.max(limit, MIN_TIME_LIMIT);
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentDirection, setCurrentDirection] = useState<Direction>("up");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME_LIMIT);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const timerRef = useRef<number>(0);
  const countdownRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const showNextArrowRef = useRef<(nextCombo: number) => void>(() => {});

  // タイマークリア
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
    if (countdownRef.current) {
      window.cancelAnimationFrame(countdownRef.current);
      countdownRef.current = 0;
    }
  }, []);

  // ゲームオーバー処理
  const handleGameOver = useCallback((finalScore: number) => {
    setPhase("result");
    const currentHighScore = loadHighScore();
    if (finalScore > currentHighScore) {
      setHighScore(finalScore);
      saveHighScore(finalScore);
      setIsNewRecord(true);
    }
  }, []);

  // 次の矢印を表示
  const showNextArrow = useCallback((nextCombo: number) => {
    comboRef.current = nextCombo;

    const direction = getRandomDirection();
    const limit = getTimeLimit(nextCombo);
    setCurrentDirection(direction);
    setTimeLeft(limit);
    startTimeRef.current = performance.now();

    // カウントダウンアニメーション
    const updateCountdown = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = limit - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        return;
      }
      setTimeLeft(remaining);
      countdownRef.current = window.requestAnimationFrame(updateCountdown);
    };
    countdownRef.current = window.requestAnimationFrame(updateCountdown);

    // タイムアウト処理
    timerRef.current = window.setTimeout(() => {
      clearTimers();
      setFeedback("wrong");
      setMisses((prev) => {
        const newMisses = prev + 1;
        if (newMisses >= MAX_MISSES) {
          setTimeout(() => {
            handleGameOver(scoreRef.current);
          }, 500);
        } else {
          setCombo(0);
          setTimeout(() => {
            setFeedback(null);
            showNextArrowRef.current(0);
          }, 500);
        }
        return newMisses;
      });
    }, limit);
  }, [clearTimers, handleGameOver]);

  // ref を更新
  useEffect(() => {
    showNextArrowRef.current = showNextArrow;
  });

  // ゲーム開始
  const startGame = useCallback(() => {
    clearTimers();
    setPhase("playing");
    setScore(0);
    scoreRef.current = 0;
    setCombo(0);
    setMisses(0);
    setFeedback(null);
    setIsNewRecord(false);
    showNextArrow(0);
  }, [clearTimers, showNextArrow]);

  // キー入力処理
  const handleKeyInput = useCallback((direction: Direction) => {
    if (phase !== "playing" || feedback !== null) return;

    clearTimers();

    if (direction === currentDirection) {
      // 正解
      setFeedback("correct");
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);
      const newScore = scoreRef.current + 10 + newCombo * 5;
      setScore(newScore);
      scoreRef.current = newScore;

      setTimeout(() => {
        setFeedback(null);
        showNextArrowRef.current(newCombo);
      }, 300);
    } else {
      // 不正解
      setFeedback("wrong");
      setMisses((prev) => {
        const newMisses = prev + 1;
        if (newMisses >= MAX_MISSES) {
          setTimeout(() => {
            handleGameOver(scoreRef.current);
          }, 500);
        } else {
          setCombo(0);
          setTimeout(() => {
            setFeedback(null);
            showNextArrowRef.current(0);
          }, 500);
        }
        return newMisses;
      });
    }
  }, [phase, feedback, currentDirection, clearTimers, handleGameOver]);

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== "playing") return;

      const dir = DIRECTIONS.find((d) => ARROW_MAP[d].key === e.key);
      if (dir) {
        e.preventDefault();
        handleKeyInput(dir);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleKeyInput]);

  // アンマウント時にタイマークリア
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // タイムバーの割合
  const timeRatio = timeLeft / getTimeLimit(combo);

  return (
    <GameShell gameId="arrowdash" layout="immersive">
      <div className="arrowdash-root">
        <h1 className="arrowdash-title">🏃 Arrow Dash</h1>

        {phase === "idle" && (
          <div className="arrowdash-panel">
            <p className="arrowdash-description">
              矢印の方向を素早く入力！
            </p>
            <p className="arrowdash-description">
              連続正解でスピードアップ！
            </p>
            <p className="arrowdash-description small">
              ミス3回でゲームオーバー
            </p>
            {highScore > 0 && (
              <p className="arrowdash-highscore">🏆 ハイスコア: {highScore}</p>
            )}
            <div className="arrowdash-controls">
              <span className="arrowdash-key">↑</span>
              <span className="arrowdash-key">↓</span>
              <span className="arrowdash-key">←</span>
              <span className="arrowdash-key">→</span>
            </div>
            <button
              type="button"
              className="arrowdash-button"
              onClick={startGame}
            >
              スタート
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="arrowdash-game">
            <div className="arrowdash-stats">
              <div className="arrowdash-stat">
                <span className="stat-label">スコア</span>
                <span className="stat-value">{score}</span>
              </div>
              <div className="arrowdash-stat">
                <span className="stat-label">コンボ</span>
                <span className="stat-value combo">{combo}</span>
              </div>
              <div className="arrowdash-stat">
                <span className="stat-label">ミス</span>
                <span className="stat-value misses">
                  {"❌".repeat(misses)}{"⚪".repeat(MAX_MISSES - misses)}
                </span>
              </div>
            </div>

            <div className="arrowdash-timebar">
              <div
                className="arrowdash-timebar-fill"
                style={{ width: `${timeRatio * 100}%` }}
              />
            </div>

            <div
              className={`arrowdash-arrow-container ${
                feedback === "correct" ? "correct" : feedback === "wrong" ? "wrong" : ""
              }`}
            >
              <span className="arrowdash-arrow">
                {ARROW_MAP[currentDirection].icon}
              </span>
            </div>

            {feedback && (
              <div className={`arrowdash-feedback ${feedback}`}>
                {feedback === "correct" ? "✓ 正解！" : "✗ ミス！"}
              </div>
            )}

            <div className="arrowdash-buttons">
              <button
                type="button"
                className="arrowdash-arrow-btn"
                onClick={() => handleKeyInput("up")}
                disabled={feedback !== null}
              >
                ↑
              </button>
              <div className="arrowdash-buttons-row">
                <button
                  type="button"
                  className="arrowdash-arrow-btn"
                  onClick={() => handleKeyInput("left")}
                  disabled={feedback !== null}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="arrowdash-arrow-btn"
                  onClick={() => handleKeyInput("down")}
                  disabled={feedback !== null}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="arrowdash-arrow-btn"
                  onClick={() => handleKeyInput("right")}
                  disabled={feedback !== null}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="arrowdash-panel">
            <p className="arrowdash-result-title">🎉 ゲームオーバー</p>
            <p className="arrowdash-final-score">スコア: {score}</p>
            {isNewRecord && (
              <p className="arrowdash-newrecord">🏆 新記録！</p>
            )}
            {!isNewRecord && highScore > 0 && (
              <p className="arrowdash-highscore">ハイスコア: {highScore}</p>
            )}
            <button
              type="button"
              className="arrowdash-button"
              onClick={startGame}
            >
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
