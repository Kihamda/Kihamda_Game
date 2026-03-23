import { useState, useEffect, useRef, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import "./App.css";

// --- Types ---
type Phase = "ready" | "playing" | "cleared" | "timeout";

type ShapeType = "circle" | "square" | "triangle" | "diamond" | "star" | "hexagon";

interface Shape {
  id: number;
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
}

interface Difference {
  shapeId: number;
  type: "color" | "shape" | "position" | "size" | "rotation";
  originalValue: string | number | ShapeType;
  modifiedValue: string | number | ShapeType;
  found: boolean;
}

// --- Constants ---
const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#78716c",
];

const SHAPE_TYPES: ShapeType[] = ["circle", "square", "triangle", "diamond", "star", "hexagon"];

const TIME_LIMIT_MS = 60000;
const DIFFERENCES_COUNT = 5;
const BASE_SHAPE_COUNT = 12;
const STORAGE_KEY = "spotdiff_best_score";

// --- Helper Functions ---
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateShapes(count: number): Shape[] {
  const shapes: Shape[] = [];
  const gridCols = 4;
  const cellWidth = 160;
  const cellHeight = 120;
  const padding = 30;

  for (let i = 0; i < count; i++) {
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const baseX = col * cellWidth + padding;
    const baseY = row * cellHeight + padding;
    
    shapes.push({
      id: i,
      type: pickRandom(SHAPE_TYPES),
      x: baseX + randomRange(0, 30),
      y: baseY + randomRange(0, 20),
      size: randomRange(30, 50),
      color: pickRandom(COLORS),
      rotation: randomRange(0, 3) * 90,
    });
  }
  return shapes;
}
function createDifferences(shapes: Shape[]): { modifiedShapes: Shape[]; differences: Difference[] } {
  const modifiedShapes = shapes.map(s => ({ ...s }));
  const differences: Difference[] = [];
  const shuffledIndices = shuffle([...Array(shapes.length).keys()]);
  const selectedIndices = shuffledIndices.slice(0, DIFFERENCES_COUNT);

  const diffTypes: Array<"color" | "shape" | "position" | "size" | "rotation"> = 
    ["color", "shape", "position", "size", "rotation"];
  
  for (let i = 0; i < selectedIndices.length; i++) {
    const idx = selectedIndices[i];
    const shape = modifiedShapes[idx];
    const diffType = diffTypes[i % diffTypes.length];
    
    const difference: Difference = {
      shapeId: shape.id,
      type: diffType,
      originalValue: "",
      modifiedValue: "",
      found: false,
    };

    switch (diffType) {
      case "color": {
        const otherColors = COLORS.filter(c => c !== shape.color);
        const newColor = pickRandom(otherColors);
        difference.originalValue = shape.color;
        difference.modifiedValue = newColor;
        shape.color = newColor;
        break;
      }
      case "shape": {
        const otherShapes = SHAPE_TYPES.filter(s => s !== shape.type);
        const newType = pickRandom(otherShapes);
        difference.originalValue = shape.type;
        difference.modifiedValue = newType;
        shape.type = newType;
        break;
      }
      case "position": {
        const offsetX = randomRange(-20, 20);
        const offsetY = randomRange(-20, 20);
        difference.originalValue = shape.x + "," + shape.y;
        shape.x = Math.max(10, Math.min(320, shape.x + offsetX));
        shape.y = Math.max(10, Math.min(280, shape.y + offsetY));
        difference.modifiedValue = shape.x + "," + shape.y;
        break;
      }
      case "size": {
        const sizeChange = shape.size > 40 ? -15 : 15;
        difference.originalValue = shape.size;
        shape.size += sizeChange;
        difference.modifiedValue = shape.size;
        break;
      }
      case "rotation": {
        const rotChange = 45;
        difference.originalValue = shape.rotation;
        shape.rotation = (shape.rotation + rotChange) % 360;
        difference.modifiedValue = shape.rotation;
        break;
      }
    }
    
    differences.push(difference);
  }
  
  return { modifiedShapes, differences };
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return String(seconds).padStart(2, "0") + "." + String(centis).padStart(2, "0");
}

function loadBestScore(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) || 0 : 0;
  } catch { return 0; }
}

function saveBestScore(score: number): void {
  try { localStorage.setItem(STORAGE_KEY, String(score)); } catch { /* ignore */ }
}
// --- Shape Renderer ---
function ShapeSVG({ shape, highlight }: { shape: Shape; highlight?: boolean }) {
  const { type, x, y, size, color, rotation } = shape;
  const half = size / 2;
  const highlightStroke = highlight ? "#fbbf24" : "none";
  const highlightWidth = highlight ? 4 : 0;
  
  const transform = "rotate(" + rotation + " " + (x + half) + " " + (y + half) + ")";
  
  switch (type) {
    case "circle":
      return (
        <circle
          cx={x + half}
          cy={y + half}
          r={half}
          fill={color}
          stroke={highlightStroke}
          strokeWidth={highlightWidth}
          transform={transform}
        />
      );
    case "square":
      return (
        <rect
          x={x}
          y={y}
          width={size}
          height={size}
          fill={color}
          stroke={highlightStroke}
          strokeWidth={highlightWidth}
          transform={transform}
        />
      );
    case "triangle": {
      const points = (x + half) + "," + y + " " + (x + size) + "," + (y + size) + " " + x + "," + (y + size);
      return (
        <polygon
          points={points}
          fill={color}
          stroke={highlightStroke}
          strokeWidth={highlightWidth}
          transform={transform}
        />
      );
    }
    case "diamond": {
      const points = (x + half) + "," + y + " " + (x + size) + "," + (y + half) + " " + (x + half) + "," + (y + size) + " " + x + "," + (y + half);
      return (
        <polygon
          points={points}
          fill={color}
          stroke={highlightStroke}
          strokeWidth={highlightWidth}
          transform={transform}
        />
      );
    }
    case "star": {
      const outerR = half;
      const innerR = half * 0.4;
      const cx = x + half;
      const cy = y + half;
      let points = "";
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        points += (cx + r * Math.cos(angle)) + "," + (cy + r * Math.sin(angle)) + " ";
      }
      return (
        <polygon
          points={points.trim()}
          fill={color}
          stroke={highlightStroke}
          strokeWidth={highlightWidth}
          transform={transform}
        />
      );
    }
    case "hexagon": {
      const cx = x + half;
      const cy = y + half;
      let points = "";
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        points += (cx + half * Math.cos(angle)) + "," + (cy + half * Math.sin(angle)) + " ";
      }
      return (
        <polygon
          points={points.trim()}
          fill={color}
          stroke={highlightStroke}
          strokeWidth={highlightWidth}
          transform={transform}
        />
      );
    }
  }
}
// --- Main Component ---
export default function App() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(loadBestScore);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const [originalShapes, setOriginalShapes] = useState<Shape[]>([]);
  const [modifiedShapes, setModifiedShapes] = useState<Shape[]>([]);
  const [differences, setDifferences] = useState<Difference[]>([]);
  const [foundCount, setFoundCount] = useState(0);
  const [clickFeedback, setClickFeedback] = useState<{ x: number; y: number; correct: boolean } | null>(null);

  const [remainingMs, setRemainingMs] = useState(TIME_LIMIT_MS);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  // Dopamine effects
  const { playSuccess, playMiss, playLevelUp, playGameOver } = useAudio();
  const { particles, burst, confetti } = useParticles();
  const [popup, setPopup] = useState<{ text: string; x: string; y: string; key: number; variant: PopupVariant } | null>(null);
  const popupKeyRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopTimer = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, TIME_LIMIT_MS - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        stopTimer();
        setPhase("timeout");
        playGameOver();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopTimer, playGameOver]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const initLevel = useCallback((newLevel: number) => {
    const shapeCount = BASE_SHAPE_COUNT + Math.min(newLevel - 1, 8) * 2;
    const shapes = generateShapes(shapeCount);
    const { modifiedShapes: modified, differences: diffs } = createDifferences(shapes);
    
    setOriginalShapes(shapes);
    setModifiedShapes(modified);
    setDifferences(diffs);
    setFoundCount(0);
    setRemainingMs(TIME_LIMIT_MS);
    startTimeRef.current = performance.now();
  }, []);

  const handleStart = useCallback(() => {
    setLevel(1);
    setScore(0);
    setIsNewRecord(false);
    setPopup(null);
    initLevel(1);
    setPhase("playing");
    startTimer();
  }, [initLevel, startTimer]);

  // Helper to show popup at position relative to container
  const showPopup = useCallback((text: string, clientX: number, clientY: number, variant: PopupVariant = "default") => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const relX = clientX - containerRect.left;
    const relY = clientY - containerRect.top;
    popupKeyRef.current += 1;
    setPopup({
      text,
      x: relX + "px",
      y: relY + "px",
      key: popupKeyRef.current,
      variant,
    });
    setTimeout(() => setPopup(null), variant === "level" ? 1500 : 800);
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent<SVGSVGElement>, isRight: boolean) => {
    if (phase !== "playing") return;
    
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const shapes = isRight ? modifiedShapes : originalShapes;
    const clickRadius = 30;
    
    let foundDiff: Difference | null = null;
    
    for (const diff of differences) {
      if (diff.found) continue;
      const shape = shapes.find(s => s.id === diff.shapeId);
      if (!shape) continue;
      
      const shapeX = shape.x + shape.size / 2;
      const shapeY = shape.y + shape.size / 2;
      const distance = Math.sqrt((x - shapeX) ** 2 + (y - shapeY) ** 2);
      
      if (distance < shape.size / 2 + clickRadius) {
        foundDiff = diff;
        break;
      }
    }
    
    if (foundDiff) {
      const updatedDiffs = differences.map(d => 
        d.shapeId === foundDiff.shapeId ? { ...d, found: true } : d
      );
      setDifferences(updatedDiffs);
      const newFoundCount = foundCount + 1;
      setFoundCount(newFoundCount);
      
      const timeBonus = Math.floor(remainingMs / 1000) * 10;
      const levelBonus = level * 50;
      const pointsGained = timeBonus + levelBonus;
      setScore(prev => prev + pointsGained);
      
      setClickFeedback({ x, y, correct: true });
      setTimeout(() => setClickFeedback(null), 500);
      
      // Dopamine effects: sound + particles + popup
      playSuccess();
      burst(e.clientX, e.clientY);
      showPopup("+" + pointsGained, e.clientX, e.clientY, "default");
      
      if (newFoundCount === DIFFERENCES_COUNT) {
        stopTimer();
        const newScore = score + pointsGained;
        
        if (newScore > bestScore) {
          setBestScore(newScore);
          saveBestScore(newScore);
          setIsNewRecord(true);
        }
        
        // Level complete effects
        playLevelUp();
        confetti(60);
        setTimeout(() => {
          showPopup("LEVEL UP!", window.innerWidth / 2, window.innerHeight / 3, "level");
        }, 300);
        
        setTimeout(() => {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          initLevel(nextLevel);
          startTimer();
        }, 1500);
      }
    } else {
      setClickFeedback({ x, y, correct: false });
      playMiss();
      const penalty = 3000;
      const newRemaining = Math.max(0, remainingMs - penalty);
      startTimeRef.current = performance.now() - (TIME_LIMIT_MS - newRemaining);
      setRemainingMs(newRemaining);
      setTimeout(() => setClickFeedback(null), 500);
      
      if (newRemaining <= 0) {
        stopTimer();
        setPhase("timeout");
        playGameOver();
      }
    }
  }, [phase, differences, modifiedShapes, originalShapes, foundCount, level, remainingMs, score, bestScore, stopTimer, initLevel, startTimer, playSuccess, playMiss, playLevelUp, playGameOver, burst, confetti, showPopup]);

  const timerPercent = (remainingMs / TIME_LIMIT_MS) * 100;
  const timerColor = remainingMs > 20000 ? "#22c55e" : remainingMs > 10000 ? "#eab308" : "#ef4444";
  return (
    <GameShell gameId="spotdiff" layout="default">
      <div ref={containerRef} className="spotdiff" style={{ width: 900, height: 600, position: "relative" }}>
        <ParticleLayer particles={particles} />
        {popup && (
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            x={popup.x}
            y={popup.y}
            variant={popup.variant}
            size={popup.variant === "level" ? "xl" : "lg"}
          />
        )}
        <header className="spotdiff__header">
          <h1 className="spotdiff__title">🔍 Spot the Diff</h1>
          <div className="spotdiff__stats">
            <span className="spotdiff__level">Lv.{level}</span>
            <span className="spotdiff__found">{foundCount}/{DIFFERENCES_COUNT} 発見</span>
            <span className="spotdiff__score">Score: {score}</span>
            {bestScore > 0 && <span className="spotdiff__best">Best: {bestScore}</span>}
          </div>
        </header>

        <div className="spotdiff__timer-bar">
          <div
            className="spotdiff__timer-fill"
            style={{ width: timerPercent + "%", backgroundColor: timerColor }}
          />
          <span className="spotdiff__timer-text">{formatTime(remainingMs)}</span>
        </div>

        {phase === "ready" && (
          <div className="spotdiff__overlay">
            <div className="spotdiff__message">
              <h2>間違いを探せ！</h2>
              <p>左右の画像から {DIFFERENCES_COUNT} つの違いを見つけよう</p>
              <p className="spotdiff__hint">違いをクリックで発見！ミスすると -3秒</p>
              <button type="button" className="spotdiff__btn" onClick={handleStart}>
                スタート
              </button>
            </div>
          </div>
        )}

        {phase === "timeout" && (
          <div className="spotdiff__overlay">
            <div className="spotdiff__message">
              <h2>⏱️ TIME UP!</h2>
              {isNewRecord && <p className="spotdiff__record">✨ 新記録！ ✨</p>}
              <p className="spotdiff__final">最終スコア: <strong>{score}</strong></p>
              <p>到達レベル: {level}</p>
              <button type="button" className="spotdiff__btn" onClick={handleStart}>
                もう一度
              </button>
            </div>
          </div>
        )}
        <div className="spotdiff__images">
          <div className="spotdiff__image-wrapper">
            <span className="spotdiff__label">Original</span>
            <svg
              className="spotdiff__canvas"
              viewBox="0 0 380 320"
              onClick={(e) => handleImageClick(e, false)}
            >
              <rect x="0" y="0" width="380" height="320" fill="#f8fafc" rx="8" />
              {originalShapes.map((shape) => {
                const diff = differences.find(d => d.shapeId === shape.id);
                return (
                  <ShapeSVG
                    key={shape.id}
                    shape={shape}
                    highlight={diff?.found}
                  />
                );
              })}
              {clickFeedback && (
                <circle
                  cx={clickFeedback.x}
                  cy={clickFeedback.y}
                  r="20"
                  fill="none"
                  stroke={clickFeedback.correct ? "#22c55e" : "#ef4444"}
                  strokeWidth="4"
                  className="spotdiff__click-feedback"
                />
              )}
            </svg>
          </div>

          <div className="spotdiff__image-wrapper">
            <span className="spotdiff__label">Modified</span>
            <svg
              className="spotdiff__canvas"
              viewBox="0 0 380 320"
              onClick={(e) => handleImageClick(e, true)}
            >
              <rect x="0" y="0" width="380" height="320" fill="#f8fafc" rx="8" />
              {modifiedShapes.map((shape) => {
                const diff = differences.find(d => d.shapeId === shape.id);
                return (
                  <ShapeSVG
                    key={shape.id}
                    shape={shape}
                    highlight={diff?.found}
                  />
                );
              })}
              {clickFeedback && (
                <circle
                  cx={clickFeedback.x}
                  cy={clickFeedback.y}
                  r="20"
                  fill="none"
                  stroke={clickFeedback.correct ? "#22c55e" : "#ef4444"}
                  strokeWidth="4"
                  className="spotdiff__click-feedback"
                />
              )}
            </svg>
          </div>
        </div>

        <div className="spotdiff__footer">
          {phase === "playing" && (
            <p className="spotdiff__tip">💡 違いの種類: 色・形・位置・サイズ・回転</p>
          )}
        </div>
      </div>
    </GameShell>
  );
}