import { useState, useCallback, useEffect, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, useHighScore, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer } from "@shared";
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

interface PopupState {
  text: string;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  y: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hex Grid Logic
// ─────────────────────────────────────────────────────────────────────────────

// 六角形グリッドの隣接セル取得（オフセット座標）
function getNeighbors(row: number, col: number): Position[] {
  const isOddCol = col % 2 === 1;
  const neighbors: Position[] = [
    { row, col: col - 1 }, // 左
    { row, col: col + 1 }, // 右
  ];

  if (isOddCol) {
    // 奇数列: 下にずれる
    neighbors.push(
      { row: row - 1, col }, // 上
      { row: row + 1, col }, // 下
      { row: row + 1, col: col - 1 }, // 左下
      { row: row + 1, col: col + 1 }  // 右下
    );
  } else {
    // 偶数列: 上にずれる
    neighbors.push(
      { row: row - 1, col }, // 上
      { row: row + 1, col }, // 下
      { row: row - 1, col: col - 1 }, // 左上
      { row: row - 1, col: col + 1 }  // 右上
    );
  }

  // 範囲内のみ
  return neighbors.filter(n => 
    n.row >= 0 && n.row < ROWS && n.col >= 0 && n.col < COLS
  );
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
  const [popup, setPopup] = useState<PopupState | null>(null);
  const nextIdRef = useRef(ROWS * COLS);
  const prevScoreRef = useRef(0);
  
  // High score tracking
  const { best: highScore, update: saveHighScore } = useHighScore("hexmatch");
  
  // Dopamine hooks
  const { particles, sparkle, confetti } = useParticles();
  const { playTone, playFanfare, playCelebrate } = useAudio();
  const playMatch = useCallback(() => playTone(660, 0.1, 'sine'), [playTone]);
  const playCombo = useCallback((c: number) => playTone(440 + c * 80, 0.12, 'sine'), [playTone]);
  const playSwap = useCallback(() => playTone(330, 0.05, 'triangle'), [playTone]);
  const playInvalid = useCallback(() => playTone(200, 0.1, 'sawtooth'), [playTone]);
  
  // Refs for recursive callbacks
  const playMatchRef = useRef<() => void>(() => {});
  const playComboRef = useRef<(c: number) => void>(() => {});
  const sparkleRef = useRef<(x: number, y: number) => void>(() => {});
  const confettiRef = useRef<() => void>(() => {});
  
  // ScorePopup helper
  const showPopup = useCallback((text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md", y = "35%") => {
    setPopup({ text, key: Date.now(), variant, size, y });
  }, []);
  
  // Refs for popup in recursive callbacks
  const showPopupRef = useRef<(text: string, variant?: PopupVariant, size?: "sm" | "md" | "lg" | "xl", y?: string) => void>(() => {});
  
  useEffect(() => {
    playMatchRef.current = playMatch;
    playComboRef.current = playCombo;
    sparkleRef.current = sparkle;
    confettiRef.current = confetti;
    showPopupRef.current = showPopup;
  }, [playMatch, playCombo, sparkle, confetti, showPopup]);
  
  // Auto-clear popup
  useEffect(() => {
    if (popup) {
      const timer = setTimeout(() => setPopup(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  const startGame = useCallback(() => {
    setTiles(initTiles());
    setSelected(null);
    setScore(0);
    setMoves(INITIAL_MOVES);
    setCombo(0);
    setMessage("");
    setPopup(null);
    setIsAnimating(false);
    nextIdRef.current = ROWS * COLS;
    prevScoreRef.current = 0;
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
      
      // Dopamine effects & ScorePopup
      if (comboMultiplier > 1) {
        playComboRef.current(comboMultiplier);
        if (comboMultiplier >= 3) {
          confettiRef.current();
        }
        // Chain reaction / combo popup
        if (comboMultiplier >= 4) {
          // Big chain - critical style
          showPopupRef.current(`🔥 ${comboMultiplier}x CHAIN! +${points}`, "critical", "xl", "30%");
        } else if (comboMultiplier >= 2) {
          // Combo popup
          showPopupRef.current(`${comboMultiplier}x COMBO! +${points}`, "combo", "lg", "32%");
        }
      } else {
        playMatchRef.current();
        // Normal match popup
        showPopupRef.current(`+${points}`, "default", "md", "35%");
      }
      sparkleRef.current(240, 235);

      if (comboMultiplier > 1) {
        setMessage(`${comboMultiplier}x COMBO! +${points}`);
      } else {
        setMessage(`+${points}`);
      }

      setTimeout(() => {
        // タイル削除
        const remaining = currentTiles
          .filter((t) => !matches.has(t.id))
          .map(t => ({ ...t })); // Deep copy to avoid mutation

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
        playInvalid();
        setSelected(null);
        setTimeout(() => setMessage(""), 1000);
        return;
      }

      // スワップ実行
      playSwap();
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
    [phase, isAnimating, selected, tiles, processMatches, playInvalid, playSwap]
  );

  // ゲーム終了チェック & ハイスコア判定
  useEffect(() => {
    if (phase === "playing" && moves <= 0 && !isAnimating) {
      // Check for high score before transitioning
      const isNewHighScore = score > highScore;
      
      setTimeout(() => {
        if (isNewHighScore) {
          saveHighScore(score);
          showPopup("🏆 NEW HIGH SCORE!", "level", "xl", "25%");
          playCelebrate();
          confetti(80);
        } else if (score >= 3000) {
          showPopup("⭐ MASTER! ⭐", "critical", "lg", "25%");
          playFanfare();
          confetti(60);
        } else if (score >= 1500) {
          showPopup("🎉 Great Score!", "bonus", "lg", "25%");
          playFanfare();
        }
        setPhase("result");
      }, 500);
    }
  }, [phase, moves, isAnimating, score, highScore, saveHighScore, showPopup, playCelebrate, playFanfare, confetti]);

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
            {highScore > 0 && (
              <p className="hm-highscore">🏆 High Score: {highScore.toLocaleString()}</p>
            )}
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
              {highScore > 0 && (
                <p className="hm-result-item">
                  <span className="hm-result-label">🏆 High Score</span>
                  <span className="hm-result-value hm-highscore-value">
                    {highScore.toLocaleString()}
                  </span>
                </p>
              )}
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
        <ParticleLayer particles={particles} />
        {popup && (
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            variant={popup.variant}
            size={popup.size}
            y={popup.y}
          />
        )}
      </div>
    </GameShell>
  );
}