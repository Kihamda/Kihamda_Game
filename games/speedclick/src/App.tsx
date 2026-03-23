import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell, useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";

/** ゲームフェーズ */
type Phase = "idle" | "playing" | "finished";

/** ポップアップ状態 */
interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  x: string;
  y: string;
}

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
  const [popup, setPopup] = useState<PopupState>({
    text: null, key: 0, variant: "default", size: "md", x: "50%", y: "40%"
  });

  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const clicksRef = useRef(0);
  const lastCpsPopupRef = useRef(0); // 最後にCPSポップアップを出したCPS値
  const lastMilestoneRef = useRef(0); // 最後にマイルストーンポップアップを出したクリック数
  
  const { playTone } = useAudio();
  const { particles, confetti, burst } = useParticles();
  
  const playClick = useCallback(() => playTone(440 + Math.random() * 100, 0.03, 'triangle'), [playTone]);
  const playStart = useCallback(() => playTone(660, 0.15, 'sine'), [playTone]);
  const playEnd = useCallback(() => playTone(880, 0.3, 'sine'), [playTone]);
  const playMilestone = useCallback(() => playTone(784, 0.15, 'sine'), [playTone]);
  const playCpsAchievement = useCallback(() => playTone(988, 0.2, 'sine'), [playTone]);

  // ポップアップ表示ヘルパー
  const showPopup = useCallback((
    text: string,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md",
    x = "50%",
    y = "40%"
  ) => {
    setPopup(prev => ({ text, key: prev.key + 1, variant, size, x, y }));
  }, []);

  // CPSに基づく評価テキスト
  const getCpsRating = (cps: number): { text: string; variant: PopupVariant; size: "sm" | "md" | "lg" | "xl" } => {
    if (cps >= 10) return { text: "⚡ GOD CPS!", variant: "critical", size: "xl" };
    if (cps >= 8) return { text: "🔥 BLAZING!", variant: "critical", size: "lg" };
    if (cps >= 6) return { text: "⚡ FAST!", variant: "bonus", size: "md" };
    if (cps >= 4) return { text: "👍 GOOD!", variant: "combo", size: "md" };
    return { text: "", variant: "default", size: "sm" };
  };

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
    lastCpsPopupRef.current = 0;
    lastMilestoneRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setPhase("playing");
    setIsNewRecord(false);
    startTimeRef.current = Date.now();
    playStart();
    showPopup("START!", "level", "lg");

    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(remaining);

      // CPS達成ポップアップ (1秒ごとにチェック)
      if (elapsed > 0 && Math.floor(elapsed) > Math.floor(elapsed - 0.05)) {
        const currentCps = clicksRef.current / elapsed;
        const cpsFloor = Math.floor(currentCps);
        if (cpsFloor > lastCpsPopupRef.current && cpsFloor >= 4) {
          const rating = getCpsRating(currentCps);
          if (rating.text) {
            showPopup(rating.text, rating.variant, rating.size);
            playCpsAchievement();
            lastCpsPopupRef.current = cpsFloor;
          }
        }
      }

      if (remaining <= 0) {
        clearTimer();
        const finalClicks = clicksRef.current;
        const currentHighScore = loadHighScore();
        playEnd();
        if (finalClicks > currentHighScore) {
          saveHighScore(finalClicks);
          setHighScore(finalClicks);
          setIsNewRecord(true);
          confetti();
          // 新記録ポップアップ (少し遅延して表示)
          setTimeout(() => {
            showPopup("🏆 NEW RECORD!", "critical", "xl");
          }, 300);
        } else {
          // 最終スコアポップアップ
          if (finalClicks >= 100) {
            showPopup(`🏆 ${finalClicks} CLICKS!`, "critical", "xl");
          } else if (finalClicks >= 60) {
            showPopup(`🔥 ${finalClicks} CLICKS!`, "bonus", "lg");
          } else if (finalClicks >= 30) {
            showPopup(`⚡ ${finalClicks} clicks`, "combo", "md");
          } else {
            showPopup(`${finalClicks} clicks`, "default", "md");
          }
        }
        setPhase("finished");
      }
    }, 50);
  }, [clearTimer, playStart, playEnd, confetti, showPopup, playCpsAchievement]);

  // クリック処理
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (phase === "playing") {
      clicksRef.current += 1;
      const currentClicks = clicksRef.current;
      setClicks(currentClicks);
      playClick();
      burst(e.clientX, e.clientY, 5);
      
      // マイルストーンポップアップ (10, 20, 30, ...)
      const milestone = Math.floor(currentClicks / 10) * 10;
      if (milestone > 0 && milestone > lastMilestoneRef.current) {
        lastMilestoneRef.current = milestone;
        playMilestone();
        
        if (milestone >= 100) {
          showPopup(`🏆 ${milestone}!`, "critical", "xl");
        } else if (milestone >= 50) {
          showPopup(`🔥 ${milestone}!`, "bonus", "lg");
        } else {
          showPopup(`⭐ ${milestone}!`, "combo", "md");
        }
      }
    }
  }, [phase, playClick, burst, playMilestone, showPopup]);

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
      <ParticleLayer particles={particles} />
      <ScorePopup
        text={popup.text}
        popupKey={popup.key}
        variant={popup.variant}
        size={popup.size}
        x={popup.x}
        y={popup.y}
      />
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
