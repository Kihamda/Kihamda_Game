import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell } from "@shared/components/GameShell";
import { ScreenShake } from "@shared/components/ScreenShake";
import { ComboCounter } from "@shared/components/ComboCounter";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import type { PopupVariant } from "@shared/components/ScorePopup";

/** ScorePopupのエントリ */
interface PopupEntry {
  id: number;
  text: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  x: string;
  y: string;
}

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
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "perfect" | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isPerfect, setIsPerfect] = useState(false);
  const [popups, setPopups] = useState<PopupEntry[]>([]);

  const timerRef = useRef<number>(0);
  const popupIdRef = useRef(0);
  const countdownRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const showNextArrowRef = useRef<(nextCombo: number) => void>(() => {});
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const arrowContainerRef = useRef<HTMLDivElement>(null);

  // パーティクル演出
  const { particles, sparkle, confetti } = useParticles();

  // 効果音
  const { playSuccess, playPerfect, playMiss, playCombo, playCelebrate } = useAudio();

  // ScorePopup表示
  const showPopup = useCallback((
    text: string, 
    variant: PopupVariant = "default", 
    size: "sm" | "md" | "lg" | "xl" = "md",
    offsetX = 0,
    offsetY = 0
  ) => {
    const id = ++popupIdRef.current;
    const x = `calc(50% + ${offsetX}px)`;
    const y = `calc(35% + ${offsetY}px)`;
    setPopups((prev) => [...prev, { id, text, variant, size, x, y }]);
    // 自動削除
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1500);
  }, []);

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
      // ハイスコア更新ポップアップ
      showPopup("🏆 NEW RECORD!", "level", "xl", 0, -60);
      // ハイスコア更新時の紙吹雪
      confetti(60);
      playCelebrate();
    }
  }, [confetti, playCelebrate, showPopup]);

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
      // ミス時の画面シェイク
      shakeRef.current?.shake("medium", 300);
      playMiss();
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
  }, [clearTimers, handleGameOver, playMiss]);

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
    setIsPerfect(false);
    setPopups([]);
    showNextArrow(0);
  }, [clearTimers, showNextArrow]);

  // sparkle発火用関数
  const triggerSparkle = useCallback(() => {
    const el = arrowContainerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      sparkle(centerX, centerY, 10);
    }
  }, [sparkle]);

  // キー入力処理
  const handleKeyInput = useCallback((direction: Direction) => {
    if (phase !== "playing" || feedback !== null) return;

    clearTimers();

    if (direction === currentDirection) {
      // 正解
      const elapsed = performance.now() - startTimeRef.current;
      const limit = getTimeLimit(comboRef.current);
      const remainingRatio = (limit - elapsed) / limit;
      
      // パーフェクト判定（70%以上残ってる場合）
      const perfectHit = remainingRatio >= 0.7;
      setIsPerfect(perfectHit);
      
      if (perfectHit) {
        setFeedback("perfect");
        playPerfect();
      } else {
        setFeedback("correct");
        playSuccess();
      }
      
      const newCombo = comboRef.current + 1;
      setCombo(newCombo);
      
      // パーフェクト時はボーナス
      const baseScore = perfectHit ? 20 : 10;
      const comboBonus = newCombo * 5;
      const pointsGained = baseScore + comboBonus;
      const newScore = scoreRef.current + pointsGained;
      setScore(newScore);
      scoreRef.current = newScore;

      // ScorePopup: 正解ポイント
      const randomOffsetX = (Math.random() - 0.5) * 40;
      showPopup(`+${pointsGained}`, perfectHit ? "critical" : "default", perfectHit ? "lg" : "md", randomOffsetX, 0);

      // ScorePopup: パーフェクトボーナス
      if (perfectHit) {
        setTimeout(() => {
          showPopup("⚡ SPEED BONUS!", "bonus", "md", 0, 30);
        }, 100);
      }

      // ScorePopup: コンボマイルストーン
      if (newCombo === 5) {
        setTimeout(() => showPopup("🔥 5 COMBO!", "combo", "lg", 0, 60), 150);
      } else if (newCombo === 10) {
        setTimeout(() => showPopup("🔥🔥 10 COMBO!", "combo", "xl", 0, 60), 150);
      } else if (newCombo === 20) {
        setTimeout(() => showPopup("🔥🔥🔥 20 COMBO!", "critical", "xl", 0, 60), 150);
      } else if (newCombo === 50) {
        setTimeout(() => showPopup("💥 50 COMBO!!", "level", "xl", 0, 60), 150);
      } else if (newCombo > 0 && newCombo % 25 === 0 && newCombo > 50) {
        setTimeout(() => showPopup(`🌟 ${newCombo} COMBO!`, "level", "xl", 0, 60), 150);
      }

      // ScorePopup: レベルアップ（制限時間の閾値通過）
      const prevLimit = getTimeLimit(comboRef.current);
      const nextLimit = getTimeLimit(newCombo);
      if (nextLimit < prevLimit && nextLimit === MIN_TIME_LIMIT) {
        setTimeout(() => showPopup("⚠️ MAX SPEED!", "level", "xl", 0, 90), 200);
      }

      // sparkleエフェクト
      triggerSparkle();
      
      // コンボ効果音（5コンボ以上）
      if (newCombo >= 5) {
        playCombo(newCombo);
      }

      setTimeout(() => {
        setFeedback(null);
        setIsPerfect(false);
        showNextArrowRef.current(newCombo);
      }, 300);
    } else {
      // 不正解
      setFeedback("wrong");
      // ミス時の画面シェイク
      shakeRef.current?.shake("medium", 300);
      playMiss();
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
  }, [phase, feedback, currentDirection, clearTimers, handleGameOver, playSuccess, playPerfect, playMiss, playCombo, triggerSparkle, showPopup]);

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
      <ScreenShake ref={shakeRef}>
        <div className="arrowdash-root">
          <ParticleLayer particles={particles} />
          {/* ScorePopupレイヤー */}
          {popups.map((p) => (
            <ScorePopup
              key={p.id}
              popupKey={p.id}
              text={p.text}
              variant={p.variant}
              size={p.size}
              x={p.x}
              y={p.y}
            />
          ))}
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
                ミス3回でゲームオーバー / 素早い入力で🌈パーフェクト！
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
                  <span className="stat-label">ミス</span>
                  <span className="stat-value misses">
                    {"❌".repeat(misses)}{"⚪".repeat(MAX_MISSES - misses)}
                  </span>
                </div>
              </div>

              {/* コンボカウンター */}
              <ComboCounter combo={combo} position="top-right" threshold={3} />

              <div className="arrowdash-timebar">
                <div
                  className="arrowdash-timebar-fill"
                  style={{ width: `${timeRatio * 100}%` }}
                />
              </div>

              <div
                ref={arrowContainerRef}
                className={`arrowdash-arrow-container ${
                  feedback === "perfect" ? "perfect" :
                  feedback === "correct" ? "correct" : 
                  feedback === "wrong" ? "wrong" : ""
                }${isPerfect ? " rainbow" : ""}`}
              >
                <span className="arrowdash-arrow">
                  {ARROW_MAP[currentDirection].icon}
                </span>
              </div>

              {feedback && (
                <div className={`arrowdash-feedback ${feedback}`}>
                  {feedback === "perfect" ? "🌈 PERFECT!" : 
                   feedback === "correct" ? "✓ 正解！" : "✗ ミス！"}
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
      </ScreenShake>
    </GameShell>
  );
}
