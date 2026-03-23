import { useState, useCallback, useMemo } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer } from "@shared";
import "./App.css";

/* ---- Popup State ---- */
interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  y: string;
}

/* ---- Types ---- */
type Grid = boolean[][];
type Phase = "menu" | "playing" | "cleared";

/* ---- Constants ---- */
const SIZE = 5;
const DIFFICULTY_LEVELS = [
  { name: "Easy", clicks: 3 },
  { name: "Normal", clicks: 5 },
  { name: "Hard", clicks: 8 },
  { name: "Expert", clicks: 12 },
];

/* ---- Game Logic ---- */
function createEmptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(false) as boolean[]);
}

function toggleCell(grid: Grid, row: number, col: number): Grid {
  const newGrid = grid.map((r) => [...r]);
  const positions = [
    [row, col],
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];

  for (const [r, c] of positions) {
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
      newGrid[r][c] = !newGrid[r][c];
    }
  }

  return newGrid;
}

function generatePuzzle(numClicks: number): Grid {
  let grid = createEmptyGrid();
  const used = new Set<string>();

  for (let i = 0; i < numClicks; i++) {
    let row: number, col: number;
    do {
      row = Math.floor(Math.random() * SIZE);
      col = Math.floor(Math.random() * SIZE);
    } while (used.has(`${row},${col}`));

    used.add(`${row},${col}`);
    grid = toggleCell(grid, row, col);
  }

  return grid;
}

function isCleared(grid: Grid): boolean {
  return grid.every((row) => row.every((cell) => !cell));
}

/* ---- Efficiency Rating ---- */
function getEfficiencyRating(moves: number, optimal: number): { rating: string; emoji: string; variant: PopupVariant } {
  const ratio = moves / optimal;
  if (ratio === 1) return { rating: "PERFECT!", emoji: "👑", variant: "critical" };
  if (ratio <= 1.2) return { rating: "EXCELLENT!", emoji: "⭐", variant: "bonus" };
  if (ratio <= 1.5) return { rating: "GREAT!", emoji: "🎯", variant: "combo" };
  if (ratio <= 2.0) return { rating: "GOOD!", emoji: "✨", variant: "default" };
  return { rating: "CLEARED!", emoji: "🎉", variant: "default" };
}

/* ---- Component ---- */
export default function App() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [grid, setGrid] = useState<Grid>(createEmptyGrid);
  const [moves, setMoves] = useState(0);
  const [difficultyIndex, setDifficultyIndex] = useState(1);
  
  // Popup state
  const [popup, setPopup] = useState<PopupState>({ text: null, key: 0, variant: "default", size: "md", y: "40%" });
  
  // Dopamine hooks
  const { particles, sparkle, confetti } = useParticles();
  const { playTone } = useAudio();
  const playClick = useCallback(() => playTone(440, 0.05, 'triangle'), [playTone]);
  const playClear = useCallback(() => playTone(880, 0.2, 'sine'), [playTone]);
  const playMilestone = useCallback(() => playTone(660, 0.1, 'sine'), [playTone]);
  
  // Show popup helper
  const showPopup = useCallback((text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md", y = "40%") => {
    setPopup(prev => ({ text, key: prev.key + 1, variant, size, y }));
  }, []);

  const lightCount = useMemo(() => {
    return grid.flat().filter(Boolean).length;
  }, [grid]);

  const handleStart = useCallback((index: number) => {
    const difficulty = DIFFICULTY_LEVELS[index];
    setDifficultyIndex(index);
    setGrid(generatePuzzle(difficulty.clicks));
    setMoves(0);
    setPhase("playing");
    // Level start popup
    showPopup(`${difficulty.name} 開始!`, "level", "lg", "35%");
  }, [showPopup]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (phase !== "playing") return;

      playClick();
      const newGrid = toggleCell(grid, row, col);
      const newMoves = moves + 1;
      setGrid(newGrid);
      setMoves(newMoves);

      const optimal = DIFFICULTY_LEVELS[difficultyIndex].clicks;

      if (isCleared(newGrid)) {
        // Puzzle solved! Show efficiency rating
        playClear();
        confetti();
        const { rating, emoji, variant } = getEfficiencyRating(newMoves, optimal);
        setTimeout(() => {
          showPopup(`${emoji} ${rating}`, variant, "xl", "25%");
        }, 300);
        setPhase("cleared");
      } else {
        sparkle(200 + col * 50, 200 + row * 50);
        
        // Move count milestones
        if (newMoves === 5) {
          playMilestone();
          showPopup("5手達成! 🔥", "combo", "md", "30%");
        } else if (newMoves === 10) {
          playMilestone();
          showPopup("10手突破! 💪", "combo", "md", "30%");
        } else if (newMoves === optimal) {
          // Reached optimal without solving - encourage to keep going
          playMilestone();
          showPopup(`最適手数 ${optimal}手に到達!`, "bonus", "md", "30%");
        } else if (newMoves === 20) {
          showPopup("20手... 🤔", "default", "sm", "30%");
        }
      }
    },
    [phase, grid, moves, difficultyIndex, playClick, playClear, playMilestone, confetti, sparkle, showPopup],
  );

  const handleRestart = useCallback(() => {
    handleStart(difficultyIndex);
  }, [handleStart, difficultyIndex]);

  const handleBackToMenu = useCallback(() => {
    setPhase("menu");
    setGrid(createEmptyGrid());
    setMoves(0);
  }, []);

  return (
    <GameShell gameId="lightsout" layout="default">
      <div className="lightsout-container">
        {/* Header */}
        <header className="lightsout-header">
          <h1 className="lightsout-title">Lights Out</h1>
        </header>

        {/* Menu Phase */}
        {phase === "menu" && (
          <div className="lightsout-menu">
            <p className="lightsout-description">
              全てのライトを消そう！
              <br />
              タップすると上下左右も反転！
            </p>
            <div className="lightsout-levels">
              {DIFFICULTY_LEVELS.map((level, index) => (
                <button
                  key={level.name}
                  className="lightsout-level-btn"
                  onClick={() => handleStart(index)}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Playing / Cleared Phase */}
        {(phase === "playing" || phase === "cleared") && (
          <>
            {/* Stats */}
            <div className="lightsout-stats">
              <div className="lightsout-stat">
                <span className="lightsout-stat-label">手数</span>
                <span className="lightsout-stat-value">{moves}</span>
              </div>
              <div className="lightsout-stat">
                <span className="lightsout-stat-label">残り</span>
                <span className="lightsout-stat-value">{lightCount}</span>
              </div>
            </div>

            {/* Grid */}
            <div className="lightsout-grid">
              {grid.map((row, rowIndex) =>
                row.map((isOn, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    className={`lightsout-cell${isOn ? " lightsout-cell--on" : ""}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    disabled={phase === "cleared"}
                    aria-label={`Cell ${rowIndex + 1},${colIndex + 1} ${isOn ? "on" : "off"}`}
                  />
                )),
              )}
            </div>

            {/* Cleared Overlay */}
            {phase === "cleared" && (
              <div className="lightsout-overlay">
                <div className="lightsout-cleared">
                  <h2 className="lightsout-cleared-title">🎉 クリア！</h2>
                  <p className="lightsout-cleared-moves">
                    {moves} 手でクリア！
                  </p>
                  <div className="lightsout-cleared-buttons">
                    <button
                      className="lightsout-btn lightsout-btn--primary"
                      onClick={handleRestart}
                    >
                      もう一度
                    </button>
                    <button
                      className="lightsout-btn lightsout-btn--secondary"
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
                className="lightsout-back-btn"
                onClick={handleBackToMenu}
              >
                ← 戻る
              </button>
            )}
          </>
        )}
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size={popup.size}
          y={popup.y}
        />
      </div>
    </GameShell>
  );
}
