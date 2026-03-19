import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell } from "@shared/components/GameShell";

/** ゲームフェーズ */
type Phase = "idle" | "waiting" | "ready" | "result" | "finished";

/** 総ラウンド数 */
const TOTAL_ROUNDS = 5;

/** 待機時間の範囲 (ms) */
const WAIT_MIN = 1500;
const WAIT_MAX = 4000;

/** localStorage のキー */
const STORAGE_KEY = "flashreflex_highscore";

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

  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

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

  // ラウンド開始
  const startRound = useCallback(() => {
    setTooEarly(false);
    setCurrentTime(null);
    setPhase("waiting");

    const delay = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
    timerRef.current = window.setTimeout(() => {
      startTimeRef.current = performance.now();
      setPhase("ready");
    }, delay);
  }, []);

  // ゲーム開始
  const startGame = useCallback(() => {
    setRound(1);
    setTimes([]);
    setCurrentTime(null);
    setTooEarly(false);
    startRound();
  }, [startRound]);

  // クリック処理
  const handleClick = useCallback(() => {
    if (phase === "idle" || phase === "finished") {
      return;
    }

    if (phase === "waiting") {
      // フライング
      clearTimer();
      setTooEarly(true);
      setPhase("result");
      setCurrentTime(null);
      return;
    }

    if (phase === "ready") {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setCurrentTime(elapsed);
      setTimes((prev) => [...prev, elapsed]);
      setPhase("result");
    }
  }, [phase, clearTimer]);

  // 次のラウンドへ
  const nextRound = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      // 終了
      const newTimes = tooEarly ? times : times;
      const avg =
        newTimes.length > 0
          ? Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length)
          : 0;

      if (avg > 0 && (highScore === null || avg < highScore)) {
        setHighScore(avg);
        saveHighScore(avg);
      }
      setPhase("finished");
    } else {
      setRound((r) => r + 1);
      startRound();
    }
  }, [round, times, tooEarly, highScore, startRound]);

  // 平均計算
  const average =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

  // 背景色決定
  const getBgClass = () => {
    if (phase === "ready") return "bg-green";
    if (phase === "waiting") return "bg-red";
    return "bg-default";
  };

  return (
    <GameShell gameId="flashreflex" layout="immersive">
      <div className={`flashreflex-root ${getBgClass()}`} onClick={handleClick}>
        <div className="flashreflex-content">
          <h1 className="flashreflex-title">⚡ Flash Reflex</h1>

          {phase === "idle" && (
            <div className="flashreflex-panel">
              <p className="flashreflex-description">
                画面が<span className="text-green">緑</span>に変わったらすぐクリック！
              </p>
              <p className="flashreflex-description">5回計測して平均を算出します</p>
              {highScore !== null && (
                <p className="flashreflex-highscore">
                  🏆 ハイスコア: {highScore} ms
                </p>
              )}
              <button
                type="button"
                className="flashreflex-button"
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
              >
                スタート
              </button>
            </div>
          )}

          {phase === "waiting" && (
            <div className="flashreflex-panel">
              <p className="flashreflex-instruction">待って...</p>
              <p className="flashreflex-round">
                Round {round} / {TOTAL_ROUNDS}
              </p>
            </div>
          )}

          {phase === "ready" && (
            <div className="flashreflex-panel">
              <p className="flashreflex-go">クリック！</p>
            </div>
          )}

          {phase === "result" && (
            <div className="flashreflex-panel">
              {tooEarly ? (
                <>
                  <p className="flashreflex-early">🚫 フライング！</p>
                  <p className="flashreflex-sublabel">早すぎました</p>
                </>
              ) : (
                <>
                  <p className="flashreflex-time">{currentTime} ms</p>
                  <p className="flashreflex-sublabel">
                    Round {round} / {TOTAL_ROUNDS}
                  </p>
                </>
              )}
              <button
                type="button"
                className="flashreflex-button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (tooEarly) {
                    // フライング時はリトライ
                    startRound();
                  } else {
                    nextRound();
                  }
                }}
              >
                {tooEarly
                  ? "リトライ"
                  : round >= TOTAL_ROUNDS
                    ? "結果を見る"
                    : "次へ"}
              </button>
            </div>
          )}

          {phase === "finished" && (
            <div className="flashreflex-panel">
              <p className="flashreflex-finished-title">🎉 結果</p>
              <p className="flashreflex-average">平均: {average} ms</p>
              <div className="flashreflex-times">
                {times.map((t, i) => (
                  <span key={i} className="flashreflex-time-chip">
                    {t} ms
                  </span>
                ))}
              </div>
              {highScore !== null && average === highScore && (
                <p className="flashreflex-newrecord">🏆 新記録！</p>
              )}
              {highScore !== null && average !== highScore && (
                <p className="flashreflex-highscore">
                  ハイスコア: {highScore} ms
                </p>
              )}
              <button
                type="button"
                className="flashreflex-button"
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
              >
                もう一度
              </button>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
