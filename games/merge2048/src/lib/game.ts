// 2048 game logic - pure functions

export type Direction = "up" | "down" | "left" | "right";

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  mergedFrom?: boolean;
  isNew?: boolean;
}

export interface GameState {
  tiles: Tile[];
  score: number;
  bestScore: number;
  gameOver: boolean;
  won: boolean;
  nextId: number;
}

const GRID_SIZE = 4;

export function createEmptyGrid(): (Tile | null)[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

export function tilesToGrid(tiles: Tile[]): (Tile | null)[][] {
  const grid = createEmptyGrid();
  for (const tile of tiles) {
    grid[tile.row][tile.col] = tile;
  }
  return grid;
}

function getEmptyPositions(tiles: Tile[]): { row: number; col: number }[] {
  const occupied = new Set(tiles.map((t) => `${t.row},${t.col}`));
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

export function addRandomTile(tiles: Tile[], nextId: number): { tiles: Tile[]; nextId: number } {
  const empty = getEmptyPositions(tiles);
  if (empty.length === 0) return { tiles, nextId };
  
  const pos = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  
  const newTile: Tile = {
    id: nextId,
    value,
    row: pos.row,
    col: pos.col,
    isNew: true,
  };
  
  return { tiles: [...tiles, newTile], nextId: nextId + 1 };
}

export function initGame(): GameState {
  let tiles: Tile[] = [];
  let nextId = 1;
  
  const result1 = addRandomTile(tiles, nextId);
  tiles = result1.tiles;
  nextId = result1.nextId;
  
  const result2 = addRandomTile(tiles, nextId);
  tiles = result2.tiles;
  nextId = result2.nextId;
  
  const saved = localStorage.getItem("merge2048-best");
  const bestScore = saved ? parseInt(saved, 10) : 0;
  
  return {
    tiles,
    score: 0,
    bestScore,
    gameOver: false,
    won: false,
    nextId,
  };
}

function slideLine(line: (Tile | null)[]): { newLine: (Tile | null)[]; scoreGained: number; merged: boolean } {
  // Extract non-null tiles
  const tiles = line.filter((t): t is Tile => t !== null);
  const result: (Tile | null)[] = Array(GRID_SIZE).fill(null);
  let scoreGained = 0;
  let merged = false;
  let writeIdx = 0;
  
  for (let i = 0; i < tiles.length; i++) {
    if (i < tiles.length - 1 && tiles[i].value === tiles[i + 1].value) {
      // Merge
      const newValue = tiles[i].value * 2;
      result[writeIdx] = {
        ...tiles[i + 1],
        value: newValue,
        mergedFrom: true,
      };
      scoreGained += newValue;
      merged = true;
      i++; // Skip next tile (merged)
    } else {
      result[writeIdx] = { ...tiles[i] };
    }
    writeIdx++;
  }
  
  return { newLine: result, scoreGained, merged };
}

export function move(state: GameState, direction: Direction): GameState {
  if (state.gameOver) return state;
  
  const grid = tilesToGrid(state.tiles);
  let newTiles: Tile[] = [];
  let totalScore = 0;
  let moved = false;
  let nextId = state.nextId;
  
  const isVertical = direction === "up" || direction === "down";
  const isReverse = direction === "down" || direction === "right";
  
  for (let i = 0; i < GRID_SIZE; i++) {
    // Extract line (row or column)
    const line: (Tile | null)[] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      const row = isVertical ? j : i;
      const col = isVertical ? i : j;
      line.push(grid[row][col]);
    }
    
    if (isReverse) line.reverse();
    
    const { newLine, scoreGained, merged } = slideLine(line);
    totalScore += scoreGained;
    
    if (isReverse) newLine.reverse();
    
    // Place tiles back with new positions
    for (let j = 0; j < GRID_SIZE; j++) {
      const tile = newLine[j];
      if (tile) {
        const newRow = isVertical ? j : i;
        const newCol = isVertical ? i : j;
        
        if (tile.row !== newRow || tile.col !== newCol) {
          moved = true;
        }
        
        newTiles.push({
          ...tile,
          row: newRow,
          col: newCol,
          isNew: false,
        });
      }
    }
    
    if (merged) moved = true;
  }
  
  if (!moved) return state;
  
  // Clear merged flags after animation
  newTiles = newTiles.map((t) => ({ ...t, mergedFrom: false, isNew: false }));
  
  // Add new random tile
  const result = addRandomTile(newTiles, nextId);
  newTiles = result.tiles;
  nextId = result.nextId;
  
  const newScore = state.score + totalScore;
  const newBestScore = Math.max(state.bestScore, newScore);
  
  if (newBestScore > state.bestScore) {
    localStorage.setItem("merge2048-best", String(newBestScore));
  }
  
  const won = newTiles.some((t) => t.value >= 2048);
  const gameOver = isGameOver(newTiles);
  
  return {
    tiles: newTiles,
    score: newScore,
    bestScore: newBestScore,
    gameOver,
    won: state.won || won,
    nextId,
  };
}

function isGameOver(tiles: Tile[]): boolean {
  if (tiles.length < GRID_SIZE * GRID_SIZE) return false;
  
  const grid = tilesToGrid(tiles);
  
  // Check for possible merges
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const tile = grid[row][col];
      if (!tile) return false;
      
      // Check right neighbor
      if (col < GRID_SIZE - 1 && grid[row][col + 1]?.value === tile.value) {
        return false;
      }
      // Check bottom neighbor
      if (row < GRID_SIZE - 1 && grid[row + 1][col]?.value === tile.value) {
        return false;
      }
    }
  }
  
  return true;
}
