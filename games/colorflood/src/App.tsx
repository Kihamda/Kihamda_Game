import { useState, useCallback, useMemo, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer } from "@shared";
import "./App.css";

/* ---- Popup State Type ---- */
interface PopupState {
  text: string;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  x: string;
  y: string;
}

/* ---- Types ---- */
type Grid = number[][];
type Phase = "menu" | "playing" | "cleared" | "gameover";

/* ---- Constants ---- */
const GRID_SIZE = 14;
const MAX_MOVES = 25;
const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"];
const COLOR_NAMES = ["赤", "青", "緑", "黄", "紫", "橙"];

const STORAGE_KEY = "colorflood_best";

/* ---- Game Logic ---- */
function createRandomGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () =>
      Math.floor(Math.random() * COLORS.length)
    )
  );
}

function floodFill(
  grid: Grid,
  newColor: number
): Grid {
  const oldColor = grid[0][0];
  if (oldColor === newColor) return grid;

  const newGrid = grid.map((row) => [...row]);
  const visited = new Set<string>();
  const stack: [number, number][] = [[0, 0]];

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (newGrid[r][c] !== oldColor) continue;

    visited.add(key);
    newGrid[r][c] = newColor;

    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  return newGrid;
}

function isCleared(grid: Grid): boolean {
  const firstColor = grid[0][0];
  return grid.every((row) => row.every((cell) => cell === firstColor));
}

function countConnected(grid: Grid): number {
  const targetColor = grid[0][0];
  const visited = new Set<string>();
  const stack: [number, number][] = [[0, 0]];

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (grid[r][c] !== targetColor) continue;

    visited.add(key);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  return visited.size;
}

function loadBestScore(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

function saveBestScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, score.toString());
  } catch {
    // ignore
  }
}

/* ---- Component ---- */
export default function App() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [grid, setGrid] = useState<Grid>(createRandomGrid);
  const [moves, setMoves] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(() => loadBestScore());

  // Popup state
  const [popups, setPopups] = useState<PopupState[]>([]);
  const popupKeyRef = useRef(0);

  const showPopup = useCallback((
    text: string,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md",
    x = "50%",
    y = "40%"
  ) => {
    const key = ++popupKeyRef.current;
    const popup: PopupState = { text, key, variant, size, x, y };
    setPopups(prev => [...prev, popup]);
    // Auto-remove popup after animation
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.key !== key));
    }, 1500);
  }, []);

  // Dopamine hooks
  const { particles, confetti, sparkle, explosion } = useParticles();
  const { playTone } = useAudio();
  const playClick = useCallback(() => playTone(440 + moves * 20, 0.08, 'sine'), [playTone, moves]);
  const playWin = useCallback(() => playTone(880, 0.3, 'sine'), [playTone]);
  const playLose = useCallback(() => playTone(180, 0.3, 'sawtooth'), [playTone]);

  const connected = useMemo(() => countConnected(grid), [grid]);
  const totalCells = GRID_SIZE * GRID_SIZE;
  const progress = Math.round((connected / totalCells) * 100);

  const handleStart = useCallback(() => {
    setGrid(createRandomGrid());
    setMoves(0);
    setPhase("playing");
    setPopups([]); // Clear popups on new game
  }, []);

  const handleColorClick = useCallback(
    (colorIndex: number) => {
      if (phase !== "playing") return;
      if (grid[0][0] === colorIndex) return;

      // Count cells before the move
      const beforeConnected = countConnected(grid);
      
      const newGrid = floodFill(grid, colorIndex);
      const newMoves = moves + 1;
      setGrid(newGrid);
      setMoves(newMoves);
      
      // Count cells captured in this move
      const afterConnected = countConnected(newGrid);
      const cellsCaptured = afterConnected - beforeConnected;
      
      // Dopamine effects
      playClick();
      sparkle(200, 250);

      // Show popup for cells captured
      if (cellsCaptured > 0) {
        // Determine popup style based on efficiency
        if (cellsCaptured >= 20) {
          // Massive capture - critical!
          showPopup(`+${cellsCaptured} 大量獲得!`, "critical", "xl", "50%", "35%");
        } else if (cellsCaptured >= 12) {
          // Very efficient move
          showPopup(`+${cellsCaptured} すごい!`, "bonus", "lg", "50%", "35%");
        } else if (cellsCaptured >= 6) {
          // Good move
          showPopup(`+${cellsCaptured} いいね!`, "combo", "md", "50%", "35%");
        } else {
          // Normal capture
          showPopup(`+${cellsCaptured}`, "default", "sm", "50%", "38%");
        }
      }

      if (isCleared(newGrid)) {
        setPhase("cleared");
        playWin();
        confetti();
        const currentBest = loadBestScore();
        const isNewBest = currentBest === null || newMoves < currentBest;
        if (isNewBest) {
          saveBestScore(newMoves);
          setBestScore(newMoves);
          // Show best score popup
          setTimeout(() => {
            showPopup("🏆 新記録!", "level", "xl", "50%", "25%");
          }, 300);
        } else {
          // Show win popup
          setTimeout(() => {
            showPopup("🎉 クリア!", "bonus", "lg", "50%", "25%");
          }, 300);
        }
      } else if (newMoves >= MAX_MOVES) {
        setPhase("gameover");
        playLose();
        explosion(200, 250);
        // Show game over popup
        setTimeout(() => {
          showPopup("💔 ゲームオーバー", "default", "lg", "50%", "25%");
        }, 300);
      }
    },
    [phase, grid, moves, playClick, playWin, playLose, sparkle, confetti, explosion, showPopup]
  );

  const handleBackToMenu = useCallback(() => {
    setPhase("menu");
    setGrid(createRandomGrid());
    setMoves(0);
    setPopups([]); // Clear popups on menu return
  }, []);

  return (
    <GameShell gameId="colorflood" layout="default">
      <div className="colorflood-container" style={{ position: 'relative' }}>
        <ParticleLayer particles={particles} />
        
        {/* Score Popups */}
        {popups.map((popup) => (
          <ScorePopup
            key={popup.key}
            text={popup.text}
            popupKey={popup.key}
            variant={popup.variant}
            size={popup.size}
            x={popup.x}
            y={popup.y}
          />
        ))}
        
        {/* Header */}
        <header className="colorflood-header">
          <h1 className="colorflood-title">Color Flood</h1>
        </header>

        {/* Menu Phase */}
        {phase === "menu" && (
          <div className="colorflood-menu">
            <p className="colorflood-description">
              左上から色を塗り替えて
              <br />
              全マスを同色にしよう！
              <br />
              <span className="colorflood-hint">
                {MAX_MOVES}手以内にクリア
              </span>
            </p>
            {bestScore !== null && (
              <p className="colorflood-best">
                🏆 ベスト: {bestScore}手
              </p>
            )}
            <button className="colorflood-start-btn" onClick={handleStart}>
              スタート
            </button>
          </div>
        )}

        {/* Playing / Cleared / GameOver Phase */}
        {(phase === "playing" || phase === "cleared" || phase === "gameover") && (
          <>
            {/* Stats */}
            <div className="colorflood-stats">
              <div className="colorflood-stat">
                <span className="colorflood-stat-label">手数</span>
                <span className="colorflood-stat-value">
                  {moves} / {MAX_MOVES}
                </span>
              </div>
              <div className="colorflood-stat">
                <span className="colorflood-stat-label">進捗</span>
                <span className="colorflood-stat-value">{progress}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="colorflood-progress-bar">
              <div
                className="colorflood-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Grid */}
            <div className="colorflood-grid">
              {grid.map((row, rowIndex) =>
                row.map((colorIndex, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="colorflood-cell"
                    style={{ backgroundColor: COLORS[colorIndex] }}
                  />
                ))
              )}
            </div>

            {/* Color Palette */}
            <div className="colorflood-palette">
              {COLORS.map((color, index) => (
                <button
                  key={index}
                  className={`colorflood-color-btn${
                    grid[0][0] === index ? " colorflood-color-btn--active" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorClick(index)}
                  disabled={phase !== "playing" || grid[0][0] === index}
                  aria-label={`${COLOR_NAMES[index]}に塗り替え`}
                />
              ))}
            </div>

            {/* Cleared Overlay */}
            {phase === "cleared" && (
              <div className="colorflood-overlay">
                <div className="colorflood-result">
                  <h2 className="colorflood-result-title">🎉 クリア！</h2>
                  <p className="colorflood-result-text">
                    {moves}手でクリア！
                  </p>
                  {bestScore === moves && (
                    <p className="colorflood-result-best">🏆 ベスト記録更新！</p>
                  )}
                  <div className="colorflood-result-buttons">
                    <button
                      className="colorflood-btn colorflood-btn--primary"
                      onClick={handleStart}
                    >
                      もう一度
                    </button>
                    <button
                      className="colorflood-btn colorflood-btn--secondary"
                      onClick={handleBackToMenu}
                    >
                      メニューへ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Game Over Overlay */}
            {phase === "gameover" && (
              <div className="colorflood-overlay">
                <div className="colorflood-result colorflood-result--gameover">
                  <h2 className="colorflood-result-title">💔 ゲームオーバー</h2>
                  <p className="colorflood-result-text">
                    {MAX_MOVES}手で{progress}%まで到達
                  </p>
                  <div className="colorflood-result-buttons">
                    <button
                      className="colorflood-btn colorflood-btn--primary"
                      onClick={handleStart}
                    >
                      リトライ
                    </button>
                    <button
                      className="colorflood-btn colorflood-btn--secondary"
                      onClick={handleBackToMenu}
                    >
                      メニューへ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Back Button (Playing only) */}
            {phase === "playing" && (
              <button
                className="colorflood-back-btn"
                onClick={handleBackToMenu}
              >
                ← 戻る
              </button>
            )}
          </>
        )}
      </div>
    </GameShell>
  );
}
