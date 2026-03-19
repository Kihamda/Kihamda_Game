import { useState, useEffect, useRef, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
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

/* ---- Audio ---- */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration = 0.15): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

function playSuccessSound(): void {
  const ctx = getAudioContext();
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.2);
  });
}

function playErrorSound(): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.value = 100;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.4);
}

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<number[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);

  const startGame = useCallback(() => {
    clearTimeouts();
    setLevel(1);
    const newPattern = generatePattern(START_POINTS);
    setPattern(newPattern);
    setPlayerPattern([]);
    setShownIndex(0);
    setPhase("showing");
    setMessage("Pattern wo oboete...");
  }, [clearTimeouts]);

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
  }, [level, clearTimeouts]);

  useEffect(() => {
    if (phase !== "showing") return;

    if (shownIndex < pattern.length) {
      const { row, col } = getRowCol(pattern[shownIndex]);
      playTone(220 + row * 110 + col * 55);

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
  }, [phase, shownIndex, pattern, clearTimeouts]);

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
        playErrorSound();
        setPhase("gameover");
        setMessage("Game Over! Level " + level);
        return;
      }

      for (let i = 0; i < pattern.length; i++) {
        if (playerPat[i] !== pattern[i]) {
          playErrorSound();
          setPhase("gameover");
          setMessage("Game Over! Level " + level);
          return;
        }
      }

      playSuccessSound();
      setPhase("success");
      setMessage("Level " + level + " Clear!");
    },
    [pattern, level],
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
        playTone(220 + Math.floor(dotIdx / GRID_SIZE) * 110 + (dotIdx % GRID_SIZE) * 55);
        setPlayerPattern([dotIdx]);
        setCurrentDrag(pos);
        canvasRef.current?.setPointerCapture(e.pointerId);
      }
    },
    [phase, getPointerPos, findDotAt],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phase !== "waiting" || playerPattern.length === 0) return;

      const pos = getPointerPos(e);
      setCurrentDrag(pos);

      const dotIdx = findDotAt(pos.x, pos.y);
      if (dotIdx !== null && !playerPattern.includes(dotIdx)) {
        playTone(220 + Math.floor(dotIdx / GRID_SIZE) * 110 + (dotIdx % GRID_SIZE) * 55);
        setPlayerPattern((prev) => [...prev, dotIdx]);
      }
    },
    [phase, playerPattern, getPointerPos, findDotAt],
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
      <div className="patternlock-container">
        <header className="patternlock-header">
          <h1 className="patternlock-title">Pattern Lock</h1>
          <div className="patternlock-level">Level: {level}</div>
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