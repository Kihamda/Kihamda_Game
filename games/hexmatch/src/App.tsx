import { useState, useCallback, useEffect, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ec4899"];
const COLS = 7;
const ROWS = 5;
const INITIAL_MOVES = 30;

interface Tile {
  id: number;
  color: string;
  row: number;
  col: number;
  removing?: boolean;
  falling?: boolean;
}

interface Position {
  row: number;
  col: number;
}

type Phase = "start" | "playing" | "result";

// ─────────────────────────────────────────────────────────────────────────────
// Hex Grid Logic
// ─────────────────────────────────────────────────────────────────────────────

// 六角形グリッドの隣接セル取得（オフセット座標）
function getNeighbors(row: number, col: number): Position[] {
  const isOddCol = col % 2 === 1;
  const neighbors: Position[] = [
    { row, col: col - 1 }, // 左
    { row, col: col + 1 }, // 右
    { row: row - 1, col }, // 上
    { row: row + 1, col }, // 下
  ];

  if (isOddCol) {
    neighbors.push(
      { row, col: col - 1 },
      { row: row + 1, col: col - 1 },
      { row, col: col + 1 },
      { row: row + 1, col: col + 1 }
    );
  } else {
    neighbors.push(
      { row: row - 1, col: col - 1 },
      { row, col: col - 1 },
      { row: row - 1, col: col + 1 },
      { row, col: col + 1 }
    );
  }

  // 重複を削除し、範囲内のみ
  const unique = new Map<string, Position>();
  for (const n of neighbors) {
    if (n.row >= 0 && n.row < ROWS && n.col >= 0 && n.col < COLS) {
      unique.set(`${n.row},${n.col}`, n);
    }
  }
  return Array.from(unique.values());
}

// マッチを検索（BFS）
function findMatches(tiles: Tile[]): Set<number> {
  const tileMap = new Map<string, Tile>();
  for (const tile of tiles) {
    tileMap.set(`${tile.row},${tile.col}`, tile);
  }

  const matched = new Set<number>();
  const visited = new Set<string>();

  for (const tile of tiles) {
    const key = `${tile.row},${tile.col}`;
    if (visited.has(key)) continue;

    // BFSでグループを探す
    const group: Tile[] = [];
    const queue: Tile[] = [tile];
    visited.add(key);

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);

      const neighbors = getNeighbors(current.row, current.col);
      for (const n of neighbors) {
        const nKey = `${n.row},${n.col}`;
        if (visited.has(nKey)) continue;

        const neighbor = tileMap.get(nKey);
        if (neighbor && neighbor.color === current.color) {
          visited.add(nKey);
          queue.push(neighbor);
        }
      }
    }

    // 3つ以上ならマッチ
    if (group.length >= 3) {
      for (const t of group) {
        matched.add(t.id);
      }
    }
  }

  return matched;
}

// タイルが隣接しているかチェック
function areAdjacent(t1: Tile, t2: Tile): boolean {
  const neighbors = getNeighbors(t1.row, t1.col);
  return neighbors.some((n) => n.row === t2.row && n.col === t2.col);
}

// ランダムな色を生成
function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// 初期盤面生成（マッチがない状態を保証）
function initTiles(): Tile[] {
  let id = 0;
  const tiles: Tile[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      tiles.push({
        id: id++,
        color: randomColor(),
        row,
        col,
      });
    }
  }

  // 初期マッチがあれば色を再生成
  let matches = findMatches(tiles);
  let attempts = 0;
  while (matches.size > 0 && attempts < 100) {
    for (const tile of tiles) {
      if (matches.has(tile.id)) {
        tile.color = randomColor();
      }
    }
    matches = findMatches(tiles);
    attempts++;
  }

  return tiles;
}

// スワップ可能でマッチが発生するか確認
function wouldMatch(tiles: Tile[], t1: Tile, t2: Tile): boolean {
  const swapped = tiles.map((t) => {
    if (t.id === t1.id) return { ...t, row: t2.row, col: t2.col };
    if (t.id === t2.id) return { ...t, row: t1.row, col: t1.col };
    return t;
  });
  return findMatches(swapped).size > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [tiles, setTiles] = useState<Tile[]>(() => initTiles());
  const [selected, setSelected] = useState<Tile | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(INITIAL_MOVES);
  const [combo, setCombo] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [message, setMessage] = useState("");
  const nextIdRef = useRef(ROWS * COLS);

  const startGame = useCallback(() => {
    setTiles(initTiles());
    setSelected(null);
    setScore(0);
    setMoves(INITIAL_MOVES);
    setCombo(0);
    setMessage("");
    setIsAnimating(false);
    nextIdRef.current = ROWS * COLS;
    setPhase("playing");
  }, []);

  // マッチ処理と落下処理
  const processMatches = useCallback(
    (currentTiles: Tile[], currentCombo: number) => {
      const matches = findMatches(currentTiles);

      if (matches.size === 0) {
        setCombo(0);
        setIsAnimating(false);
        return;
      }

      // 削除アニメーション
      const withRemoving = currentTiles.map((t) =>
        matches.has(t.id) ? { ...t, removing: true } : t
      );
      setTiles(withRemoving);

      const comboMultiplier = currentCombo + 1;
      const points = matches.size * 10 * comboMultiplier;
      setScore((s) => s + points);
      setCombo(comboMultiplier);

      if (comboMultiplier > 1) {
        setMessage(`${comboMultiplier}x COMBO! +${points}`);
      } else {
        setMessage(`+${points}`);
      }

      setTimeout(() => {
        // タイル削除
        const remaining = currentTiles.filter((t) => !matches.has(t.id));

        // 落下処理（各列）
        for (let col = 0; col < COLS; col++) {
          const colTiles = remaining
            .filter((t) => t.col === col)
            .sort((a, b) => b.row - a.row);

          let bottom = ROWS - 1;
          for (const tile of colTiles) {
            if (tile.row !== bottom) {
              tile.row = bottom;
              tile.falling = true;
            }
            bottom--;
          }

          // 新しいタイルを上から落とす
          for (let row = bottom; row >= 0; row--) {
            remaining.push({
              id: nextIdRef.current++,
              color: randomColor(),
              row,
              col,
              falling: true,
            });
          }
        }

        setTiles(remaining);

        // 次のマッチをチェック
        setTimeout(() => {
          // falling フラグをクリア
          setTiles((prev) => prev.map((t) => ({ ...t, falling: false })));
          processMatches(remaining, comboMultiplier);
        }, 300);
      }, 300);
    },
    []
  );

  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (phase !== "playing" || isAnimating) return;

      if (!selected) {
        setSelected(tile);
        return;
      }

      if (selected.id === tile.id) {
        setSelected(null);
        return;
      }

      if (!areAdjacent(selected, tile)) {
        setSelected(tile);
        return;
      }

      // スワップ試行
      if (!wouldMatch(tiles, selected, tile)) {
        setMessage("マッチしません");
        setSelected(null);
        setTimeout(() => setMessage(""), 1000);
        return;
      }

      // スワップ実行
      setIsAnimating(true);
      setMoves((m) => m - 1);
      setSelected(null);

      const swapped = tiles.map((t) => {
        if (t.id === selected.id)
          return { ...t, row: tile.row, col: tile.col };
        if (t.id === tile.id)
          return { ...t, row: selected.row, col: selected.col };
        return t;
      });
      setTiles(swapped);

      setTimeout(() => {
        processMatches(swapped, 0);
      }, 200);
    },
    [phase, isAnimating, selected, tiles, processMatches]
  );

  // ゲーム終了チェック
  useEffect(() => {
    if (phase === "playing" && moves <= 0 && !isAnimating) {
      setTimeout(() => setPhase("result"), 500);
    }
  }, [phase, moves, isAnimating]);

  // 六角形の座標計算
  const getHexPosition = (row: number, col: number) => {
    const hexWidth = 70;
    const hexHeight = 80;
    const xOffset = col % 2 === 1 ? hexHeight / 2 : 0;
    return {
      x: col * (hexWidth * 0.85) + 45,
      y: row * hexHeight + xOffset + 50,
    };
  };

  return (
    <GameShell gameId="hexmatch" layout="default">
      <div className="hm-root">
        {phase === "start" && (
          <div className="hm-screen">
            <h1 className="hm-title">⬡ Hex Match</h1>
            <p className="hm-desc">六角形のタイルを揃えて消そう！</p>
            <div className="hm-preview">
              {COLORS.map((color, i) => (
                <div
                  key={i}
                  className="hm-preview-hex"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="hm-rules">
              <p>🎯 隣接タイルをスワップして3つ以上揃えよう</p>
              <p>🔥 連鎖でコンボボーナス！</p>
              <p>📊 {INITIAL_MOVES}手でハイスコアを目指せ</p>
            </div>
            <button className="hm-btn hm-btn--start" onClick={startGame}>
              スタート
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="hm-game">
            <div className="hm-hud">
              <span className="hm-stat">🎯 {score.toLocaleString()}</span>
              <span className="hm-stat">🔄 残り {moves} 手</span>
              {combo > 1 && (
                <span className="hm-stat hm-combo">{combo}x COMBO</span>
              )}
            </div>
            {message && <div className="hm-message">{message}</div>}
            <svg className="hm-board" viewBox="0 0 480 470">
              {tiles.map((tile) => {
                const pos = getHexPosition(tile.row, tile.col);
                const isSelected = selected?.id === tile.id;
                return (
                  <g
                    key={tile.id}
                    className={`hm-tile ${isSelected ? "hm-tile--selected" : ""} ${tile.removing ? "hm-tile--removing" : ""} ${tile.falling ? "hm-tile--falling" : ""}`}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => handleTileClick(tile)}
                  >
                    <polygon
                      className="hm-hex"
                      points="30,0 60,17 60,52 30,70 0,52 0,17"
                      fill={tile.color}
                      stroke={isSelected ? "#fff" : "rgba(255,255,255,0.2)"}
                      strokeWidth={isSelected ? 4 : 2}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {phase === "result" && (
          <div className="hm-screen">
            <h1 className="hm-title">🎉 ゲーム終了！</h1>
            <div className="hm-result-stats">
              <p className="hm-result-item">
                <span className="hm-result-label">最終スコア</span>
                <span className="hm-result-value">
                  {score.toLocaleString()}
                </span>
              </p>
            </div>
            <p className="hm-rating">
              {score >= 3000 && "⭐⭐⭐ マスター！"}
              {score >= 1500 && score < 3000 && "⭐⭐ すばらしい！"}
              {score < 1500 && "⭐ がんばりました！"}
            </p>
            <button className="hm-btn hm-btn--restart" onClick={startGame}>
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}