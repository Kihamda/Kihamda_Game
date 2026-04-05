import { useState, useEffect, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ScorePopup, ShareButton, GameRecommendations } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer, ComboCounter } from "@shared";
import "./App.css";

// ScorePopup state type
interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  y: string;
}

// 色の定義
interface ColorData {
  name: string;
  cssColor: string;
}

const COLORS: ColorData[] = [
  { name: "赤", cssColor: "#e74c3c" },
  { name: "青", cssColor: "#3498db" },
  { name: "緑", cssColor: "#27ae60" },
  { name: "黄", cssColor: "#f1c40f" },
  { name: "紫", cssColor: "#9b59b6" },
  { name: "橙", cssColor: "#e67e22" },
];

// ゲーム設定
const GAME_DURATION = 30; // 秒
const MATCH_PROBABILITY = 0.4; // 一致する確率

type GamePhase = "before" | "in_progress" | "after";

interface Question {
  colorName: string;
  displayColor: string;
  isMatch: boolean;
}

function generateQuestion(): Question {
  const nameIdx = Math.floor(Math.random() * COLORS.length);
  const colorName = COLORS[nameIdx].name;

  const isMatch = Math.random() < MATCH_PROBABILITY;

  if (isMatch) {
    return {
      colorName,
      displayColor: COLORS[nameIdx].cssColor,
      isMatch: true,
    };
  }

  // 不一致の場合、別の色を選択
  let colorIdx: number;
  do {
    colorIdx = Math.floor(Math.random() * COLORS.length);
  } while (colorIdx === nameIdx);

  return {
    colorName,
    displayColor: COLORS[colorIdx].cssColor,
    isMatch: false,
  };
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("before");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [question, setQuestion] = useState<Question>(generateQuestion);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  
  // ハイスコアをrefで保持（エフェクト内でsetStateしないため）
  const highScoreRef = useRef<number | null>(null);
  if (highScoreRef.current === null) {
    const saved = localStorage.getItem("colorburst-highscore");
    highScoreRef.current = saved ? parseInt(saved, 10) : 0;
  }

  // ScorePopup state
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    variant: "default",
    size: "md",
    y: "40%",
  });
  const popupTimeoutRef = useRef<number | null>(null);

  const showPopup = useCallback(
    (text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md", y = "40%") => {
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      setPopup((prev) => ({ text, key: prev.key + 1, variant, size, y }));
      popupTimeoutRef.current = window.setTimeout(() => {
        setPopup((prev) => ({ ...prev, text: null }));
      }, variant === "level" ? 1500 : variant === "critical" ? 1200 : 900);
    },
    []
  );

  const timerRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  // Dopamine hooks
  const { particles, confetti, sparkle } = useParticles();
  const { playTone } = useAudio();
  const playCorrect = useCallback(() => playTone(660, 0.1, 'sine'), [playTone]);
  const playWrong = useCallback(() => playTone(200, 0.15, 'sawtooth'), [playTone]);
  const playCombo = useCallback((c: number) => playTone(440 + c * 50, 0.1, 'sine'), [playTone]);

  // タイマー管理
  useEffect(() => {
    if (phase !== "in_progress") return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPhase("after");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase]);

  // ゲーム終了時にタイマークリア
  useEffect(() => {
    if (phase === "after" && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [phase]);

  const startGame = useCallback(() => {
    setPhase("in_progress");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setQuestion(generateQuestion());
    setStreak(0);
    setFeedback(null);
    setTotalAnswers(0);
    setCorrectAnswers(0);
  }, []);

  const handleAnswer = useCallback(
    (answerMatch: boolean) => {
      if (phase !== "in_progress") return;

      const isCorrect = answerMatch === question.isMatch;
      setTotalAnswers((prev) => prev + 1);

      // フィードバック表示をクリア
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }

      if (isCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setCorrectAnswers((prev) => prev + 1);

        // Dopamine effects
        playCorrect();
        sparkle(200, 150);
        if (newStreak >= 3) {
          playCombo(newStreak);
        }
        if (newStreak >= 10) {
          confetti();
        }

        // コンボボーナス: 3連続以上で追加点
        const bonus = newStreak >= 3 ? Math.floor(newStreak / 3) : 0;
        const points = 10 + bonus * 5;
        setScore((prev) => prev + points);
        setFeedback("correct");

        // ScorePopup for points and combos
        if (newStreak >= 10) {
          showPopup(`🔥 ${newStreak} COMBO! +${points}`, "critical", "lg", "35%");
        } else if (newStreak >= 5) {
          showPopup(`🎯 ${newStreak}連続! +${points}`, "combo", "md", "38%");
        } else if (newStreak >= 3) {
          showPopup(`+${points} (x${newStreak})`, "combo", "md", "40%");
        } else {
          showPopup(`+${points}`, "default", "sm", "42%");
        }
      } else {
        setStreak(0);
        playWrong();
        setFeedback("wrong");
      }

      // フィードバックを300ms後にクリア
      feedbackTimeoutRef.current = window.setTimeout(() => {
        setFeedback(null);
      }, 300);

      // 次の問題
      setQuestion(generateQuestion());
    },
    [phase, question.isMatch, streak, playCorrect, playWrong, playCombo, sparkle, confetti, showPopup]
  );

  // ゲーム終了時にハイスコア更新とポップアップ表示
  useEffect(() => {
    if (phase === "after") {
      const currentHighScore = highScoreRef.current ?? 0;
      const isNewHighScore = score > currentHighScore;
      if (isNewHighScore) {
        highScoreRef.current = score;
        localStorage.setItem("colorburst-highscore", String(score));
        // Defer popup to avoid setState in effect (use microtask)
        queueMicrotask(() => showPopup("🏆 NEW HIGH SCORE!", "critical", "xl", "25%"));
      } else if (score > 0) {
        queueMicrotask(() => showPopup(`ゲーム終了! ${score}pt`, "level", "lg", "30%"));
      }
    }
  }, [phase, score, showPopup]);

  // キーボードショートカット
  useEffect(() => {
    if (phase !== "in_progress") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        handleAnswer(true);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        handleAnswer(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleAnswer]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  const accuracy =
    totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  return (
    <GameShell gameId="colorburst" layout="default">
      <div className="colorburst-container" style={{ position: 'relative' }}>
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size={popup.size}
          y={popup.y}
        />
        {streak >= 3 && phase === "in_progress" && <ComboCounter combo={streak} />}
        
        {/* ヘッダー: スコアとタイマー */}
        <header className="colorburst-header">
          <div className="colorburst-score">
            <span className="colorburst-label">スコア</span>
            <span className="colorburst-value">{score}</span>
          </div>
          <div className="colorburst-timer">
            <span className="colorburst-label">残り時間</span>
            <span
              className={`colorburst-value ${timeLeft <= 5 ? "colorburst-value--urgent" : ""}`}
            >
              {timeLeft}秒
            </span>
          </div>
          {phase === "in_progress" && streak >= 3 && (
            <div className="colorburst-streak">🔥 {streak}連続!</div>
          )}
        </header>

        {/* メインエリア */}
        <main className="colorburst-main">
          {phase === "before" && (
            <div className="colorburst-start-screen">
              <h1 className="colorburst-title">Color Burst</h1>
              <p className="colorburst-instruction">
                文字の<strong>色</strong>と<strong>文字の意味</strong>が
                <br />
                一致しているか判定してください
              </p>
              <div className="colorburst-example">
                <span style={{ color: "#3498db", fontSize: "2rem" }}>赤</span>
                <span className="colorburst-arrow">→</span>
                <span>不一致（青色で「赤」と書かれている）</span>
              </div>
              <button className="colorburst-start-btn" onClick={startGame}>
                スタート
              </button>
              <p className="colorburst-hint">
                ← / A: 一致 ｜ → / D: 不一致
              </p>
            </div>
          )}

          {phase === "in_progress" && (
            <div
              className={`colorburst-game-area ${feedback ? `colorburst-game-area--${feedback}` : ""}`}
            >
              <div className="colorburst-question">
                <span
                  className="colorburst-color-text"
                  style={{ color: question.displayColor }}
                >
                  {question.colorName}
                </span>
              </div>

              <div className="colorburst-hint-text">
                文字の「色」と「意味」は一致している？
              </div>

              <div className="colorburst-buttons">
                <button
                  className="colorburst-answer-btn colorburst-answer-btn--match"
                  onClick={() => handleAnswer(true)}
                >
                  ⭕ 一致
                </button>
                <button
                  className="colorburst-answer-btn colorburst-answer-btn--mismatch"
                  onClick={() => handleAnswer(false)}
                >
                  ❌ 不一致
                </button>
              </div>
            </div>
          )}

          {phase === "after" && (
            <div className="colorburst-result-screen">
              <h2 className="colorburst-result-title">ゲーム終了!</h2>
              <div className="colorburst-result-score">{score}</div>
              <div className="colorburst-result-label">ポイント</div>

              <div className="colorburst-stats">
                <div className="colorburst-stat">
                  <span className="colorburst-stat-value">{totalAnswers}</span>
                  <span className="colorburst-stat-label">回答数</span>
                </div>
                <div className="colorburst-stat">
                  <span className="colorburst-stat-value">
                    {correctAnswers}
                  </span>
                  <span className="colorburst-stat-label">正解数</span>
                </div>
                <div className="colorburst-stat">
                  <span className="colorburst-stat-value">{accuracy}%</span>
                  <span className="colorburst-stat-label">正解率</span>
                </div>
              </div>

              <button className="colorburst-start-btn" onClick={startGame}>
                もう一度
              </button>
              <ShareButton score={score} gameTitle="Color Burst" gameId="colorburst" />
              <GameRecommendations currentGameId="colorburst" />
            </div>
          )}
        </main>
      </div>
    </GameShell>
  );
}
