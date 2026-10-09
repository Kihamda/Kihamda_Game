import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell } from "@shared/components/GameShell";
import { useParticles, ParticleLayer, useAudio, ScreenShake, ComboCounter, ScorePopup, ShareButton, GameRecommendations } from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";

/** ゲームフェーズ */
type Phase = "idle" | "playing" | "finished";

/** 色定義 */
interface ColorDef {
  id: string;
  name: string;
  cssClass: string;
  hex: string;
}

const COLORS: ColorDef[] = [
  { id: "red", name: "あか", cssClass: "color-red", hex: "#ef4444" },
  { id: "blue", name: "あお", cssClass: "color-blue", hex: "#3b82f6" },
  { id: "green", name: "みどり", cssClass: "color-green", hex: "#22c55e" },
  { id: "yellow", name: "きいろ", cssClass: "color-yellow", hex: "#eab308" },
  { id: "purple", name: "むらさき", cssClass: "color-purple", hex: "#a855f7" },
  { id: "orange", name: "オレンジ", cssClass: "color-orange", hex: "#f97316" },
];

/** 定数 */
const INITIAL_LIVES = 3;
const TIME_LIMIT = 30000; // 30秒
const CORRECT_SCORE = 100;
const TIME_BONUS_MAX = 50;
const UPDATE_INTERVAL = 100;
const TIME_WARNING = 5000; // 残り5秒で警告

/** localStorage キー */
const STORAGE_KEY = "tapcolor_highscore";

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

/** ランダムに n 個選択 */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** 問題を生成 */
function generateQuestion(): {
  targetColor: ColorDef;
  displayColor: ColorDef;
  choices: ColorDef[];
} {
  // ターゲット（正解の色）
  const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  
  // 表示色（ストループ効果: 異なる色で表示）
  let displayColor: ColorDef;
  if (Math.random() < 0.7) {
    // 70%の確率で異なる色
    const others = COLORS.filter((c) => c.id !== targetColor.id);
    displayColor = others[Math.floor(Math.random() * others.length)];
  } else {
    // 30%の確率で同じ色
    displayColor = targetColor;
  }

  // 選択肢: 正解を含む4色
  const otherColors = COLORS.filter((c) => c.id !== targetColor.id);
  const randomOthers = pickRandom(otherColors, 3);
  const choices = [...randomOthers, targetColor].sort(() => Math.random() - 0.5);

  return { targetColor, displayColor, choices };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [lastAnswerTime, setLastAnswerTime] = useState(0);

  const [targetColor, setTargetColor] = useState<ColorDef | null>(null);
  const [displayColor, setDisplayColor] = useState<ColorDef | null>(null);
  const [choices, setChoices] = useState<ColorDef[]>([]);
  const [feedback, setFeedback] = useState<{ colorId: string; type: "correct" | "wrong" } | null>(null);

  // ドーパミン演出用の状態
  const [combo, setCombo] = useState(0);
  const [showWrongFlash, setShowWrongFlash] = useState(false);
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);
  const [popupVariant, setPopupVariant] = useState<PopupVariant>("default");
  const [isNewRecord, setIsNewRecord] = useState(false);

  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const questionStartRef = useRef<number>(0);

  // 共通フック
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const { particles, sparkle, confetti, burst } = useParticles();
  const { playSuccess, playCombo, playMiss, playWarning, playCelebrate, playSweep } = useAudio();

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

  // 次の問題を出題
  const nextQuestion = useCallback(() => {
    const q = generateQuestion();
    setTargetColor(q.targetColor);
    setDisplayColor(q.displayColor);
    setChoices(q.choices);
    setFeedback(null);
    questionStartRef.current = performance.now();
  }, []);

  // ゲーム開始
  const startGame = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setLives(INITIAL_LIVES);
    setCorrectCount(0);
    setTotalCount(0);
    setTimeLeft(TIME_LIMIT);
    setLastAnswerTime(0);
    setCombo(0);
    setIsNewRecord(false);
    startTimeRef.current = performance.now();

    nextQuestion();

    timerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, TIME_LIMIT - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearTimer();
        setPhase("finished");
        // タイムアウト音
        playSweep(300, 100, 0.4, "sawtooth", 0.25);
      }
    }, UPDATE_INTERVAL);
  }, [nextQuestion, clearTimer, playSweep]);

  // ゲーム終了処理
  const endGame = useCallback(() => {
    clearTimer();
    setPhase("finished");
    setCombo(0);
    if (score > highScore) {
      setHighScore(score);
      saveHighScore(score);
      setIsNewRecord(true);
      // ハイスコア更新時の confetti
      confetti(60);
      playCelebrate();
    }
  }, [clearTimer, score, highScore, confetti, playCelebrate]);

  // 選択肢クリック
  const handleChoice = useCallback(
    (color: ColorDef, event: React.MouseEvent<HTMLButtonElement>) => {
      if (phase !== "playing" || !targetColor || feedback) return;

      const responseTime = performance.now() - questionStartRef.current;
      setTotalCount((c) => c + 1);

      // クリック位置取得（パーティクル用）
      const rect = event.currentTarget.getBoundingClientRect();
      const px = rect.left + rect.width / 2;
      const py = rect.top + rect.height / 2;

      if (color.id === targetColor.id) {
        // 正解
        // Smooth exponential decay: 500ms = ~60% bonus, 1000ms = ~37%, 2000ms = ~14%
        const timeBonus = Math.max(0, Math.floor(TIME_BONUS_MAX * Math.exp(-responseTime / 1000)));
        const addScore = CORRECT_SCORE + timeBonus;
        setScore((s) => s + addScore);
        setCorrectCount((c) => c + 1);
        setLastAnswerTime(Math.round(responseTime));
        setFeedback({ colorId: color.id, type: "correct" });

        // コンボ更新
        const newCombo = combo + 1;
        setCombo(newCombo);

        // 正解エフェクト: sparkle（正解色で）
        sparkle(px, py, 10);
        
        // スコアポップアップ
        if (newCombo >= 5) {
          setPopupVariant("combo");
          setPopupText(`+${addScore} x${newCombo}`);
        } else {
          setPopupVariant("default");
          setPopupText(`+${addScore}`);
        }
        setPopupKey((k) => k + 1);

        // 音: コンボ音または成功音
        if (newCombo >= 3) {
          playCombo(newCombo);
        } else {
          playSuccess();
        }

        setTimeout(() => {
          nextQuestion();
        }, 200);
      } else {
        // 不正解
        setLives((l) => {
          const newLives = l - 1;
          if (newLives <= 0) {
            setTimeout(() => endGame(), 300);
          }
          return newLives;
        });
        setFeedback({ colorId: color.id, type: "wrong" });
        setCombo(0); // コンボリセット

        // 間違いエフェクト: 赤フラッシュ + シェイク
        setShowWrongFlash(true);
        shakeRef.current?.shake("medium", 300);
        playMiss();
        burst(px, py, 8);

        setTimeout(() => {
          setFeedback(null);
          setShowWrongFlash(false);
        }, 300);
      }
    },
    [phase, targetColor, feedback, nextQuestion, endGame, combo, sparkle, burst, playSuccess, playCombo, playMiss]
  );

  // タイマー警告音（残り5秒）
  const warnedRef = useRef(false);
  useEffect(() => {
    if (phase === "playing" && timeLeft <= TIME_WARNING && timeLeft > 0 && !warnedRef.current) {
      warnedRef.current = true;
      playWarning();
    }
    if (phase !== "playing") {
      warnedRef.current = false;
    }
  }, [phase, timeLeft, playWarning]);

  // 選択肢のクラス名を生成
  const getChoiceClassName = (color: ColorDef) => {
    const base = "tapcolor-choice " + color.cssClass;
    if (feedback?.colorId === color.id) {
      return base + " " + feedback.type;
    }
    return base;
  };

  // タイマーバーの幅
  const timerWidth = (timeLeft / TIME_LIMIT) * 100 + "%";
  const isTimeLow = timeLeft <= TIME_WARNING && timeLeft > 0;

  return (
    <GameShell gameId="tapcolor" layout="default">
      <ScreenShake ref={shakeRef}>
        <div className={`tapcolor-root${showWrongFlash ? " wrong-flash" : ""}`}>
          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />

          {/* スコアポップアップ */}
          <ScorePopup
            text={popupText}
            popupKey={popupKey}
            variant={popupVariant}
            y="30%"
          />

          {/* コンボカウンター */}
          {phase === "playing" && <ComboCounter combo={combo} position="top-right" threshold={3} />}

          {phase === "idle" && (
            <div className="tapcolor-panel">
              <h1 className="tapcolor-panel-title">🎨 タップカラー</h1>
              <p className="tapcolor-panel-description">
                <span className="highlight">文字の色</span>ではなく、
                <span className="highlight">書かれた色名</span>をタップ！
              </p>
              <p className="tapcolor-panel-description">
                ストループ効果に惑わされず、素早く正確にタップしよう。
                制限時間は30秒、ライフは3つ。
              </p>
              {highScore > 0 && (
                <p className="tapcolor-highscore">🏆 ハイスコア: {highScore}</p>
              )}
              <button type="button" className="tapcolor-button" onClick={startGame}>
                スタート
              </button>
            </div>
          )}

          {phase === "playing" && targetColor && displayColor && (
            <>
              <div className="tapcolor-header">
                <h1 className="tapcolor-title">🎨 タップカラー</h1>
                <div className="tapcolor-stats">
                  <div className="tapcolor-stat">
                    <span className="tapcolor-stat-label">スコア</span>
                    <span className="tapcolor-stat-value score">{score}</span>
                  </div>
                  <div className="tapcolor-stat">
                    <span className="tapcolor-stat-label">ライフ</span>
                    <span className="tapcolor-stat-value lives">{"❤️".repeat(lives)}</span>
                  </div>
                </div>
              </div>

              <div className="tapcolor-question">
                <p className="tapcolor-instruction">この色をタップ！</p>
                <p
                  className="tapcolor-color-word"
                  style={{ color: displayColor.hex }}
                >
                  {targetColor.name}
                </p>
              </div>

              <div className="tapcolor-choices">
                {choices.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    className={getChoiceClassName(color)}
                    onClick={(e) => handleChoice(color, e)}
                  >
                    {color.name}
                  </button>
                ))}
              </div>

              <div className={`tapcolor-timer-container${isTimeLow ? " pulse" : ""}`}>
                <div
                  className={`tapcolor-timer-bar${isTimeLow ? " low" : ""}`}
                  style={{ width: timerWidth }}
                />
              </div>
            </>
          )}

          {phase === "finished" && (
            <div className="tapcolor-panel">
              <h2 className="tapcolor-panel-title">🎉 結果</h2>
              <p className="tapcolor-result-score">{score}</p>
              <p className="tapcolor-result-label">スコア</p>

              <div className="tapcolor-result-stats">
                <div className="tapcolor-result-stat">
                  <span className="tapcolor-result-stat-value">{correctCount}</span>
                  <span className="tapcolor-result-stat-label">正解数</span>
                </div>
                <div className="tapcolor-result-stat">
                  <span className="tapcolor-result-stat-value">
                    {totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0}%
                  </span>
                  <span className="tapcolor-result-stat-label">正答率</span>
                </div>
                <div className="tapcolor-result-stat">
                  <span className="tapcolor-result-stat-value">{lastAnswerTime}ms</span>
                  <span className="tapcolor-result-stat-label">最終回答</span>
                </div>
              </div>

              {isNewRecord && <p className="tapcolor-newrecord">🏆 新記録！</p>}
              {!isNewRecord && highScore > 0 && (
                <p className="tapcolor-highscore">ハイスコア: {highScore}</p>
              )}

              <button type="button" className="tapcolor-button" onClick={startGame}>
                もう一度
              </button>
              <ShareButton score={score} gameTitle="Tap Color" gameId="tapcolor" />
              <GameRecommendations currentGameId="tapcolor" />
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
