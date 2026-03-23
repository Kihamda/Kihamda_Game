import { useState, useCallback, useEffect, useRef } from "react";
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
  x: string;
  y: string;
}

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
  const [matchStreak, setMatchStreak] = useState(0);
  const timerRef = useRef<number | null>(null);
  
  // Popup state
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    variant: "default",
    size: "md",
    x: "50%",
    y: "40%",
  });
  
  // High score (fewer turns is better, so we use custom localStorage handling)
  const [bestTurns, setBestTurns] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("kihamda_colorpairs_best");
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  });
  
  const updateBestTurns = useCallback((turns: number): boolean => {
    if (bestTurns !== null && turns >= bestTurns) return false;
    setBestTurns(turns);
    try {
      localStorage.setItem("kihamda_colorpairs_best", String(turns));
    } catch {
      /* storage full or unavailable */
    }
    return true;
  }, [bestTurns]);
  
  const showPopup = useCallback((
    text: string,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md",
    x = "50%",
    y = "40%"
  ) => {
    setPopup(prev => ({
      text,
      key: prev.key + 1,
      variant,
      size,
      x,
      y,
    }));
  }, []);

  // Dopamine hooks
  const { particles, confetti, sparkle } = useParticles();
  const { playTone } = useAudio();
  const playFlip = useCallback(() => playTone(440, 0.05, 'triangle'), [playTone]);
  const playMatch = useCallback(() => playTone(660, 0.15, 'sine'), [playTone]);
  const playMiss = useCallback(() => playTone(200, 0.1, 'sawtooth'), [playTone]);
  const playWin = useCallback(() => playTone(880, 0.3, 'sine'), [playTone]);

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
    setMatchStreak(0);
    setPhase("playing");
  }, []);

  const handleClick = useCallback(
    (id: number) => {
      if (phase !== "playing") return;
      const card = cards.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return;
      if (selected.length >= 2) return;

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

    const timeout = setTimeout(() => {
      const newTurns = turns + 1;
      setTurns(newTurns);
      if (cardA.color === cardB.color) {
        // Match!
        playMatch();
        sparkle(200, 200);
        const newStreak = matchStreak + 1;
        setMatchStreak(newStreak);
        
        // Calculate matched pairs count
        const newMatchedCount = cards.filter(c => c.matched).length / 2 + 1;
        
        // Show popup for match with streak bonus
        if (newStreak >= 3) {
          showPopup(`🔥 ${newStreak}連続マッチ!`, "critical", "lg");
        } else if (newStreak === 2) {
          showPopup("✨ コンボ!", "combo", "md");
        } else {
          showPopup("💫 マッチ!", "default", "sm");
        }
        
        setCards((prev) => {
          const next = prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true } : c
          );
          // クリア判定
          if (next.every((c) => c.matched)) {
            playWin();
            confetti();
            
            // Check for best score (lower is better)
            const isNewBest = bestTurns === null || newTurns < bestTurns;
            if (isNewBest) {
              updateBestTurns(newTurns);
            }
            
            setTimeout(() => {
              setElapsedTime(Date.now() - startTime);
              // Show completion popup
              if (newTurns <= 10) {
                showPopup("🏆 パーフェクト!", "level", "xl");
              } else if (isNewBest) {
                showPopup("🎉 新記録!", "bonus", "xl");
              } else {
                showPopup("🎊 クリア!", "level", "lg");
              }
              setTimeout(() => setPhase("result"), 800);
            }, 300);
          } else if (newMatchedCount === 4) {
            // Half-way bonus popup
            setTimeout(() => showPopup("✅ 半分クリア!", "bonus", "md"), 400);
          }
          return next;
        });
      } else {
        // No match
        playMiss();
        setMatchStreak(0);
        setCards((prev) =>
          prev.map((c) =>
            c.id === a || c.id === b ? { ...c, flipped: false } : c
          )
        );
      }
      setSelected([]);
    }, 700);

    return () => clearTimeout(timeout);
  }, [selected, cards, startTime, matchStreak, turns, bestTurns, updateBestTurns, showPopup, playMatch, sparkle, playWin, confetti, playMiss]);

  const matchedCount = cards.filter((c) => c.matched).length / 2;

  return (
    <GameShell gameId="colorpairs" layout="default">
      <div className="cp-root" style={{ position: 'relative' }}>
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size={popup.size}
          x={popup.x}
          y={popup.y}
        />
        {matchStreak >= 2 && phase === "playing" && <ComboCounter combo={matchStreak} />}
        
        {phase === "start" && (
          <div className="cp-screen">
            <h1 className="cp-title">🎨 Color Pairs</h1>
            <p className="cp-desc">同じ色のペアを見つけて消そう！</p>
            {bestTurns !== null && (
              <p className="cp-best">🏆 ベスト: {bestTurns}ターン</p>
            )}
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
              {bestTurns !== null && (
                <p className="cp-result-item">
                  <span className="cp-result-label">ベストスコア</span>
                  <span className="cp-result-value">{bestTurns}ターン</span>
                </p>
              )}
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
