import { useState, useEffect, useRef, useCallback } from "react";
import { GameShell, useParticles, ParticleLayer, useAudio, ScorePopup } from "@shared";
import "./App.css";

/* ---- Types ---- */
type Phase = "idle" | "showing" | "waiting" | "success" | "gameover";
type Point = { x: number; y: number };

/* ---- Constants ---- */
const GRID_SIZE = 3;
const DOT_RADIUS = 24;
const DOT_GAP = 100;
const GRID_OFFSET = 60;
const CANVAS_SIZE = GRID_OFFSET * 2 + DOT_GAP * (GRID_SIZE - 1);

const SHOW_DURATION = 500;
const SUCCESS_DELAY = 1200;
const START_POINTS = 3;

/* ---- Helpers ---- */
function getDotPosition(row: number, col: number): Point {
  return {
    x: GRID_OFFSET + col * DOT_GAP,
    y: GRID_OFFSET + row * DOT_GAP,
  };
}

function getDotIndex(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

function getRowCol(index: number): { row: number; col: number } {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

function generatePattern(length: number): number[] {
  const available = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i);
  const pattern: number[] = [];

  for (let i = 0; i < length && available.length > 0; i++) {
    const randIdx = Math.floor(Math.random() * available.length);
    pattern.push(available[randIdx]);
    available.splice(randIdx, 1);
  }

  return pattern;
}

/* ---- Component ---- */
export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [shownIndex, setShownIndex] = useState(0);
  const [playerPattern, setPlayerPattern] = useState<number[]>([]);
  const [currentDrag, setCurrentDrag] = useState<Point | null>(null);
  const [message, setMessage] = useState("START de hajimeyou!");
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);
  const [streak, setStreak] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<number[]>([]);
  
  const { particles, sparkle, burst, confetti } = useParticles();
  const { playClick, playSuccess, playMiss, playLevelUp, playCelebrate, playTone } = useAudio();

  const showPopup = useCallback((text: string) => {
    setPopupText(text);
    setPopupKey((k) => k + 1);
    setTimeout(() => setPopupText(null), 1000);
  }, []);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  const startGame = useCallback(() => {
    clearTimeouts();
    setLevel(1);
    setStreak(0);
    const newPattern = generatePattern(START_POINTS);
    setPattern(newPattern);
    setPlayerPattern([]);
    setShownIndex(0);
    setPhase("showing");
    setMessage("Pattern wo oboete...");
    playClick();
  }, [clearTimeouts, playClick]);

  const nextLevel = useCallback(() => {
    clearTimeouts();
    const newLevel = level + 1;
    setLevel(newLevel);
    const newPattern = generatePattern(START_POINTS - 1 + newLevel);
    setPattern(newPattern);
    setPlayerPattern([]);
    setShownIndex(0);
    setPhase("showing");
    setMessage("Pattern wo oboete...");
    playLevelUp();
    showPopup(`Level ${newLevel}!`);
  }, [level, clearTimeouts, playLevelUp, showPopup]);

  useEffect(() => {
    if (phase !== "showing") return;

    if (shownIndex < pattern.length) {
      const { row, col } = getRowCol(pattern[shownIndex]);
      // Use shared playTone for showing pattern
      playTone(220 + row * 110 + col * 55, 0.15, "sine", 0.3);

      const tid = window.setTimeout(() => {
        setShownIndex((i) => i + 1);
      }, SHOW_DURATION);
      timeoutRef.current.push(tid);
    } else {
      const tid = window.setTimeout(() => {
        setPhase("waiting");
        setMessage("Nazotte kudasai!");
      }, 300);
      timeoutRef.current.push(tid);
    }

    return () => clearTimeouts();
  }, [phase, shownIndex, pattern, clearTimeouts, playTone]);

  useEffect(() => {
    if (phase !== "success") return;

    const tid = window.setTimeout(nextLevel, SUCCESS_DELAY);
    timeoutRef.current.push(tid);

    return () => clearTimeouts();
  }, [phase, nextLevel, clearTimeouts]);

  const findDotAt = useCallback((x: number, y: number): number | null => {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const pos = getDotPosition(row, col);
        const dist = Math.hypot(x - pos.x, y - pos.y);
        if (dist < DOT_RADIUS + 15) {
          return getDotIndex(row, col);
        }
      }
    }
    return null;
  }, []);

  const checkPattern = useCallback(
    (playerPat: number[]) => {
      if (playerPat.length !== pattern.length) {
        playMiss();
        setStreak(0);
        setPhase("gameover");
        setMessage("Game Over! Level " + level);
        showPopup("MISS!");
        return;
      }

      for (let i = 0; i < pattern.length; i++) {
        if (playerPat[i] !== pattern[i]) {
          playMiss();
          setStreak(0);
          setPhase("gameover");
          setMessage("Game Over! Level " + level);
          showPopup("MISS!");
          return;
        }
      }

      // Pattern correct!
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      playSuccess();
      burst(window.innerWidth / 2, window.innerHeight / 2);
      sparkle(window.innerWidth / 2 - 50, window.innerHeight / 2 - 30);
      sparkle(window.innerWidth / 2 + 50, window.innerHeight / 2 - 30);
      
      // Celebrate every 3 levels or 5 streak
      if (level % 3 === 0 || newStreak >= 5) {
        confetti();
        playCelebrate();
        if (newStreak >= 5) {
          setStreak(0); // Reset streak after celebration
          showPopup(`🔥 ${newStreak} STREAK!`);
        } else {
          showPopup(`+${pattern.length * 10} pts!`);
        }
      } else {
        showPopup(`+${pattern.length * 10} pts!`);
      }
      
      setPhase("success");
      setMessage("Level " + level + " Clear!");
    },
    [pattern, level, streak, sparkle, burst, confetti, playSuccess, playMiss, playCelebrate, showPopup],
  );

  const getPointerPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phase !== "waiting") return;

      const pos = getPointerPos(e);
      const dotIdx = findDotAt(pos.x, pos.y);

      if (dotIdx !== null) {
        // Play click with varying pitch based on dot position
        playTone(220 + Math.floor(dotIdx / GRID_SIZE) * 110 + (dotIdx % GRID_SIZE) * 55, 0.1, "sine", 0.25);
        playClick();
        
        // Sparkle effect at dot position (convert canvas coords to screen coords)
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const { row, col } = getRowCol(dotIdx);
          const dotPos = getDotPosition(row, col);
          const screenX = rect.left + (dotPos.x / CANVAS_SIZE) * rect.width;
          const screenY = rect.top + (dotPos.y / CANVAS_SIZE) * rect.height;
          sparkle(screenX, screenY, 6);
        }
        
        setPlayerPattern([dotIdx]);
        setCurrentDrag(pos);
        canvasRef.current?.setPointerCapture(e.pointerId);
      }
    },
    [phase, getPointerPos, findDotAt, playTone, playClick, sparkle],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phase !== "waiting" || playerPattern.length === 0) return;

      const pos = getPointerPos(e);
      setCurrentDrag(pos);

      const dotIdx = findDotAt(pos.x, pos.y);
      if (dotIdx !== null && !playerPattern.includes(dotIdx)) {
        // Play click with varying pitch based on dot position
        playTone(220 + Math.floor(dotIdx / GRID_SIZE) * 110 + (dotIdx % GRID_SIZE) * 55, 0.1, "sine", 0.25);
        playClick();
        
        // Sparkle effect at dot position
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const { row, col } = getRowCol(dotIdx);
          const dotPos = getDotPosition(row, col);
          const screenX = rect.left + (dotPos.x / CANVAS_SIZE) * rect.width;
          const screenY = rect.top + (dotPos.y / CANVAS_SIZE) * rect.height;
          sparkle(screenX, screenY, 6);
        }
        
        setPlayerPattern((prev) => [...prev, dotIdx]);
      }
    },
    [phase, playerPattern, getPointerPos, findDotAt, playTone, playClick, sparkle],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phase !== "waiting") return;

      canvasRef.current?.releasePointerCapture(e.pointerId);
      setCurrentDrag(null);

      if (playerPattern.length > 0) {
        checkPattern(playerPattern);
      }
    },
    [phase, playerPattern, checkPattern],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const pos = getDotPosition(row, col);
        const idx = getDotIndex(row, col);

        let isHighlighted = false;
        let isActive = false;

        if (phase === "showing" && pattern.slice(0, shownIndex + 1).includes(idx)) {
          isHighlighted = true;
          if (pattern[shownIndex] === idx) {
            isActive = true;
          }
        }

        if ((phase === "waiting" || phase === "success") && playerPattern.includes(idx)) {
          isHighlighted = true;
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = isHighlighted
          ? phase === "gameover"
            ? "#ff4444"
            : phase === "success"
              ? "#44ff44"
              : "#00ffff"
          : "#3a4a5a";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isActive ? DOT_RADIUS - 4 : 8, 0, Math.PI * 2);
        ctx.fillStyle = isActive
          ? "#00ffff"
          : isHighlighted
            ? phase === "gameover"
              ? "#ff4444"
              : phase === "success"
                ? "#44ff44"
                : "#00dddd"
            : "#5a6a7a";
        ctx.fill();

        if (isActive) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, DOT_RADIUS + 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 255, 255, 0.4)";
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }
    }

    if (phase === "showing" && shownIndex > 0) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      for (let i = 0; i <= shownIndex && i < pattern.length; i++) {
        const { row, col } = getRowCol(pattern[i]);
        const pos = getDotPosition(row, col);
        if (i === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      }
      ctx.stroke();
    }

    if ((phase === "waiting" || phase === "success" || phase === "gameover") && playerPattern.length > 0) {
      ctx.strokeStyle =
        phase === "gameover" ? "#ff4444" : phase === "success" ? "#44ff44" : "#00ffff";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      for (let i = 0; i < playerPattern.length; i++) {
        const { row, col } = getRowCol(playerPattern[i]);
        const pos = getDotPosition(row, col);
        if (i === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      }

      if (currentDrag && phase === "waiting") {
        ctx.lineTo(currentDrag.x, currentDrag.y);
      }

      ctx.stroke();
    }
  }, [phase, pattern, shownIndex, playerPattern, currentDrag]);

  return (
    <GameShell gameId="patternlock" layout="default">
      <ParticleLayer particles={particles} />
      <ScorePopup 
        text={popupText} 
        popupKey={popupKey}
        variant={popupText?.includes("STREAK") ? "combo" : popupText?.includes("Level") ? "level" : popupText?.includes("MISS") ? "critical" : "bonus"}
        size="lg"
      />
      <div className="patternlock-container">
        <header className="patternlock-header">
          <h1 className="patternlock-title">Pattern Lock</h1>
          <div className="patternlock-level">Level: {level}</div>
          {streak > 0 && <div className="patternlock-streak">🔥 {streak}</div>}
        </header>

        <div className="patternlock-message">{message}</div>

        <div className="patternlock-board">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="patternlock-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>

        {(phase === "idle" || phase === "gameover") && (
          <button className="patternlock-start" onClick={startGame}>
            {phase === "idle" ? "START" : "RETRY"}
          </button>
        )}

        {phase === "success" && (
          <div className="patternlock-success">Correct!</div>
        )}
      </div>
    </GameShell>
  );
}