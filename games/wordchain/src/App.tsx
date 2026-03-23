import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell, useHighScore, useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import {
  getLastChar,
  getStartingWord,
  isValidChain,
  isValidWord,
} from "./lib/words";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "start" | "playing" | "result";

interface GameState {
  phase: Phase;
  currentWord: string;
  usedWords: string[];
  chainCount: number;
  timeLeft: number;
  errorMessage: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIME_PER_WORD = 15; // seconds

// Milestone chain lengths for bonus popups
const MILESTONES = [5, 10, 15, 20, 25, 30, 50, 75, 100];

// Popup state type
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
      <h1>🔗 Word Chain</h1>
      <p className="subtitle">英単語しりとりゲーム</p>

      <div className="rules">
        <h3>📖 遊び方</h3>
        <ul>
          <li>表示された単語の<strong>最後の文字</strong>で始まる単語を入力</li>
          <li>各単語につき<strong>15秒</strong>の制限時間</li>
          <li>同じ単語は<strong>1度しか</strong>使えません</li>
          <li>辞書に登録された単語のみ有効</li>
        </ul>
      </div>

      {highScore > 0 && (
        <div className="high-score-display">🏆 ハイスコア: {highScore}チェーン</div>
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
  }, [state.currentWord]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim().toLowerCase();
    if (trimmed) {
      onSubmit(trimmed);
      setInput("");
    }
  };

  const lastChar = getLastChar(state.currentWord);
  const timerClass =
    state.timeLeft <= 3 ? "danger" : state.timeLeft <= 5 ? "warning" : "";

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="chain-count">🔗 {state.chainCount} チェーン</div>
        <div className={`timer ${timerClass}`}>⏱️ {state.timeLeft}秒</div>
      </div>

      <div className="current-word-section">
        <div className="current-word-label">現在の単語</div>
        <div className="current-word">
          {state.currentWord.slice(0, -1)}
          <span className="last-char">{lastChar.toUpperCase()}</span>
        </div>
      </div>

      <form className="input-section" onSubmit={handleSubmit}>
        <div className="input-hint">
          「<span className="highlight">{lastChar.toUpperCase()}</span>
          」で始まる単語を入力
        </div>
        <input
          ref={inputRef}
          type="text"
          className={`word-input ${state.errorMessage ? "error" : ""}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`${lastChar}...`}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <div className="error-message">{state.errorMessage}</div>
      </form>

      {state.usedWords.length > 0 && (
        <div className="used-words">
          <div className="used-words-label">使用済み単語:</div>
          <div className="used-words-list">
            {state.usedWords.map((word, i) => (
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
  chainCount,
  usedWords,
  isNewRecord,
  onRetry,
  onHome,
}: {
  chainCount: number;
  usedWords: string[];
  isNewRecord: boolean;
  onRetry: () => void;
  onHome: () => void;
}) {
  return (
    <div className="result-screen">
      <h2>⏱️ タイムアップ！</h2>
      <div className="final-score">{chainCount}</div>
      <div>チェーン達成！</div>

      {isNewRecord && <div className="new-record">🎉 NEW RECORD!</div>}

      {usedWords.length > 0 && (
        <div className="word-chain-display">
          <h4>作成したチェーン</h4>
          <div className="chain-words">
            {usedWords.map((word, i) => (
              <span key={i} className="chain-word">
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

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const highScoreHook = useHighScore("wordchain");
  const [isNewRecord, setIsNewRecord] = useState(false);

  const [state, setState] = useState<GameState>({
    phase: "start",
    currentWord: "",
    usedWords: [],
    chainCount: 0,
    timeLeft: TIME_PER_WORD,
    errorMessage: "",
  });

  // ScorePopup state
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    variant: "default",
    size: "md",
    y: "35%",
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { playTone } = useAudio();
  const { particles, sparkle, confetti, burst } = useParticles();
  
  const playCorrect = useCallback(() => playTone(660, 0.12, 'sine'), [playTone]);
  const playWrong = useCallback(() => playTone(220, 0.15, 'sawtooth'), [playTone]);
  const playTick = useCallback(() => playTone(400, 0.05, 'triangle'), [playTone]);
  const playMilestone = useCallback(() => playTone(880, 0.2, 'sine'), [playTone]);
  const playLongWord = useCallback(() => playTone(550, 0.15, 'triangle'), [playTone]);

  // Show popup helper
  const showPopup = useCallback((
    text: string,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md",
    y: string = "35%"
  ) => {
    setPopup(prev => ({
      text,
      key: prev.key + 1,
      variant,
      size,
      y,
    }));
  }, []);

  // Timer effect
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
          // Time up - game over
          const finalScore = prev.chainCount;
          const newRecord = highScoreHook.update(finalScore);
          setIsNewRecord(newRecord);
          
          // Show result popup
          if (newRecord) {
            confetti();
            showPopup("🎉 NEW RECORD!", "critical", "xl", "30%");
          } else if (finalScore >= 20) {
            showPopup(`🏆 ${finalScore} Chains!`, "level", "lg", "30%");
          } else if (finalScore >= 10) {
            showPopup(`🔥 ${finalScore} Chains!`, "combo", "lg", "30%");
          } else {
            showPopup(`${finalScore} Chains`, "default", "lg", "30%");
          }
          
          return { ...prev, phase: "result", timeLeft: 0 };
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
  }, [state.phase, highScoreHook, confetti, playTick, showPopup]);

  const startGame = useCallback(() => {
    const startWord = getStartingWord();
    setState({
      phase: "playing",
      currentWord: startWord.toLowerCase(),
      usedWords: [startWord.toLowerCase()],
      chainCount: 0,
      timeLeft: TIME_PER_WORD,
      errorMessage: "",
    });
    setIsNewRecord(false);
    setPopup(prev => ({ ...prev, text: null }));
  }, []);

  const handleSubmit = useCallback((word: string) => {
    setState((prev) => {
      // Check if word starts with the correct letter
      if (!isValidChain(prev.currentWord, word)) {
        playWrong();
        return {
          ...prev,
          errorMessage: `「${prev.currentWord.slice(-1).toUpperCase()}」で始まる単語を入力してください`,
        };
      }

      // Check if word is in dictionary
      if (!isValidWord(word)) {
        playWrong();
        return {
          ...prev,
          errorMessage: "辞書に登録されていない単語です",
        };
      }

      // Check if word was already used
      if (prev.usedWords.includes(word.toLowerCase())) {
        playWrong();
        return {
          ...prev,
          errorMessage: "その単語は既に使われています",
        };
      }

      // Success - add word and reset timer
      const newChainCount = prev.chainCount + 1;
      const wordLength = word.length;
      
      // Determine popup and effects
      const isMilestone = MILESTONES.includes(newChainCount);
      const isLongWord = wordLength >= 8;
      const isVeryLongWord = wordLength >= 10;
      
      // Play sounds
      playCorrect();
      
      // Show appropriate popup based on achievement
      if (isMilestone) {
        // Milestone achievement - highest priority
        playMilestone();
        burst(window.innerWidth / 2, window.innerHeight / 3);
        if (newChainCount >= 50) {
          showPopup(`🏆 ${newChainCount} CHAINS!`, "critical", "xl", "30%");
        } else if (newChainCount >= 20) {
          showPopup(`🔥 ${newChainCount} Chains!`, "level", "lg", "30%");
        } else {
          showPopup(`✨ ${newChainCount} Chains!`, "combo", "lg", "30%");
        }
      } else if (isVeryLongWord) {
        // Very long word (10+ letters)
        playLongWord();
        sparkle(window.innerWidth / 2, window.innerHeight / 3);
        showPopup(`💎 "${word}" +${wordLength}pt!`, "bonus", "lg", "30%");
      } else if (isLongWord) {
        // Long word (8-9 letters)
        playLongWord();
        sparkle(window.innerWidth / 2, window.innerHeight / 3);
        showPopup(`⭐ "${word}" +${wordLength}pt!`, "bonus", "md", "30%");
      } else {
        // Normal chain continuation
        sparkle(window.innerWidth / 2, window.innerHeight / 3);
        showPopup(`+${newChainCount}`, "default", "sm", "32%");
      }
      
      return {
        ...prev,
        currentWord: word.toLowerCase(),
        usedWords: [...prev.usedWords, word.toLowerCase()],
        chainCount: newChainCount,
        timeLeft: TIME_PER_WORD,
        errorMessage: "",
      };
    });
  }, [playCorrect, playWrong, playMilestone, playLongWord, sparkle, burst, showPopup]);

  const goToStart = useCallback(() => {
    setState({
      phase: "start",
      currentWord: "",
      usedWords: [],
      chainCount: 0,
      timeLeft: TIME_PER_WORD,
      errorMessage: "",
    });
    setPopup(prev => ({ ...prev, text: null }));
  }, []);

  return (
    <GameShell gameId="wordchain" layout="default">
      <ParticleLayer particles={particles} />
      <ScorePopup
        text={popup.text}
        popupKey={popup.key}
        variant={popup.variant}
        size={popup.size}
        y={popup.y}
      />
      <div className="wordchain-container">
        {state.phase === "start" && (
          <StartScreen highScore={highScoreHook.best} onStart={startGame} />
        )}
        {state.phase === "playing" && (
          <GameScreen state={state} onSubmit={handleSubmit} />
        )}
        {state.phase === "result" && (
          <ResultScreen
            chainCount={state.chainCount}
            usedWords={state.usedWords}
            isNewRecord={isNewRecord}
            onRetry={startGame}
            onHome={goToStart}
          />
        )}
      </div>
    </GameShell>
  );
}
