import { useState, useCallback, useEffect, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import type { PopupVariant } from "@shared/components/ScorePopup";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import "./App.css";

// 単語リスト (難易度別)
const WORDS = {
  easy: ["CAT", "DOG", "SUN", "BOOK", "FISH", "TREE", "BIRD", "CAKE", "MOON", "STAR"],
  normal: ["APPLE", "PIANO", "BEACH", "CLOUD", "GUITAR", "ORANGE", "TIGER", "WIZARD", "ROCKET", "JUNGLE"],
  hard: ["ALGORITHM", "SYMPHONY", "CHOCOLATE", "BUTTERFLY", "ADVENTURE", "HAPPINESS", "MYSTERIOUS", "THUNDERSTORM", "KNOWLEDGE", "BEAUTIFUL"],
};

const MAX_MISTAKES = 6;
const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

type Difficulty = "easy" | "normal" | "hard";
type GamePhase = "select" | "playing" | "won" | "lost";

interface GameState {
  word: string;
  guessedLetters: Set<string>;
  mistakes: number;
  phase: GamePhase;
  streak: number; // 連続正解数
}

interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  y: string;
}

// ハングマンの描画コンポーネント
function HangmanDrawing({ mistakes }: { mistakes: number }) {
  return (
    <div className="hangman-drawing">
      <svg viewBox="0 0 200 200">
        {/* 土台 */}
        <line x1="20" y1="180" x2="100" y2="180" stroke="#4a5568" strokeWidth="4" />
        <line x1="60" y1="180" x2="60" y2="20" stroke="#4a5568" strokeWidth="4" />
        <line x1="60" y1="20" x2="140" y2="20" stroke="#4a5568" strokeWidth="4" />
        <line x1="140" y1="20" x2="140" y2="40" stroke="#4a5568" strokeWidth="4" />
        
        {/* 頭 */}
        <circle
          cx="140"
          cy="60"
          r="20"
          className={`hangman-part hangman-head ${mistakes >= 1 ? "visible" : ""}`}
        />
        {/* 体 */}
        <line
          x1="140"
          y1="80"
          x2="140"
          y2="120"
          className={`hangman-part ${mistakes >= 2 ? "visible" : ""}`}
        />
        {/* 左腕 */}
        <line
          x1="140"
          y1="90"
          x2="110"
          y2="110"
          className={`hangman-part ${mistakes >= 3 ? "visible" : ""}`}
        />
        {/* 右腕 */}
        <line
          x1="140"
          y1="90"
          x2="170"
          y2="110"
          className={`hangman-part ${mistakes >= 4 ? "visible" : ""}`}
        />
        {/* 左脚 */}
        <line
          x1="140"
          y1="120"
          x2="110"
          y2="160"
          className={`hangman-part ${mistakes >= 5 ? "visible" : ""}`}
        />
        {/* 右脚 */}
        <line
          x1="140"
          y1="120"
          x2="170"
          y2="160"
          className={`hangman-part ${mistakes >= 6 ? "visible" : ""}`}
        />
      </svg>
    </div>
  );
}

function App() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    word: "",
    guessedLetters: new Set(),
    mistakes: 0,
    phase: "select",
    streak: 0,
  });
  const [shaking, setShaking] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    variant: "default",
    size: "md",
    y: "40%",
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { particles, sparkle, confetti } = useParticles();
  const { playSuccess, playMiss, playCelebrate, playGameOver } = useAudio();

  // ScorePopup表示ヘルパー
  const showPopup = useCallback(
    (text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md", y = "40%") => {
      setPopup((prev) => ({
        text,
        key: prev.key + 1,
        variant,
        size,
        y,
      }));
    },
    []
  );

  // ゲーム開始
  const startGame = useCallback((diff: Difficulty) => {
    const wordList = WORDS[diff];
    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
    setDifficulty(diff);
    setGameState({
      word: randomWord,
      guessedLetters: new Set(),
      mistakes: 0,
      phase: "playing",
      streak: 0,
    });
    setPopup({ text: null, key: 0, variant: "default", size: "md", y: "40%" });
  }, []);

  // 文字を推測
  const guessLetter = useCallback((letter: string) => {
    if (gameState.phase !== "playing") return;
    if (gameState.guessedLetters.has(letter)) return;

    const newGuessed = new Set(gameState.guessedLetters);
    newGuessed.add(letter);

    const isCorrect = gameState.word.includes(letter);
    let newMistakes = gameState.mistakes;
    let newPhase: GamePhase = "playing";
    let newStreak = gameState.streak;

    if (isCorrect) {
      // 正解時: sparkleパーティクル + 効果音
      playSuccess();
      newStreak++;

      // 同じ文字が複数ある場合はボーナス
      const letterCount = gameState.word.split("").filter((c) => c === letter).length;
      const baseScore = 10 * letterCount;
      
      // ストリークボーナス
      if (newStreak >= 3) {
        const bonus = newStreak * 5;
        showPopup(`+${baseScore + bonus} 🔥${newStreak}連続!`, "combo", "lg", "35%");
      } else if (letterCount > 1) {
        showPopup(`+${baseScore} ×${letterCount}!`, "bonus", "md", "35%");
      } else {
        showPopup(`+${baseScore}`, "default", "md", "35%");
      }
      
      // 文字の位置でsparkleを発生
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        sparkle(rect.width / 2, rect.height / 2 - 40, 12);
      }

      // 勝利判定
      const allRevealed = gameState.word
        .split("")
        .every((char) => newGuessed.has(char));
      if (allRevealed) {
        newPhase = "won";
        playCelebrate();
        confetti(80);
        // 勝利ポップアップを少し遅延して表示
        setTimeout(() => {
          showPopup("🎉 SOLVED!", "critical", "xl", "30%");
        }, 300);
      }
    } else {
      // 間違い時: シェイク + 赤フラッシュ + 効果音
      newMistakes++;
      newStreak = 0; // ストリークリセット
      playMiss();
      setShaking(true);
      setFlashing(true);
      setTimeout(() => setShaking(false), 400);
      setTimeout(() => setFlashing(false), 300);
      
      // 間違いポップアップ
      const remainingLives = MAX_MISTAKES - newMistakes;
      if (remainingLives === 1) {
        showPopup(`💀 ラスト1回!`, "critical", "lg", "35%");
      } else if (remainingLives <= 2) {
        showPopup(`❌ ${letter} 残り${remainingLives}`, "combo", "md", "35%");
      } else {
        showPopup(`✗ ${letter}`, "default", "sm", "35%");
      }

      // 敗北判定
      if (newMistakes >= MAX_MISTAKES) {
        newPhase = "lost";
        playGameOver();
        setTimeout(() => {
          showPopup("💀 GAME OVER", "level", "xl", "30%");
        }, 300);
      }
    }

    setGameState({
      ...gameState,
      guessedLetters: newGuessed,
      mistakes: newMistakes,
      phase: newPhase,
      streak: newStreak,
    });
  }, [gameState, sparkle, confetti, playSuccess, playMiss, playCelebrate, playGameOver, showPopup]);

  // キーボード入力対応
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        guessLetter(key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guessLetter]);

  // リセット
  const resetGame = useCallback(() => {
    setDifficulty(null);
    setGameState({
      word: "",
      guessedLetters: new Set(),
      mistakes: 0,
      phase: "select",
      streak: 0,
    });
    setPopup({ text: null, key: 0, variant: "default", size: "md", y: "40%" });
  }, []);

  // 難易度選択画面
  if (gameState.phase === "select") {
    return (
      <GameShell gameId="hangman">
        <div className="hangman-container">
          <div className="difficulty-select">
            <h2>🎯 Hangman</h2>
            <p style={{ color: "#a0aec0", margin: 0 }}>難易度を選択してください</p>
            <div className="difficulty-buttons">
              <button
                className="difficulty-btn easy"
                onClick={() => startGame("easy")}
              >
                Easy
              </button>
              <button
                className="difficulty-btn normal"
                onClick={() => startGame("normal")}
              >
                Normal
              </button>
              <button
                className="difficulty-btn hard"
                onClick={() => startGame("hard")}
              >
                Hard
              </button>
            </div>
          </div>
        </div>
      </GameShell>
    );
  }

  const getLetterStatus = (letter: string) => {
    if (!gameState.guessedLetters.has(letter)) return "";
    return gameState.word.includes(letter) ? "correct" : "wrong";
  };

  const getSlotClass = () => {
    if (gameState.phase === "won") return "won";
    if (gameState.phase === "lost") return "lost";
    return "";
  };

  return (
    <GameShell gameId="hangman">
      <div
        ref={containerRef}
        className={`hangman-container ${shaking ? "shake" : ""}`}
      >
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size={popup.size}
          y={popup.y}
        />
        {flashing && <div className="flash-overlay" />}

        {/* ステータス */}
        <div className="game-status">
          <span>❤️ 残りミス: {MAX_MISTAKES - gameState.mistakes}</span>
          <span>📝 難易度: {difficulty?.toUpperCase()}</span>
        </div>

        {/* ハングマン描画 */}
        <HangmanDrawing mistakes={gameState.mistakes} />

        {/* 単語表示 */}
        <div className="word-display">
          {gameState.word.split("").map((char, idx) => (
            <div
              key={idx}
              className={`letter-slot ${gameState.guessedLetters.has(char) ? "revealed" : ""} ${getSlotClass()}`}
            >
              {gameState.guessedLetters.has(char) || gameState.phase === "lost"
                ? char
                : ""}
            </div>
          ))}
        </div>

        {/* キーボード */}
        <div className="keyboard">
          {KEYBOARD_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="keyboard-row">
              {row.map((letter) => (
                <button
                  key={letter}
                  className={`key ${getLetterStatus(letter)}`}
                  onClick={() => guessLetter(letter)}
                  disabled={
                    gameState.guessedLetters.has(letter) ||
                    gameState.phase !== "playing"
                  }
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* 結果画面 */}
        {(gameState.phase === "won" || gameState.phase === "lost") && (
          <div className="game-result">
            <h2 className={`result-title ${gameState.phase === "won" ? "win" : "lose"}`}>
              {gameState.phase === "won" ? "🎉 勝利！" : "💀 ゲームオーバー"}
            </h2>
            <p className="result-word">正解: {gameState.word}</p>
            <button className="play-again-btn" onClick={resetGame}>
              もう一度プレイ
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}

export default App;