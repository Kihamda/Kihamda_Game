import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell } from "@shared/components/GameShell";

/** ゲームフェーズ */
type Phase = "start" | "playing" | "result";

/** 難易度 */
type Difficulty = "easy" | "normal" | "hard";

/** 演算子タイプ */
type Operator = "+" | "-" | "×";

/** 問題 */
interface Problem {
  a: number;
  b: number;
  operator: Operator;
  answer: number;
}

/** ゲーム時間 (秒) */
const GAME_DURATION = 60;

/** localStorage キー */
const STORAGE_KEY_PREFIX = "mathblitz_highscore_";

/** 難易度設定 */
const DIFFICULTY_CONFIG: Record<Difficulty, { 
  label: string; 
  operators: Operator[]; 
  maxNum: number;
  emoji: string;
}> = {
  easy: { label: "かんたん", operators: ["+", "-"], maxNum: 20, emoji: "😊" },
  normal: { label: "ふつう", operators: ["+", "-", "×"], maxNum: 50, emoji: "🔥" },
  hard: { label: "むずかしい", operators: ["+", "-", "×"], maxNum: 99, emoji: "💀" },
};

/** ハイスコア読み込み */
function loadHighScore(difficulty: Difficulty): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY_PREFIX + difficulty);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}

/** ハイスコア保存 */
function saveHighScore(difficulty: Difficulty, score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + difficulty, String(score));
  } catch {
    // ignore
  }
}

/** 問題生成 */
function generateProblem(difficulty: Difficulty): Problem {
  const config = DIFFICULTY_CONFIG[difficulty];
  const operator = config.operators[Math.floor(Math.random() * config.operators.length)];
  
  let a: number, b: number, answer: number;
  
  switch (operator) {
    case "+":
      a = Math.floor(Math.random() * config.maxNum) + 1;
      b = Math.floor(Math.random() * config.maxNum) + 1;
      answer = a + b;
      break;
    case "-":
      // 正の答えになるように
      a = Math.floor(Math.random() * config.maxNum) + 1;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×": {
      // 掛け算は小さめの数
      const maxMul = difficulty === "hard" ? 12 : 9;
      a = Math.floor(Math.random() * maxMul) + 1;
      b = Math.floor(Math.random() * maxMul) + 1;
      answer = a * b;
      break;
    }
    default:
      a = 1; b = 1; answer = 2;
  }
  
  return { a, b, operator, answer };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [highScore, setHighScore] = useState(() => loadHighScore("normal"));
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number>(0);

  // 難易度変更時にハイスコア更新
  useEffect(() => {
    setHighScore(loadHighScore(difficulty));
  }, [difficulty]);

  // タイマー
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase("result");
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

  // 結果画面でハイスコア判定
  useEffect(() => {
    if (phase === "result") {
      const currentHighScore = loadHighScore(difficulty);
      if (score > currentHighScore) {
        saveHighScore(difficulty, score);
        setHighScore(score);
        setIsNewRecord(true);
      } else {
        setIsNewRecord(false);
      }
    }
  }, [phase, score, difficulty]);

  // ゲーム開始
  const startGame = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setInput("");
    setProblem(generateProblem(difficulty));
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [difficulty]);

  // 次の問題
  const nextProblem = useCallback(() => {
    setProblem(generateProblem(difficulty));
    setInput("");
    inputRef.current?.focus();
  }, [difficulty]);

  // 回答判定
  const handleSubmit = useCallback(() => {
    if (!problem || input.trim() === "") return;

    const userAnswer = parseInt(input, 10);
    
    if (userAnswer === problem.answer) {
      // 正解
      const newCombo = combo + 1;
      const comboBonus = Math.floor(newCombo / 5); // 5コンボごとにボーナス
      setScore((prev) => prev + 1 + comboBonus);
      setCombo(newCombo);
      setMaxCombo((prev) => Math.max(prev, newCombo));
      setShowCorrect(true);
      setTimeout(() => setShowCorrect(false), 300);
    } else {
      // 不正解
      setCombo(0);
      setShowWrong(true);
      setTimeout(() => setShowWrong(false), 300);
    }
    
    nextProblem();
  }, [problem, input, combo, nextProblem]);

  // 入力変更
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 数字と負号のみ許可
    if (/^-?\d*$/.test(value)) {
      setInput(value);
    }
  }, []);

  // キー入力
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  }, [handleSubmit]);

  // タイトルに戻る
  const backToStart = useCallback(() => {
    setPhase("start");
  }, []);

  const config = DIFFICULTY_CONFIG[difficulty];

  return (
    <GameShell gameId="mathblitz" layout="default">
      <div className={`mathblitz-root ${showCorrect ? "flash-correct" : ""} ${showWrong ? "flash-wrong" : ""}`}>
        <h1 className="mathblitz-title">🧮 Math Blitz</h1>

        {phase === "start" && (
          <div className="mathblitz-panel">
            <p className="mathblitz-description">
              60秒で何問解ける？<br />
              計算を素早く解いてスコアを稼げ！
            </p>
            
            <div className="mathblitz-difficulty">
              <p className="mathblitz-difficulty-label">難易度を選択</p>
              <div className="mathblitz-difficulty-buttons">
                {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`mathblitz-difficulty-btn ${difficulty === d ? "active" : ""}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {DIFFICULTY_CONFIG[d].emoji} {DIFFICULTY_CONFIG[d].label}
                  </button>
                ))}
              </div>
              <p className="mathblitz-difficulty-info">
                {config.operators.join(" ")} ・ 最大{config.maxNum}
              </p>
            </div>

            {highScore > 0 && (
              <p className="mathblitz-highscore">
                🏆 ハイスコア ({config.label}): {highScore}点
              </p>
            )}
            
            <button
              type="button"
              className="mathblitz-button primary"
              onClick={startGame}
            >
              スタート！
            </button>
          </div>
        )}

        {phase === "playing" && problem && (
          <div className="mathblitz-game">
            <div className="mathblitz-status">
              <div className="mathblitz-stat">
                <span className="mathblitz-stat-label">⏱️ 残り時間</span>
                <span className={`mathblitz-stat-value ${timeLeft <= 10 ? "danger" : ""}`}>
                  {timeLeft}秒
                </span>
              </div>
              <div className="mathblitz-stat">
                <span className="mathblitz-stat-label">📊 スコア</span>
                <span className="mathblitz-stat-value">{score}</span>
              </div>
              <div className="mathblitz-stat">
                <span className="mathblitz-stat-label">🔥 コンボ</span>
                <span className={`mathblitz-stat-value ${combo >= 5 ? "combo-bonus" : ""}`}>
                  {combo}
                </span>
              </div>
            </div>

            <div className="mathblitz-problem">
              <span className="mathblitz-num">{problem.a}</span>
              <span className="mathblitz-operator">{problem.operator}</span>
              <span className="mathblitz-num">{problem.b}</span>
              <span className="mathblitz-equals">=</span>
              <span className="mathblitz-answer-box">?</span>
            </div>

            <div className="mathblitz-input-area">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                className="mathblitz-input"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="答えを入力"
                autoComplete="off"
              />
              <button
                type="button"
                className="mathblitz-button submit"
                onClick={handleSubmit}
              >
                回答
              </button>
            </div>

            {combo >= 5 && (
              <div className="mathblitz-combo-alert">
                🔥 {combo}コンボ！ ボーナス+{Math.floor(combo / 5)}
              </div>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="mathblitz-panel result">
            <p className="mathblitz-result-title">
              {isNewRecord ? "🎉 新記録！" : "⏱️ タイムアップ！"}
            </p>
            
            <div className="mathblitz-result-score">
              <span className="mathblitz-result-label">スコア</span>
              <span className="mathblitz-result-value">{score}点</span>
            </div>

            <div className="mathblitz-result-stats">
              <div className="mathblitz-result-stat">
                <span>最大コンボ</span>
                <span>{maxCombo}</span>
              </div>
              <div className="mathblitz-result-stat">
                <span>難易度</span>
                <span>{config.emoji} {config.label}</span>
              </div>
            </div>

            {highScore > 0 && (
              <p className="mathblitz-highscore">
                🏆 ハイスコア: {highScore}点
              </p>
            )}

            <div className="mathblitz-result-buttons">
              <button
                type="button"
                className="mathblitz-button primary"
                onClick={startGame}
              >
                もう一度
              </button>
              <button
                type="button"
                className="mathblitz-button secondary"
                onClick={backToStart}
              >
                タイトルへ
              </button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
