import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell, useHighScore, useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import type { GameState } from "./lib/types";
import {
  createInitialState,
  handleCorrectAnswer,
  handleTimeUp,
  handleWrongAnswer,
  startGame,
  validateAnswer,
} from "./lib/wordbomb";
import { DIFFICULTY } from "./lib/constants";

// ─── Popup State ─────────────────────────────────────────────────────────────

interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  y: string;
}

// ─── Components ──────────────────────────────────────────────────────────────

function StartScreen({
  highScore,
  onStart,
}: {
  highScore: number;
  onStart: () => void;
}) {
  return (
    <div className="start-screen">
      <h1>💣 Word Bomb</h1>
      <p className="subtitle">爆弾解除タイピングゲーム</p>

      <div className="rules">
        <h3>📖 遊び方</h3>
        <ul>
          <li>表示された<strong>文字列を含む</strong>英単語を入力</li>
          <li>各問題につき<strong>10秒</strong>の制限時間</li>
          <li>時間切れで<strong>ライフ -1</strong></li>
          <li>ライフが0になるとゲームオーバー</li>
          <li>同じ単語は<strong>1度しか</strong>使えません</li>
        </ul>
      </div>

      {highScore > 0 && (
        <div className="high-score-display">🏆 ハイスコア: {highScore}問</div>
      )}

      <button className="start-btn" onClick={onStart}>
        スタート
      </button>
    </div>
  );
}

function GameScreen({
  state,
  onSubmit,
}: {
  state: GameState;
  onSubmit: (word: string) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [state.currentPattern]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim().toLowerCase();
    if (trimmed) {
      onSubmit(trimmed);
      setInput("");
    }
  };

  const timerClass =
    state.timeLeft <= 3 ? "danger" : state.timeLeft <= 5 ? "warning" : "";

  const timerPercentage = (state.timeLeft / DIFFICULTY.timePerRound) * 100;

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="score-display">⭐ {state.score} 問正解</div>
        <div className="lives-display">
          {"❤️".repeat(state.lives)}
          {"🖤".repeat(DIFFICULTY.initialLives - state.lives)}
        </div>
      </div>

      <div className="bomb-section">
        <div className={`bomb ${timerClass}`}>
          <div className="bomb-fuse">
            <div
              className="bomb-fuse-fill"
              style={{ width: `${timerPercentage}%` }}
            />
          </div>
          <div className="bomb-body">💣</div>
          <div className={`timer ${timerClass}`}>{state.timeLeft}秒</div>
        </div>
      </div>

      <div className="pattern-section">
        <div className="pattern-label">この文字列を含む単語を入力</div>
        <div className="pattern-display">{state.currentPattern.toUpperCase()}</div>
      </div>

      <form className="input-section" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className={`word-input ${state.errorMessage ? "error" : ""}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`例: ...${state.currentPattern}...`}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button type="submit" className="submit-btn">
          回答
        </button>
      </form>

      <div className="error-message">{state.errorMessage}</div>

      {state.answeredWords.length > 0 && (
        <div className="used-words">
          <div className="used-words-label">回答済み:</div>
          <div className="used-words-list">
            {state.answeredWords.slice(-8).map((word, i) => (
              <span key={i} className="used-word">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultScreen({
  score,
  answeredWords,
  isNewRecord,
  onRetry,
  onHome,
}: {
  score: number;
  answeredWords: string[];
  isNewRecord: boolean;
  onRetry: () => void;
  onHome: () => void;
}) {
  return (
    <div className="result-screen">
      <h2>💥 GAME OVER</h2>
      <div className="final-score">{score}</div>
      <div>問正解！</div>

      {isNewRecord && <div className="new-record">🎉 NEW RECORD!</div>}

      {answeredWords.length > 0 && (
        <div className="word-list-display">
          <h4>回答した単語</h4>
          <div className="answered-words">
            {answeredWords.map((word, i) => (
              <span key={i} className="answered-word">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="result-buttons">
        <button className="retry-btn" onClick={onRetry}>
          もう一度
        </button>
        <button className="home-btn" onClick={onHome}>
          タイトルへ
        </button>
      </div>
    </div>
  );
}

// ─── Popup Helper ────────────────────────────────────────────────────────────

function createPopup(
  text: string,
  variant: PopupVariant = "default",
  size: "sm" | "md" | "lg" | "xl" = "md",
  y = "40%"
): PopupState {
  return { text, key: Date.now() + Math.random(), variant, size, y };
}

const INITIAL_POPUP: PopupState = { text: null, key: 0, variant: "default", size: "md", y: "40%" };

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const highScoreHook = useHighScore("wordbomb");
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [state, setState] = useState<GameState>(createInitialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [popup, setPopup] = useState<PopupState>(INITIAL_POPUP);
  
  const { playTone } = useAudio();
  const { particles, sparkle, confetti, explosion } = useParticles();

  // Popup表示ヘルパー
  const showPopup = useCallback(
    (text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md", y = "40%") => {
      setPopup(createPopup(text, variant, size, y));
    },
    []
  );
  
  const playCorrect = useCallback(() => playTone(660, 0.12, 'sine'), [playTone]);
  const playWrong = useCallback(() => playTone(220, 0.15, 'sawtooth'), [playTone]);
  const playTick = useCallback(() => playTone(400, 0.05, 'triangle'), [playTone]);
  const playBoom = useCallback(() => playTone(120, 0.4, 'sawtooth'), [playTone]);

  // タイマー処理
  useEffect(() => {
    if (state.phase !== "playing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.timeLeft <= 1) {
          playBoom();
          explosion(window.innerWidth / 2, window.innerHeight / 2);
          showPopup("💥 BOOM!", "critical", "xl", "35%");
          const nextState = handleTimeUp(prev);
          if (nextState.phase === "result") {
            const newRecord = highScoreHook.update(prev.score);
            setIsNewRecord(newRecord);
            if (newRecord) {
              confetti();
              setTimeout(() => showPopup("🎉 NEW RECORD!", "level", "xl", "30%"), 500);
            } else if (prev.score >= 10) {
              setTimeout(() => showPopup(`🎯 ${prev.score}問クリア！`, "bonus", "lg", "30%"), 500);
            }
          }
          return nextState;
        }
        if (prev.timeLeft <= 3) {
          playTick();
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.phase, highScoreHook, playBoom, playTick, explosion, confetti, showPopup]);

  const handleStart = useCallback(() => {
    setState(startGame());
    setIsNewRecord(false);
  }, []);

  const handleSubmit = useCallback((word: string) => {
    setState((prev) => {
      const validation = validateAnswer(prev, word);
      if (!validation.valid) {
        playWrong();
        return handleWrongAnswer(prev, validation.errorMessage);
      }
      playCorrect();
      sparkle(window.innerWidth / 2, window.innerHeight / 3);
      
      // Score popup based on word length and time remaining
      const wordLen = word.length;
      const timeRemaining = prev.timeLeft;
      const nextScore = prev.score + 1;
      
      // Long word achievements (7+ letters)
      if (wordLen >= 10) {
        showPopup(`🌟 MASTER WORD! "${word.toUpperCase()}"`, "critical", "lg", "25%");
      } else if (wordLen >= 8) {
        showPopup(`✨ EXCELLENT! "${word.toUpperCase()}"`, "bonus", "lg", "25%");
      } else if (wordLen >= 7) {
        showPopup(`👍 GREAT! +${wordLen}文字`, "combo", "md", "25%");
      } else if (timeRemaining <= 2) {
        // Last second save
        showPopup("⚡ ギリギリ！", "combo", "md", "25%");
      } else if (timeRemaining >= 8) {
        // Quick answer bonus
        showPopup(`🚀 QUICK! +1`, "default", "md", "25%");
      } else {
        // Normal correct
        showPopup(`+1 正解！`, "default", "sm", "25%");
      }
      
      // Milestone celebrations
      if (nextScore === 5) {
        setTimeout(() => showPopup("🔥 5問突破！", "combo", "lg", "35%"), 200);
      } else if (nextScore === 10) {
        setTimeout(() => showPopup("🎯 10問突破！すごい！", "bonus", "lg", "35%"), 200);
        confetti();
      } else if (nextScore === 15) {
        setTimeout(() => showPopup("⭐ 15問突破！達人！", "critical", "xl", "35%"), 200);
        confetti();
      } else if (nextScore === 20) {
        setTimeout(() => showPopup("👑 20問突破！神！", "level", "xl", "35%"), 200);
        confetti();
      } else if (nextScore > 0 && nextScore % 10 === 0) {
        setTimeout(() => showPopup(`🏆 ${nextScore}問達成！`, "level", "lg", "35%"), 200);
        confetti();
      }
      
      return handleCorrectAnswer(prev, word);
    });
  }, [playCorrect, playWrong, sparkle, showPopup, confetti]);

  const goToStart = useCallback(() => {
    setState(createInitialState());
  }, []);

  return (
    <GameShell gameId="wordbomb" layout="default">
      <ParticleLayer particles={particles} />
      <ScorePopup
        text={popup.text}
        popupKey={popup.key}
        variant={popup.variant}
        size={popup.size}
        y={popup.y}
      />
      <div className="wordbomb-container">
        {state.phase === "start" && (
          <StartScreen highScore={highScoreHook.best} onStart={handleStart} />
        )}
        {state.phase === "playing" && (
          <GameScreen state={state} onSubmit={handleSubmit} />
        )}
        {state.phase === "result" && (
          <ResultScreen
            score={state.score}
            answeredWords={state.answeredWords}
            isNewRecord={isNewRecord}
            onRetry={handleStart}
            onHome={goToStart}
          />
        )}
      </div>
    </GameShell>
  );
}
