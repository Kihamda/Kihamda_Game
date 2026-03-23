import { useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer } from "@shared";
import "./App.css";

// ScorePopup用の状態型
interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

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
  const [wasLeading, setWasLeading] = useState(false); // コンバック検出用

  // ScorePopup状態
  const [popup, setPopup] = useState<PopupState>({ text: null, key: 0, variant: "default", size: "md" });

  // Dopamine hooks
  const { particles, confetti, sparkle, explosion } = useParticles();
  const { playTone } = useAudio();
  const playWin = useCallback(() => playTone(660, 0.15, 'sine'), [playTone]);
  const playLose = useCallback(() => playTone(220, 0.2, 'sawtooth'), [playTone]);
  const playComeback = useCallback(() => playTone(880, 0.2, 'sine'), [playTone]);
  const playWar = useCallback(() => {
    playTone(330, 0.1, 'square');
    setTimeout(() => playTone(440, 0.1, 'square'), 100);
  }, [playTone]);

  // ポップアップ表示ヘルパー
  const showPopup = useCallback((text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md") => {
    setPopup(prev => ({ text, key: prev.key + 1, variant, size }));
  }, []);

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
    setWasLeading(false);
    setPopup({ text: null, key: 0, variant: "default", size: "md" });
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

    // 現在のスコア状態を保存（コンバック検出用）
    const wasBehind = cpuWins > playerWins;

    // 勝敗判定
    let result: "win" | "lose" | "draw";
    if (pCard.value > cCard.value) {
      result = "win";
      const newPlayerWins = playerWins + 1;
      setPlayerWins(newPlayerWins);
      playWin();
      sparkle(200, 300);
      
      // コンバック検出: 負けていた状態からリードを奪い返した
      if (wasBehind && newPlayerWins > cpuWins) {
        playComeback();
        showPopup("🔥 COMEBACK!", "critical", "lg");
      } else {
        // 高いカードでの勝利はより派手に
        const valueDiff = pCard.value - cCard.value;
        if (valueDiff >= 10) {
          showPopup(`💥 CRUSHING +1`, "combo", "lg");
        } else if (valueDiff >= 5) {
          showPopup(`✨ NICE +1`, "bonus", "md");
        } else {
          showPopup(`+1 WIN`, "default", "sm");
        }
      }
      
      // プレイヤーがリードしていたことを記録
      if (newPlayerWins > cpuWins) {
        setWasLeading(true);
      }
    } else if (pCard.value < cCard.value) {
      result = "lose";
      setCpuWins(prev => prev + 1);
      playLose();
      
      // 差が大きいほど残念感を表示
      const valueDiff = cCard.value - pCard.value;
      if (valueDiff >= 10) {
        showPopup(`😱 CRUSHED...`, "default", "md");
      } else {
        showPopup(`-1`, "default", "sm");
      }
      
      // リードを失った場合の記録
      if (wasLeading && cpuWins + 1 > playerWins) {
        setWasLeading(false);
      }
    } else {
      // 引き分け = WAR! (同じ数字)
      result = "draw";
      setDraws(prev => prev + 1);
      playWar();
      
      // WAR表示 - 同ランク対決は興奮！
      const rankName = pCard.rank === "A" ? "ACE" : 
                       pCard.rank === "K" ? "KING" :
                       pCard.rank === "Q" ? "QUEEN" :
                       pCard.rank === "J" ? "JACK" : pCard.rank;
      showPopup(`⚔️ WAR! ${rankName} vs ${rankName}`, "bonus", "lg");
    }
    setLastResult(result);
    setPhase("reveal");

    // 次のラウンドまたは終了
    setTimeout(() => {
      if (playerDeck.length <= 1) {
        // これが最後のカードだった - ゲーム終了ポップアップ
        if (playerWins > cpuWins || (result === "win" && playerWins + 1 > cpuWins)) {
          confetti();
          const winMargin = (result === "win" ? playerWins + 1 : playerWins) - cpuWins;
          if (winMargin >= 5) {
            showPopup("🏆 完全勝利！", "level", "xl");
          } else {
            showPopup("🎉 VICTORY!", "critical", "xl");
          }
        } else if (playerWins < cpuWins || (result === "lose" && playerWins < cpuWins + 1)) {
          explosion(200, 300);
          showPopup("💔 敗北...", "default", "lg");
        } else {
          showPopup("🤝 DRAW GAME", "bonus", "lg");
        }
        setPhase("after");
      } else {
        setPhase("playing");
      }
    }, 1500);
  }, [phase, playerDeck, cpuDeck, playerWins, cpuWins, wasLeading, playWin, playLose, playWar, playComeback, sparkle, confetti, explosion, showPopup]);

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
      <div className="cw-root" style={{ position: 'relative' }}>
        <ParticleLayer particles={particles} />
        <ScorePopup 
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size={popup.size}
          y="35%"
        />
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