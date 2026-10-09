import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  ShareButton,
  GameRecommendations,
} from "@shared";
import type { PopupVariant } from "@shared";
import {
  initGame,
  getItemAt,
  canMerge,
  isAdjacent,
  mergeItems,
  moveItem,
  clearAnimationFlags,
} from "./lib/game";
import {
  GRID_SIZE,
  MAX_LEVEL,
  LEVEL_EMOJIS,
  LEVEL_COLORS,
  LEVEL_SCORES,
} from "./lib/constants";
import type { GameState, DragState, Item } from "./lib/types";
import "./App.css";

/** アイテムの画面座標を算出 */
function getItemPosition(row: number, col: number) {
  const x = 10 + col * 88;
  const y = 10 + row * 88;
  return { x, y };
}

/** 発見済みレベル追跡用 */
const DISCOVERED_KEY = "mergemaster-discovered";
function loadDiscovered(): Set<number> {
  try {
    const saved = localStorage.getItem(DISCOVERED_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set([1, 2]);
  } catch {
    return new Set([1, 2]);
  }
}
function saveDiscovered(discovered: Set<number>) {
  localStorage.setItem(DISCOVERED_KEY, JSON.stringify([...discovered]));
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(initGame);
  const [dragState, setDragState] = useState<DragState>({
    itemId: null,
    startRow: 0,
    startCol: 0,
  });
  const [validTargets, setValidTargets] = useState<Set<string>>(new Set());
  const [discoveredLevels, setDiscoveredLevels] = useState<Set<number>>(loadDiscovered);
  const [gridWarning, setGridWarning] = useState(false);

  // スコアポップアップ
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    x: string;
    y: string;
    variant: PopupVariant;
  } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const prevItemCountRef = useRef(gameState.items.length);

  // 共通フック
  const audio = useAudio();
  const { particles, sparkle, confetti, burst, explosion } = useParticles();

  // グリッド満杯チェック
  const isGridNearFull = useMemo(() => {
    return gameState.items.length >= GRID_SIZE * GRID_SIZE - 2;
  }, [gameState.items.length]);

  // 満杯警告
  useEffect(() => {
    const wasFull = prevItemCountRef.current >= GRID_SIZE * GRID_SIZE - 2;
    const isFull = isGridNearFull;
    prevItemCountRef.current = gameState.items.length;

    if (isFull && !wasFull && !gameState.gameOver) {
      audio.playWarning();
      // Use setTimeout to avoid direct setState in effect body
      const timer = setTimeout(() => {
        setGridWarning(true);
        setTimeout(() => setGridWarning(false), 600);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [gameState.items.length, isGridNearFull, gameState.gameOver, audio]);

  // アニメーションフラグクリア
  useEffect(() => {
    const timeout = setTimeout(() => {
      setGameState((prev) => clearAnimationFlags(prev));
    }, 300);
    return () => clearTimeout(timeout);
  }, [gameState.items]);

  // ポップアップ表示
  const showPopup = useCallback(
    (text: string, x: number, y: number, variant: PopupVariant = "default") => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const px = `${x - rect.left}px`;
      const py = `${y - rect.top}px`;
      setPopup({ text, key: Date.now(), x: px, y: py, variant });
      setTimeout(() => setPopup(null), 1200);
    },
    []
  );

  // 新アイテム発見チェック
  const checkNewDiscovery = useCallback(
    (level: number, x: number, y: number) => {
      if (!discoveredLevels.has(level)) {
        const newDiscovered = new Set(discoveredLevels);
        newDiscovered.add(level);
        setDiscoveredLevels(newDiscovered);
        saveDiscovered(newDiscovered);
        
        // 発見演出
        audio.playBonus();
        explosion(x, y, 30);
        showPopup(`NEW! ${LEVEL_EMOJIS[level]}`, x, y, "bonus");
      }
    },
    [discoveredLevels, audio, explosion, showPopup]
  );

  // ドラッグ開始
  const handleDragStart = useCallback(
    (item: Item, e: React.PointerEvent) => {
      e.preventDefault();
      setDragState({
        itemId: item.id,
        startRow: item.row,
        startCol: item.col,
      });

      // 有効なターゲットを計算
      const targets = new Set<string>();
      const neighbors = [
        { row: item.row - 1, col: item.col },
        { row: item.row + 1, col: item.col },
        { row: item.row, col: item.col - 1 },
        { row: item.row, col: item.col + 1 },
      ];

      for (const { row, col } of neighbors) {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) continue;
        const target = getItemAt(gameState.items, row, col);
        if (!target) {
          targets.add(`${row},${col}`);
        } else if (canMerge(item, target)) {
          targets.add(`${row},${col}`);
        }
      }
      setValidTargets(targets);
      audio.playClick();
    },
    [gameState.items, audio]
  );

  // ドラッグ終了
  const handleDragEnd = useCallback(
    (targetRow: number, targetCol: number) => {
      if (dragState.itemId === null) return;

      const key = `${targetRow},${targetCol}`;
      if (!validTargets.has(key)) {
        setDragState({ itemId: null, startRow: 0, startCol: 0 });
        setValidTargets(new Set());
        return;
      }

      const sourceItem = gameState.items.find((i) => i.id === dragState.itemId);
      const targetItem = getItemAt(gameState.items, targetRow, targetCol);

      if (sourceItem && targetItem && canMerge(sourceItem, targetItem)) {
        // マージ処理
        const prevHighest = gameState.highestLevel;
        const newState = mergeItems(gameState, sourceItem.id, targetItem.id);
        setGameState(newState);

        // 座標計算
        const pos = getItemPosition(targetRow, targetCol);
        const cx = pos.x + 50;
        const cy = pos.y + 50;

        // マージ音 + sparkle
        audio.playSuccess();
        sparkle(cx, cy, 12);

        // スコアポップアップ
        const newLevel = sourceItem.level + 1;
        const scoreGained = LEVEL_SCORES[newLevel] || 0;
        if (scoreGained > 0) {
          showPopup(`+${scoreGained}`, cx, cy + 20, "default");
        }

        // 新アイテム発見チェック
        setTimeout(() => checkNewDiscovery(newLevel, cx, cy), 150);

        // 高レベルマージ (5以上)
        if (newLevel >= 5) {
          audio.playLevelUp();
          confetti(30);
          showPopup(`Lv.${newLevel}!`, cx, cy - 30, "level");
        }

        // 最高記録更新
        if (newLevel > prevHighest && newLevel >= 3) {
          setTimeout(() => {
            audio.playCelebrate();
            burst(cx, cy, 20);
          }, 300);
        }

        // 最高レベル達成
        if (newLevel === MAX_LEVEL) {
          confetti(80);
          setTimeout(() => {
            audio.playPerfect();
            explosion(cx, cy, 40);
          }, 200);
        }
      } else if (sourceItem) {
        // 空きセルへ移動
        const newState = moveItem(gameState, sourceItem.id, targetRow, targetCol);
        setGameState(newState);
      }

      setDragState({ itemId: null, startRow: 0, startCol: 0 });
      setValidTargets(new Set());
    },
    [
      dragState.itemId,
      validTargets,
      gameState,
      audio,
      sparkle,
      confetti,
      burst,
      explosion,
      showPopup,
      checkNewDiscovery,
    ]
  );

  // アイテムクリック（ドラッグ終了）
  const handleItemClick = useCallback(
    (item: Item) => {
      if (
        dragState.itemId !== null &&
        dragState.itemId !== item.id &&
        isAdjacent(dragState.startRow, dragState.startCol, item.row, item.col)
      ) {
        handleDragEnd(item.row, item.col);
      }
    },
    [dragState, handleDragEnd]
  );

  // 空セルクリック
  const handleEmptyCellClick = useCallback(
    (row: number, col: number) => {
      if (dragState.itemId !== null) {
        handleDragEnd(row, col);
      }
    },
    [dragState.itemId, handleDragEnd]
  );

  // リセット
  const handleReset = useCallback(() => {
    setGameState(initGame());
    setDragState({ itemId: null, startRow: 0, startCol: 0 });
    setValidTargets(new Set());
    audio.playClick();
  }, [audio]);

  // ゲームオーバー演出
  useEffect(() => {
    if (gameState.gameOver) {
      audio.playGameOver();
    }
  }, [gameState.gameOver, audio]);

  // 空セル一覧
  const emptyCells = useMemo(() => {
    const occupied = new Set(gameState.items.map((i) => `${i.row},${i.col}`));
    const cells: { row: number; col: number }[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!occupied.has(`${row},${col}`)) {
          cells.push({ row, col });
        }
      }
    }
    return cells;
  }, [gameState.items]);

  return (
    <GameShell gameId="mergemaster" layout="immersive">
      <div className={`mergemaster-container ${gridWarning ? "mergemaster-warning" : ""}`}>
        <header className="mergemaster-header">
          <h1 className="mergemaster-title">🐣 Merge</h1>
          <div className="mergemaster-scores">
            <div className="mergemaster-score-box">
              <div className="mergemaster-score-label">Score</div>
              <div className="mergemaster-score-value">{gameState.score}</div>
            </div>
            <div className="mergemaster-score-box">
              <div className="mergemaster-score-label">Best</div>
              <div className="mergemaster-score-value">{gameState.bestScore}</div>
            </div>
          </div>
        </header>

        <div className="mergemaster-info">
          <span>
            最高: {LEVEL_EMOJIS[gameState.highestLevel]} Lv.{gameState.highestLevel}
          </span>
          <span>空き: {GRID_SIZE * GRID_SIZE - gameState.items.length}</span>
        </div>

        <div className="mergemaster-controls">
          <button className="mergemaster-btn" onClick={handleReset}>
            🔄 New Game
          </button>
        </div>

        <div
          ref={boardRef}
          className="mergemaster-board"
          style={{ position: "relative" }}
        >
          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />

          {/* スコアポップアップ */}
          {popup && (
            <ScorePopup
              text={popup.text}
              popupKey={popup.key}
              x={popup.x}
              y={popup.y}
              variant={popup.variant}
            />
          )}

          {/* 背景グリッド */}
          <div className="mergemaster-grid">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <div key={i} className="mergemaster-cell" />
            ))}
          </div>

          {/* 空セル（ドロップターゲット） */}
          {emptyCells.map(({ row, col }) => {
            const pos = getItemPosition(row, col);
            const key = `${row},${col}`;
            const isValid = validTargets.has(key);
            return (
              <div
                key={key}
                className={`mergemaster-empty-cell ${isValid ? "mergemaster-empty-cell--valid" : ""}`}
                style={{ left: pos.x, top: pos.y }}
                onClick={() => handleEmptyCellClick(row, col)}
              />
            );
          })}

          {/* アイテム */}
          {gameState.items.map((item) => {
            const pos = getItemPosition(item.row, item.col);
            const isDragging = dragState.itemId === item.id;
            const isValidTarget =
              dragState.itemId !== null &&
              dragState.itemId !== item.id &&
              validTargets.has(`${item.row},${item.col}`);

            return (
              <div
                key={item.id}
                className={`mergemaster-item ${isDragging ? "mergemaster-item--dragging" : ""} ${
                  isValidTarget ? "mergemaster-item--valid-target" : ""
                } ${item.isNew ? "mergemaster-item--new" : ""} ${
                  item.isMerging ? "mergemaster-item--merged" : ""
                } ${item.level >= 5 ? "mergemaster-item--high-level" : ""}`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  background: LEVEL_COLORS[item.level] || "#fff",
                }}
                onPointerDown={(e) => handleDragStart(item, e)}
                onClick={() => handleItemClick(item)}
              >
                <span className="mergemaster-item-emoji">
                  {LEVEL_EMOJIS[item.level]}
                </span>
                <span className="mergemaster-item-level">Lv.{item.level}</span>
              </div>
            );
          })}

          {/* ゲームオーバーオーバーレイ */}
          {gameState.gameOver && (
            <div
              className={`mergemaster-overlay ${
                gameState.highestLevel >= MAX_LEVEL ? "mergemaster-overlay--won" : ""
              }`}
            >
              <p className="mergemaster-overlay-text">
                {gameState.highestLevel >= MAX_LEVEL ? "🎉 完全制覇!" : "Game Over"}
              </p>
              <p className="mergemaster-overlay-subtext">
                Score: {gameState.score} | Best: {LEVEL_EMOJIS[gameState.highestLevel]}
              </p>
              <button className="mergemaster-btn" onClick={handleReset}>
                🔄 Retry
              </button>
              <ShareButton score={gameState.score} gameTitle="Merge Master" gameId="mergemaster" />
              <GameRecommendations currentGameId="mergemaster" />
            </div>
          )}
        </div>

        <p className="mergemaster-instructions">
          同じレベルのアイテムを隣同士でマージ！目指せ🐉Lv.10
        </p>
      </div>
    </GameShell>
  );
}
