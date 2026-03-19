import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell } from "@shared/components/GameShell";

/** ゲームフェーズ */
type Phase = "idle" | "playing" | "finished";

/** ゲーム時間 (秒) */
const GAME_DURATION = 10;

/** localStorage のキー */
const STORAGE_KEY = "speedclick_highscore";

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
function saveHighScore(clicks: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(clicks));
  } catch {
    // ignore
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [highScore, setHighScore] = useState<number>(loadHighScore);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const clicksRef = useRef(0);

  // タイマークリア
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = 0;
    }
  }, []);

  // アンマウント時にタイマークリア
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // ゲーム開始
  const startGame = useCallback(() => {
    setClicks(0);
    clicksRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setPhase("playing");
    setIsNewRecord(false);
    startTimeRef.current = Date.now();

    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearTimer();
        const finalClicks = clicksRef.current;
        const currentHighScore = loadHighScore();
        if (finalClicks > currentHighScore) {
          saveHighScore(finalClicks);
          setHighScore(finalClicks);
          setIsNewRecord(true);
        }
        setPhase("finished");
      }
    }, 50);
  }, [clearTimer]);

  // クリック処理
  const handleClick = useCallback(() => {
    if (phase === "playing") {
      clicksRef.current += 1;
      setClicks(clicksRef.current);
    }
  }, [phase]);

  // CPS計算 (ゲーム終了時)
  const cps = phase === "finished" ? (clicks / GAME_DURATION).toFixed(2) : "0.00";

  // リアルタイムCPS計算
  const realtimeCps =
    phase === "playing" && GAME_DURATION - timeLeft > 0
      ? (clicks / (GAME_DURATION - timeLeft)).toFixed(2)
      : "0.00";

  // 評価メッセージ
  const getEvaluation = () => {
    const c = clicks;
    if (c >= 100) return { emoji: "🏆", text: "神" };
    if (c >= 80) return { emoji: "🔥", text: "超人級" };
    if (c >= 60) return { emoji: "⚡", text: "すごい!" };
    if (c >= 40) return { emoji: "👍", text: "なかなか" };
    if (c >= 20) return { emoji: "😊", text: "普通" };
    return { emoji: "🐢", text: "もっと速く!" };
  };

  return (
    <GameShell gameId="speedclick" layout="default">
      <div className="speedclick-root">
        <h1 className="speedclick-title">🖱️ Speed Click</h1>

        {phase === "idle" && (
          <div className="speedclick-panel">
            <p className="speedclick-description">
              10秒間でボタンを何回クリックできるか挑戦！
            </p>
            {highScore > 0 && (
              <p className="speedclick-highscore">
                🏆 ハイスコア: {highScore} clicks
              </p>
            )}
            <button
              type="button"
              className="speedclick-start-button"
              onClick={startGame}
            >
              スタート
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="speedclick-game">
            <div className="speedclick-stats">
              <div className="speedclick-stat">
                <span className="speedclick-stat-value">
                  {timeLeft.toFixed(1)}
                </span>
                <span className="speedclick-stat-label">秒</span>
              </div>
              <div className="speedclick-stat">
                <span className="speedclick-stat-value">{clicks}</span>
                <span className="speedclick-stat-label">クリック</span>
              </div>
              <div className="speedclick-stat">
                <span className="speedclick-stat-value">{realtimeCps}</span>
                <span className="speedclick-stat-label">CPS</span>
              </div>
            </div>
            <button
              type="button"
              className="speedclick-click-button"
              onClick={handleClick}
            >
              クリック！
            </button>
          </div>
        )}

        {phase === "finished" && (
          <div className="speedclick-panel">
            <p className="speedclick-finished-title">🎉 結果</p>
            <div className="speedclick-result">
              <span className="speedclick-result-emoji">
                {getEvaluation().emoji}
              </span>
              <span className="speedclick-result-text">
                {getEvaluation().text}
              </span>
            </div>
            <div className="speedclick-final-stats">
              <div className="speedclick-final-stat">
                <span className="speedclick-final-stat-value">{clicks}</span>
                <span className="speedclick-final-stat-label">クリック</span>
              </div>
              <div className="speedclick-final-stat">
                <span className="speedclick-final-stat-value">{cps}</span>
                <span className="speedclick-final-stat-label">CPS</span>
              </div>
            </div>
            {isNewRecord && (
              <p className="speedclick-newrecord">🏆 新記録！</p>
            )}
            {!isNewRecord && highScore > 0 && (
              <p className="speedclick-highscore">
                ハイスコア: {highScore} clicks
              </p>
            )}
            <button
              type="button"
              className="speedclick-start-button"
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
