import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell, useHighScore } from "../../../src/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "start" | "playing" | "result";

interface GameState {
  phase: Phase;
  currentWord: string;
  scrambledLetters: string[];
  userInput: string;
  hintUsed: boolean;
  solvedCount: number;
  timeLeft: number;
  feedback: "correct" | "wrong" | null;
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
  "MAPLE", "NOVEL", "ORBIT", "PRISM", "QUICK", "RADAR", "SUGAR", "TABLE", "URBAN", "VALID",
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
    timeLeft: TIME_LIMIT,
    feedback: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          return { ...prev, phase: "result", timeLeft: 0 };
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
  }, [state.phase, highScoreHook]);

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
      timeLeft: TIME_LIMIT,
      feedback: null,
    });
    setIsNewRecord(false);
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
        const word = getRandomWord(usedWordsRef.current);
        usedWordsRef.current.add(word);
        return {
          ...prev,
          currentWord: word,
          scrambledLetters: scrambleWord(word),
          userInput: "",
          hintUsed: false,
          solvedCount: newSolvedCount,
          timeLeft: TIME_LIMIT,
          feedback: "correct",
        };
      } else {
        // Wrong answer
        return {
          ...prev,
          feedback: "wrong",
        };
      }
    });
  }, []);

  const handleHint = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hintUsed: true,
    }));
  }, []);

  const handleSkip = useCallback(() => {
    const word = getRandomWord(usedWordsRef.current);
    usedWordsRef.current.add(word);
    setState((prev) => ({
      ...prev,
      currentWord: word,
      scrambledLetters: scrambleWord(word),
      userInput: "",
      hintUsed: false,
      timeLeft: TIME_LIMIT,
      feedback: null,
    }));
  }, []);

  const goToStart = useCallback(() => {
    setState({
      phase: "start",
      currentWord: "",
      scrambledLetters: [],
      userInput: "",
      hintUsed: false,
      solvedCount: 0,
      timeLeft: TIME_LIMIT,
      feedback: null,
    });
  }, []);

  return (
    <GameShell gameId="wordscramble" layout="default">
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
