import { useCallback, useRef, useState } from "react";
import "./App.css";
import { GameShell, useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";

/** ゲームフェーズ */
type Phase = "start" | "playing" | "result";

/** 履歴アイテム */
interface GuessHistory {
  guess: number;
  hint: "high" | "low" | "correct";
}

/** localStorage キー */
const STORAGE_KEY = "numberguess_best";

/** 最小値・最大値 */
const MIN_NUM = 1;
const MAX_NUM = 100;

/** ベストスコア読み込み */
function loadBestScore(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

/** ベストスコア保存 */
function saveBestScore(score: number): void {
  try {
    const current = loadBestScore();
    if (current === null || score < current) {
      localStorage.setItem(STORAGE_KEY, String(score));
    }
  } catch {
    // ignore
  }
}

/** ランダムな正解を生成 */
function generateAnswer(): number {
  return Math.floor(Math.random() * (MAX_NUM - MIN_NUM + 1)) + MIN_NUM;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [answer, setAnswer] = useState<number>(0);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<GuessHistory[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(() => loadBestScore());
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showHint, setShowHint] = useState<"high" | "low" | null>(null);
  
  // ScorePopup state
  const [popup, setPopup] = useState<{ text: string; variant: PopupVariant; key: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  
  const { playTone } = useAudio();
  const { particles, sparkle, confetti } = useParticles();
  
  const playHint = useCallback(() => playTone(330, 0.1, 'triangle'), [playTone]);
  const playCorrect = useCallback(() => playTone(880, 0.3, 'sine'), [playTone]);
  const playStart = useCallback(() => playTone(440, 0.1, 'sine'), [playTone]);
  
  // Show popup helper
  const showPopup = useCallback((text: string, variant: PopupVariant) => {
    setPopup({ text, variant, key: Date.now() });
    setTimeout(() => setPopup(null), variant === 'level' ? 1500 : variant === 'critical' ? 1200 : 1000);
  }, []);

  // ゲーム開始
  const startGame = useCallback(() => {
    setPhase("playing");
    setAnswer(generateAnswer());
    setInput("");
    setHistory([]);
    setAttempts(0);
    setShowHint(null);
    setPopup(null);
    playStart();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [playStart]);

  // 回答判定
  const handleGuess = useCallback(() => {
    const guess = parseInt(input, 10);
    if (isNaN(guess) || guess < MIN_NUM || guess > MAX_NUM) {
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setInput("");

    let hint: "high" | "low" | "correct";
    if (guess === answer) {
      hint = "correct";
      setHistory((prev) => [...prev, { guess, hint }]);
      
      // 正解！
      playCorrect();
      sparkle(window.innerWidth / 2, window.innerHeight / 2);
      const currentBest = loadBestScore();
      if (currentBest === null || newAttempts < currentBest) {
        saveBestScore(newAttempts);
        setBestScore(newAttempts);
        setIsNewRecord(true);
        confetti();
        // New high score popup
        showPopup("🏆 新記録!", "level");
      } else {
        setIsNewRecord(false);
        // Correct guess popup
        showPopup("正解!", "critical");
      }
      setPhase("result");
    } else if (guess > answer) {
      hint = "high";
      playHint();
      setShowHint("high");
      setHistory((prev) => [...prev, { guess, hint }]);
      // Hint popup - too high
      showPopup("⬆️ 小さい!", "bonus");
      setTimeout(() => setShowHint(null), 500);
    } else {
      hint = "low";
      playHint();
      setShowHint("low");
      setHistory((prev) => [...prev, { guess, hint }]);
      // Hint popup - too low
      showPopup("⬇️ 大きい!", "bonus");
      setTimeout(() => setShowHint(null), 500);
    }
    
    inputRef.current?.focus();
  }, [input, answer, attempts, playCorrect, playHint, sparkle, confetti, showPopup]);

  // 入力変更
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setInput(value);
    }
  }, []);

  // キー入力
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGuess();
    }
  }, [handleGuess]);

  // タイトルに戻る
  const backToStart = useCallback(() => {
    setPhase("start");
  }, []);

  // レーティング表示
  const getRating = (attempts: number): { text: string; emoji: string } => {
    if (attempts <= 5) return { text: "神", emoji: "🌟" };
    if (attempts <= 7) return { text: "最高！", emoji: "🎉" };
    if (attempts <= 10) return { text: "すごい！", emoji: "👏" };
    if (attempts <= 15) return { text: "いいね！", emoji: "👍" };
    return { text: "クリア！", emoji: "✨" };
  };

  return (
    <GameShell gameId="numberguess" layout="default">
      <ParticleLayer particles={particles} />
      {popup && (
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size="lg"
          y="30%"
        />
      )}
      <div className={`numberguess-root ${showHint === "high" ? "flash-high" : ""} ${showHint === "low" ? "flash-low" : ""}`}>
        <h1 className="numberguess-title">🔢 数当てゲーム</h1>

        {phase === "start" && (
          <div className="numberguess-panel">
            <p className="numberguess-description">
              1〜100の数字を当てよう！<br />
              ヒントを頼りに少ない回数でクリア！
            </p>
            
            <div className="numberguess-rules">
              <p>📌 ルール</p>
              <ul>
                <li>正解の数字は1〜100のどれか</li>
                <li>予想を入力すると「大きい」か「小さい」のヒント</li>
                <li>少ない回数で当てるほど高評価！</li>
              </ul>
            </div>

            {bestScore !== null && (
              <p className="numberguess-best">
                🏆 ベスト記録: {bestScore}回
              </p>
            )}
            
            <button
              type="button"
              className="numberguess-button primary"
              onClick={startGame}
            >
              スタート！
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="numberguess-game">
            <div className="numberguess-status">
              <div className="numberguess-stat">
                <span className="numberguess-stat-label">🎯 予想回数</span>
                <span className="numberguess-stat-value">{attempts}</span>
              </div>
              <div className="numberguess-stat">
                <span className="numberguess-stat-label">📊 範囲</span>
                <span className="numberguess-stat-value">{MIN_NUM}〜{MAX_NUM}</span>
              </div>
            </div>

            <div className="numberguess-input-area">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                className="numberguess-input"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="数字を入力"
                autoComplete="off"
                maxLength={3}
              />
              <button
                type="button"
                className="numberguess-button submit"
                onClick={handleGuess}
                disabled={input === ""}
              >
                予想！
              </button>
            </div>

            {history.length > 0 && (
              <div className="numberguess-history">
                <p className="numberguess-history-title">履歴</p>
                <div className="numberguess-history-list">
                  {history.slice().reverse().map((item, idx) => (
                    <div key={history.length - 1 - idx} className={`numberguess-history-item ${item.hint}`}>
                      <span className="numberguess-history-num">{item.guess}</span>
                      <span className="numberguess-history-hint">
                        {item.hint === "high" && "⬆️ もっと小さい"}
                        {item.hint === "low" && "⬇️ もっと大きい"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="numberguess-panel result">
            <p className="numberguess-result-title">
              {isNewRecord ? "🎉 新記録！" : `${getRating(attempts).emoji} ${getRating(attempts).text}`}
            </p>
            
            <div className="numberguess-result-answer">
              <span className="numberguess-result-label">正解</span>
              <span className="numberguess-result-value">{answer}</span>
            </div>

            <div className="numberguess-result-stats">
              <div className="numberguess-result-stat">
                <span>予想回数</span>
                <span>{attempts}回</span>
              </div>
              {bestScore !== null && (
                <div className="numberguess-result-stat">
                  <span>ベスト記録</span>
                  <span>{bestScore}回</span>
                </div>
              )}
            </div>

            <div className="numberguess-result-buttons">
              <button
                type="button"
                className="numberguess-button primary"
                onClick={startGame}
              >
                もう一度
              </button>
              <button
                type="button"
                className="numberguess-button secondary"
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
