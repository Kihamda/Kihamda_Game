import { useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

// カードの定義
type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // A=14, K=13, Q=12, J=11, 他は数字そのまま
}

type Phase = "before" | "playing" | "reveal" | "after";

// ランクから数値への変換
function rankToValue(rank: Rank): number {
  switch (rank) {
    case "A": return 14;
    case "K": return 13;
    case "Q": return 12;
    case "J": return 11;
    default: return parseInt(rank, 10);
  }
}

// デッキを作成
function createDeck(): Card[] {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: rankToValue(rank) });
    }
  }
  return deck;
}

// シャッフル
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// スートの色
function getSuitColor(suit: Suit): string {
  return suit === "♥" || suit === "♦" ? "#dc2626" : "#1e293b";
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("before");
  const [playerDeck, setPlayerDeck] = useState<Card[]>([]);
  const [cpuDeck, setCpuDeck] = useState<Card[]>([]);
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [cpuCard, setCpuCard] = useState<Card | null>(null);
  const [playerWins, setPlayerWins] = useState(0);
  const [cpuWins, setCpuWins] = useState(0);
  const [draws, setDraws] = useState(0);
  const [round, setRound] = useState(0);
  const [lastResult, setLastResult] = useState<"win" | "lose" | "draw" | null>(null);

  const start = useCallback(() => {
    const deck = shuffle(createDeck());
    const half = deck.length / 2;
    setPlayerDeck(deck.slice(0, half));
    setCpuDeck(deck.slice(half));
    setPlayerCard(null);
    setCpuCard(null);
    setPlayerWins(0);
    setCpuWins(0);
    setDraws(0);
    setRound(0);
    setLastResult(null);
    setPhase("playing");
  }, []);

  const drawCard = useCallback(() => {
    if (phase !== "playing" || playerDeck.length === 0) return;

    const pCard = playerDeck[0];
    const cCard = cpuDeck[0];
    
    setPlayerCard(pCard);
    setCpuCard(cCard);
    setPlayerDeck(prev => prev.slice(1));
    setCpuDeck(prev => prev.slice(1));
    setRound(prev => prev + 1);

    // 勝敗判定
    let result: "win" | "lose" | "draw";
    if (pCard.value > cCard.value) {
      result = "win";
      setPlayerWins(prev => prev + 1);
    } else if (pCard.value < cCard.value) {
      result = "lose";
      setCpuWins(prev => prev + 1);
    } else {
      result = "draw";
      setDraws(prev => prev + 1);
    }
    setLastResult(result);
    setPhase("reveal");

    // 次のラウンドまたは終了
    setTimeout(() => {
      if (playerDeck.length <= 1) {
        // これが最後のカードだった
        setPhase("after");
      } else {
        setPhase("playing");
      }
    }, 1500);
  }, [phase, playerDeck, cpuDeck]);

  const renderCard = (card: Card | null, isHidden: boolean = false) => {
    if (!card) {
      return (
        <div className="cw-card cw-card--empty">
          <span className="cw-card-placeholder">?</span>
        </div>
      );
    }
    if (isHidden) {
      return (
        <div className="cw-card cw-card--back">
          <span className="cw-card-back-pattern">🂠</span>
        </div>
      );
    }
    return (
      <div className="cw-card" style={{ color: getSuitColor(card.suit) }}>
        <span className="cw-card-rank">{card.rank}</span>
        <span className="cw-card-suit">{card.suit}</span>
      </div>
    );
  };

  const getFinalResult = () => {
    if (playerWins > cpuWins) return "勝利！";
    if (playerWins < cpuWins) return "敗北...";
    return "引き分け";
  };

  const getFinalEmoji = () => {
    if (playerWins > cpuWins) return "🏆";
    if (playerWins < cpuWins) return "😢";
    return "🤝";
  };

  return (
    <GameShell gameId="cardwar" layout="default">
      <div className="cw-root">
        {phase === "before" && (
          <div className="cw-screen">
            <h1 className="cw-title">🃏 Card War</h1>
            <p className="cw-desc">
              カードの数字勝負！<br />
              A（エース）が最強、2が最弱。<br />
              26戦で勝敗を決めよう！
            </p>
            <button className="cw-btn cw-btn--start" onClick={start}>
              スタート
            </button>
          </div>
        )}

        {(phase === "playing" || phase === "reveal") && (
          <div className="cw-game">
            <div className="cw-hud">
              <span className="cw-round">ラウンド: {round}/26</span>
              <span className="cw-score">
                あなた: {playerWins} | CPU: {cpuWins} | 引分: {draws}
              </span>
            </div>

            <div className="cw-battle">
              <div className="cw-player">
                <div className="cw-player-label">CPU</div>
                <div className="cw-deck-area">
                  {renderCard(cpuCard, phase === "playing")}
                  <div className="cw-remaining">残り {cpuDeck.length}</div>
                </div>
              </div>

              <div className="cw-vs">
                {phase === "reveal" && lastResult && (
                  <div className={`cw-result cw-result--${lastResult}`}>
                    {lastResult === "win" && "WIN!"}
                    {lastResult === "lose" && "LOSE"}
                    {lastResult === "draw" && "DRAW"}
                  </div>
                )}
                {phase === "playing" && <span className="cw-vs-text">VS</span>}
              </div>

              <div className="cw-player">
                <div className="cw-player-label">あなた</div>
                <div className="cw-deck-area">
                  {renderCard(playerCard, phase === "playing")}
                  <div className="cw-remaining">残り {playerDeck.length}</div>
                </div>
              </div>
            </div>

            {phase === "playing" && (
              <button className="cw-btn cw-btn--draw" onClick={drawCard}>
                カードをめくる
              </button>
            )}
          </div>
        )}

        {phase === "after" && (
          <div className="cw-screen">
            <h1 className="cw-title">{getFinalEmoji()} {getFinalResult()}</h1>
            <div className="cw-final-score">
              <p>あなた: {playerWins} 勝</p>
              <p>CPU: {cpuWins} 勝</p>
              <p>引き分け: {draws} 回</p>
            </div>
            <button className="cw-btn cw-btn--restart" onClick={start}>
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}