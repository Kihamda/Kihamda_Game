import { useState, useCallback, useRef, useEffect } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { ComboCounter } from "@shared/components/ComboCounter";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import type { PopupVariant } from "@shared";
import "./App.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Phase = "before" | "playing" | "after";

interface PopupInfo {
  text: string;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
}

interface RoundData {
  gridSize: number;
  normalEmoji: string;
  oddEmoji: string;
  oddIndex: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const GAME_DURATION = 60; // seconds
const BASE_SCORE = 100;
const TIME_BONUS_MULTIPLIER = 10;
const COMBO_MULTIPLIER = 0.5;

// Similar emoji pairs (normal -> odd) that look alike but are different
const EMOJI_PAIRS: [string, string][] = [
  ["😀", "😃"], ["😄", "😁"], ["😊", "🥲"], ["🙂", "🙃"],
  ["😎", "🤓"], ["🥳", "🤩"], ["😏", "😒"], ["😌", "😔"],
  ["🐱", "🐈"], ["🐶", "🐕"], ["🐻", "🧸"], ["🐼", "🐻‍❄️"],
  ["🍎", "🍏"], ["🍊", "🍑"], ["🍋", "🍌"], ["🍇", "🫐"],
  ["⭐", "🌟"], ["❤️", "🧡"], ["💙", "💎"], ["💚", "💛"],
  ["🔴", "🟠"], ["🟢", "🔵"], ["🟣", "🟤"], ["⬛", "⬜"],
  ["🏠", "🏡"], ["🚗", "🚙"], ["✈️", "🛩️"], ["⛵", "🚤"],
  ["🌸", "🌺"], ["🌻", "🌼"], ["🌹", "🥀"], ["🍀", "☘️"],
  ["📱", "📲"], ["💻", "🖥️"], ["⌚", "⏰"], ["📷", "📸"],
  ["🎵", "🎶"], ["🔔", "🔕"], ["⚽", "🏀"], ["🎾", "🏐"],
  ["🌙", "🌛"], ["☀️", "🌞"], ["⛅", "🌤️"], ["🌈", "🎨"],
  ["🦁", "🐯"], ["🐺", "🦊"], ["🐸", "🐢"], ["🦅", "🦆"],
];

// Starting grid size, increases with level
const MIN_GRID_SIZE = 3;
const MAX_GRID_SIZE = 6;

// ─────────────────────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────────────────────

function generateRound(level: number): RoundData {
  // Grid size increases with level
  const gridSize = Math.min(MIN_GRID_SIZE + Math.floor((level - 1) / 3), MAX_GRID_SIZE);
  const totalCells = gridSize * gridSize;
  
  // Pick a random emoji pair
  const pairIndex = Math.floor(Math.random() * EMOJI_PAIRS.length);
  const [normalEmoji, oddEmoji] = Math.random() > 0.5 
    ? EMOJI_PAIRS[pairIndex] 
    : [EMOJI_PAIRS[pairIndex][1], EMOJI_PAIRS[pairIndex][0]];
  
  // Random position for the odd one
  const oddIndex = Math.floor(Math.random() * totalCells);
  
  return { gridSize, normalEmoji, oddEmoji, oddIndex };
}

function calculateScore(
  baseScore: number,
  timeBonus: number,
  combo: number
): number {
  const comboBonus = Math.floor(baseScore * combo * COMBO_MULTIPLIER);
  return baseScore + timeBonus + comboBonus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState<Phase>("before");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [combo, setCombo] = useState(0);
  const [roundData, setRoundData] = useState<RoundData>(() => generateRound(1));
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [popups, setPopups] = useState<PopupInfo[]>([]);
  
  const timerRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const popupKeyRef = useRef(0);

  // Dopamine hooks
  const { particles, burst, sparkle, confetti, clear: clearParticles } = useParticles();
  const { 
    playSuccess, 
    playMiss, 
    playCombo, 
    playLevelUp, 
    playCelebrate 
  } = useAudio();

  // Get cell position for effects
  const getCellPosition = useCallback((index: number, gridSize: number) => {
    const cellSize = 280 / gridSize;
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const x = col * cellSize + cellSize / 2 + 10; // +10 for padding
    const y = row * cellSize + cellSize / 2 + 10;
    return { x, y };
  }, []);

  // Add popup
  const addPopup = useCallback((text: string, x: number, y: number, variant: PopupVariant = "default") => {
    const newPopup: PopupInfo = {
      text,
      key: ++popupKeyRef.current,
      x: `${x}px`,
      y: `${y}px`,
      variant,
    };
    setPopups(prev => [...prev, newPopup]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.key !== newPopup.key));
    }, 1200);
  }, []);

  // Timer effect
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("after");
          // Celebrate if score is high
          if (score >= 2000) {
            playCelebrate();
            confetti(60);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, score, playCelebrate, confetti]);

  // Start game
  const start = useCallback(() => {
    const newRound = generateRound(1);
    setRoundData(newRound);
    setScore(0);
    setLevel(1);
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    setRoundStartTime(Date.now());
    setClickedIndex(null);
    setIsCorrect(null);
    setPopups([]);
    clearParticles();
    setPhase("playing");
  }, [clearParticles]);

  // Next round
  const nextRound = useCallback(() => {
    const newLevel = level + 1;
    const newRound = generateRound(newLevel);
    setRoundData(newRound);
    setLevel(newLevel);
    setRoundStartTime(Date.now());
    setClickedIndex(null);
    setIsCorrect(null);
    
    // Level up sound every 3 levels
    if (newLevel % 3 === 0) {
      playLevelUp();
    }
  }, [level, playLevelUp]);

  // Handle cell click
  const handleCellClick = useCallback((index: number) => {
    if (phase !== "playing" || clickedIndex !== null) return;

    const { gridSize, oddIndex } = roundData;
    const isOdd = index === oddIndex;
    
    setClickedIndex(index);
    setIsCorrect(isOdd);

    const pos = getCellPosition(index, gridSize);

    if (isOdd) {
      // Correct! Found the odd one
      const newCombo = combo + 1;
      setCombo(newCombo);

      // Calculate time bonus (faster = more points)
      const reactionTime = (Date.now() - roundStartTime) / 1000;
      const timeBonus = Math.max(0, Math.floor((5 - reactionTime) * TIME_BONUS_MULTIPLIER));
      
      // Calculate total score
      const roundScore = calculateScore(BASE_SCORE, timeBonus, newCombo);
      setScore(s => s + roundScore);

      // Sound effects
      if (newCombo >= 5) {
        playCombo(newCombo);
        playCelebrate();
      } else if (newCombo >= 3) {
        playCombo(newCombo);
      } else {
        playSuccess();
      }

      // Particle effects
      burst(pos.x, pos.y, 15);
      if (newCombo >= 3) {
        sparkle(pos.x, pos.y, 12);
      }

      // Score popup
      let variant: PopupVariant = "default";
      let popupText = `+${roundScore}`;
      
      if (newCombo >= 5) {
        variant = "critical";
        popupText = `+${roundScore} 🔥${newCombo}x`;
      } else if (newCombo >= 3) {
        variant = "combo";
        popupText = `+${roundScore} x${newCombo}`;
      } else if (timeBonus > 30) {
        variant = "bonus";
        popupText = `+${roundScore} FAST!`;
      }
      
      addPopup(popupText, pos.x, pos.y, variant);

      // Next round after brief delay
      setTimeout(nextRound, 500);
    } else {
      // Wrong! Reset combo
      setCombo(0);
      playMiss();
      addPopup("MISS", pos.x, pos.y, "default");

      // Brief penalty delay then continue
      setTimeout(() => {
        setClickedIndex(null);
        setIsCorrect(null);
      }, 300);
    }
  }, [
    phase, clickedIndex, roundData, combo, roundStartTime,
    getCellPosition, addPopup, burst, sparkle, nextRound,
    playSuccess, playMiss, playCombo, playCelebrate
  ]);

  // Format time
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Render grid
  const renderGrid = () => {
    const { gridSize, normalEmoji, oddEmoji, oddIndex } = roundData;
    const totalCells = gridSize * gridSize;
    const cells = [];

    for (let i = 0; i < totalCells; i++) {
      const emoji = i === oddIndex ? oddEmoji : normalEmoji;
      const isClicked = clickedIndex === i;
      let cellClass = "ooo-cell";
      
      if (isClicked && isCorrect === true) {
        cellClass += " ooo-cell--correct";
      } else if (isClicked && isCorrect === false) {
        cellClass += " ooo-cell--wrong";
      }

      cells.push(
        <button
          key={i}
          className={cellClass}
          onClick={() => handleCellClick(i)}
          disabled={clickedIndex !== null && isCorrect === true}
          style={{
            fontSize: `${Math.max(24, 48 - gridSize * 6)}px`,
          }}
        >
          {emoji}
        </button>
      );
    }

    return (
      <div
        className="ooo-grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {cells}
      </div>
    );
  };

  return (
    <GameShell gameId="oddoneout" layout="default">
      <div className="ooo-root">
        {phase === "before" && (
          <div className="ooo-screen">
            <h1 className="ooo-title">👀 仲間はずれ探し</h1>
            <p className="ooo-desc">たくさんの絵文字から1つだけ違うものを探そう！</p>
            <div className="ooo-rules">
              <p>• 同じ絵文字の中から1つだけ違うものをタップ</p>
              <p>• 素早く見つけるほど高得点</p>
              <p>• 連続正解でコンボボーナス</p>
              <p>• 制限時間 {GAME_DURATION}秒</p>
            </div>
            <button className="ooo-btn ooo-btn--start" onClick={start}>
              スタート
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="ooo-game">
            <div className="ooo-hud">
              <span className="ooo-score">Score: {score}</span>
              <span className="ooo-level">Lv.{level}</span>
              <span className="ooo-time">{formatTime(timeLeft)}</span>
            </div>
            <p className="ooo-hint">仲間はずれを探せ！</p>
            <div className="ooo-board" ref={boardRef}>
              <ParticleLayer particles={particles} />
              {popups.map(p => (
                <ScorePopup
                  key={p.key}
                  text={p.text}
                  popupKey={p.key}
                  x={p.x}
                  y={p.y}
                  variant={p.variant}
                  size="md"
                />
              ))}
              {renderGrid()}
              <ComboCounter combo={combo} position="top-right" threshold={2} />
            </div>
          </div>
        )}

        {phase === "after" && (
          <div className="ooo-screen">
            <h1 className="ooo-title">⏰ タイムアップ！</h1>
            <p className="ooo-final-score">{score} pts</p>
            <p className="ooo-level-reached">到達レベル: {level}</p>
            <p className="ooo-rating">
              {score >= 3000
                ? "🏆 すばらしい！"
                : score >= 1500
                ? "⭐ よくできました！"
                : "💪 がんばろう！"}
            </p>
            <button className="ooo-btn ooo-btn--restart" onClick={start}>
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
