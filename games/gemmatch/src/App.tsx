import { useState, useCallback, useEffect, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { ComboCounter } from "@shared/components/ComboCounter";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import "./App.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Phase = "before" | "playing" | "after";

interface Gem {
  id: number;
  type: number;
  row: number;
  col: number;
  removing?: boolean;
  falling?: boolean;
}

interface SwapAnim {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

interface PopupInfo {
  text: string;
  key: number;
  x: string;
  y: string;
  variant: "default" | "combo" | "bonus" | "critical";
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const GRID_SIZE = 8;
const GEM_TYPES = 6;
const GAME_DURATION = 90; // seconds
const MATCH_SCORE = 10;

const GEM_COLORS = [
  { bg: "#ef4444", emoji: "💎", particle: "#ff6b6b" }, // Red
  { bg: "#22c55e", emoji: "💚", particle: "#4ade80" }, // Green
  { bg: "#3b82f6", emoji: "💙", particle: "#60a5fa" }, // Blue
  { bg: "#eab308", emoji: "💛", particle: "#facc15" }, // Yellow
  { bg: "#a855f7", emoji: "💜", particle: "#c084fc" }, // Purple
  { bg: "#f97316", emoji: "🧡", particle: "#fb923c" }, // Orange
];

// ─────────────────────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────────────────────

let gemIdCounter = 0;

function createGem(type: number, row: number, col: number): Gem {
  return { id: gemIdCounter++, type, row, col };
}

function randomGemType(): number {
  return Math.floor(Math.random() * GEM_TYPES);
}

function createInitialGrid(): Gem[][] {
  const grid: Gem[][] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const rowGems: Gem[] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      let type: number;
      do {
        type = randomGemType();
      } while (wouldMatch(grid, rowGems, type, row, col));
      rowGems.push(createGem(type, row, col));
    }
    grid.push(rowGems);
  }
  return grid;
}

function wouldMatch(
  grid: Gem[][],
  currentRow: Gem[],
  type: number,
  row: number,
  col: number
): boolean {
  // Check horizontal
  if (col >= 2) {
    if (
      currentRow[col - 1]?.type === type &&
      currentRow[col - 2]?.type === type
    ) {
      return true;
    }
  }
  // Check vertical
  if (row >= 2) {
    if (
      grid[row - 1]?.[col]?.type === type &&
      grid[row - 2]?.[col]?.type === type
    ) {
      return true;
    }
  }
  return false;
}

function areAdjacent(
  r1: number,
  c1: number,
  r2: number,
  c2: number
): boolean {
  const rowDiff = Math.abs(r1 - r2);
  const colDiff = Math.abs(c1 - c2);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

function swapGems(grid: Gem[][], r1: number, c1: number, r2: number, c2: number): Gem[][] {
  const newGrid = grid.map((row) => row.map((gem) => ({ ...gem })));
  const temp = newGrid[r1][c1];
  newGrid[r1][c1] = { ...newGrid[r2][c2], row: r1, col: c1 };
  newGrid[r2][c2] = { ...temp, row: r2, col: c2 };
  return newGrid;
}

function findMatches(grid: Gem[][]): Set<string> {
  const matches = new Set<string>();

  // Horizontal matches
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 2; col++) {
      const type = grid[row][col].type;
      if (type === grid[row][col + 1].type && type === grid[row][col + 2].type) {
        let end = col + 2;
        while (end + 1 < GRID_SIZE && grid[row][end + 1].type === type) {
          end++;
        }
        for (let c = col; c <= end; c++) {
          matches.add(`${row},${c}`);
        }
        col = end;
      }
    }
  }

  // Vertical matches
  for (let col = 0; col < GRID_SIZE; col++) {
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      const type = grid[row][col].type;
      if (type === grid[row + 1][col].type && type === grid[row + 2][col].type) {
        let end = row + 2;
        while (end + 1 < GRID_SIZE && grid[end + 1][col].type === type) {
          end++;
        }
        for (let r = row; r <= end; r++) {
          matches.add(`${r},${col}`);
        }
        row = end;
      }
    }
  }

  return matches;
}

function removeMatches(grid: Gem[][], matches: Set<string>): Gem[][] {
  return grid.map((row, r) =>
    row.map((gem, c) => ({
      ...gem,
      removing: matches.has(`${r},${c}`),
    }))
  );
}

function dropAndFill(grid: Gem[][]): Gem[][] {
  const newGrid: Gem[][] = Array.from({ length: GRID_SIZE }, () => []);

  for (let col = 0; col < GRID_SIZE; col++) {
    const remaining: Gem[] = [];
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (!grid[row][col].removing) {
        remaining.push(grid[row][col]);
      }
    }

    const needed = GRID_SIZE - remaining.length;
    for (let i = 0; i < needed; i++) {
      remaining.push(createGem(randomGemType(), -1 - i, col));
    }

    remaining.reverse();
    for (let row = 0; row < GRID_SIZE; row++) {
      const gem = remaining[row];
      newGrid[row][col] = {
        ...gem,
        row,
        col,
        removing: false,
        falling: gem.row !== row,
      };
    }
  }

  return newGrid;
}

function hasValidMoves(grid: Gem[][]): boolean {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Try swap right
      if (col < GRID_SIZE - 1) {
        const swapped = swapGems(grid, row, col, row, col + 1);
        if (findMatches(swapped).size > 0) return true;
      }
      // Try swap down
      if (row < GRID_SIZE - 1) {
        const swapped = swapGems(grid, row, col, row + 1, col);
        if (findMatches(swapped).size > 0) return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState<Phase>("before");
  const [grid, setGrid] = useState<Gem[][]>(() => createInitialGrid());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [swapAnim, setSwapAnim] = useState<SwapAnim | null>(null);
  const [combo, setCombo] = useState(0);
  const [popups, setPopups] = useState<PopupInfo[]>([]);
  const timerRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const popupKeyRef = useRef(0);

  const { particles, burst, sparkle, explosion, clear: clearParticles } = useParticles();
  const { playTone, playSweep, playArpeggio, playCombo: playComboSound, playBonus } = useAudio();

  // ジェム座標からボード内座標を取得
  const getGemPosition = useCallback((row: number, col: number) => {
    const x = col * 50 + 25;
    const y = row * 50 + 25;
    return { x, y };
  }, []);

  // スコアポップアップ追加
  const addPopup = useCallback((text: string, row: number, col: number, variant: PopupInfo["variant"] = "default") => {
    const pos = getGemPosition(row, col);
    const newPopup: PopupInfo = {
      text,
      key: ++popupKeyRef.current,
      x: `${pos.x}px`,
      y: `${pos.y}px`,
      variant,
    };
    setPopups(prev => [...prev, newPopup]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.key !== newPopup.key));
    }, 1200);
  }, [getGemPosition]);

  // 効果音
  const playSwapSound = useCallback(() => {
    playTone(440, 0.08, "sine", 0.15);
    playTone(550, 0.08, "sine", 0.15, 0.04);
  }, [playTone]);

  const playMatchSound = useCallback((matchCount: number) => {
    if (matchCount >= 4) {
      // Big match - 華やかな音
      playArpeggio([660, 880, 1100], 0.12, "sine", 0.2, 0.05);
    } else {
      // Normal match
      playTone(660, 0.1, "sine", 0.18);
      playTone(880, 0.08, "sine", 0.15, 0.06);
    }
  }, [playTone, playArpeggio]);

  const playBigMatchSound = useCallback(() => {
    playBonus();
    playSweep(600, 1200, 0.3, "sine", 0.2);
  }, [playBonus, playSweep]);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("after");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const start = useCallback(() => {
    gemIdCounter = 0;
    setGrid(createInitialGrid());
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setSelected(null);
    setIsProcessing(false);
    setSwapAnim(null);
    setCombo(0);
    setPopups([]);
    clearParticles();
    setPhase("playing");
  }, [clearParticles]);

  const processMatches = useCallback(async (currentGrid: Gem[][]) => {
    let workingGrid = currentGrid;
    let totalScore = 0;
    let chainCount = 0;

    while (true) {
      const matches = findMatches(workingGrid);
      if (matches.size === 0) break;

      chainCount++;
      const matchMultiplier = chainCount;
      const matchScore = matches.size * MATCH_SCORE * matchMultiplier;
      totalScore += matchScore;

      // コンボ更新
      setCombo(chainCount);

      // マッチしたジェムの位置を収集
      const matchedGems: { row: number; col: number; type: number }[] = [];
      matches.forEach(key => {
        const [r, c] = key.split(",").map(Number);
        matchedGems.push({ row: r, col: c, type: workingGrid[r][c].type });
      });

      // サウンド
      if (matches.size >= 4) {
        playBigMatchSound();
      } else {
        playMatchSound(matches.size);
      }

      // コンボサウンド（2連鎖以降）
      if (chainCount >= 2) {
        playComboSound(chainCount);
      }

      // パーティクル生成
      matchedGems.forEach(({ row, col }) => {
        const pos = getGemPosition(row, col);
        
        if (matches.size >= 4) {
          // 4つ以上は特大エフェクト
          explosion(pos.x, pos.y, 16);
        } else {
          // 通常のキラキラ
          sparkle(pos.x, pos.y, 6);
        }
        // バースト
        burst(pos.x, pos.y, 8);
      });

      // スコアポップアップ
      const centerGem = matchedGems[Math.floor(matchedGems.length / 2)];
      if (chainCount >= 3) {
        addPopup(`+${matchScore} COMBO!`, centerGem.row, centerGem.col, "critical");
      } else if (chainCount >= 2) {
        addPopup(`+${matchScore} x${chainCount}`, centerGem.row, centerGem.col, "combo");
      } else if (matches.size >= 4) {
        addPopup(`+${matchScore} BIG!`, centerGem.row, centerGem.col, "bonus");
      } else {
        addPopup(`+${matchScore}`, centerGem.row, centerGem.col, "default");
      }

      // Mark for removal
      workingGrid = removeMatches(workingGrid, matches);
      setGrid([...workingGrid]);

      await new Promise((r) => setTimeout(r, 250));

      // Drop and fill
      workingGrid = dropAndFill(workingGrid);
      setGrid([...workingGrid]);

      await new Promise((r) => setTimeout(r, 300));
    }

    setScore((s) => s + totalScore);
    setCombo(0);
    
    // Check for valid moves, regenerate if none
    if (!hasValidMoves(workingGrid)) {
      // Show notification before regenerating (use center position)
      addPopup("💫 新しいボード!", 3, 3, "bonus");
      await new Promise((r) => setTimeout(r, 500));
      setGrid(createInitialGrid());
    }

    setIsProcessing(false);
  }, [playMatchSound, playBigMatchSound, playComboSound, getGemPosition, sparkle, explosion, burst, addPopup]);

  const handleGemClick = useCallback(
    (row: number, col: number) => {
      if (phase !== "playing" || isProcessing) return;

      if (!selected) {
        setSelected({ row, col });
        return;
      }

      if (selected.row === row && selected.col === col) {
        setSelected(null);
        return;
      }

      if (!areAdjacent(selected.row, selected.col, row, col)) {
        setSelected({ row, col });
        return;
      }

      // スワップアニメーション開始
      setSwapAnim({
        from: { row: selected.row, col: selected.col },
        to: { row, col },
      });
      playSwapSound();

      // Try swap
      const swapped = swapGems(grid, selected.row, selected.col, row, col);
      const matches = findMatches(swapped);

      if (matches.size === 0) {
        // Invalid move - swap back after animation
        setTimeout(() => {
          setSwapAnim(null);
        }, 200);
        setSelected(null);
        return;
      }

      setSelected(null);
      setIsProcessing(true);
      
      // アニメーション完了後にグリッド更新
      setTimeout(() => {
        setSwapAnim(null);
        setGrid(swapped);
        processMatches(swapped);
      }, 200);
    },
    [phase, isProcessing, selected, grid, processMatches, playSwapSound]
  );

  // スワップアニメーション用のスタイル計算
  const getSwapOffset = useCallback((row: number, col: number): { dx: number; dy: number } => {
    if (!swapAnim) return { dx: 0, dy: 0 };
    
    const { from, to } = swapAnim;
    if (row === from.row && col === from.col) {
      return {
        dx: (to.col - from.col) * 50,
        dy: (to.row - from.row) * 50,
      };
    }
    if (row === to.row && col === to.col) {
      return {
        dx: (from.col - to.col) * 50,
        dy: (from.row - to.row) * 50,
      };
    }
    return { dx: 0, dy: 0 };
  }, [swapAnim]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <GameShell gameId="gemmatch" layout="default">
      <div className="gm-root">
        {phase === "before" && (
          <div className="gm-screen">
            <h1 className="gm-title">💎 ジェムマッチ</h1>
            <p className="gm-desc">隣接ジェムを入れ替えて3つ以上揃えよう</p>
            <div className="gm-rules">
              <p>• 隣り合うジェムをタップして入れ替え</p>
              <p>• 同じ色を3つ以上並べると消える</p>
              <p>• 制限時間 {GAME_DURATION}秒</p>
            </div>
            <button className="gm-btn gm-btn--start" onClick={start}>
              スタート
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="gm-game">
            <div className="gm-hud">
              <span className="gm-score">Score: {score}</span>
              <span className="gm-time">{formatTime(timeLeft)}</span>
            </div>
            <div className="gm-board" ref={boardRef}>
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
              {grid.flat().map((gem) => {
                const swapOffset = getSwapOffset(gem.row, gem.col);
                const isSwapping = swapOffset.dx !== 0 || swapOffset.dy !== 0;
                return (
                  <div
                    key={gem.id}
                    className={`gm-gem ${
                      selected?.row === gem.row && selected?.col === gem.col
                        ? "gm-gem--selected"
                        : ""
                    } ${gem.removing ? "gm-gem--removing" : ""} ${
                      gem.falling ? "gm-gem--falling" : ""
                    } ${isSwapping ? "gm-gem--swapping" : ""}`}
                    style={{
                      "--gem-row": gem.row,
                      "--gem-col": gem.col,
                      "--gem-bg": GEM_COLORS[gem.type].bg,
                      "--swap-dx": `${swapOffset.dx}px`,
                      "--swap-dy": `${swapOffset.dy}px`,
                    } as React.CSSProperties}
                    onClick={() => handleGemClick(gem.row, gem.col)}
                  >
                    <span className="gm-gem-inner">{GEM_COLORS[gem.type].emoji}</span>
                  </div>
                );
              })}
              <ComboCounter combo={combo} position="top-right" threshold={2} />
            </div>
          </div>
        )}

        {phase === "after" && (
          <div className="gm-screen">
            <h1 className="gm-title">⏰ タイムアップ！</h1>
            <p className="gm-final-score">{score} pts</p>
            <p className="gm-rating">
              {score >= 2000
                ? "🏆 すばらしい！"
                : score >= 1000
                ? "⭐ よくできました！"
                : "💪 がんばろう！"}
            </p>
            <button className="gm-btn gm-btn--restart" onClick={start}>
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}

