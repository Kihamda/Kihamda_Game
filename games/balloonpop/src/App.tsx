import { useState, useEffect, useCallback, useRef } from "react";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScreenShake,
  ComboCounter,
} from "@shared";
import type { ScreenShakeHandle } from "@shared";
import "./App.css";

type BalloonType = "normal" | "gold" | "bomb";

interface Balloon {
  id: number;
  x: number;
  y: number;
  type: BalloonType;
  color: string;
  speed: number;
  size: number;
}

interface LocalScorePopup {
  id: number;
  x: number;
  y: number;
  value: number;
  type: BalloonType;
}

type GamePhase = "before" | "in_progress" | "after";

const GAME_DURATION = 30;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const BALLOON_COLORS = [
  "#f44336", // red
  "#e91e63", // pink
  "#9c27b0", // purple
  "#2196f3", // blue
  "#4caf50", // green
  "#ff9800", // orange
];

function createBalloon(id: number): Balloon {
  const random = Math.random();
  let type: BalloonType;
  let color: string;

  if (random < 0.1) {
    type = "bomb";
    color = "#424242";
  } else if (random < 0.2) {
    type = "gold";
    color = "#ffd700";
  } else {
    type = "normal";
    color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
  }

  const size = type === "gold" ? 50 : type === "bomb" ? 45 : 55 + Math.random() * 20;

  return {
    id,
    x: 30 + Math.random() * (GAME_WIDTH - 60),
    y: GAME_HEIGHT + 50,
    type,
    color,
    speed: 1.5 + Math.random() * 2,
    size,
  };
}

function BalloonSVG({ balloon }: { balloon: Balloon }) {
  const { type, color, size } = balloon;

  if (type === "bomb") {
    return (
      <svg width={size} height={size * 1.3} viewBox="0 0 50 65">
        <circle cx="25" cy="35" r="20" fill={color} />
        <ellipse cx="25" cy="35" rx="20" ry="22" fill={color} />
        <rect x="22" y="8" width="6" height="12" fill="#666" />
        <path d="M25 5 Q30 0 28 8 Q26 5 25 8 Q24 5 22 8 Q20 0 25 5" fill="#ff5722" />
        <circle cx="18" cy="30" r="4" fill="rgba(255,255,255,0.3)" />
        <text x="25" y="42" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">💣</text>
      </svg>
    );
  }

  const isGold = type === "gold";
  const shine = isGold ? (
    <>
      <circle cx="18" cy="28" r="6" fill="rgba(255,255,255,0.6)" />
      <circle cx="32" cy="24" r="3" fill="rgba(255,255,255,0.4)" />
    </>
  ) : (
    <circle cx="18" cy="28" r="5" fill="rgba(255,255,255,0.4)" />
  );

  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 60 84">
      <defs>
        <radialGradient id={`grad-${balloon.id}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor={isGold ? "#fff9c4" : "#fff"} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </radialGradient>
      </defs>
      <ellipse cx="30" cy="35" rx="28" ry="32" fill={`url(#grad-${balloon.id})`} />
      <polygon points="30,67 26,75 34,75" fill={color} />
      <line x1="30" y1="75" x2="30" y2="84" stroke="#8d6e63" strokeWidth="2" />
      {shine}
      {isGold && <text x="30" y="42" textAnchor="middle" fontSize="18" fill="#fff">★</text>}
    </svg>
  );
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("before");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [scorePopups, setScorePopups] = useState<LocalScorePopup[]>([]);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("balloonpop-highscore");
    return saved ? parseInt(saved, 10) : 0;
  });

  const nextIdRef = useRef(0);
  const gameLoopRef = useRef<number>(0);
  const spawnIntervalRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const comboTimeoutRef = useRef<number>(0);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // Dopamine hooks
  const { particles, confetti, sparkle, explosion } = useParticles();
  const { playSuccess, playCombo, playBonus, playGameOver, playMiss, playCelebrate } = useAudio();

  // Keep scoreRef in sync with score state
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const startGame = useCallback(() => {
    setPhase("in_progress");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setBalloons([]);
    setScorePopups([]);
    setCombo(0);
    setIsNewHighScore(false);
    nextIdRef.current = 0;
  }, []);

  const endGame = useCallback(() => {
    setPhase("after");
    cancelAnimationFrame(gameLoopRef.current);
    clearInterval(spawnIntervalRef.current);
    clearTimeout(comboTimeoutRef.current);

    // Save high score
    const finalScore = scoreRef.current;
    const savedHighScore = parseInt(localStorage.getItem("balloonpop-highscore") ?? "0", 10);
    
    // Effects
    explosion(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    
    if (finalScore > savedHighScore) {
      setHighScore(finalScore);
      setIsNewHighScore(true);
      localStorage.setItem("balloonpop-highscore", finalScore.toString());
      // New high score celebration!
      setTimeout(() => {
        confetti(60);
        playCelebrate();
      }, 300);
    } else {
      playGameOver();
    }
  }, [confetti, explosion, playGameOver, playCelebrate]);

  const popBalloon = useCallback((balloon: Balloon) => {
    let points = 0;
    switch (balloon.type) {
      case "normal":
        points = 1;
        break;
      case "gold":
        points = 5;
        break;
      case "bomb":
        points = -3;
        break;
    }

    setScore((prev) => Math.max(0, prev + points));
    setBalloons((prev) => prev.filter((b) => b.id !== balloon.id));
    const popupId = Date.now() + Math.random();
    setScorePopups((prev) => [
      ...prev,
      {
        id: popupId,
        x: balloon.x,
        y: balloon.y,
        value: points,
        type: balloon.type,
      },
    ]);

    // Clean up popup after animation
    setTimeout(() => {
      setScorePopups((prev) => prev.filter((p) => p.id !== popupId));
    }, 800);

    // Dopamine effects based on balloon type
    if (balloon.type === "bomb") {
      // Bomb hit - negative feedback
      playMiss();
      shakeRef.current?.shake("medium", 200);
      setCombo(0);
    } else if (balloon.type === "gold") {
      // Gold balloon - big reward
      sparkle(balloon.x, balloon.y, 12);
      playBonus();
      setCombo((prev) => {
        const newCombo = prev + 1;
        if (newCombo >= 3) {
          playCombo(newCombo);
        }
        return newCombo;
      });
    } else {
      // Normal balloon
      sparkle(balloon.x, balloon.y, 6);
      playSuccess();
      setCombo((prev) => {
        const newCombo = prev + 1;
        if (newCombo >= 3) {
          playCombo(newCombo);
        }
        return newCombo;
      });
    }

    // Reset combo after inactivity
    clearTimeout(comboTimeoutRef.current);
    if (balloon.type !== "bomb") {
      comboTimeoutRef.current = window.setTimeout(() => {
        setCombo(0);
      }, 1500);
    }
  }, [playSuccess, playMiss, playBonus, playCombo, sparkle]);

  // Game timer
  useEffect(() => {
    if (phase !== "in_progress") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, endGame]);

  // Balloon spawning
  useEffect(() => {
    if (phase !== "in_progress") return;

    const spawnBalloon = () => {
      setBalloons((prev) => {
        if (prev.length >= 15) return prev;
        const newBalloon = createBalloon(nextIdRef.current++);
        return [...prev, newBalloon];
      });
    };

    spawnBalloon();
    spawnIntervalRef.current = window.setInterval(spawnBalloon, 800);

    return () => clearInterval(spawnIntervalRef.current);
  }, [phase]);

  // Balloon movement
  useEffect(() => {
    if (phase !== "in_progress") return;

    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 16.67;
      lastTime = currentTime;

      setBalloons((prev) =>
        prev
          .map((balloon) => ({
            ...balloon,
            y: balloon.y - balloon.speed * delta,
          }))
          .filter((balloon) => balloon.y > -100)
      );

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [phase]);

  // Clean up old score popups
  useEffect(() => {
    const cleanup = setInterval(() => {
      setScorePopups((prev) => prev.slice(-10));
    }, 1000);
    return () => clearInterval(cleanup);
  }, []);

  const getTimerClass = () => {
    if (timeLeft <= 5) return "balloonpop-timer balloonpop-timer--danger";
    if (timeLeft <= 10) return "balloonpop-timer balloonpop-timer--warning";
    return "balloonpop-timer";
  };

  return (
    <GameShell gameId="balloonpop" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="balloonpop-container">
          {/* Particle effects layer */}
          <ParticleLayer particles={particles} />

          {/* Decorative clouds */}
          <div className="balloonpop-cloud" style={{ width: 100, height: 60, top: 80, left: 50 }} />
          <div className="balloonpop-cloud" style={{ width: 80, height: 50, top: 120, left: 650 }} />
          <div className="balloonpop-cloud" style={{ width: 120, height: 70, top: 60, left: 350 }} />

          {/* HUD */}
          {phase === "in_progress" && (
            <div className="balloonpop-hud">
              <div className="balloonpop-score">Score: {score}</div>
              <div className={getTimerClass()}>{timeLeft}s</div>
            </div>
          )}

          {/* Combo counter */}
          {phase === "in_progress" && (
            <ComboCounter combo={combo} position="bottom-right" threshold={3} />
          )}

          {/* Balloons */}
          {balloons.map((balloon) => (
            <div
              key={balloon.id}
              className="balloonpop-balloon"
              style={{
                left: balloon.x - balloon.size / 2,
                top: balloon.y - balloon.size / 2,
              }}
              onClick={() => popBalloon(balloon)}
            >
              <BalloonSVG balloon={balloon} />
            </div>
          ))}

          {/* Score popups */}
          {scorePopups.map((popup) => (
            <div
              key={popup.id}
              className={`balloonpop-score-popup ${
                popup.type === "gold"
                  ? "balloonpop-score-popup--gold"
                  : popup.value > 0
                    ? "balloonpop-score-popup--positive"
                    : "balloonpop-score-popup--negative"
              }`}
              style={{ left: popup.x, top: popup.y }}
            >
              {popup.value > 0 ? `+${popup.value}` : popup.value}
            </div>
          ))}

          {/* Start screen */}
          {phase === "before" && (
            <div className="balloonpop-overlay">
              <h2>🎈 Balloon Pop 🎈</h2>
              <p>High Score: {highScore}</p>
              <button className="balloonpop-button" onClick={startGame}>
                Start Game
              </button>
              <div className="balloonpop-instructions">
                <h3>How to Play</h3>
                <ul>
                  <li><span className="balloon-normal">🎈</span> Normal balloon = +1 point</li>
                  <li><span className="balloon-gold">⭐</span> Gold balloon = +5 points</li>
                  <li><span className="balloon-bomb">💣</span> Bomb = -3 points</li>
                </ul>
              </div>
            </div>
          )}

          {/* Game over screen */}
          {phase === "after" && (
            <div className="balloonpop-overlay">
              <h2>Time's Up!</h2>
              <div className="balloonpop-final-score">{score}</div>
              {isNewHighScore && (
                <p className="balloonpop-new-highscore">🎉 New High Score! 🎉</p>
              )}
              <p>High Score: {highScore}</p>
              <button className="balloonpop-button" onClick={startGame}>
                Play Again
              </button>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
