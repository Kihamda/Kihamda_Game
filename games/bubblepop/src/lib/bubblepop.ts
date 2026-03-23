import type { Bubble, GridPos, BubbleColor } from "./types";
import {
  COLORS,
  BUBBLE_RADIUS,
  BOARD_WIDTH,
  COLS,
  INITIAL_ROWS,
} from "./constants";

/** ランダムな色を取得 */
export function randomColor(): BubbleColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

/** グリッド座標から画面座標を取得 */
export function getBubblePosition(row: number, col: number): { x: number; y: number } {
  const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0;
  return {
    x: col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + offset,
    y: row * BUBBLE_RADIUS * 1.73 + BUBBLE_RADIUS + 10,
  };
}

/** 画面座標からグリッド列を取得 */
export function getGridCol(x: number, row: number): number {
  const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0;
  return Math.round((x - BUBBLE_RADIUS - offset) / (BUBBLE_RADIUS * 2));
}

/** 画面座標からグリッド行を取得 */
export function getGridRow(y: number): number {
  return Math.round((y - BUBBLE_RADIUS - 10) / (BUBBLE_RADIUS * 1.73));
}

/** 初期バブル配置を生成 */
export function initBubbles(): Bubble[] {
  let id = 0;
  const bubbles: Bubble[] = [];
  for (let row = 0; row < INITIAL_ROWS; row++) {
    const maxCols = row % 2 === 1 ? COLS - 1 : COLS;
    for (let col = 0; col < maxCols; col++) {
      const pos = getBubblePosition(row, col);
      if (pos.x < BOARD_WIDTH - BUBBLE_RADIUS) {
        bubbles.push({
          id: id++,
          color: randomColor(),
          row,
          col,
          x: pos.x,
          y: pos.y,
        });
      }
    }
  }
  return bubbles;
}

/** 隣接セルを取得（六角形グリッド） */
export function getNeighbors(row: number, col: number): GridPos[] {
  const isOdd = row % 2 === 1;
  if (isOdd) {
    return [
      { row: row - 1, col },
      { row: row - 1, col: col + 1 },
      { row, col: col - 1 },
      { row, col: col + 1 },
      { row: row + 1, col },
      { row: row + 1, col: col + 1 },
    ];
  }
  return [
    { row: row - 1, col: col - 1 },
    { row: row - 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
    { row: row + 1, col: col - 1 },
    { row: row + 1, col },
  ];
}

/** 同色の連結バブルを探索 */
export function findConnectedSameColor(
  bubbles: Bubble[],
  target: Bubble
): Set<number> {
  const bubbleMap = new Map<string, Bubble>();
  for (const b of bubbles) {
    bubbleMap.set(`${b.row},${b.col}`, b);
  }

  const visited = new Set<number>();
  const queue: Bubble[] = [target];
  visited.add(target.id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighbors(current.row, current.col);

    for (const n of neighbors) {
      const neighbor = bubbleMap.get(`${n.row},${n.col}`);
      if (neighbor && !visited.has(neighbor.id) && neighbor.color === target.color) {
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

/** 浮いているバブルを探索（上辺と繋がっていないもの） */
export function findFloatingBubbles(bubbles: Bubble[]): Set<number> {
  const bubbleMap = new Map<string, Bubble>();
  for (const b of bubbles) {
    bubbleMap.set(`${b.row},${b.col}`, b);
  }

  // 上辺から到達可能なバブルを見つける
  const connected = new Set<number>();
  const topBubbles = bubbles.filter((b) => b.row === 0);

  const queue: Bubble[] = [...topBubbles];
  for (const b of topBubbles) {
    connected.add(b.id);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighbors(current.row, current.col);

    for (const n of neighbors) {
      const neighbor = bubbleMap.get(`${n.row},${n.col}`);
      if (neighbor && !connected.has(neighbor.id)) {
        connected.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  // 接続されていないバブルを浮いているとみなす
  const floating = new Set<number>();
  for (const b of bubbles) {
    if (!connected.has(b.id)) {
      floating.add(b.id);
    }
  }

  return floating;
}

/** バブルを1行下にシフト */
export function shiftBubblesDown(bubbles: Bubble[]): Bubble[] {
  return bubbles.map((b) => {
    const newRow = b.row + 1;
    const pos = getBubblePosition(newRow, b.col);
    return { ...b, row: newRow, x: pos.x, y: pos.y };
  });
}

/** 新しい行を上に追加 */
export function addTopRow(bubbles: Bubble[], nextId: number): { bubbles: Bubble[]; nextId: number } {
  const shifted = shiftBubblesDown(bubbles);
  const newBubbles: Bubble[] = [];
  const maxCols = COLS;
  
  for (let col = 0; col < maxCols; col++) {
    const pos = getBubblePosition(0, col);
    if (pos.x < BOARD_WIDTH - BUBBLE_RADIUS) {
      newBubbles.push({
        id: nextId++,
        color: randomColor(),
        row: 0,
        col,
        x: pos.x,
        y: pos.y,
      });
    }
  }

  return { bubbles: [...newBubbles, ...shifted], nextId };
}

/** バブル衝突判定 */
export function checkCollision(
  x: number,
  y: number,
  bubbles: Bubble[]
): Bubble | null {
  for (const b of bubbles) {
    const dx = x - b.x;
    const dy = y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < BUBBLE_RADIUS * 2 - 4) {
      return b;
    }
  }
  return null;
}

/** 配置位置を正規化 */
export function normalizeGridPos(row: number, col: number): GridPos {
  const maxCols = row % 2 === 1 ? COLS - 1 : COLS;
  return {
    row: Math.max(0, row),
    col: Math.max(0, Math.min(col, maxCols - 1)),
  };
}
