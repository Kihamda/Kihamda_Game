import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell, useAudio, useParticles, ParticleLayer, ScorePopup, ShareButton, GameRecommendations } from "@shared";
import type { PopupVariant } from "@shared";

/** ゲームフェーズ */
type Phase = "idle" | "countdown" | "waiting" | "draw" | "result" | "finished";

/** 総ラウンド数 */
const TOTAL_ROUNDS = 5;

/** 待機時間の範囲 (ms) */
const WAIT_MIN = 2000;
const WAIT_MAX = 5000;

/** localStorage のキー */
const STORAGE_KEY = "quickdraw_highscore";

/** ハイスコア読み込み */
function loadHighScore(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

/** ハイスコア保存 */
function saveHighScore(ms: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(ms));
  } catch {
    // ignore
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [highScore, setHighScore] = useState<number | null>(loadHighScore);
  const [tooEarly, setTooEarly] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // ScorePopup 用の状態
  const [popup, setPopup] = useState<{
    text: string | null;
    key: number;
    variant: PopupVariant;
    size: "sm" | "md" | "lg" | "xl";
    y: string;
  }>({ text: null, key: 0, variant: "default", size: "md", y: "30%" });

  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  
  const { playTone } = useAudio();
  const { particles, sparkle, confetti, explosion } = useParticles();
  
  const playDraw = useCallback(() => playTone(880, 0.2, 'square'), [playTone]);
  const playShot = useCallback(() => playTone(440, 0.08, 'sawtooth'), [playTone]);
  const playFail = useCallback(() => playTone(150, 0.3, 'sawtooth'), [playTone]);

  // ポップアップ表示ヘルパー
  const showPopup = useCallback(
    (
      text: string,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md",
      y = "30%"
    ) => {
      setPopup((prev) => ({
        text,
        key: prev.key + 1,
        variant,
        size,
        y,
      }));
    },
    []
  );

  // タイマークリア
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
  }, []);

  // アンマウント時にタイマークリア
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // カウントダウン開始
  const startCountdown = useCallback(() => {
    setTooEarly(false);
    setCurrentTime(null);
    setCountdown(3);
    setPhase("countdown");
  }, []);

  // カウントダウン処理
  useEffect(() => {
    if (phase !== "countdown") return;

    if (countdown > 0) {
      timerRef.current = window.setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 800);
    } else {
      // カウントダウン終了、待機フェーズへ（タイマー経由で遷移）
      timerRef.current = window.setTimeout(() => {
        setPhase("waiting");
      }, 0);
    }

    return () => clearTimer();
  }, [phase, countdown, clearTimer]);

  // 待機フェーズ開始時にDRAWタイマーをセット
  useEffect(() => {
    if (phase !== "waiting") return;

    const delay = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
    timerRef.current = window.setTimeout(() => {
      startTimeRef.current = performance.now();
      playDraw();
      setPhase("draw");
    }, delay);

    return () => clearTimer();
  }, [phase, clearTimer, playDraw]);

  // ゲーム開始
  const startGame = useCallback(() => {
    setRound(1);
    setTimes([]);
    setCurrentTime(null);
    setTooEarly(false);
    startCountdown();
  }, [startCountdown]);

  // クリック処理
  const handleClick = useCallback(() => {
    if (phase === "idle" || phase === "finished" || phase === "result" || phase === "countdown") {
      return;
    }

    if (phase === "waiting") {
      // フライング
      clearTimer();
      setTooEarly(true);
      playFail();
      explosion(window.innerWidth / 2, window.innerHeight / 2);
      showPopup("💀 TOO SOON!", "combo", "lg", "25%");
      setPhase("result");
      setCurrentTime(null);
      return;
    }

    if (phase === "draw") {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setCurrentTime(elapsed);
      setTimes((prev) => [...prev, elapsed]);
      playShot();
      
      // 反応時間に応じたポップアップ
      const secs = (elapsed / 1000).toFixed(3);
      if (elapsed < 200) {
        showPopup(`🔥 ${secs}s LEGENDARY!`, "critical", "xl", "20%");
        sparkle(window.innerWidth / 2, window.innerHeight / 2);
        confetti();
      } else if (elapsed < 250) {
        showPopup(`⚡ ${secs}s AMAZING!`, "bonus", "lg", "22%");
        sparkle(window.innerWidth / 2, window.innerHeight / 2);
      } else if (elapsed < 300) {
        showPopup(`🎯 ${secs}s GREAT!`, "level", "lg", "24%");
      } else if (elapsed < 400) {
        showPopup(`👍 ${secs}s GOOD`, "default", "md", "26%");
      } else {
        showPopup(`🐢 ${secs}s`, "default", "sm", "28%");
      }
      
      setPhase("result");
    }
  }, [phase, clearTimer, playShot, playFail, sparkle, explosion, confetti, showPopup]);

  // 次のラウンドへ
  const nextRound = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      // 終了
      const avg =
        times.length > 0
          ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
          : 0;

      if (avg > 0 && (highScore === null || avg < highScore)) {
        setHighScore(avg);
        saveHighScore(avg);
        confetti();
        showPopup("🏆 NEW RECORD!", "critical", "xl", "18%");
      } else {
        // 勝利のお祝い
        showPopup("🎉 DUEL COMPLETE!", "level", "lg", "20%");
      }
      setPhase("finished");
    } else {
      setRound((r) => r + 1);
      startCountdown();
    }
  }, [round, times, highScore, startCountdown, confetti, showPopup]);

  // 平均計算
  const average =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

  // 背景クラス決定
  const getBgClass = () => {
    if (phase === "draw") return "bg-draw";
    if (phase === "waiting") return "bg-waiting";
    if (phase === "countdown") return "bg-countdown";
    return "bg-default";
  };

  // 反応時間の評価
  const getReactionRating = (ms: number) => {
    if (ms < 200) return { text: "LEGENDARY!", emoji: "🔥" };
    if (ms < 250) return { text: "AMAZING!", emoji: "⚡" };
    if (ms < 300) return { text: "GREAT!", emoji: "🎯" };
    if (ms < 400) return { text: "GOOD", emoji: "👍" };
    return { text: "SLOW...", emoji: "🐢" };
  };

  return (
    <GameShell gameId="quickdraw" layout="immersive">
      <ParticleLayer particles={particles} />
      <ScorePopup
        text={popup.text}
        popupKey={popup.key}
        variant={popup.variant}
        size={popup.size}
        y={popup.y}
      />
      <div className={`quickdraw-root ${getBgClass()}`} onClick={handleClick}>
        <div className="quickdraw-content">
          <h1 className="quickdraw-title">🤠 Quick Draw</h1>

          {phase === "idle" && (
            <div className="quickdraw-panel">
              <div className="quickdraw-western-border">
                <p className="quickdraw-description">
                  西部の早撃ち対決
                </p>
                <p className="quickdraw-description">
                  <span className="text-yellow">DRAW!</span> が表示されたら即クリック！
                </p>
                <p className="quickdraw-warning">
                  ⚠️ 早すぎるとフライングでペナルティ
                </p>
                {highScore !== null && (
                  <p className="quickdraw-highscore">
                    🏆 ベストタイム: {highScore} ms
                  </p>
                )}
                <button
                  type="button"
                  className="quickdraw-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startGame();
                  }}
                >
                  決闘開始
                </button>
              </div>
            </div>
          )}

          {phase === "countdown" && (
            <div className="quickdraw-panel">
              <p className="quickdraw-countdown-text">準備...</p>
              <p className="quickdraw-countdown-number">{countdown || "..."}</p>
              <p className="quickdraw-round">
                Round {round} / {TOTAL_ROUNDS}
              </p>
            </div>
          )}

          {phase === "waiting" && (
            <div className="quickdraw-panel clickable">
              <div className="quickdraw-gun-container">
                <span className="quickdraw-gun">🔫</span>
              </div>
              <p className="quickdraw-wait-text">待て...</p>
              <p className="quickdraw-wait-sub">DRAWの合図を待て！</p>
            </div>
          )}

          {phase === "draw" && (
            <div className="quickdraw-panel clickable">
              <p className="quickdraw-draw-text">DRAW!</p>
              <p className="quickdraw-draw-sub">今だ！クリック！</p>
            </div>
          )}

          {phase === "result" && (
            <div className="quickdraw-panel">
              {tooEarly ? (
                <>
                  <p className="quickdraw-early">💀 フライング！</p>
                  <p className="quickdraw-early-sub">
                    落ち着いて、合図を待て
                  </p>
                </>
              ) : (
                <>
                  <p className="quickdraw-time">{currentTime} ms</p>
                  {currentTime && (
                    <p className="quickdraw-rating">
                      {getReactionRating(currentTime).emoji}{" "}
                      {getReactionRating(currentTime).text}
                    </p>
                  )}
                  <p className="quickdraw-sublabel">
                    Round {round} / {TOTAL_ROUNDS}
                  </p>
                </>
              )}
              <button
                type="button"
                className="quickdraw-button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (tooEarly) {
                    // フライング時はリトライ
                    startCountdown();
                  } else {
                    nextRound();
                  }
                }}
              >
                {tooEarly
                  ? "再挑戦"
                  : round >= TOTAL_ROUNDS
                    ? "結果を見る"
                    : "次のラウンド"}
              </button>
            </div>
          )}

          {phase === "finished" && (
            <div className="quickdraw-panel">
              <p className="quickdraw-finished-title">🎉 決闘終了！</p>
              <p className="quickdraw-average">平均: {average} ms</p>
              <div className="quickdraw-times">
                {times.map((t, i) => (
                  <span key={i} className="quickdraw-time-chip">
                    R{i + 1}: {t} ms
                  </span>
                ))}
              </div>
              {highScore !== null && average === highScore && (
                <p className="quickdraw-newrecord">🏆 新記録！</p>
              )}
              {highScore !== null && average !== highScore && (
                <p className="quickdraw-highscore">
                  ベストタイム: {highScore} ms
                </p>
              )}
              <button
                type="button"
                className="quickdraw-button"
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
              >
                もう一度決闘
              </button>
              <ShareButton score={average} gameTitle="Quick Draw" gameId="quickdraw" />
              <GameRecommendations currentGameId="quickdraw" />
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}