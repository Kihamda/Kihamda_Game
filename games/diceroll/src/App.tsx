import { useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ScorePopup, ShareButton, GameRecommendations } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer } from "@shared";
import "./App.css";

interface PopupItem {
  id: number;
  text: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  x: string;
  y: string;
}

type GamePhase = "before" | "in_progress" | "after";
type Prediction = "high" | "low";

interface GameState {
  points: number;
  bet: number;
  streak: number;
  maxStreak: number;
  diceValue: number | null;
  prediction: Prediction | null;
  isRolling: boolean;
}

const INITIAL_POINTS = 100;
const MIN_BET = 1;
const MAX_BET = 50;

function DiceSVG({ value, isRolling }: { value: number | null; isRolling: boolean }) {
  const renderDots = (v: number) => {
    const dotPositions: Record<number, Array<[number, number]>> = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    };

    return dotPositions[v]?.map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="8" fill="#1a1a2e" />
    ));
  };

  return (
    <div className={`diceroll-dice ${isRolling ? "diceroll-dice--rolling" : ""}`}>
      <svg viewBox="0 0 100 100" width="140" height="140">
        <defs>
          <linearGradient id="diceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e0e0" />
          </linearGradient>
          <filter id="diceShadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>
        <rect x="5" y="5" width="90" height="90" rx="12" ry="12" 
              fill="url(#diceGradient)" stroke="#ccc" strokeWidth="2" 
              filter="url(#diceShadow)" />
        {value && renderDots(value)}
        {!value && !isRolling && (
          <text x="50" y="58" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#888">?</text>
        )}
      </svg>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("before");
  const [gameState, setGameState] = useState<GameState>({
    points: INITIAL_POINTS,
    bet: 10,
    streak: 0,
    maxStreak: 0,
    diceValue: null,
    prediction: null,
    isRolling: false,
  });

  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("diceroll-highscore");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Popup queue system
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [popupCounter, setPopupCounter] = useState(0);

  const showPopup = useCallback((
    text: string,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md",
    x = "50%",
    y = "40%"
  ) => {
    setPopupCounter((prev) => prev + 1);
    const id = popupCounter + 1;
    const popup: PopupItem = { id, text, variant, size, x, y };
    setPopups((prev) => [...prev, popup]);
    // Remove popup after animation
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1500);
  }, [popupCounter]);

  // Dopamine hooks
  const { particles, confetti, sparkle, explosion } = useParticles();
  const { playTone } = useAudio();
  const playRoll = useCallback(() => playTone(440, 0.05, 'triangle'), [playTone]);
  const playWin = useCallback(() => playTone(660, 0.15, 'sine'), [playTone]);
  const playLose = useCallback(() => playTone(200, 0.15, 'sawtooth'), [playTone]);

  const startGame = useCallback(() => {
    setPhase("in_progress");
    setGameState({
      points: INITIAL_POINTS,
      bet: 10,
      streak: 0,
      maxStreak: 0,
      diceValue: null,
      prediction: null,
      isRolling: false,
    });
  }, []);

  const adjustBet = useCallback((delta: number) => {
    setGameState((prev) => {
      const newBet = Math.max(MIN_BET, Math.min(MAX_BET, prev.bet + delta, prev.points));
      return { ...prev, bet: newBet };
    });
  }, []);

  const setMaxBet = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      bet: Math.min(MAX_BET, prev.points),
    }));
  }, []);

  const rollDice = useCallback((prediction: Prediction) => {
    if (gameState.isRolling || gameState.points < gameState.bet) return;

    playRoll();
    setGameState((prev) => ({
      ...prev,
      prediction,
      isRolling: true,
      diceValue: null,
    }));

    // Animate for 1.2 seconds
    setTimeout(() => {
      const diceValue = Math.floor(Math.random() * 6) + 1;
      const isHigh = diceValue >= 4;
      const won = (prediction === "high" && isHigh) || (prediction === "low" && !isHigh);
      const currentBet = gameState.bet;
      const currentStreak = gameState.streak;

      // Special roll detection
      const isExtremeLow = diceValue === 1;
      const isExtremeHigh = diceValue === 6;

      if (won) {
        playWin();
        sparkle(200, 180);
        
        // Win popup with balance change
        showPopup(`+${currentBet} pt`, "default", "lg", "50%", "30%");
        
        // Special rolls
        if (isExtremeLow) {
          setTimeout(() => showPopup("🎯 ピンゾロ!", "bonus", "md", "50%", "20%"), 200);
        } else if (isExtremeHigh) {
          setTimeout(() => showPopup("🎯 ゾロ目6!", "bonus", "md", "50%", "20%"), 200);
        }
        
        // Streak bonuses
        const newStreak = currentStreak + 1;
        if (newStreak === 3) {
          setTimeout(() => showPopup("🔥 3連続!", "combo", "lg", "50%", "15%"), 300);
          confetti();
        } else if (newStreak === 5) {
          setTimeout(() => showPopup("🔥🔥 5連続!", "critical", "xl", "50%", "15%"), 300);
          confetti();
        } else if (newStreak >= 7) {
          setTimeout(() => showPopup(`🔥🔥🔥 ${newStreak}連続!`, "critical", "xl", "50%", "15%"), 300);
          confetti();
        } else if (currentStreak >= 2) {
          confetti();
        }
      } else {
        playLose();
        explosion(200, 180);
        
        // Lose popup with balance change
        showPopup(`-${currentBet} pt`, "default", "lg", "50%", "30%");
        
        // Streak lost message
        if (currentStreak >= 3) {
          setTimeout(() => showPopup(`${currentStreak}連続 終了...`, "default", "md", "50%", "20%"), 200);
        }
      }

      setGameState((prev) => {
        const newPoints = won ? prev.points + prev.bet : prev.points - prev.bet;
        const newStreak = won ? prev.streak + 1 : 0;
        const newMaxStreak = Math.max(prev.maxStreak, newStreak);

        // Check game over
        if (newPoints <= 0) {
          setTimeout(() => {
            showPopup("💸 GAME OVER", "critical", "xl", "50%", "25%");
            setPhase("after");
            const currentHigh = parseInt(localStorage.getItem("diceroll-highscore") ?? "0", 10);
            if (newMaxStreak > currentHigh) {
              setHighScore(newMaxStreak);
              localStorage.setItem("diceroll-highscore", newMaxStreak.toString());
            }
          }, 500);
        }

        return {
          ...prev,
          diceValue,
          points: newPoints,
          streak: newStreak,
          maxStreak: newMaxStreak,
          isRolling: false,
          bet: Math.min(prev.bet, newPoints > 0 ? newPoints : prev.bet),
        };
      });
    }, 1200);
  }, [gameState.isRolling, gameState.points, gameState.bet, gameState.streak, playRoll, playWin, playLose, sparkle, confetti, explosion, showPopup]);

  const cashOut = useCallback(() => {
    showPopup("💰 Cash Out!", "level", "xl", "50%", "30%");
    if (gameState.points > INITIAL_POINTS) {
      const profit = gameState.points - INITIAL_POINTS;
      setTimeout(() => showPopup(`+${profit} 獲得!`, "bonus", "lg", "50%", "40%"), 300);
    }
    setTimeout(() => {
      setPhase("after");
      const currentHigh = parseInt(localStorage.getItem("diceroll-highscore") ?? "0", 10);
      if (gameState.maxStreak > currentHigh) {
        setHighScore(gameState.maxStreak);
        localStorage.setItem("diceroll-highscore", gameState.maxStreak.toString());
      }
    }, 800);
  }, [gameState.maxStreak, gameState.points, showPopup]);

  const getResultMessage = () => {
    if (!gameState.diceValue || !gameState.prediction) return null;
    const isHigh = gameState.diceValue >= 4;
    const won = (gameState.prediction === "high" && isHigh) || (gameState.prediction === "low" && !isHigh);
    
    return won ? (
      <span className="diceroll-message diceroll-message--win">
        🎉 的中！ +{gameState.bet} pt（出目: {gameState.diceValue}）
      </span>
    ) : (
      <span className="diceroll-message diceroll-message--lose">
        😢 はずれ！ -{gameState.bet} pt（出目: {gameState.diceValue}）
      </span>
    );
  };

  return (
    <GameShell gameId="diceroll" layout="default">
      <div className="diceroll-container">
        {/* Before game */}
        {phase === "before" && (
          <div className="diceroll-overlay">
            <h2>🎲 Dice Roll 🎲</h2>
            <p className="diceroll-subtitle">出目を予測！High or Low?</p>
            <p>ハイスコア (連続正解): {highScore}</p>
            <button className="diceroll-button" onClick={startGame}>
              ゲーム開始
            </button>
            <div className="diceroll-instructions">
              <h3>遊び方</h3>
              <ul>
                <li>🎯 High (4,5,6) か Low (1,2,3) を予測</li>
                <li>💰 当たれば賭け金が2倍</li>
                <li>🔥 連続正解でストリーク</li>
                <li>💸 ポイントが0になったら終了</li>
              </ul>
            </div>
          </div>
        )}

        {/* In progress */}
        {phase === "in_progress" && (
          <>
            <div className="diceroll-hud">
              <div className="diceroll-stat">
                <span className="diceroll-stat-label">ポイント</span>
                <span className="diceroll-stat-value diceroll-stat-value--points">
                  💰 {gameState.points}
                </span>
              </div>
              <div className="diceroll-stat">
                <span className="diceroll-stat-label">ストリーク</span>
                <span className="diceroll-stat-value diceroll-stat-value--streak">
                  🔥 {gameState.streak}
                </span>
              </div>
            </div>

            <div className="diceroll-stage">
              <DiceSVG value={gameState.diceValue} isRolling={gameState.isRolling} />

              <div className="diceroll-result-area">
                {gameState.isRolling ? (
                  <span className="diceroll-message diceroll-message--rolling">
                    サイコロを振っています...
                  </span>
                ) : (
                  getResultMessage()
                )}
              </div>

              <div className="diceroll-hint">
                <span className="diceroll-hint-low">Low: 1,2,3</span>
                <span className="diceroll-hint-high">High: 4,5,6</span>
              </div>
            </div>

            <div className="diceroll-controls">
              <div className="diceroll-bet-section">
                <span className="diceroll-bet-label">賭けポイント:</span>
                <div className="diceroll-bet-controls">
                  <button
                    className="diceroll-bet-button"
                    onClick={() => adjustBet(-5)}
                    disabled={gameState.isRolling || gameState.bet <= MIN_BET}
                  >
                    -5
                  </button>
                  <button
                    className="diceroll-bet-button"
                    onClick={() => adjustBet(-1)}
                    disabled={gameState.isRolling || gameState.bet <= MIN_BET}
                  >
                    -1
                  </button>
                  <span className="diceroll-bet-value">{gameState.bet}</span>
                  <button
                    className="diceroll-bet-button"
                    onClick={() => adjustBet(1)}
                    disabled={gameState.isRolling || gameState.bet >= Math.min(MAX_BET, gameState.points)}
                  >
                    +1
                  </button>
                  <button
                    className="diceroll-bet-button"
                    onClick={() => adjustBet(5)}
                    disabled={gameState.isRolling || gameState.bet >= Math.min(MAX_BET, gameState.points)}
                  >
                    +5
                  </button>
                  <button
                    className="diceroll-bet-button diceroll-bet-button--max"
                    onClick={setMaxBet}
                    disabled={gameState.isRolling}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="diceroll-prediction-buttons">
                <button
                  className="diceroll-button diceroll-button--low"
                  onClick={() => rollDice("low")}
                  disabled={gameState.isRolling || gameState.points < gameState.bet}
                >
                  ⬇️ Low
                </button>
                <button
                  className="diceroll-button diceroll-button--high"
                  onClick={() => rollDice("high")}
                  disabled={gameState.isRolling || gameState.points < gameState.bet}
                >
                  ⬆️ High
                </button>
              </div>

              <button
                className="diceroll-button diceroll-button--cashout"
                onClick={cashOut}
                disabled={gameState.isRolling}
              >
                利益確定して終了
              </button>
            </div>
          </>
        )}

        {/* Game over */}
        {phase === "after" && (
          <div className="diceroll-overlay">
            <h2>{gameState.points > 0 ? "🎊 おつかれさま！ 🎊" : "💸 ゲームオーバー 💸"}</h2>
            <div className="diceroll-final-stats">
              <div className="diceroll-final-stat">
                <span className="diceroll-final-label">最終ポイント</span>
                <span className="diceroll-final-value">{gameState.points}</span>
              </div>
              <div className="diceroll-final-stat">
                <span className="diceroll-final-label">最大ストリーク</span>
                <span className="diceroll-final-value">{gameState.maxStreak}</span>
              </div>
            </div>
            {gameState.maxStreak >= highScore && gameState.maxStreak > 0 && (
              <p className="diceroll-new-record">🏆 新記録！ 🏆</p>
            )}
            <p>ハイスコア: {highScore}</p>
            <ShareButton score={gameState.maxStreak} gameTitle="Dice Roll" gameId="diceroll" />
            <GameRecommendations currentGameId="diceroll" />
            <button className="diceroll-button" onClick={startGame}>
              もう一度
            </button>
          </div>
        )}
        <ParticleLayer particles={particles} />
        
        {/* Score Popups */}
        {popups.map((popup) => (
          <ScorePopup
            key={popup.id}
            popupKey={popup.id}
            text={popup.text}
            variant={popup.variant}
            size={popup.size}
            x={popup.x}
            y={popup.y}
          />
        ))}
      </div>
    </GameShell>
  );
}
