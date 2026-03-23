import { useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer, ComboCounter } from "@shared";
import "./App.css";

interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  y: string;
}

type GamePhase = "before" | "in_progress" | "after";
type CoinSide = "heads" | "tails";

interface GameState {
  coins: number;
  bet: number;
  streak: number;
  maxStreak: number;
  result: CoinSide | null;
  prediction: CoinSide | null;
  isFlipping: boolean;
}

const INITIAL_COINS = 100;
const MIN_BET = 1;
const MAX_BET = 50;

function CoinSVG({ side, isFlipping }: { side: CoinSide | null; isFlipping: boolean }) {
  const isHeads = side === "heads" || side === null;

  return (
    <div className={`coinflip-coin ${isFlipping ? "coinflip-coin--flipping" : ""}`}>
      <div className="coinflip-coin-inner">
        <div className="coinflip-coin-face coinflip-coin-face--front">
          <svg viewBox="0 0 100 100" width="150" height="150">
            <defs>
              <linearGradient id="coinGoldFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd700" />
                <stop offset="50%" stopColor="#ffec8b" />
                <stop offset="100%" stopColor="#daa520" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#coinGoldFront)" stroke="#b8860b" strokeWidth="2" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#b8860b" strokeWidth="1" />
            <text x="50" y="58" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#8b4513">表</text>
            <circle cx="30" cy="35" r="8" fill="rgba(255,255,255,0.3)" />
          </svg>
        </div>
        <div className="coinflip-coin-face coinflip-coin-face--back">
          <svg viewBox="0 0 100 100" width="150" height="150">
            <defs>
              <linearGradient id="coinGoldBack" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c0c0c0" />
                <stop offset="50%" stopColor="#e8e8e8" />
                <stop offset="100%" stopColor="#a9a9a9" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#coinGoldBack)" stroke="#808080" strokeWidth="2" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#808080" strokeWidth="1" />
            <text x="50" y="58" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#555">裏</text>
            <circle cx="30" cy="35" r="8" fill="rgba(255,255,255,0.4)" />
          </svg>
        </div>
      </div>
      {!isFlipping && side && (
        <div className={`coinflip-result-indicator ${side === "heads" ? "coinflip-result-indicator--heads" : "coinflip-result-indicator--tails"}`}>
          {isHeads ? "表" : "裏"}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("before");
  const [gameState, setGameState] = useState<GameState>({
    coins: INITIAL_COINS,
    bet: 10,
    streak: 0,
    maxStreak: 0,
    result: null,
    prediction: null,
    isFlipping: false,
  });

  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("coinflip-highscore");
    return saved ? parseInt(saved, 10) : 0;
  });

  // ScorePopup state
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    variant: "default",
    size: "md",
    y: "40%",
  });

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

  // Dopamine hooks
  const { particles, confetti, sparkle, explosion } = useParticles();
  const { playTone } = useAudio();
  const playCorrect = useCallback(() => playTone(660, 0.12, 'sine'), [playTone]);
  const playWrong = useCallback(() => playTone(200, 0.2, 'sawtooth'), [playTone]);
  const playFlip = useCallback(() => playTone(440, 0.05, 'triangle'), [playTone]);

  const startGame = useCallback(() => {
    setPhase("in_progress");
    setGameState({
      coins: INITIAL_COINS,
      bet: 10,
      streak: 0,
      maxStreak: 0,
      result: null,
      prediction: null,
      isFlipping: false,
    });
  }, []);

  const adjustBet = useCallback((delta: number) => {
    setGameState((prev) => {
      const newBet = Math.max(MIN_BET, Math.min(MAX_BET, prev.bet + delta, prev.coins));
      return { ...prev, bet: newBet };
    });
  }, []);

  const setMaxBet = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      bet: Math.min(MAX_BET, prev.coins),
    }));
  }, []);

  const flipCoin = useCallback((prediction: CoinSide) => {
    if (gameState.isFlipping || gameState.coins < gameState.bet) return;

    playFlip();
    setGameState((prev) => ({
      ...prev,
      prediction,
      isFlipping: true,
    }));

    // Animate for 1.5 seconds
    setTimeout(() => {
      const result: CoinSide = Math.random() < 0.5 ? "heads" : "tails";
      const won = result === prediction;

      if (won) {
        playCorrect();
        sparkle(200, 200);
      } else {
        playWrong();
      }

      setGameState((prev) => {
        const newCoins = won ? prev.coins + prev.bet : prev.coins - prev.bet;
        const newStreak = won ? prev.streak + 1 : 0;
        const newMaxStreak = Math.max(prev.maxStreak, newStreak);
        const currentHigh = parseInt(localStorage.getItem("coinflip-highscore") ?? "0", 10);

        // Show win/lose popup with balance change
        if (won) {
          showPopup(`+${prev.bet} 💰`, "default", "lg", "35%");
        } else {
          showPopup(`-${prev.bet} 💸`, "critical", "md", "35%");
        }

        // Streak bonus popups (shown after a delay)
        if (newStreak === 3) {
          setTimeout(() => showPopup("🔥 3連勝！", "combo", "lg", "25%"), 300);
        } else if (newStreak === 5) {
          setTimeout(() => showPopup("🔥🔥 5連勝！", "bonus", "xl", "25%"), 300);
          confetti();
        } else if (newStreak === 7) {
          setTimeout(() => showPopup("🔥🔥🔥 7連勝！激アツ！", "critical", "xl", "25%"), 300);
          confetti();
        } else if (newStreak >= 10 && newStreak % 5 === 0) {
          setTimeout(() => showPopup(`🏆 ${newStreak}連勝！神！`, "level", "xl", "25%"), 300);
          confetti();
        }

        // High score achievement popup
        if (newMaxStreak > currentHigh && newMaxStreak > prev.maxStreak) {
          setTimeout(() => showPopup("🏆 新記録！", "level", "xl", "15%"), 500);
        }

        // Check game over
        if (newCoins <= 0) {
          explosion(200, 200);
          setTimeout(() => {
            setPhase("after");
            // Save high score
            if (newMaxStreak > currentHigh) {
              setHighScore(newMaxStreak);
              localStorage.setItem("coinflip-highscore", newMaxStreak.toString());
            }
          }, 500);
        }

        return {
          ...prev,
          result,
          coins: newCoins,
          streak: newStreak,
          maxStreak: newMaxStreak,
          isFlipping: false,
          bet: newCoins > 0 ? Math.min(prev.bet, newCoins) : MIN_BET,
        };
      });
    }, 1500);
  }, [gameState.isFlipping, gameState.coins, gameState.bet, playFlip, playCorrect, playWrong, sparkle, confetti, explosion, showPopup]);

  const cashOut = useCallback(() => {
    setPhase("after");
    const currentHigh = parseInt(localStorage.getItem("coinflip-highscore") ?? "0", 10);
    if (gameState.maxStreak > currentHigh) {
      setHighScore(gameState.maxStreak);
      localStorage.setItem("coinflip-highscore", gameState.maxStreak.toString());
    }
  }, [gameState.maxStreak]);

  const getResultMessage = () => {
    if (!gameState.result || !gameState.prediction) return null;
    const won = gameState.result === gameState.prediction;
    return won ? (
      <span className="coinflip-message coinflip-message--win">
        正解！ +{gameState.bet} コイン 🎉
      </span>
    ) : (
      <span className="coinflip-message coinflip-message--lose">
        残念！ -{gameState.bet} コイン 😢
      </span>
    );
  };

  return (
    <GameShell gameId="coinflip" layout="default">
      <div className="coinflip-container" style={{ position: 'relative' }}>
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size={popup.size}
          y={popup.y}
        />
        {gameState.streak >= 3 && phase === "in_progress" && <ComboCounter combo={gameState.streak} />}
        
        {/* Before game */}
        {phase === "before" && (
          <div className="coinflip-overlay">
            <h2>🪙 Coin Flip 🪙</h2>
            <p className="coinflip-subtitle">コインの表裏を予測しよう！</p>
            <p>ハイスコア (連続正解): {highScore}</p>
            <button className="coinflip-button" onClick={startGame}>
              ゲーム開始
            </button>
            <div className="coinflip-instructions">
              <h3>遊び方</h3>
              <ul>
                <li>🎯 表か裏を予測</li>
                <li>💰 当たれば賭け金が倍</li>
                <li>🔥 連続正解でストリーク</li>
                <li>💸 コインが0になったら終了</li>
              </ul>
            </div>
          </div>
        )}

        {/* In progress */}
        {phase === "in_progress" && (
          <>
            <div className="coinflip-hud">
              <div className="coinflip-stat">
                <span className="coinflip-stat-label">所持コイン</span>
                <span className="coinflip-stat-value coinflip-stat-value--coins">
                  💰 {gameState.coins}
                </span>
              </div>
              <div className="coinflip-stat">
                <span className="coinflip-stat-label">ストリーク</span>
                <span className="coinflip-stat-value coinflip-stat-value--streak">
                  🔥 {gameState.streak}
                </span>
              </div>
            </div>

            <div className="coinflip-stage">
              <CoinSVG side={gameState.result} isFlipping={gameState.isFlipping} />

              <div className="coinflip-result-area">
                {gameState.isFlipping ? (
                  <span className="coinflip-message coinflip-message--flipping">
                    コインを投げています...
                  </span>
                ) : (
                  getResultMessage()
                )}
              </div>
            </div>

            <div className="coinflip-controls">
              <div className="coinflip-bet-section">
                <span className="coinflip-bet-label">賭け金:</span>
                <div className="coinflip-bet-controls">
                  <button
                    className="coinflip-bet-button"
                    onClick={() => adjustBet(-5)}
                    disabled={gameState.isFlipping || gameState.bet <= MIN_BET}
                  >
                    -5
                  </button>
                  <button
                    className="coinflip-bet-button"
                    onClick={() => adjustBet(-1)}
                    disabled={gameState.isFlipping || gameState.bet <= MIN_BET}
                  >
                    -1
                  </button>
                  <span className="coinflip-bet-value">{gameState.bet}</span>
                  <button
                    className="coinflip-bet-button"
                    onClick={() => adjustBet(1)}
                    disabled={gameState.isFlipping || gameState.bet >= Math.min(MAX_BET, gameState.coins)}
                  >
                    +1
                  </button>
                  <button
                    className="coinflip-bet-button"
                    onClick={() => adjustBet(5)}
                    disabled={gameState.isFlipping || gameState.bet >= Math.min(MAX_BET, gameState.coins)}
                  >
                    +5
                  </button>
                  <button
                    className="coinflip-bet-button coinflip-bet-button--max"
                    onClick={setMaxBet}
                    disabled={gameState.isFlipping}
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="coinflip-prediction-buttons">
                <button
                  className="coinflip-button coinflip-button--heads"
                  onClick={() => flipCoin("heads")}
                  disabled={gameState.isFlipping || gameState.coins < gameState.bet}
                >
                  🌟 表
                </button>
                <button
                  className="coinflip-button coinflip-button--tails"
                  onClick={() => flipCoin("tails")}
                  disabled={gameState.isFlipping || gameState.coins < gameState.bet}
                >
                  🌙 裏
                </button>
              </div>

              <button
                className="coinflip-button coinflip-button--cashout"
                onClick={cashOut}
                disabled={gameState.isFlipping}
              >
                利益確定して終了
              </button>
            </div>
          </>
        )}

        {/* Game over */}
        {phase === "after" && (
          <div className="coinflip-overlay">
            <h2>{gameState.coins > 0 ? "🎊 おつかれさま！ 🎊" : "💸 ゲームオーバー 💸"}</h2>
            <div className="coinflip-final-stats">
              <div className="coinflip-final-stat">
                <span className="coinflip-final-label">最終コイン</span>
                <span className="coinflip-final-value">{gameState.coins}</span>
              </div>
              <div className="coinflip-final-stat">
                <span className="coinflip-final-label">最大ストリーク</span>
                <span className="coinflip-final-value">{gameState.maxStreak}</span>
              </div>
            </div>
            {gameState.maxStreak >= highScore && gameState.maxStreak > 0 && (
              <p className="coinflip-new-record">🏆 新記録！ 🏆</p>
            )}
            <p>ハイスコア: {highScore}</p>
            <button className="coinflip-button" onClick={startGame}>
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
