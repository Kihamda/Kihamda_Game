import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell, useHighScore, useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "start" | "playing" | "result";

interface GameState {
  phase: Phase;
  currentWord: string;
  scrambledLetters: string[];
  userInput: string;
  hintUsed: boolean;
  solvedCount: number;
  streak: number;
  timeLeft: number;
  feedback: "correct" | "wrong" | null;
}

/** ポップアップ状態 */
interface PopupState {
  text: string | null;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIME_LIMIT = 30; // seconds per word

const WORD_LIST = [
  "APPLE", "BRAIN", "CLOUD", "DANCE", "EARTH", "FLAME", "GRAPE", "HOUSE", "IMAGE", "JUICE",
  "KNIFE", "LEMON", "MOUSE", "NIGHT", "OCEAN", "PLANT", "QUEEN", "RIVER", "STONE", "TIGER",
  "UNCLE", "VOICE", "WATER", "ZEBRA", "ANGEL", "BEACH", "CANDY", "DREAM", "EAGLE", "FROST",
  "GHOST", "HEART", "JEWEL", "MAGIC", "NORTH", "PIANO", "ROYAL", "SHARK", "TOWER", "WITCH",
  "ALBUM", "BRUSH", "CHAIR", "DELTA", "ENTER", "FRUIT", "GRILL", "HOTEL", "INPUT", "JELLY",
  "KIOSK", "LUNAR", "MAPLE", "NOBLE", "OLIVE", "PEARL", "QUEST", "REALM", "SOLAR", "TRAIN",
  "NOVEL", "ORBIT", "PRISM", "QUICK", "RADAR", "SUGAR", "TABLE", "URBAN", "VALID", "WALTZ",
  "WEIRD", "YOUTH", "AGENT", "BLANK", "CLIMB", "DRIFT", "EVENT", "FLASH", "GRAIN", "HUMAN",
  "INSECT", "JUMBLE", "KERNEL", "LAPTOP", "MARKET", "NATURE", "ORANGE", "PLANET", "ROCKET", "SUNSET",
  "TEMPLE", "WONDER", "ACTION", "BRIDGE", "CASTLE", "DRAGON", "EMPIRE", "FOREST", "GARDEN", "HARBOR",
  "ISLAND", "JUNGLE", "KNIGHT", "LEGEND", "MINUTE", "NUMBER", "OXYGEN", "PEOPLE", "RANDOM", "SILVER",
  "TRAVEL", "UNIQUE", "VALLEY", "WINTER", "YELLOW", "ZOMBIE", "ANCHOR", "BRONZE", "CHROME", "DESERT",
];

// ─── Helper Functions ────────────────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function scrambleWord(word: string): string[] {
  const letters = word.split("");
  let scrambled = shuffleArray(letters);
  // Make sure scrambled is different from original
  while (scrambled.join("") === word && word.length > 1) {
    scrambled = shuffleArray(letters);
  }
  return scrambled;
}

function getRandomWord(usedWords: Set<string>): string {
  const available = WORD_LIST.filter((w) => !usedWords.has(w));
  if (available.length === 0) {
    // All words used, reset
    return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
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
      <h1>🔤 Word Scramble</h1>
      <p className="subtitle">単語スクランブル</p>

      <div className="rules">
        <h3>📖 遊び方</h3>
        <ul>
          <li>バラバラになった<strong>文字</strong>を並べ替えて単語を当てよう</li>
          <li>各単語につき<strong>30秒</strong>の制限時間</li>
          <li><strong>ヒントボタン</strong>で最初の文字がわかる</li>
          <li>正解すると次の単語へ！</li>
        </ul>
      </div>

      {highScore > 0 && (
        <div className="high-score-display">🏆 ハイスコア: {highScore}問正解</div>
      )}

      <button className="start-btn" onClick={onStart}>
        スタート
      </button>
    </div>
  );
}

function GameScreen({
  state,
  onInput,
  onSubmit,
  onHint,
  onSkip,
}: {
  state: GameState;
  onInput: (value: string) => void;
  onSubmit: () => void;
  onHint: () => void;
  onSkip: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [state.currentWord]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

  const timerClass =
    state.timeLeft <= 5 ? "danger" : state.timeLeft <= 10 ? "warning" : "";

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="solved-count">✅ {state.solvedCount}問正解</div>
        <div className={`timer ${timerClass}`}>⏱️ {state.timeLeft}秒</div>
      </div>

      <div className="scramble-section">
        <div className="scramble-label">この文字を並べ替えよう！</div>
        <div className="scrambled-letters">
          {state.scrambledLetters.map((letter, i) => (
            <span
              key={i}
              className={`letter ${state.hintUsed && i === 0 ? "hint-revealed" : ""}`}
            >
              {state.hintUsed && i === 0 ? state.currentWord[0] : letter}
            </span>
          ))}
        </div>
        {state.hintUsed && (
          <div className="hint-notice">💡 最初の文字は「{state.currentWord[0]}」</div>
        )}
      </div>

      <div className="input-section">
        <input
          ref={inputRef}
          type="text"
          className={`word-input ${state.feedback === "wrong" ? "error" : ""} ${state.feedback === "correct" ? "correct" : ""}`}
          value={state.userInput}
          onChange={(e) => onInput(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="単語を入力..."
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={state.currentWord.length}
        />
        <div className="letter-count">
          {state.userInput.length} / {state.currentWord.length}文字
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="hint-btn"
          onClick={onHint}
          disabled={state.hintUsed}
        >
          💡 ヒント
        </button>
        <button className="submit-btn" onClick={onSubmit}>
          回答する
        </button>
        <button className="skip-btn" onClick={onSkip}>
          ⏭️ スキップ
        </button>
      </div>
    </div>
  );
}

function ResultScreen({
  solvedCount,
  isNewRecord,
  onRetry,
  onHome,
}: {
  solvedCount: number;
  isNewRecord: boolean;
  onRetry: () => void;
  onHome: () => void;
}) {
  const getMessage = () => {
    if (solvedCount === 0) return "😢 ドンマイ！";
    if (solvedCount <= 3) return "😊 いい調子！";
    if (solvedCount <= 6) return "😎 すごい！";
    return "🏆 天才！";
  };

  return (
    <div className="result-screen">
      <h2>ゲーム終了！</h2>
      <div className="result-emoji">{getMessage().split(" ")[0]}</div>
      <div className="final-score">{solvedCount}</div>
      <div className="score-label">問正解</div>

      {isNewRecord && <div className="new-record">🎉 NEW RECORD!</div>}

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
  const highScoreHook = useHighScore("wordscramble");
  const [isNewRecord, setIsNewRecord] = useState(false);
  const usedWordsRef = useRef<Set<string>>(new Set());

  const [state, setState] = useState<GameState>({
    phase: "start",
    currentWord: "",
    scrambledLetters: [],
    userInput: "",
    hintUsed: false,
    solvedCount: 0,
    streak: 0,
    timeLeft: TIME_LIMIT,
    feedback: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // ScorePopup state
  const [popups, setPopups] = useState<PopupState[]>([]);
  const popupKeyRef = useRef(0);
  
  const { playTone } = useAudio();
  const { particles, sparkle, confetti, burst } = useParticles();
  
  const playCorrect = useCallback(() => playTone(660, 0.15, 'sine'), [playTone]);
  const playWrong = useCallback(() => playTone(220, 0.15, 'sawtooth'), [playTone]);
  const playTick = useCallback(() => playTone(400, 0.05, 'triangle'), [playTone]);
  const playSkip = useCallback(() => playTone(330, 0.1, 'triangle'), [playTone]);
  const playStreak = useCallback((s: number) => playTone(440 + s * 40, 0.1, 'sine'), [playTone]);
  const playSpeedBonus = useCallback(() => playTone(880, 0.1, 'sine'), [playTone]);
  
  // ポップアップ表示関数
  const showPopup = useCallback((
    text: string,
    options: {
      x?: string;
      y?: string;
      variant?: PopupVariant;
      size?: "sm" | "md" | "lg" | "xl";
      duration?: number;
    } = {}
  ) => {
    const key = ++popupKeyRef.current;
    const popup: PopupState = {
      text,
      key,
      x: options.x ?? "50%",
      y: options.y ?? "35%",
      variant: options.variant ?? "default",
      size: options.size ?? "md",
    };
    setPopups(prev => [...prev, popup]);
    
    // 自動消去
    const duration = options.duration ?? (options.variant === "critical" ? 1500 : 1000);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.key !== key));
    }, duration);
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
          const finalScore = prev.solvedCount;
          const newRecord = highScoreHook.update(finalScore);
          setIsNewRecord(newRecord);
          if (newRecord) {
            confetti();
          }
          return { ...prev, phase: "result", timeLeft: 0 };
        }
        if (prev.timeLeft <= 5) {
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
  }, [state.phase, highScoreHook, confetti, playTick]);

  const startGame = useCallback(() => {
    usedWordsRef.current.clear();
    const word = getRandomWord(usedWordsRef.current);
    usedWordsRef.current.add(word);
    setState({
      phase: "playing",
      currentWord: word,
      scrambledLetters: scrambleWord(word),
      userInput: "",
      hintUsed: false,
      solvedCount: 0,
      streak: 0,
      timeLeft: TIME_LIMIT,
      feedback: null,
    });
    setIsNewRecord(false);
    setPopups([]); // ポップアップをクリア
  }, []);

  const handleInput = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      userInput: value,
      feedback: null,
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    setState((prev) => {
      if (prev.userInput.toUpperCase() === prev.currentWord) {
        // Correct answer
        const newSolvedCount = prev.solvedCount + 1;
        const newStreak = prev.streak + 1;
        const timeRemaining = prev.timeLeft;
        
        // Calculate points
        let basePoints = 10;
        let speedBonus = 0;
        let streakBonus = 0;
        
        // Speed bonus: more time remaining = more bonus
        if (timeRemaining >= 25) {
          speedBonus = 5; // 超高速
        } else if (timeRemaining >= 20) {
          speedBonus = 3; // 高速
        } else if (timeRemaining >= 15) {
          speedBonus = 1; // やや速い
        }
        
        // Streak bonus: consecutive correct answers
        if (newStreak >= 3) {
          streakBonus = Math.min(newStreak, 10); // max 10 bonus
        }
        
        // Hint penalty
        if (prev.hintUsed) {
          basePoints = 5;
        }
        
        // Play sounds
        playCorrect();
        
        // Popup: base points
        showPopup(`+${basePoints}`, {
          y: "25%",
          variant: "default",
          size: "lg",
        });
        
        // Popup: speed bonus
        if (speedBonus > 0) {
          playSpeedBonus();
          setTimeout(() => {
            const speedText = speedBonus >= 5 ? "⚡ SPEED! +5" : speedBonus >= 3 ? "⚡ FAST! +3" : "⚡ +1";
            showPopup(speedText, {
              y: "35%",
              variant: "bonus",
              size: "md",
              duration: 1000,
            });
          }, 100);
        }
        
        // Popup: streak bonus
        if (newStreak >= 3 && newStreak % 3 === 0) {
          playStreak(newStreak);
          sparkle(window.innerWidth / 2, window.innerHeight / 3);
          setTimeout(() => {
            showPopup(`🔥 ${newStreak} STREAK! +${streakBonus}`, {
              y: "45%",
              variant: "combo",
              size: "lg",
              duration: 1200,
            });
          }, 200);
        } else if (newStreak >= 3) {
          burst(window.innerWidth / 2, window.innerHeight / 3, 5);
        } else {
          burst(window.innerWidth / 2, window.innerHeight / 3, 3);
        }
        
        // Level milestone popups (5, 10, 15...)
        if (newSolvedCount > 0 && newSolvedCount % 5 === 0) {
          setTimeout(() => {
            showPopup(`🎯 ${newSolvedCount}問クリア!`, {
              y: "55%",
              variant: "level",
              size: "xl",
              duration: 1500,
            });
          }, 300);
          sparkle(window.innerWidth / 2, window.innerHeight / 2);
        }
        
        const word = getRandomWord(usedWordsRef.current);
        usedWordsRef.current.add(word);
        return {
          ...prev,
          currentWord: word,
          scrambledLetters: scrambleWord(word),
          userInput: "",
          hintUsed: false,
          solvedCount: newSolvedCount,
          streak: newStreak,
          timeLeft: TIME_LIMIT,
          feedback: "correct",
        };
      } else {
        // Wrong answer
        playWrong();
        
        // Popup: wrong answer
        showPopup("✖️ もう一度!", {
          y: "30%",
          variant: "critical",
          size: "md",
          duration: 800,
        });
        
        return {
          ...prev,
          streak: 0, // Reset streak on wrong answer
          feedback: "wrong",
        };
      }
    });
  }, [playCorrect, playWrong, playSpeedBonus, playStreak, sparkle, burst, showPopup]);

  const handleHint = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hintUsed: true,
    }));
  }, []);

  const handleSkip = useCallback(() => {
    playSkip();
    showPopup("⏭️ SKIP", {
      y: "30%",
      variant: "default",
      size: "sm",
      duration: 600,
    });
    const word = getRandomWord(usedWordsRef.current);
    usedWordsRef.current.add(word);
    setState((prev) => ({
      ...prev,
      currentWord: word,
      scrambledLetters: scrambleWord(word),
      userInput: "",
      hintUsed: false,
      streak: 0, // Reset streak on skip
      timeLeft: TIME_LIMIT,
      feedback: null,
    }));
  }, [playSkip, showPopup]);

  const goToStart = useCallback(() => {
    setState({
      phase: "start",
      currentWord: "",
      scrambledLetters: [],
      userInput: "",
      hintUsed: false,
      solvedCount: 0,
      streak: 0,
      timeLeft: TIME_LIMIT,
      feedback: null,
    });
    setPopups([]);
  }, []);

  return (
    <GameShell gameId="wordscramble" layout="default">
      <ParticleLayer particles={particles} />
      {/* ScorePopups */}
      {popups.map((p) => (
        <ScorePopup
          key={p.key}
          text={p.text}
          popupKey={p.key}
          x={p.x}
          y={p.y}
          variant={p.variant}
          size={p.size}
        />
      ))}
      <div className="wordscramble-container">
        {state.phase === "start" && (
          <StartScreen highScore={highScoreHook.best} onStart={startGame} />
        )}
        {state.phase === "playing" && (
          <GameScreen
            state={state}
            onInput={handleInput}
            onSubmit={handleSubmit}
            onHint={handleHint}
            onSkip={handleSkip}
          />
        )}
        {state.phase === "result" && (
          <ResultScreen
            solvedCount={state.solvedCount}
            isNewRecord={isNewRecord}
            onRetry={startGame}
            onHome={goToStart}
          />
        )}
      </div>
    </GameShell>
  );
}
