import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles } from "@shared/hooks/useParticles";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScreenShake } from "@shared/components/ScreenShake";
import { ScorePopup } from "@shared/components/ScorePopup";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import type { PopupVariant } from "@shared/components/ScorePopup";
import "./App.css";

/* ---- Types ---- */
type Grid = (number | null)[][];
type Phase = "menu" | "playing" | "cleared";
type HighlightedLine = { type: "row" | "col" | "box"; index: number };

/* ---- Score Popup state ---- */
interface PopupState {
  text: string | null;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

interface Difficulty {
  name: string;
  blanks: number;
}

/* ---- Constants ---- */
const SIZE = 9;
const BOX_SIZE = 3;
const DIFFICULTY_LEVELS: Difficulty[] = [
  { name: "かんたん", blanks: 30 },
  { name: "ふつう", blanks: 40 },
  { name: "むずかしい", blanks: 50 },
];

/* ---- Game Logic ---- */
function createEmptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null) as (number | null)[]);
}

function isValidPlacement(grid: Grid, row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < SIZE; c++) {
    if (grid[row][c] === num) return false;
  }
  
  // Check column
  for (let r = 0; r < SIZE; r++) {
    if (grid[r][col] === num) return false;
  }
  
  // Check 3x3 box
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  
  return true;
}

function solveSudoku(grid: Grid): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid[row][col] === null) {
        const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of numbers) {
          if (isValidPlacement(grid, row, col, num)) {
            grid[row][col] = num;
            if (solveSudoku(grid)) {
              return true;
            }
            grid[row][col] = null;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// Count solutions (returns 0, 1, or 2 to indicate none, unique, or multiple)
function countSolutions(grid: Grid, limit: number = 2): number {
  let count = 0;
  
  function solve(): boolean {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (grid[row][col] === null) {
          for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(grid, row, col, num)) {
              grid[row][col] = num;
              if (solve()) {
                grid[row][col] = null;
                return true;
              }
              grid[row][col] = null;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }
  
  solve();
  return count;
}

function hasUniqueSolution(grid: Grid): boolean {
  const copy = grid.map(row => [...row]);
  return countSolutions(copy) === 1;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateSudoku(blanks: number): { puzzle: Grid; solution: Grid } {
  // Generate a complete valid sudoku
  const solution = createEmptyGrid();
  solveSudoku(solution);
  
  // Create puzzle by removing numbers while ensuring unique solution
  const puzzle = solution.map(row => [...row]);
  const positions = shuffleArray(
    Array.from({ length: SIZE * SIZE }, (_, i) => [Math.floor(i / SIZE), i % SIZE])
  );
  
  let removed = 0;
  for (const [row, col] of positions) {
    if (removed >= blanks) break;
    
    const backup = puzzle[row][col];
    puzzle[row][col] = null;
    
    // Check if puzzle still has unique solution
    if (hasUniqueSolution(puzzle)) {
      removed++;
    } else {
      // Restore if removing this cell creates multiple solutions
      puzzle[row][col] = backup;
    }
  }
  
  return { puzzle, solution };
}

function isPuzzleComplete(grid: Grid): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid[row][col] === null) return false;
    }
  }
  return true;
}

function isPuzzleCorrect(grid: Grid, solution: Grid): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid[row][col] !== solution[row][col]) return false;
    }
  }
  return true;
}

/* ---- Line Completion Check ---- */
function isRowComplete(grid: Grid, row: number): boolean {
  for (let c = 0; c < SIZE; c++) {
    if (grid[row][c] === null) return false;
  }
  // Check for duplicates
  const seen = new Set<number>();
  for (let c = 0; c < SIZE; c++) {
    const val = grid[row][c]!;
    if (seen.has(val)) return false;
    seen.add(val);
  }
  return true;
}

function isColComplete(grid: Grid, col: number): boolean {
  for (let r = 0; r < SIZE; r++) {
    if (grid[r][col] === null) return false;
  }
  const seen = new Set<number>();
  for (let r = 0; r < SIZE; r++) {
    const val = grid[r][col]!;
    if (seen.has(val)) return false;
    seen.add(val);
  }
  return true;
}

function isBoxComplete(grid: Grid, boxRow: number, boxCol: number): boolean {
  const startRow = boxRow * BOX_SIZE;
  const startCol = boxCol * BOX_SIZE;
  for (let r = startRow; r < startRow + BOX_SIZE; r++) {
    for (let c = startCol; c < startCol + BOX_SIZE; c++) {
      if (grid[r][c] === null) return false;
    }
  }
  const seen = new Set<number>();
  for (let r = startRow; r < startRow + BOX_SIZE; r++) {
    for (let c = startCol; c < startCol + BOX_SIZE; c++) {
      const val = grid[r][c]!;
      if (seen.has(val)) return false;
      seen.add(val);
    }
  }
  return true;
}

/* ---- Component ---- */
export default function App() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [puzzle, setPuzzle] = useState<Grid>(createEmptyGrid);
  const [solution, setSolution] = useState<Grid>(createEmptyGrid);
  const [userGrid, setUserGrid] = useState<Grid>(createEmptyGrid);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highlightedLines, setHighlightedLines] = useState<HighlightedLine[]>([]);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [lastMilestone, setLastMilestone] = useState(0);
  
  /* ---- Score Popup state ---- */
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    x: "50%",
    y: "40%",
    variant: "default",
    size: "md",
  });
  const popupKeyRef = useRef(0);

  const showPopup = useCallback((
    text: string,
    options: { x?: string; y?: string; variant?: PopupVariant; size?: "sm" | "md" | "lg" | "xl" } = {}
  ) => {
    popupKeyRef.current += 1;
    setPopup({
      text,
      key: popupKeyRef.current,
      x: options.x ?? "50%",
      y: options.y ?? "40%",
      variant: options.variant ?? "default",
      size: options.size ?? "md",
    });
  }, []);

  const { playClick, playSuccess, playMiss, playCelebrate, playBonus } = useAudio();
  const { particles, sparkle, confetti, burst } = useParticles();
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filledCount = useMemo(() => {
    return userGrid.flat().filter((cell) => cell !== null).length;
  }, [userGrid]);

  const handleStart = useCallback((index: number) => {
    const difficulty = DIFFICULTY_LEVELS[index];
    setDifficultyIndex(index);
    const { puzzle: newPuzzle, solution: newSolution } = generateSudoku(difficulty.blanks);
    setPuzzle(newPuzzle);
    setSolution(newSolution);
    setUserGrid(newPuzzle.map(row => [...row]));
    setSelectedCell(null);
    setStartTime(Date.now());
    setHintsUsed(0);
    setLastMilestone(0);
    setCurrentTime(0);
    setPhase("playing");
  }, []);

  /* ---- Timer for time milestones ---- */
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setCurrentTime(elapsed);
      
      // Time milestones at 1, 2, 3, 5, 10 minutes
      const milestones = [60, 120, 180, 300, 600];
      for (const milestone of milestones) {
        if (elapsed >= milestone && lastMilestone < milestone) {
          const mins = milestone / 60;
          showPopup(`⏱️ ${mins}分経過！`, { variant: "level", size: "md" });
          setLastMilestone(milestone);
          break;
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, startTime, lastMilestone, showPopup]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (phase !== "playing") return;
    if (puzzle[row][col] !== null) return; // Can't select pre-filled cells
    setSelectedCell({ row, col });
  }, [phase, puzzle]);

  /** Get cell position for particle effects */
  const getCellPosition = useCallback((row: number, col: number) => {
    if (!gridRef.current) return { x: 0, y: 0 };
    const gridRect = gridRef.current.getBoundingClientRect();
    const cellSize = 42; // 40px cell + 2px gap
    const padding = 8;
    return {
      x: gridRect.left + padding + col * cellSize + cellSize / 2,
      y: gridRect.top + padding + row * cellSize + cellSize / 2,
    };
  }, []);

  const handleNumberInput = useCallback((num: number | null) => {
    if (phase !== "playing" || !selectedCell) return;
    const { row, col } = selectedCell;
    if (puzzle[row][col] !== null) return; // Can't modify pre-filled cells

    playClick(); // input sound

    const newGrid = userGrid.map(r => [...r]);
    newGrid[row][col] = num;
    setUserGrid(newGrid);

    // Check if input is correct
    if (num !== null) {
      const isCorrect = num === solution[row][col];
      
      if (isCorrect) {
        // Correct input - sparkle effect + popup
        playSuccess();
        const pos = getCellPosition(row, col);
        sparkle(pos.x, pos.y, 6);
        showPopup("✓", { variant: "default", size: "sm", y: "35%" });

        // Check for line completions
        const newHighlights: HighlightedLine[] = [];
        const boxRow = Math.floor(row / BOX_SIZE);
        const boxCol = Math.floor(col / BOX_SIZE);

        if (isRowComplete(newGrid, row)) {
          newHighlights.push({ type: "row", index: row });
        }
        if (isColComplete(newGrid, col)) {
          newHighlights.push({ type: "col", index: col });
        }
        if (isBoxComplete(newGrid, boxRow, boxCol)) {
          newHighlights.push({ type: "box", index: boxRow * 3 + boxCol });
        }

        if (newHighlights.length > 0) {
          playBonus();
          setHighlightedLines(newHighlights);
          
          // Show completion popup with delay
          setTimeout(() => {
            const messages: string[] = [];
            newHighlights.forEach(line => {
              if (line.type === "row") messages.push(`行${line.index + 1}完成！`);
              else if (line.type === "col") messages.push(`列${line.index + 1}完成！`);
              else messages.push(`ボックス完成！`);
            });
            const size = newHighlights.length > 1 ? "lg" : "md";
            showPopup(messages.join(" "), { variant: "bonus", size });
          }, 100);
          
          // Line completion particles
          newHighlights.forEach(line => {
            if (line.type === "row") {
              for (let c = 0; c < SIZE; c++) {
                const cellPos = getCellPosition(line.index, c);
                setTimeout(() => burst(cellPos.x, cellPos.y, 4), c * 30);
              }
            } else if (line.type === "col") {
              for (let r = 0; r < SIZE; r++) {
                const cellPos = getCellPosition(r, line.index);
                setTimeout(() => burst(cellPos.x, cellPos.y, 4), r * 30);
              }
            } else {
              const bRow = Math.floor(line.index / 3) * 3;
              const bCol = (line.index % 3) * 3;
              let delay = 0;
              for (let r = bRow; r < bRow + 3; r++) {
                for (let c = bCol; c < bCol + 3; c++) {
                  const cellPos = getCellPosition(r, c);
                  setTimeout(() => burst(cellPos.x, cellPos.y, 3), delay * 20);
                  delay++;
                }
              }
            }
          });
          // Clear highlights after animation
          setTimeout(() => setHighlightedLines([]), 800);
        }
      } else {
        // Wrong input - shake + flash
        playMiss();
        shakeRef.current?.shake("light", 200);
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 300);
      }
    }

    // Check puzzle completion
    if (isPuzzleComplete(newGrid) && isPuzzleCorrect(newGrid, solution)) {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      setPhase("cleared");
      // Victory confetti + celebration popup!
      setTimeout(() => {
        playCelebrate();
        showPopup("🎉 パーフェクト！", { variant: "critical", size: "xl" });
        confetti(80);
      }, 200);
    }
  }, [phase, selectedCell, puzzle, userGrid, solution, startTime, playClick, playSuccess, playMiss, playBonus, playCelebrate, sparkle, burst, confetti, getCellPosition, showPopup]);

  const isConflict = useCallback((row: number, col: number): boolean => {
    const value = userGrid[row][col];
    if (value === null) return false;

    // Check row
    for (let c = 0; c < SIZE; c++) {
      if (c !== col && userGrid[row][c] === value) return true;
    }
    // Check column
    for (let r = 0; r < SIZE; r++) {
      if (r !== row && userGrid[r][col] === value) return true;
    }
    // Check box
    const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
      for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
        if ((r !== row || c !== col) && userGrid[r][c] === value) return true;
      }
    }
    return false;
  }, [userGrid]);

  const handleRestart = useCallback(() => {
    handleStart(difficultyIndex);
  }, [handleStart, difficultyIndex]);

  const handleBackToMenu = useCallback(() => {
    setPhase("menu");
    setPuzzle(createEmptyGrid());
    setSolution(createEmptyGrid());
    setUserGrid(createEmptyGrid());
    setSelectedCell(null);
    setHighlightedLines([]);
    setWrongFlash(false);
    setHintsUsed(0);
    setLastMilestone(0);
  }, []);

  /** Use a hint to reveal the correct number for the selected cell */
  const handleHint = useCallback(() => {
    if (phase !== "playing" || !selectedCell) return;
    const { row, col } = selectedCell;
    if (puzzle[row][col] !== null) return; // Can't hint pre-filled cells
    if (userGrid[row][col] === solution[row][col]) return; // Already correct
    
    const newGrid = userGrid.map(r => [...r]);
    newGrid[row][col] = solution[row][col];
    setUserGrid(newGrid);
    setHintsUsed(prev => prev + 1);
    
    // Hint popup
    showPopup(`💡 ヒント使用 (${hintsUsed + 1}回目)`, { variant: "combo", size: "sm", y: "30%" });
    playClick();
    
    const pos = getCellPosition(row, col);
    sparkle(pos.x, pos.y, 4);
    
    // Check puzzle completion after hint
    if (isPuzzleComplete(newGrid) && isPuzzleCorrect(newGrid, solution)) {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      setPhase("cleared");
      setTimeout(() => {
        playCelebrate();
        showPopup("🎉 クリア！", { variant: "critical", size: "xl" });
        confetti(60);
      }, 200);
    }
  }, [phase, selectedCell, puzzle, userGrid, solution, hintsUsed, startTime, playClick, playCelebrate, sparkle, confetti, getCellPosition, showPopup]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /** Check if a cell should be highlighted due to line completion */
  const isHighlighted = useCallback((row: number, col: number): boolean => {
    return highlightedLines.some(line => {
      if (line.type === "row") return line.index === row;
      if (line.type === "col") return line.index === col;
      // box
      const boxRow = Math.floor(row / BOX_SIZE);
      const boxCol = Math.floor(col / BOX_SIZE);
      return line.index === boxRow * 3 + boxCol;
    });
  }, [highlightedLines]);

  return (
    <GameShell gameId="sudoku" layout="default">
      <ScreenShake ref={shakeRef}>
        <div className={`sudoku-container ${wrongFlash ? "sudoku-container--flash" : ""}`}>
          <ParticleLayer particles={particles} />
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            x={popup.x}
            y={popup.y}
            variant={popup.variant}
            size={popup.size}
          />
        {/* Header */}
        <header className="sudoku-header">
          <h1 className="sudoku-title">数独</h1>
        </header>

        {/* Menu Phase */}
        {phase === "menu" && (
          <div className="sudoku-menu">
            <p className="sudoku-description">
              1〜9の数字を入れて
              <br />
              9x9のグリッドを完成させよう！
            </p>
            <div className="sudoku-levels">
              {DIFFICULTY_LEVELS.map((level, index) => (
                <button
                  key={level.name}
                  className="sudoku-level-btn"
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
            <div className="sudoku-stats">
              <div className="sudoku-stat">
                <span className="sudoku-stat-label">完成</span>
                <span className="sudoku-stat-value">{filledCount}/81</span>
              </div>
              <div className="sudoku-stat">
                <span className="sudoku-stat-label">難易度</span>
                <span className="sudoku-stat-value">{DIFFICULTY_LEVELS[difficultyIndex].name}</span>
              </div>
              <div className="sudoku-stat">
                <span className="sudoku-stat-label">時間</span>
                <span className="sudoku-stat-value">{formatTime(currentTime)}</span>
              </div>
              {hintsUsed > 0 && (
                <div className="sudoku-stat">
                  <span className="sudoku-stat-label">ヒント</span>
                  <span className="sudoku-stat-value">{hintsUsed}回</span>
                </div>
              )}
            </div>

            {/* Grid */}
            <div className="sudoku-grid" ref={gridRef}>
              {userGrid.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isOriginal = puzzle[rowIndex][colIndex] !== null;
                  const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                  const hasConflict = !isOriginal && isConflict(rowIndex, colIndex);
                  const cellHighlighted = isHighlighted(rowIndex, colIndex);
                  
                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      className={[
                        "sudoku-cell",
                        isOriginal ? "sudoku-cell--original" : "",
                        isSelected ? "sudoku-cell--selected" : "",
                        hasConflict ? "sudoku-cell--conflict" : "",
                        cellHighlighted ? "sudoku-cell--highlight" : "",
                        colIndex % 3 === 2 && colIndex < 8 ? "sudoku-cell--border-right" : "",
                        rowIndex % 3 === 2 && rowIndex < 8 ? "sudoku-cell--border-bottom" : "",
                      ].filter(Boolean).join(" ")}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      disabled={phase === "cleared" || isOriginal}
                      aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}: ${cell || 'empty'}`}
                    >
                      {cell}
                    </button>
                  );
                })
              )}
            </div>

            {/* Number Pad */}
            {phase === "playing" && (
              <div className="sudoku-numpad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    className="sudoku-numpad-btn"
                    onClick={() => handleNumberInput(num)}
                    disabled={!selectedCell}
                  >
                    {num}
                  </button>
                ))}
                <button
                  className="sudoku-numpad-btn sudoku-numpad-btn--clear"
                  onClick={() => handleNumberInput(null)}
                  disabled={!selectedCell}
                >
                  ✕
                </button>
                <button
                  className="sudoku-numpad-btn sudoku-numpad-btn--hint"
                  onClick={handleHint}
                  disabled={!selectedCell || (selectedCell && puzzle[selectedCell.row][selectedCell.col] !== null)}
                  title="ヒントを使う"
                >
                  💡
                </button>
              </div>
            )}

            {/* Cleared Overlay */}
            {phase === "cleared" && (
              <div className="sudoku-overlay">
                <div className="sudoku-cleared">
                  <h2 className="sudoku-cleared-title">🎉 クリア！</h2>
                  <p className="sudoku-cleared-time">
                    タイム: {formatTime(elapsedTime)}
                  </p>
                  {hintsUsed > 0 && (
                    <p className="sudoku-cleared-hints">
                      ヒント使用: {hintsUsed}回
                    </p>
                  )}
                  <div className="sudoku-cleared-buttons">
                    <button
                      className="sudoku-btn sudoku-btn--primary"
                      onClick={handleRestart}
                    >
                      もう一度
                    </button>
                    <button
                      className="sudoku-btn sudoku-btn--secondary"
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
                className="sudoku-back-btn"
                onClick={handleBackToMenu}
              >
                ← 戻る
              </button>
            )}
          </>
        )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
