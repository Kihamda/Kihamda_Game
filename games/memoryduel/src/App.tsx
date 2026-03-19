import { useState, useCallback, useEffect } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

// 8種類の絵柄（ペアで16枚）
const SYMBOLS = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🍒", "🥝"];

interface Card {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

type Phase = "before" | "playing" | "after";

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function initCards(): Card[] {
  return shuffle([...SYMBOLS, ...SYMBOLS]).map((symbol, i) => ({
    id: i,
    symbol,
    flipped: false,
    matched: false,
  }));
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("before");
  const [cards, setCards] = useState<Card[]>(initCards);
  const [selected, setSelected] = useState<number[]>([]);
  const [turns, setTurns] = useState(0);
  const [locked, setLocked] = useState(false);

  const start = useCallback(() => {
    setCards(initCards());
    setSelected([]);
    setTurns(0);
    setLocked(false);
    setPhase("playing");
  }, []);

  const handleClick = useCallback(
    (id: number) => {
      if (phase !== "playing" || locked) return;
      const card = cards.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return;
      if (selected.length >= 2) return;

      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, flipped: true } : c))
      );
      setSelected((prev) => [...prev, id]);
    },
    [phase, locked, cards, selected]
  );

  // 2枚選択後の判定
  useEffect(() => {
    if (selected.length !== 2) return;

    const [a, b] = selected;
    const cardA = cards.find((c) => c.id === a);
    const cardB = cards.find((c) => c.id === b);
    if (!cardA || !cardB) return;

    // lockedは即座に設定する必要があるが、useEffectの外で管理
    // 代わりにselected.length === 2をロック条件として使う

    const timeout = setTimeout(() => {
      setTurns((t) => t + 1);
      if (cardA.symbol === cardB.symbol) {
        setCards((prev) => {
          const next = prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true } : c
          );
          // クリア判定もここで
          if (next.every((c) => c.matched)) {
            setTimeout(() => setPhase("after"), 100);
          }
          return next;
        });
      } else {
        setCards((prev) =>
          prev.map((c) =>
            c.id === a || c.id === b ? { ...c, flipped: false } : c
          )
        );
      }
      setSelected([]);
    }, 800);

    return () => clearTimeout(timeout);
  }, [selected, cards]);

  return (
    <GameShell gameId="memoryduel" layout="default">
      <div className="md-root">
        {phase === "before" && (
          <div className="md-screen">
            <h1 className="md-title">🧠 神経衰弱</h1>
            <p className="md-desc">同じ絵柄のカードを見つけよう！</p>
            <button className="md-btn md-btn--start" onClick={start}>
              スタート
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="md-game">
            <div className="md-hud">
              <span className="md-turns">ターン: {turns}</span>
            </div>
            <div className="md-grid">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`md-card ${card.flipped || card.matched ? "md-card--flipped" : ""} ${card.matched ? "md-card--matched" : ""}`}
                  onClick={() => handleClick(card.id)}
                >
                  <div className="md-card-inner">
                    <div className="md-card-face md-card-front">❓</div>
                    <div className="md-card-face md-card-back">{card.symbol}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "after" && (
          <div className="md-screen">
            <h1 className="md-title">🎉 クリア！</h1>
            <p className="md-score">{turns} ターンでクリア</p>
            <p className="md-rating">
              {turns <= 8 && "⭐⭐⭐ パーフェクト！"}
              {turns > 8 && turns <= 12 && "⭐⭐ すばらしい！"}
              {turns > 12 && "⭐ がんばりました！"}
            </p>
            <button className="md-btn md-btn--restart" onClick={start}>
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
