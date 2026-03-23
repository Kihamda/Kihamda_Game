// Merge Master game logic - pure functions
import type { Item, GameState } from "./types";
import { GRID_SIZE, MAX_LEVEL, LEVEL_SCORES, STORAGE_KEY } from "./constants";

function getEmptyPositions(items: Item[]): { row: number; col: number }[] {
  const occupied = new Set(items.map((i) => `${i.row},${i.col}`));
  const empty: { row: number; col: number }[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!occupied.has(`${row},${col}`)) {
        empty.push({ row, col });
      }
    }
  }
  return empty;
}

export function addRandomItem(
  items: Item[],
  nextId: number
): { items: Item[]; nextId: number } | null {
  const empty = getEmptyPositions(items);
  if (empty.length === 0) return null;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  // 80% chance for level 1, 20% chance for level 2
  const level = Math.random() < 0.8 ? 1 : 2;

  const newItem: Item = {
    id: nextId,
    level,
    row: pos.row,
    col: pos.col,
    isNew: true,
  };

  return { items: [...items, newItem], nextId: nextId + 1 };
}

export function initGame(): GameState {
  let items: Item[] = [];
  let nextId = 1;

  // Start with 3 random items
  for (let i = 0; i < 3; i++) {
    const result = addRandomItem(items, nextId);
    if (result) {
      items = result.items;
      nextId = result.nextId;
    }
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  const bestScore = saved ? parseInt(saved, 10) : 0;

  return {
    items,
    score: 0,
    bestScore,
    highestLevel: Math.max(...items.map((i) => i.level), 1),
    gameOver: false,
    nextId,
  };
}

export function getItemAt(
  items: Item[],
  row: number,
  col: number
): Item | undefined {
  return items.find((i) => i.row === row && i.col === col);
}

export function canMerge(item1: Item, item2: Item): boolean {
  if (item1.id === item2.id) return false;
  if (item1.level !== item2.level) return false;
  if (item1.level >= MAX_LEVEL) return false;
  return true;
}

export function isAdjacent(
  row1: number,
  col1: number,
  row2: number,
  col2: number
): boolean {
  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

export function mergeItems(
  state: GameState,
  sourceId: number,
  targetId: number
): GameState {
  const sourceItem = state.items.find((i) => i.id === sourceId);
  const targetItem = state.items.find((i) => i.id === targetId);

  if (!sourceItem || !targetItem) return state;
  if (!canMerge(sourceItem, targetItem)) return state;
  if (
    !isAdjacent(sourceItem.row, sourceItem.col, targetItem.row, targetItem.col)
  ) {
    return state;
  }

  const newLevel = sourceItem.level + 1;
  const scoreGained = LEVEL_SCORES[newLevel] || 0;

  // Remove source, upgrade target
  let newItems = state.items.filter(
    (i) => i.id !== sourceId && i.id !== targetId
  );

  const mergedItem: Item = {
    id: state.nextId,
    level: newLevel,
    row: targetItem.row,
    col: targetItem.col,
    isMerging: true,
  };

  newItems = [...newItems, mergedItem];
  let nextId = state.nextId + 1;

  // Add a new random item after merge
  const addResult = addRandomItem(newItems, nextId);
  if (addResult) {
    newItems = addResult.items;
    nextId = addResult.nextId;
  }

  const newScore = state.score + scoreGained;
  const newBestScore = Math.max(state.bestScore, newScore);
  const newHighestLevel = Math.max(
    state.highestLevel,
    ...newItems.map((i) => i.level)
  );

  if (newBestScore > state.bestScore) {
    localStorage.setItem(STORAGE_KEY, String(newBestScore));
  }

  // Check game over
  const gameOver = checkGameOver(newItems);

  return {
    items: newItems,
    score: newScore,
    bestScore: newBestScore,
    highestLevel: newHighestLevel,
    gameOver,
    nextId,
  };
}

export function moveItem(
  state: GameState,
  itemId: number,
  targetRow: number,
  targetCol: number
): GameState {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  // Check if target is within grid
  if (
    targetRow < 0 ||
    targetRow >= GRID_SIZE ||
    targetCol < 0 ||
    targetCol >= GRID_SIZE
  ) {
    return state;
  }

  // Check if target is adjacent
  if (!isAdjacent(item.row, item.col, targetRow, targetCol)) {
    return state;
  }

  const targetItem = getItemAt(state.items, targetRow, targetCol);

  // If there's an item at target, try to merge
  if (targetItem) {
    return mergeItems(state, itemId, targetItem.id);
  }

  // Move to empty cell
  const newItems = state.items.map((i) =>
    i.id === itemId ? { ...i, row: targetRow, col: targetCol } : i
  );

  return {
    ...state,
    items: newItems,
  };
}

export function checkGameOver(items: Item[]): boolean {
  // Not game over if there are empty cells
  if (items.length < GRID_SIZE * GRID_SIZE) return false;

  // Check for possible merges
  for (const item of items) {
    const neighbors = [
      { row: item.row - 1, col: item.col },
      { row: item.row + 1, col: item.col },
      { row: item.row, col: item.col - 1 },
      { row: item.row, col: item.col + 1 },
    ];

    for (const { row, col } of neighbors) {
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) continue;
      const neighbor = getItemAt(items, row, col);
      if (neighbor && canMerge(item, neighbor)) {
        return false;
      }
    }
  }

  return true;
}

export function clearAnimationFlags(state: GameState): GameState {
  return {
    ...state,
    items: state.items.map((i) => ({
      ...i,
      isNew: false,
      isMerging: false,
    })),
  };
}
