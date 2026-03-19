import { useState, useCallback, useEffect, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

// 8色のパレット
const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
];

interface Card {
  id: number;
  color: string;
  flipped: boolean;
  matched: boolean;
}

type Phase = "start" | "playing" | "result";

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function initCards(): Card[] {
  return shuffle([...COLORS, ...COLORS]).map((color, i) => ({
    id: i,
    color,
    flipped: false,
    matched: false,
  }));
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [cards, setCards] = useState<Card[]>(initCards);
  const [selected, setSelected] = useState<number[]>([]);
  const [turns, setTurns] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  // タイマー処理
  useEffect(() => {
    if (phase === "playing") {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 50);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase, startTime]);

  const startGame = useCallback(() => {
    setCards(initCards());
    setSelected([]);
    setTurns(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setPhase("playing");
  }, []);

  const handleClick = useCallback(
    (id: number) => {
      if (phase !== "playing") return;
      const card = cards.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return;
      if (selected.length >= 2) return;

      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, flipped: true } : c))
      );
      setSelected((prev) => [...prev, id]);
    },
    [phase, cards, selected]
  );

  // 2枚選択後の判定
  useEffect(() => {
    if (selected.length !== 2) return;

    const [a, b] = selected;
    const cardA = cards.find((c) => c.id === a);
    const cardB = cards.find((c) => c.id === b);
    if (!cardA || !cardB) return;

    const timeout = setTimeout(() => {
      setTurns((t) => t + 1);
      if (cardA.color === cardB.color) {
        setCards((prev) => {
          const next = prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true } : c
          );
          // クリア判定
          if (next.every((c) => c.matched)) {
            setTimeout(() => {
              setElapsedTime(Date.now() - startTime);
              setPhase("result");
            }, 300);
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
    }, 700);

    return () => clearTimeout(timeout);
  }, [selected, cards, startTime]);

  const matchedCount = cards.filter((c) => c.matched).length / 2;

  return (
    <GameShell gameId="colorpairs" layout="default">
      <div className="cp-root">
        {phase === "start" && (
          <div className="cp-screen">
            <h1 className="cp-title">🎨 Color Pairs</h1>
            <p className="cp-desc">同じ色のペアを見つけて消そう！</p>
            <div className="cp-preview">
              {COLORS.map((color, i) => (
                <div
                  key={i}
                  className="cp-preview-dot"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button className="cp-btn cp-btn--start" onClick={startGame}>
              スタート
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="cp-game">
            <div className="cp-hud">
              <span className="cp-stat">🔄 {turns} ターン</span>
              <span className="cp-stat">✅ {matchedCount}/8 ペア</span>
              <span className="cp-stat cp-timer">⏱️ {formatTime(elapsedTime)}</span>
            </div>
            <div className="cp-grid">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`cp-card ${card.flipped || card.matched ? "cp-card--flipped" : ""} ${card.matched ? "cp-card--matched" : ""}`}
                  onClick={() => handleClick(card.id)}
                >
                  <div className="cp-card-inner">
                    <div className="cp-card-face cp-card-front">?</div>
                    <div
                      className="cp-card-face cp-card-back"
                      style={{ backgroundColor: card.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="cp-screen">
            <h1 className="cp-title">🎉 クリア！</h1>
            <div className="cp-result-stats">
              <p className="cp-result-item">
                <span className="cp-result-label">ターン数</span>
                <span className="cp-result-value">{turns}</span>
              </p>
              <p className="cp-result-item">
                <span className="cp-result-label">クリアタイム</span>
                <span className="cp-result-value cp-result-time">{formatTime(elapsedTime)}</span>
              </p>
            </div>
            <p className="cp-rating">
              {turns <= 10 && "⭐⭐⭐ パーフェクト！"}
              {turns > 10 && turns <= 15 && "⭐⭐ すばらしい！"}
              {turns > 15 && "⭐ がんばりました！"}
            </p>
            <button className="cp-btn cp-btn--restart" onClick={startGame}>
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
