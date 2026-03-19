import { useState, useCallback, useMemo } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

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

/* ---- Component ---- */
export default function App() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [grid, setGrid] = useState<Grid>(createEmptyGrid);
  const [moves, setMoves] = useState(0);
  const [difficultyIndex, setDifficultyIndex] = useState(1);

  const lightCount = useMemo(() => {
    return grid.flat().filter(Boolean).length;
  }, [grid]);

  const handleStart = useCallback((index: number) => {
    const difficulty = DIFFICULTY_LEVELS[index];
    setDifficultyIndex(index);
    setGrid(generatePuzzle(difficulty.clicks));
    setMoves(0);
    setPhase("playing");
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (phase !== "playing") return;

      const newGrid = toggleCell(grid, row, col);
      const newMoves = moves + 1;
      setGrid(newGrid);
      setMoves(newMoves);

      if (isCleared(newGrid)) {
        setPhase("cleared");
      }
    },
    [phase, grid, moves],
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
      </div>
    </GameShell>
  );
}
