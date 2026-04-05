import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell, useHighScore, useAudio, useParticles, ParticleLayer, ScorePopup, ShareButton, GameRecommendations } from "../../../src/shared";
import type { PopupVariant } from "../../../src/shared";
import type { Phase, Difficulty, GameSettings, GameStats, GameResult } from "./lib/types";
import {
  TIME_OPTIONS,
  DIFFICULTY_CONFIG,
  HIGHSCORE_KEY,
} from "./lib/constants";
import {
  getRandomSentences,
  calculateResult,
  loadSettings,
  saveSettings,
  getWPMRating,
} from "./lib/typerace";

// Popup state type
interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  x: string;
  y: string;
}

function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [stats, setStats] = useState<GameStats>({
    correctChars: 0,
    totalChars: 0,
    correctWords: 0,
    totalWords: 0,
    startTime: 0,
    endTime: 0,
  });
  const [result, setResult] = useState<GameResult | null>(null);

  // Popup state
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    variant: "default",
    size: "md",
    x: "50%",
    y: "40%",
  });
  const popupKeyRef = useRef(0);

  // Track achievements
  const lastWPMMilestoneRef = useRef(0);
  const lastAccuracyBonusRef = useRef(0);
  const sentenceStreakRef = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  const { best: highScore, update: updateHighScore } = useHighScore(HIGHSCORE_KEY);
  const { playClick, playFanfare, playCelebrate, playMiss } = useAudio();
  const { particles, sparkle, burst, confetti } = useParticles();

  const inputWrapperRef = useRef<HTMLDivElement>(null);

  const currentSentence = sentences[currentSentenceIndex] || "";

  // Show popup helper
  const showPopup = useCallback(
    (
      text: string,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md",
      x = "50%",
      y = "40%"
    ) => {
      popupKeyRef.current += 1;
      setPopup({
        text,
        key: popupKeyRef.current,
        variant,
        size,
        x,
        y,
      });
    },
    []
  );

  // 設定変更時に保存
  const handleSettingsChange = useCallback(
    <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  // ゲーム開始
  const startGame = useCallback(() => {
    const newSentences = getRandomSentences(settings.difficulty, 10);
    setSentences(newSentences);
    setCurrentSentenceIndex(0);
    setCurrentPosition(0);
    setInput("");
    setTimeLeft(settings.timeLimit);
    setStats({
      correctChars: 0,
      totalChars: 0,
      correctWords: 0,
      totalWords: 0,
      startTime: Date.now(),
      endTime: 0,
    });
    setResult(null);
    setPhase("playing");
    // Reset achievement trackers
    lastWPMMilestoneRef.current = 0;
    lastAccuracyBonusRef.current = 0;
    sentenceStreakRef.current = 0;
    playFanfare();
    showPopup("START!", "level", "xl");
  }, [settings, playFanfare, showPopup]);

  // ゲーム終了
  const endGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const endTime = Date.now();
    setStats((prev) => {
      const finalStats = { ...prev, endTime };
      const gameResult = calculateResult(finalStats);
      setResult(gameResult);

      // Race completion popup
      const rating = getWPMRating(gameResult.wpm);
      const ratingEmoji = rating.split(" ").pop() || "";

      if (gameResult.score > highScore) {
        updateHighScore(gameResult.score);
        playCelebrate();
        // Personal best - trigger confetti and show special popup
        confetti(60);
        setTimeout(() => {
          showPopup(`🎉 NEW BEST! ${gameResult.score}pts`, "critical", "xl");
        }, 300);
      } else {
        playMiss();
        // Show completion popup
        setTimeout(() => {
          showPopup(`${ratingEmoji} ${gameResult.wpm} WPM`, "bonus", "lg");
        }, 200);
      }

      return finalStats;
    });

    setPhase("result");
  }, [highScore, updateHighScore, playCelebrate, playMiss, confetti, showPopup]);

  // タイマー管理
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        if (prev <= 6) {
          playClick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase, endGame, playClick]);

  // 入力フォーカス
  useEffect(() => {
    if (phase === "playing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, currentSentenceIndex]);

  // Helper to get particle position from input area
  const getInputPosition = useCallback(() => {
    if (inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }, []);

  // キー入力処理
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (phase !== "playing") return;

      const newInput = e.target.value;
      const lastChar = newInput[newInput.length - 1];

      if (newInput.length > input.length && lastChar !== undefined) {
        // 文字追加
        const expectedChar = currentSentence[currentPosition];
        const isCorrect = lastChar === expectedChar;

        // Calculate current WPM for achievements
        const elapsedMs = Date.now() - stats.startTime;
        const elapsedMin = elapsedMs / 60000;
        const newCorrectChars = stats.correctChars + (isCorrect ? 1 : 0);
        const newTotalChars = stats.totalChars + 1;
        const currentWpmCalc = elapsedMin > 0 ? Math.round((newCorrectChars / 5) / elapsedMin) : 0;
        const currentAccCalc = Math.round((newCorrectChars / newTotalChars) * 100);

        setStats((prev) => ({
          ...prev,
          totalChars: prev.totalChars + 1,
          correctChars: prev.correctChars + (isCorrect ? 1 : 0),
        }));

        if (isCorrect) {
          playClick();
          setCurrentPosition((prev) => prev + 1);

          // Sparkle effect for correct typing (every few correct chars)
          const newCorrectChars = stats.correctChars + 1;
          if (newCorrectChars % 5 === 0) {
            const pos = getInputPosition();
            sparkle(pos.x + (Math.random() - 0.5) * 100, pos.y, 4);
          }

          // Speed achievement milestones (every 20 WPM)
          const wpmMilestone = Math.floor(currentWpmCalc / 20) * 20;
          if (wpmMilestone > 0 && wpmMilestone > lastWPMMilestoneRef.current && elapsedMs > 3000) {
            lastWPMMilestoneRef.current = wpmMilestone;
            showPopup(`🚀 ${wpmMilestone}+ WPM!`, "combo", "lg", "50%", "30%");
          }

          // Accuracy bonus (check at every 20 chars if maintaining high accuracy)
          if (newTotalChars > 0 && newTotalChars % 20 === 0) {
            if (currentAccCalc >= 98 && lastAccuracyBonusRef.current < newTotalChars) {
              lastAccuracyBonusRef.current = newTotalChars;
              showPopup("⚡ PERFECT!", "critical", "md", "50%", "35%");
            } else if (currentAccCalc >= 95 && currentAccCalc < 98 && lastAccuracyBonusRef.current < newTotalChars - 20) {
              lastAccuracyBonusRef.current = newTotalChars;
              showPopup(`✨ ${currentAccCalc}% Accuracy`, "bonus", "sm", "50%", "35%");
            }
          }

          // 文章完了チェック
          if (currentPosition + 1 >= currentSentence.length) {
            setStats((prev) => ({
              ...prev,
              correctWords: prev.correctWords + 1,
              totalWords: prev.totalWords + 1,
            }));
            playFanfare();

            // Burst effect when completing a word/sentence
            const pos = getInputPosition();
            burst(pos.x, pos.y, 16);

            // Sentence completion streak tracking
            sentenceStreakRef.current += 1;
            const streak = sentenceStreakRef.current;

            // Word completion popup with WPM indicator
            if (streak >= 3) {
              showPopup(`🔥 ${streak}連続! ${currentWpmCalc} WPM`, "combo", "lg");
            } else {
              showPopup(`✓ +${currentSentence.length}文字 (${currentWpmCalc} WPM)`, "default", "md");
            }

            // 次の文章へ
            if (currentSentenceIndex + 1 < sentences.length) {
              setCurrentSentenceIndex((prev) => prev + 1);
              setCurrentPosition(0);
              setInput("");
              return;
            } else {
              // 全文章完了 - confetti celebration
              confetti(80);
              showPopup("🏁 COMPLETE!", "level", "xl");
              setTimeout(() => endGame(), 500);
              return;
            }
          }
        } else {
          playMiss();
          // Reset streak on miss
          sentenceStreakRef.current = 0;
        }
      }

      setInput(newInput);
    },
    [
      phase,
      input,
      currentSentence,
      currentPosition,
      currentSentenceIndex,
      sentences.length,
      stats.correctChars,
      stats.totalChars,
      stats.startTime,
      endGame,
      playClick,
      playFanfare,
      playMiss,
      sparkle,
      burst,
      confetti,
      getInputPosition,
      showPopup,
    ]
  );

  // メニューに戻る
  const goToMenu = useCallback(() => {
    setPhase("idle");
  }, []);

  // WPM計算（リアルタイム）- timeLeftベースで計算
  const elapsedSeconds = settings.timeLimit - timeLeft;
  const currentWPM =
    phase === "playing" && elapsedSeconds > 0
      ? Math.round((stats.correctChars / 5 / (elapsedSeconds / 60)) || 0)
      : 0;

  // 正確性計算（リアルタイム）
  const currentAccuracy =
    stats.totalChars > 0
      ? Math.round((stats.correctChars / stats.totalChars) * 100)
      : 100;

  // 進捗計算
  const totalCharsInSentences = sentences.reduce((a, s) => a + s.length, 0);
  const completedChars =
    sentences
      .slice(0, currentSentenceIndex)
      .reduce((a, s) => a + s.length, 0) + currentPosition;
  const progress =
    totalCharsInSentences > 0
      ? (completedChars / totalCharsInSentences) * 100
      : 0;

  return (
    <GameShell gameId="typerace" layout="default">
      <div className="typerace-container">
        {phase === "idle" && (
          <div className="start-screen">
            <h1>Type Race</h1>
            <p>文章を正確に素早くタイピングしてスコアを競おう！</p>

            <div className="settings-panel">
              <div className="setting-row">
                <label>難易度</label>
                <div className="setting-options">
                  {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(
                    (diff) => (
                      <button
                        key={diff}
                        className={settings.difficulty === diff ? "selected" : ""}
                        onClick={() => handleSettingsChange("difficulty", diff)}
                        title={DIFFICULTY_CONFIG[diff].desc}
                      >
                        {DIFFICULTY_CONFIG[diff].label}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="setting-row">
                <label>制限時間</label>
                <div className="setting-options">
                  {TIME_OPTIONS.map((time) => (
                    <button
                      key={time}
                      className={settings.timeLimit === time ? "selected" : ""}
                      onClick={() => handleSettingsChange("timeLimit", time)}
                    >
                      {time}秒
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {highScore > 0 && (
              <p style={{ color: "#ffd700" }}>🏆 ハイスコア: {highScore}</p>
            )}

            <button className="start-button" onClick={startGame}>
              START
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="game-screen">
            <div className="game-header">
              <div className="timer">
                {timeLeft}s
              </div>
              <div className="stats">
                <span>
                  WPM: <span className="value">{currentWPM}</span>
                </span>
                <span>
                  正確性: <span className="value">{currentAccuracy}%</span>
                </span>
                <span>
                  文章:{" "}
                  <span className="value">
                    {currentSentenceIndex + 1}/{sentences.length}
                  </span>
                </span>
              </div>
            </div>

            <div className="typing-area">
              <div className="sentence-display">
                {currentSentence.split("").map((char, idx) => {
                  let className = "char ";
                  if (idx < currentPosition) {
                    const inputChar = input[idx];
                    className += inputChar === char ? "correct" : "incorrect";
                  } else if (idx === currentPosition) {
                    className += "current";
                  } else {
                    className += "pending";
                  }
                  return (
                    <span key={idx} className={className}>
                      {char}
                    </span>
                  );
                })}
              </div>

              <div className="input-wrapper" ref={inputWrapperRef}>
                <input
                  ref={inputRef}
                  type="text"
                  className="typing-input"
                  value={input}
                  onChange={handleInput}
                  placeholder="ここにタイピング..."
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {phase === "result" && result && (
          <div className="result-screen">
            <h2>Result</h2>
            <p className="result-rating">{getWPMRating(result.wpm)}</p>

            <div className="result-stats">
              <div className="result-stat">
                <div className="label">WPM</div>
                <div className="value wpm">{result.wpm}</div>
              </div>
              <div className="result-stat">
                <div className="label">正確性</div>
                <div className="value accuracy">{result.accuracy}%</div>
              </div>
              <div className="result-stat">
                <div className="label">スコア</div>
                <div className="value score">{result.score}</div>
              </div>
              <div className="result-stat">
                <div className="label">正解文字</div>
                <div className="value">
                  {result.correctChars}/{result.totalChars}
                </div>
              </div>
            </div>

            {result.score > 0 && result.score >= highScore && (
              <div className="highscore-badge">🎉 NEW HIGH SCORE!</div>
            )}

            <div className="result-actions">
              <button className="retry-button" onClick={startGame}>
                もう一度
              </button>
              <button className="menu-button" onClick={goToMenu}>
                メニュー
              </button>
              <div style={{ marginTop: 12 }}>
                <ShareButton score={result.wpm} gameTitle="Type Race" gameId="typerace" />
                <GameRecommendations currentGameId="typerace" />
              </div>
            </div>
          </div>
        )}

        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size={popup.size}
          x={popup.x}
          y={popup.y}
        />
      </div>
    </GameShell>
  );
}

export default App;
