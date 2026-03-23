import { useState, useCallback, useEffect, useRef } from "react";
import {
  GameShell,
  ParticleLayer,
  useParticles,
  useAudio,
  ComboCounter,
  ScorePopup,
} from "@shared";
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
  const [combo, setCombo] = useState(0);
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);

  // パーティクル & オーディオ
  const { particles, sparkle, confetti, explosion } = useParticles();
  const { playTone, playSuccess, playCombo, playCelebrate, playMiss } =
    useAudio();

  // カード要素への参照（パーティクル位置計算用）
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);

  // カードの中心座標を取得
  const getCardCenter = useCallback((cardId: number) => {
    const cardEl = cardRefs.current.get(cardId);
    const gridEl = gridRef.current;
    if (!cardEl || !gridEl) return { x: 0, y: 0 };
    const cardRect = cardEl.getBoundingClientRect();
    const gridRect = gridEl.getBoundingClientRect();
    return {
      x: cardRect.left - gridRect.left + cardRect.width / 2,
      y: cardRect.top - gridRect.top + cardRect.height / 2,
    };
  }, []);

  // フリップ音
  const playFlip = useCallback(() => {
    playTone(600, 0.08, "sine", 0.15);
  }, [playTone]);

  // マッチ音
  const playMatch = useCallback(() => {
    playSuccess();
  }, [playSuccess]);

  // 全クリア音
  const playComplete = useCallback(() => {
    playCelebrate();
  }, [playCelebrate]);

  const start = useCallback(() => {
    setCards(initCards());
    setSelected([]);
    setTurns(0);
    setCombo(0);
    setPopupText(null);
    setPhase("playing");
  }, []);

  const handleClick = useCallback(
    (id: number) => {
      if (phase !== "playing") return;
      // selected.length >= 2 はまだ判定中なのでブロック
      if (selected.length >= 2) return;
      const card = cards.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return;

      // フリップ音
      playFlip();

      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, flipped: true } : c))
      );
      setSelected((prev) => [...prev, id]);
    },
    [phase, cards, selected, playFlip]
  );

  // 2枚選択後の判定
  useEffect(() => {
    if (selected.length !== 2) return;

    const [a, b] = selected;
    const cardA = cards.find((c) => c.id === a);
    const cardB = cards.find((c) => c.id === b);
    if (!cardA || !cardB) return;

    // selected.length === 2 の間は handleClick でブロックされるため
    // 追加の setLocked(true) は不要

    const timeout = setTimeout(() => {
      setTurns((t) => t + 1);
      if (cardA.symbol === cardB.symbol) {
        // マッチ成功！
        const newCombo = combo + 1;
        setCombo(newCombo);

        // コンボに応じた演出
        if (newCombo >= 2) {
          playCombo(newCombo);
          setPopupText(`${newCombo}コンボ！`);
          setPopupKey((k) => k + 1);
        } else {
          playMatch();
        }

        // パーティクル（両方のカードでsparkle）
        const posA = getCardCenter(a);
        const posB = getCardCenter(b);
        sparkle(posA.x, posA.y, 10);
        sparkle(posB.x, posB.y, 10);

        setCards((prev) => {
          const next = prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true } : c
          );
          // クリア判定
          if (next.every((c) => c.matched)) {
            setTimeout(() => {
              // 全クリア演出
              playComplete();
              confetti(80);
              explosion(450, 325, 30);
              setPhase("after");
            }, 300);
          }
          return next;
        });
      } else {
        // マッチ失敗
        playMiss();
        setCombo(0);
        setCards((prev) =>
          prev.map((c) =>
            c.id === a || c.id === b ? { ...c, flipped: false } : c
          )
        );
      }
      setSelected([]);
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    selected,
    cards,
    combo,
    playMatch,
    playCombo,
    playMiss,
    playComplete,
    sparkle,
    confetti,
    explosion,
    getCardCenter,
  ]);

  return (
    <GameShell gameId="memoryduel" layout="default">
      <div className="md-root">
        <ParticleLayer particles={particles} />

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
            <div className="md-grid" ref={gridRef}>
              {cards.map((card) => (
                <div
                  key={card.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(card.id, el);
                  }}
                  className={`md-card ${card.flipped || card.matched ? "md-card--flipped" : ""} ${card.matched ? "md-card--matched" : ""}`}
                  onClick={() => handleClick(card.id)}
                >
                  <div className="md-card-inner">
                    <div className="md-card-face md-card-front">❓</div>
                    <div className="md-card-face md-card-back">
                      {card.symbol}
                    </div>
                  </div>
                </div>
              ))}
              {/* コンボ表示 */}
              <ComboCounter combo={combo} position="top-right" threshold={2} />
              {/* ポップアップ */}
              <ScorePopup
                text={popupText}
                popupKey={popupKey}
                variant="combo"
                size="lg"
              />
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
