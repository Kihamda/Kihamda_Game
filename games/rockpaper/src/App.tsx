import { useState, useCallback, useEffect } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

type GamePhase = "before" | "in_progress" | "after";
type Hand = "rock" | "paper" | "scissors";
type Result = "win" | "lose" | "draw";

interface GameState {
  playerHand: Hand | null;
  cpuHand: Hand | null;
  result: Result | null;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  maxStreak: number;
  isAnimating: boolean;
  rounds: number;
}

const HANDS: Hand[] = ["rock", "paper", "scissors"];
const HAND_EMOJI: Record<Hand, string> = {
  rock: "✊",
  paper: "✋",
  scissors: "✌️",
};
const HAND_LABEL: Record<Hand, string> = {
  rock: "グー",
  paper: "パー",
  scissors: "チョキ",
};

function getResult(player: Hand, cpu: Hand): Result {
  if (player === cpu) return "draw";
  if (
    (player === "rock" && cpu === "scissors") ||
    (player === "scissors" && cpu === "paper") ||
    (player === "paper" && cpu === "rock")
  ) {
    return "win";
  }
  return "lose";
}

function getRandomHand(): Hand {
  return HANDS[Math.floor(Math.random() * HANDS.length)];
}

function HandDisplay({ hand, label, isAnimating }: { hand: Hand | null; label: string; isAnimating: boolean }) {
  return (
    <div className="rockpaper-hand-container">
      <div className="rockpaper-hand-label">{label}</div>
      <div className={"rockpaper-hand" + (isAnimating ? " rockpaper-hand--shaking" : "")}>
        {isAnimating ? "❓" : hand ? HAND_EMOJI[hand] : "❔"}
      </div>
      {!isAnimating && hand && (
        <div className="rockpaper-hand-name">{HAND_LABEL[hand]}</div>
      )}
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("before");
  const [gameState, setGameState] = useState<GameState>({
    playerHand: null,
    cpuHand: null,
    result: null,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    maxStreak: 0,
    isAnimating: false,
    rounds: 0,
  });

  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("rockpaper-highstreak");
    return saved ? parseInt(saved, 10) : 0;
  });

  const startGame = useCallback(() => {
    setPhase("in_progress");
    setGameState({
      playerHand: null,
      cpuHand: null,
      result: null,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      maxStreak: 0,
      isAnimating: false,
      rounds: 0,
    });
  }, []);

  const playHand = useCallback((playerChoice: Hand) => {
    if (gameState.isAnimating) return;

    setGameState((prev) => ({
      ...prev,
      playerHand: playerChoice,
      cpuHand: null,
      result: null,
      isAnimating: true,
    }));

    // Animation delay
    setTimeout(() => {
      const cpuChoice = getRandomHand();
      const result = getResult(playerChoice, cpuChoice);

      setGameState((prev) => {
        const newWins = result === "win" ? prev.wins + 1 : prev.wins;
        const newLosses = result === "lose" ? prev.losses + 1 : prev.losses;
        const newDraws = result === "draw" ? prev.draws + 1 : prev.draws;
        const newStreak = result === "win" ? prev.streak + 1 : result === "lose" ? 0 : prev.streak;
        const newMaxStreak = Math.max(prev.maxStreak, newStreak);

        // Save high score
        if (newMaxStreak > highScore) {
          setHighScore(newMaxStreak);
          localStorage.setItem("rockpaper-highstreak", newMaxStreak.toString());
        }

        return {
          ...prev,
          cpuHand: cpuChoice,
          result,
          wins: newWins,
          losses: newLosses,
          draws: newDraws,
          streak: newStreak,
          maxStreak: newMaxStreak,
          isAnimating: false,
          rounds: prev.rounds + 1,
        };
      });
    }, 1000);
  }, [gameState.isAnimating, highScore]);

  const endGame = useCallback(() => {
    setPhase("after");
  }, []);

  const getResultMessage = () => {
    if (!gameState.result) return null;
    switch (gameState.result) {
      case "win":
        return <span className="rockpaper-result rockpaper-result--win">🎉 WIN! 🎉</span>;
      case "lose":
        return <span className="rockpaper-result rockpaper-result--lose">😢 LOSE 😢</span>;
      case "draw":
        return <span className="rockpaper-result rockpaper-result--draw">🤝 DRAW 🤝</span>;
    }
  };

  // Keyboard support
  useEffect(() => {
    if (phase !== "in_progress" || gameState.isAnimating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "1":
        case "r":
          playHand("rock");
          break;
        case "2":
        case "s":
          playHand("scissors");
          break;
        case "3":
        case "p":
          playHand("paper");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, gameState.isAnimating, playHand]);

  return (
    <GameShell gameId="rockpaper" layout="default">
      <div className="rockpaper-container">
        {/* Before game */}
        {phase === "before" && (
          <div className="rockpaper-overlay">
            <h2>✊✌️✋ じゃんけん ✊✌️✋</h2>
            <p className="rockpaper-subtitle">CPUに勝てるか運試し！</p>
            <p>最高連勝記録: {highScore}</p>
            <button className="rockpaper-button" onClick={startGame}>
              ゲーム開始
            </button>
            <div className="rockpaper-instructions">
              <h3>遊び方</h3>
              <ul>
                <li>✊ グー、✌️ チョキ、✋ パーを選択</li>
                <li>🤖 CPUがランダムに手を出す</li>
                <li>🔥 連勝でストリークを伸ばそう</li>
                <li>⌨️ キーボード: 1/R=グー, 2/S=チョキ, 3/P=パー</li>
              </ul>
            </div>
          </div>
        )}

        {/* In progress */}
        {phase === "in_progress" && (
          <>
            <div className="rockpaper-hud">
              <div className="rockpaper-stat">
                <span className="rockpaper-stat-label">勝</span>
                <span className="rockpaper-stat-value rockpaper-stat-value--win">{gameState.wins}</span>
              </div>
              <div className="rockpaper-stat">
                <span className="rockpaper-stat-label">敗</span>
                <span className="rockpaper-stat-value rockpaper-stat-value--lose">{gameState.losses}</span>
              </div>
              <div className="rockpaper-stat">
                <span className="rockpaper-stat-label">引分</span>
                <span className="rockpaper-stat-value rockpaper-stat-value--draw">{gameState.draws}</span>
              </div>
              <div className="rockpaper-stat">
                <span className="rockpaper-stat-label">連勝</span>
                <span className="rockpaper-stat-value rockpaper-stat-value--streak">�� {gameState.streak}</span>
              </div>
            </div>

            <div className="rockpaper-stage">
              <div className="rockpaper-battle">
                <HandDisplay hand={gameState.playerHand} label="あなた" isAnimating={gameState.isAnimating} />
                <div className="rockpaper-vs">VS</div>
                <HandDisplay hand={gameState.cpuHand} label="CPU" isAnimating={gameState.isAnimating} />
              </div>

              <div className="rockpaper-result-area">
                {gameState.isAnimating ? (
                  <span className="rockpaper-result rockpaper-result--animating">じゃんけん...</span>
                ) : (
                  getResultMessage()
                )}
              </div>
            </div>

            <div className="rockpaper-controls">
              <div className="rockpaper-hand-buttons">
                <button
                  className="rockpaper-hand-button rockpaper-hand-button--rock"
                  onClick={() => playHand("rock")}
                  disabled={gameState.isAnimating}
                >
                  <span className="rockpaper-hand-emoji">✊</span>
                  <span className="rockpaper-hand-text">グー</span>
                  <span className="rockpaper-key-hint">1/R</span>
                </button>
                <button
                  className="rockpaper-hand-button rockpaper-hand-button--scissors"
                  onClick={() => playHand("scissors")}
                  disabled={gameState.isAnimating}
                >
                  <span className="rockpaper-hand-emoji">✌️</span>
                  <span className="rockpaper-hand-text">チョキ</span>
                  <span className="rockpaper-key-hint">2/S</span>
                </button>
                <button
                  className="rockpaper-hand-button rockpaper-hand-button--paper"
                  onClick={() => playHand("paper")}
                  disabled={gameState.isAnimating}
                >
                  <span className="rockpaper-hand-emoji">✋</span>
                  <span className="rockpaper-hand-text">パー</span>
                  <span className="rockpaper-key-hint">3/P</span>
                </button>
              </div>

              <button
                className="rockpaper-button rockpaper-button--end"
                onClick={endGame}
                disabled={gameState.isAnimating}
              >
                終了する
              </button>
            </div>
          </>
        )}

        {/* Game over */}
        {phase === "after" && (
          <div className="rockpaper-overlay">
            <h2>🎮 結果発表 🎮</h2>
            <div className="rockpaper-final-stats">
              <div className="rockpaper-final-row">
                <div className="rockpaper-final-stat">
                  <span className="rockpaper-final-label">勝利</span>
                  <span className="rockpaper-final-value rockpaper-final-value--win">{gameState.wins}</span>
                </div>
                <div className="rockpaper-final-stat">
                  <span className="rockpaper-final-label">敗北</span>
                  <span className="rockpaper-final-value rockpaper-final-value--lose">{gameState.losses}</span>
                </div>
                <div className="rockpaper-final-stat">
                  <span className="rockpaper-final-label">引分</span>
                  <span className="rockpaper-final-value rockpaper-final-value--draw">{gameState.draws}</span>
                </div>
              </div>
              <div className="rockpaper-final-stat rockpaper-final-stat--highlight">
                <span className="rockpaper-final-label">最大連勝</span>
                <span className="rockpaper-final-value rockpaper-final-value--streak">{gameState.maxStreak}</span>
              </div>
            </div>
            {gameState.maxStreak >= highScore && gameState.maxStreak > 0 && (
              <p className="rockpaper-new-record">🏆 新記録！ 🏆</p>
            )}
            <p>ハイスコア: {highScore}</p>
            <button className="rockpaper-button" onClick={startGame}>
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
