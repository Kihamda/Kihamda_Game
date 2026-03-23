import { useCallback, useState, useRef, useEffect } from "react";
import "./App.css";
import { GameShell, useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "start" | "playing" | "result";
type Direction = "across" | "down";

interface ClueWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  number: number;
}

interface CellData {
  letter: string;
  isBlocked: boolean;
  number: number | null;
  acrossClue: number | null;
  downClue: number | null;
}

interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  y: string;
}

interface GameState {
  phase: Phase;
  grid: string[][];
  solution: CellData[][];
  clues: ClueWord[];
  selectedCell: { row: number; col: number } | null;
  selectedDirection: Direction;
  startTime: number;
  endTime: number;
  completedWords: Set<string>; // Track completed word keys
  lastTypedCell: { row: number; col: number } | null; // For scale animation
  hintsUsed: number;
  score: number;
  lastMilestone: number; // Track last time milestone in seconds
}

// ─── Constants & Puzzles ─────────────────────────────────────────────────────

const GRID_SIZE = 5;

// Pre-designed 5x5 puzzles with crossing words
const PUZZLES: { grid: CellData[][]; clues: ClueWord[] }[] = [
  // Puzzle 1: CAT, CUP, TEA, APE, TAP
  {
    grid: createGrid([
      ["C", "A", "T", "#", "#"],
      ["U", "P", "E", "A", "#"],
      ["P", "#", "A", "P", "E"],
      ["#", "#", "#", "#", "#"],
      ["#", "#", "#", "#", "#"],
    ]),
    clues: [
      { word: "CAT", clue: "ニャーと鳴く動物", row: 0, col: 0, direction: "across", number: 1 },
      { word: "CUP", clue: "飲み物を入れる器", row: 0, col: 0, direction: "down", number: 1 },
      { word: "TEA", clue: "緑やウーロンがある飲み物", row: 0, col: 2, direction: "down", number: 2 },
      { word: "APE", clue: "人間に近い霊長類", row: 2, col: 2, direction: "across", number: 3 },
    ],
  },
  // Puzzle 2: DOG, DAD, OAK, GYM
  {
    grid: createGrid([
      ["D", "O", "G", "#", "#"],
      ["A", "A", "Y", "M", "#"],
      ["D", "K", "M", "#", "#"],
      ["#", "#", "#", "#", "#"],
      ["#", "#", "#", "#", "#"],
    ]),
    clues: [
      { word: "DOG", clue: "ワンワンと吠える動物", row: 0, col: 0, direction: "across", number: 1 },
      { word: "DAD", clue: "お父さんの英語", row: 0, col: 0, direction: "down", number: 1 },
      { word: "OAK", clue: "どんぐりがなる木", row: 0, col: 1, direction: "down", number: 2 },
      { word: "GYM", clue: "運動する施設", row: 0, col: 2, direction: "down", number: 3 },
    ],
  },
  // Puzzle 3: SUN, SKY, USE, NET
  {
    grid: createGrid([
      ["S", "U", "N", "#", "#"],
      ["K", "S", "E", "T", "#"],
      ["Y", "E", "T", "#", "#"],
      ["#", "#", "#", "#", "#"],
      ["#", "#", "#", "#", "#"],
    ]),
    clues: [
      { word: "SUN", clue: "昼間に輝く星", row: 0, col: 0, direction: "across", number: 1 },
      { word: "SKY", clue: "雲が浮かぶ場所", row: 0, col: 0, direction: "down", number: 1 },
      { word: "USE", clue: "使うという意味", row: 0, col: 1, direction: "down", number: 2 },
      { word: "NET", clue: "インターネットの略", row: 0, col: 2, direction: "down", number: 3 },
    ],
  },
  // Puzzle 4: RED, RUN, EAR, DEN
  {
    grid: createGrid([
      ["R", "E", "D", "#", "#"],
      ["U", "A", "E", "N", "#"],
      ["N", "R", "N", "#", "#"],
      ["#", "#", "#", "#", "#"],
      ["#", "#", "#", "#", "#"],
    ]),
    clues: [
      { word: "RED", clue: "りんごの色", row: 0, col: 0, direction: "across", number: 1 },
      { word: "RUN", clue: "走るという意味", row: 0, col: 0, direction: "down", number: 1 },
      { word: "EAR", clue: "音を聞く体の部分", row: 0, col: 1, direction: "down", number: 2 },
      { word: "DEN", clue: "動物の巣穴", row: 0, col: 2, direction: "down", number: 3 },
    ],
  },
  // Puzzle 5: BIG, BAT, ICE, GOT
  {
    grid: createGrid([
      ["B", "I", "G", "#", "#"],
      ["A", "C", "O", "T", "#"],
      ["T", "E", "T", "#", "#"],
      ["#", "#", "#", "#", "#"],
      ["#", "#", "#", "#", "#"],
    ]),
    clues: [
      { word: "BIG", clue: "大きいという意味", row: 0, col: 0, direction: "across", number: 1 },
      { word: "BAT", clue: "夜に飛ぶ動物/野球の道具", row: 0, col: 0, direction: "down", number: 1 },
      { word: "ICE", clue: "凍った水", row: 0, col: 1, direction: "down", number: 2 },
      { word: "GOT", clue: "getの過去形", row: 0, col: 2, direction: "down", number: 3 },
    ],
  },
];

function createGrid(letters: string[][]): CellData[][] {
  const grid: CellData[][] = [];
  let num = 1;

  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const letter = letters[row]?.[col] || "#";
      const isBlocked = letter === "#";

      // Determine if this cell needs a number
      let needsNumber = false;
      if (!isBlocked) {
        // Start of horizontal word
        const leftBlocked = col === 0 || letters[row][col - 1] === "#";
        const rightExists = col < GRID_SIZE - 1 && letters[row][col + 1] !== "#";
        // Start of vertical word
        const topBlocked = row === 0 || letters[row - 1][col] === "#";
        const bottomExists = row < GRID_SIZE - 1 && letters[row + 1]?.[col] !== "#";

        if ((leftBlocked && rightExists) || (topBlocked && bottomExists)) {
          needsNumber = true;
        }
      }

      grid[row][col] = {
        letter: isBlocked ? "" : letter,
        isBlocked,
        number: needsNumber ? num++ : null,
        acrossClue: null,
        downClue: null,
      };
    }
  }

  return grid;
}

function getRandomPuzzle(): { grid: CellData[][]; clues: ClueWord[] } {
  return PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
}

function createEmptyUserGrid(solution: CellData[][]): string[][] {
  return solution.map((row) => row.map((cell) => (cell.isBlocked ? "#" : "")));
}

function checkCompletion(grid: string[][], solution: CellData[][]): boolean {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!solution[row][col].isBlocked) {
        if (grid[row][col].toUpperCase() !== solution[row][col].letter) {
          return false;
        }
      }
    }
  }
  return true;
}

/** Check if a specific word is completed */
function checkWordComplete(
  grid: string[][],
  clue: ClueWord
): boolean {
  for (let i = 0; i < clue.word.length; i++) {
    const row = clue.direction === "across" ? clue.row : clue.row + i;
    const col = clue.direction === "across" ? clue.col + i : clue.col;
    if (grid[row]?.[col]?.toUpperCase() !== clue.word[i]) {
      return false;
    }
  }
  return true;
}

/** Get word key for tracking */
function getWordKey(clue: ClueWord): string {
  return `${clue.direction}-${clue.number}`;
}

/** Calculate progress percentage */
function calculateProgress(grid: string[][], solution: CellData[][]): number {
  let filled = 0;
  let total = 0;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!solution[row][col].isBlocked) {
        total++;
        if (grid[row][col] && grid[row][col].toUpperCase() === solution[row][col].letter) {
          filled++;
        }
      }
    }
  }
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// ─── Components ──────────────────────────────────────────────────────────────

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="start-screen">
      <h1>📝 クロスワード</h1>
      <p className="subtitle">Crossword Puzzle</p>

      <div className="rules">
        <h3>📖 遊び方</h3>
        <ul>
          <li>ヒントを見て<strong>単語</strong>を入力しよう</li>
          <li>マスをクリックして<strong>入力</strong></li>
          <li>全部埋めたら<strong>クリア</strong>！</li>
          <li>英単語は<strong>大文字</strong>で入力</li>
        </ul>
      </div>

      <button className="start-btn" onClick={onStart}>
        スタート
      </button>
    </div>
  );
}

function CrosswordGrid({
  grid,
  solution,
  selectedCell,
  selectedDirection,
  completedWords,
  clues,
  lastTypedCell,
  onCellClick,
}: {
  grid: string[][];
  solution: CellData[][];
  selectedCell: { row: number; col: number } | null;
  selectedDirection: Direction;
  completedWords: Set<string>;
  clues: ClueWord[];
  lastTypedCell: { row: number; col: number } | null;
  onCellClick: (row: number, col: number) => void;
}) {
  // Check if cell is part of a completed word
  const isCellInCompletedWord = (rowIdx: number, colIdx: number): boolean => {
    return clues.some((clue) => {
      if (!completedWords.has(getWordKey(clue))) return false;
      for (let i = 0; i < clue.word.length; i++) {
        const r = clue.direction === "across" ? clue.row : clue.row + i;
        const c = clue.direction === "across" ? clue.col + i : clue.col;
        if (r === rowIdx && c === colIdx) return true;
      }
      return false;
    });
  };

  return (
    <div className="crossword-grid">
      {solution.map((row, rowIdx) => (
        <div key={rowIdx} className="crossword-row">
          {row.map((cell, colIdx) => {
            const isSelected =
              selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
            const isInWord =
              selectedCell &&
              !cell.isBlocked &&
              isInSelectedWord(rowIdx, colIdx, selectedCell, selectedDirection, solution);
            const userLetter = grid[rowIdx][colIdx];
            const isCorrect =
              userLetter && userLetter.toUpperCase() === cell.letter;
            const isWrong = userLetter && !isCorrect;
            const isCompleted = isCellInCompletedWord(rowIdx, colIdx);
            const isJustTyped =
              lastTypedCell?.row === rowIdx && lastTypedCell?.col === colIdx;

            return (
              <div
                key={colIdx}
                className={`crossword-cell ${cell.isBlocked ? "blocked" : ""} ${isSelected ? "selected" : ""} ${isInWord ? "in-word" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""} ${isCompleted ? "completed" : ""} ${isJustTyped ? "just-typed" : ""}`}
                onClick={() => !cell.isBlocked && onCellClick(rowIdx, colIdx)}
              >
                {cell.number && <span className="cell-number">{cell.number}</span>}
                {!cell.isBlocked && <span className="cell-letter">{userLetter}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function isInSelectedWord(
  row: number,
  col: number,
  selectedCell: { row: number; col: number },
  direction: Direction,
  solution: CellData[][]
): boolean {
  if (direction === "across") {
    if (row !== selectedCell.row) return false;
    // Find word start
    let start = selectedCell.col;
    while (start > 0 && !solution[row][start - 1].isBlocked) start--;
    // Find word end
    let end = selectedCell.col;
    while (end < GRID_SIZE - 1 && !solution[row][end + 1].isBlocked) end++;
    return col >= start && col <= end;
  } else {
    if (col !== selectedCell.col) return false;
    // Find word start
    let start = selectedCell.row;
    while (start > 0 && !solution[start - 1][col].isBlocked) start--;
    // Find word end
    let end = selectedCell.row;
    while (end < GRID_SIZE - 1 && !solution[end + 1][col].isBlocked) end++;
    return row >= start && row <= end;
  }
}

function ClueList({
  clues,
  direction,
  selectedCell,
  completedWords,
}: {
  clues: ClueWord[];
  direction: Direction;
  selectedCell: { row: number; col: number } | null;
  solution: CellData[][];
  completedWords: Set<string>;
}) {
  const filteredClues = clues.filter((c) => c.direction === direction);

  const isClueActive = (clue: ClueWord): boolean => {
    if (!selectedCell) return false;
    const { row, col } = selectedCell;
    if (clue.direction === "across") {
      if (row !== clue.row) return false;
      const start = clue.col;
      const end = clue.col + clue.word.length - 1;
      return col >= start && col <= end;
    } else {
      if (col !== clue.col) return false;
      const start = clue.row;
      const end = clue.row + clue.word.length - 1;
      return row >= start && row <= end;
    }
  };

  return (
    <div className="clue-section">
      <h4>{direction === "across" ? "→ ヨコ" : "↓ タテ"}</h4>
      <ul>
        {filteredClues.map((clue, idx) => {
          const isCompleted = completedWords.has(getWordKey(clue));
          return (
            <li
              key={`${clue.direction}-${clue.number}`}
              className={`${isClueActive(clue) ? "active" : ""} ${isCompleted ? "completed" : ""} clue-fade-in`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <span className="clue-number">{clue.number}.</span> {clue.clue}
              {isCompleted && <span className="clue-check">✓</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResultScreen({
  time,
  score,
  hintsUsed,
  onRetry,
  onHome,
}: {
  time: number;
  score: number;
  hintsUsed: number;
  onRetry: () => void;
  onHome: () => void;
}) {
  return (
    <div className="result-screen">
      <h2>🎉 クリア！</h2>
      <div className="result-emoji">🏆</div>
      
      <div className="result-stats">
        <div className="stat-row">
          <span className="stat-label">クリアタイム</span>
          <span className="stat-value">{formatTime(time)}</span>
        </div>
        <div className="stat-row highlight">
          <span className="stat-label">スコア</span>
          <span className="stat-value">{score}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">ヒント使用</span>
          <span className="stat-value">{hintsUsed}回</span>
        </div>
      </div>

      <div className="result-buttons">
        <button className="retry-btn" onClick={onRetry}>
          もう一度
        </button>
        <button className="home-btn" onClick={onHome}>
          タイトルへ
        </button>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { playClick, playSuccess, playCelebrate, playTone } = useAudio();
  const { particles, sparkle, confetti } = useParticles();

  const [state, setState] = useState<GameState>(() => {
    const puzzle = getRandomPuzzle();
    return {
      phase: "start",
      grid: createEmptyUserGrid(puzzle.grid),
      solution: puzzle.grid,
      clues: puzzle.clues,
      selectedCell: null,
      selectedDirection: "across",
      startTime: 0,
      endTime: 0,
      completedWords: new Set<string>(),
      lastTypedCell: null,
      hintsUsed: 0,
      score: 0,
      lastMilestone: 0,
    };
  });

  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    variant: "default",
    y: "40%",
  });

  const showPopup = useCallback((text: string, variant: PopupVariant = "default", y: string = "40%") => {
    setPopup((prev) => ({ text, key: prev.key + 1, variant, y }));
  }, []);

  // Clear lastTypedCell after animation
  useEffect(() => {
    if (state.lastTypedCell) {
      const timer = setTimeout(() => {
        setState((prev) => ({ ...prev, lastTypedCell: null }));
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [state.lastTypedCell]);

  useEffect(() => {
    if (state.phase === "playing" && state.selectedCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.phase, state.selectedCell]);

  // Confetti on puzzle complete
  useEffect(() => {
    if (state.phase === "result") {
      confetti(80);
      playCelebrate();
    }
  }, [state.phase, confetti, playCelebrate]);

  /** Get cell position for sparkle effect */
  const getCellCenter = useCallback((row: number, col: number): { x: number; y: number } | null => {
    if (!gridRef.current) return null;
    const gridRect = gridRef.current.getBoundingClientRect();
    const cellSize = 52; // 50px + 2px gap
    const x = gridRect.left + col * cellSize + cellSize / 2;
    const y = gridRect.top + row * cellSize + cellSize / 2;
    return { x, y };
  }, []);

  const startGame = useCallback(() => {
    const puzzle = getRandomPuzzle();
    playClick();
    setState({
      phase: "playing",
      grid: createEmptyUserGrid(puzzle.grid),
      solution: puzzle.grid,
      clues: puzzle.clues,
      selectedCell: { row: 0, col: 0 },
      selectedDirection: "across",
      startTime: Date.now(),
      endTime: 0,
      completedWords: new Set<string>(),
      lastTypedCell: null,
      hintsUsed: 0,
      score: 0,
      lastMilestone: 0,
    });
  }, [playClick]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      playClick();
      setState((prev) => {
        // If clicking same cell, toggle direction
        if (prev.selectedCell?.row === row && prev.selectedCell?.col === col) {
          return {
            ...prev,
            selectedDirection: prev.selectedDirection === "across" ? "down" : "across",
          };
        }
        return {
          ...prev,
          selectedCell: { row, col },
        };
      });
    },
    [playClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (state.phase !== "playing" || !state.selectedCell) return;

      const { row, col } = state.selectedCell;
      const key = e.key.toUpperCase();

      if (key.length === 1 && key >= "A" && key <= "Z") {
        e.preventDefault();
        
        // Play type sound
        playTone(660 + Math.random() * 100, 0.05, "sine", 0.15);

        setState((prev) => {
          const newGrid = prev.grid.map((r) => [...r]);
          newGrid[row][col] = key;

          // Check for newly completed words
          const newCompletedWords = new Set(prev.completedWords);
          let wordJustCompleted = false;
          let wordsCompletedThisTurn = 0;
          let scoreGained = 0;

          for (const clue of prev.clues) {
            const wordKey = getWordKey(clue);
            if (!prev.completedWords.has(wordKey) && checkWordComplete(newGrid, clue)) {
              newCompletedWords.add(wordKey);
              wordJustCompleted = true;
              wordsCompletedThisTurn++;
              
              // Score based on word length
              const wordScore = clue.word.length * 10;
              scoreGained += wordScore;

              // Sparkle effect on word completion
              const midIdx = Math.floor(clue.word.length / 2);
              const sparkleRow = clue.direction === "across" ? clue.row : clue.row + midIdx;
              const sparkleCol = clue.direction === "across" ? clue.col + midIdx : clue.col;
              const pos = getCellCenter(sparkleRow, sparkleCol);
              if (pos) {
                setTimeout(() => sparkle(pos.x, pos.y, 12), 50);
              }
            }
          }

          // Play word complete sound and show popup
          if (wordJustCompleted) {
            setTimeout(() => playSuccess(), 50);
            // Show popup with bonus for multiple words
            const variant: PopupVariant = wordsCompletedThisTurn > 1 ? "combo" : "bonus";
            const bonusText = wordsCompletedThisTurn > 1 
              ? `+${scoreGained} x${wordsCompletedThisTurn}コンボ!` 
              : `+${scoreGained}`;
            setTimeout(() => showPopup(bonusText, variant, "35%"), 100);
          }

          const newScore = prev.score + scoreGained;

          // Check full completion
          if (checkCompletion(newGrid, prev.solution)) {
            const clearTime = Date.now() - prev.startTime;
            const timeBonus = Math.max(0, 300 - Math.floor(clearTime / 1000)) * 2;
            const finalScore = newScore + timeBonus + 100; // +100 completion bonus
            
            setTimeout(() => {
              showPopup(`🎉 クリアボーナス +${100 + timeBonus}`, "critical", "30%");
            }, 200);
            
            return {
              ...prev,
              grid: newGrid,
              phase: "result" as Phase,
              endTime: Date.now(),
              completedWords: newCompletedWords,
              lastTypedCell: { row, col },
              score: finalScore,
            };
          }

          // Move to next cell
          let nextRow = row;
          let nextCol = col;
          if (prev.selectedDirection === "across") {
            nextCol = col + 1;
            while (nextCol < GRID_SIZE && prev.solution[row][nextCol].isBlocked) {
              nextCol++;
            }
            if (nextCol >= GRID_SIZE) nextCol = col;
          } else {
            nextRow = row + 1;
            while (nextRow < GRID_SIZE && prev.solution[nextRow][col].isBlocked) {
              nextRow++;
            }
            if (nextRow >= GRID_SIZE) nextRow = row;
          }

          return {
            ...prev,
            grid: newGrid,
            selectedCell: { row: nextRow, col: nextCol },
            completedWords: newCompletedWords,
            lastTypedCell: { row, col },
            score: newScore,
          };
        });
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setState((prev) => {
          const newGrid = prev.grid.map((r) => [...r]);
          if (newGrid[row][col]) {
            newGrid[row][col] = "";
          } else {
            // Move back and delete
            let prevRow = row;
            let prevCol = col;
            if (prev.selectedDirection === "across") {
              prevCol = col - 1;
              while (prevCol >= 0 && prev.solution[row][prevCol].isBlocked) {
                prevCol--;
              }
              if (prevCol >= 0) {
                newGrid[row][prevCol] = "";
              }
            } else {
              prevRow = row - 1;
              while (prevRow >= 0 && prev.solution[prevRow][col].isBlocked) {
                prevRow--;
              }
              if (prevRow >= 0) {
                newGrid[prevRow][col] = "";
              }
            }
            if (prevCol >= 0 && prevRow >= 0) {
              return {
                ...prev,
                grid: newGrid,
                selectedCell: { row: prevRow, col: prevCol },
              };
            }
          }
          return { ...prev, grid: newGrid };
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setState((prev) => {
          let next = col + 1;
          while (next < GRID_SIZE && prev.solution[row][next].isBlocked) next++;
          if (next < GRID_SIZE) {
            return { ...prev, selectedCell: { row, col: next }, selectedDirection: "across" };
          }
          return prev;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setState((prev) => {
          let next = col - 1;
          while (next >= 0 && prev.solution[row][next].isBlocked) next--;
          if (next >= 0) {
            return { ...prev, selectedCell: { row, col: next }, selectedDirection: "across" };
          }
          return prev;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setState((prev) => {
          let next = row + 1;
          while (next < GRID_SIZE && prev.solution[next][col].isBlocked) next++;
          if (next < GRID_SIZE) {
            return { ...prev, selectedCell: { row: next, col }, selectedDirection: "down" };
          }
          return prev;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setState((prev) => {
          let next = row - 1;
          while (next >= 0 && prev.solution[next][col].isBlocked) next--;
          if (next >= 0) {
            return { ...prev, selectedCell: { row: next, col }, selectedDirection: "down" };
          }
          return prev;
        });
      } else if (e.key === "Tab") {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          selectedDirection: prev.selectedDirection === "across" ? "down" : "across",
        }));
      }
    },
    [state.phase, state.selectedCell, playTone, playSuccess, sparkle, getCellCenter, showPopup]
  );

  // Hint function - reveals one letter with penalty
  const useHint = useCallback(() => {
    if (state.phase !== "playing" || !state.selectedCell) return;
    
    const { row, col } = state.selectedCell;
    const correctLetter = state.solution[row][col].letter;
    const currentLetter = state.grid[row][col];
    
    // Already correct, no hint needed
    if (currentLetter.toUpperCase() === correctLetter) {
      showPopup("すでに正解!", "default", "35%");
      return;
    }
    
    playTone(300, 0.1, "triangle", 0.2);
    
    setState((prev) => {
      const newGrid = prev.grid.map((r) => [...r]);
      newGrid[row][col] = correctLetter;
      
      // Check if this completes any words
      const newCompletedWords = new Set(prev.completedWords);
      for (const clue of prev.clues) {
        const wordKey = getWordKey(clue);
        if (!prev.completedWords.has(wordKey) && checkWordComplete(newGrid, clue)) {
          newCompletedWords.add(wordKey);
        }
      }
      
      // Check full completion
      if (checkCompletion(newGrid, prev.solution)) {
        return {
          ...prev,
          grid: newGrid,
          phase: "result" as Phase,
          endTime: Date.now(),
          completedWords: newCompletedWords,
          hintsUsed: prev.hintsUsed + 1,
          score: Math.max(0, prev.score - 15),
        };
      }
      
      return {
        ...prev,
        grid: newGrid,
        completedWords: newCompletedWords,
        hintsUsed: prev.hintsUsed + 1,
        score: Math.max(0, prev.score - 15),
      };
    });
    
    showPopup("-15 ヒント使用", "default", "35%");
  }, [state.phase, state.selectedCell, state.solution, state.grid, playTone, showPopup]);

  // Time milestone tracking
  useEffect(() => {
    if (state.phase !== "playing") return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      const milestone = Math.floor(elapsed / 30) * 30; // Every 30 seconds
      
      if (milestone > 0 && milestone !== state.lastMilestone && milestone <= 90) {
        setState((prev) => ({ ...prev, lastMilestone: milestone }));
        if (milestone === 30) {
          showPopup("⏱️ 30秒経過！", "default", "25%");
        } else if (milestone === 60) {
          showPopup("⏱️ 1分経過！急げ！", "combo", "25%");
        } else if (milestone === 90) {
          showPopup("⏱️ 90秒経過！", "critical", "25%");
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [state.phase, state.startTime, state.lastMilestone, showPopup]);

  const goToStart = useCallback(() => {
    const puzzle = getRandomPuzzle();
    setState({
      phase: "start",
      grid: createEmptyUserGrid(puzzle.grid),
      solution: puzzle.grid,
      clues: puzzle.clues,
      selectedCell: null,
      selectedDirection: "across",
      startTime: 0,
      endTime: 0,
      completedWords: new Set<string>(),
      lastTypedCell: null,
      hintsUsed: 0,
      score: 0,
      lastMilestone: 0,
    });
  }, []);

  const progress = state.phase === "playing" ? calculateProgress(state.grid, state.solution) : 0;

  return (
    <GameShell gameId="crossword" layout="default">
      <div className="crossword-container" tabIndex={0} onKeyDown={handleKeyDown}>
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          y={popup.y}
        />
        
        {/* Hidden input for mobile keyboard */}
        <input
          ref={inputRef}
          className="hidden-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
        />

        {state.phase === "start" && <StartScreen onStart={startGame} />}

        {state.phase === "playing" && (
          <div className="game-layout">
            {/* Score and Progress Bar */}
            <div className="status-bar">
              <div className="score-display">
                <span className="score-label">スコア:</span>
                <span className="score-value">{state.score}</span>
              </div>
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="progress-text">{progress}%</span>
              </div>
            </div>

            <div className="grid-section">
              <div ref={gridRef}>
                <CrosswordGrid
                  grid={state.grid}
                  solution={state.solution}
                  selectedCell={state.selectedCell}
                  selectedDirection={state.selectedDirection}
                  completedWords={state.completedWords}
                  clues={state.clues}
                  lastTypedCell={state.lastTypedCell}
                  onCellClick={handleCellClick}
                />
              </div>
              <div className="grid-controls">
                <div className="direction-hint">
                  {state.selectedDirection === "across" ? "→ ヨコ入力中" : "↓ タテ入力中"}
                  <span className="hint-small">（Tabで切替）</span>
                </div>
                <button className="hint-btn" onClick={useHint} disabled={!state.selectedCell}>
                  💡 ヒント (-15pt)
                </button>
              </div>
            </div>
            <div className="clues-section">
              <ClueList
                clues={state.clues}
                direction="across"
                selectedCell={state.selectedCell}
                solution={state.solution}
                completedWords={state.completedWords}
              />
              <ClueList
                clues={state.clues}
                direction="down"
                selectedCell={state.selectedCell}
                solution={state.solution}
                completedWords={state.completedWords}
              />
            </div>
          </div>
        )}

        {state.phase === "result" && (
          <ResultScreen
            time={state.endTime - state.startTime}
            score={state.score}
            hintsUsed={state.hintsUsed}
            onRetry={startGame}
            onHome={goToStart}
          />
        )}
      </div>
    </GameShell>
  );
}
