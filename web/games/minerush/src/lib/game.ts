// セル状態の型定義
export interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

export interface GameState {
  grid: Cell[][];
  rows: number;
  cols: number;
  mineCount: number;
  status: "playing" | "won" | "lost";
  revealedCount: number;
  flaggedCount: number;
}

// 8方向の隣接オフセット
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1], [1, 0], [1, 1],
] as const;

/**
 * 空のグリッドを作成
 */
function createEmptyGrid(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );
}

/**
 * 地雷をランダムに配置（最初のクリック位置を除外）
 */
function placeMines(
  grid: Cell[][],
  mineCount: number,
  excludeRow: number,
  excludeCol: number
): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const positions: [number, number][] = [];

  // 除外エリア（クリック位置とその周囲）
  const excludeSet = new Set<string>();
  excludeSet.add(`${excludeRow},${excludeCol}`);
  for (const [dr, dc] of DIRECTIONS) {
    const nr = excludeRow + dr;
    const nc = excludeCol + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      excludeSet.add(`${nr},${nc}`);
    }
  }

  // 配置可能な位置を収集
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!excludeSet.has(`${r},${c}`)) {
        positions.push([r, c]);
      }
    }
  }

  // シャッフルして地雷を配置
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  const minesToPlace = Math.min(mineCount, positions.length);
  for (let i = 0; i < minesToPlace; i++) {
    const [r, c] = positions[i];
    grid[r][c].isMine = true;
  }
}

/**
 * 各セルの隣接地雷数を計算
 */
function calculateAdjacentMines(grid: Cell[][]): void {
  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].isMine) continue;

      let count = 0;
      for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isMine) {
          count++;
        }
      }
      grid[r][c].adjacentMines = count;
    }
  }
}

/**
 * 新規ゲーム状態を作成
 */
export function createGame(rows: number, cols: number, mineCount: number): GameState {
  return {
    grid: createEmptyGrid(rows, cols),
    rows,
    cols,
    mineCount,
    status: "playing",
    revealedCount: 0,
    flaggedCount: 0,
  };
}

/**
 * グリッドをディープコピー
 */
function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

/**
 * セルを開く（再帰的連鎖オープン）
 */
export function revealCell(state: GameState, row: number, col: number): GameState {
  if (state.status !== "playing") return state;

  const cell = state.grid[row][col];
  if (cell.isRevealed || cell.isFlagged) return state;

  // 最初のクリックかチェック（まだ地雷配置されていない）
  const isFirstClick = state.revealedCount === 0 && !state.grid.some((r) => r.some((c) => c.isMine));

  const newGrid = cloneGrid(state.grid);

  if (isFirstClick) {
    // 最初のクリック時に地雷を配置
    placeMines(newGrid, state.mineCount, row, col);
    calculateAdjacentMines(newGrid);
  }

  // 地雷を踏んだ場合
  if (newGrid[row][col].isMine) {
    // 全地雷を表示
    for (const r of newGrid) {
      for (const c of r) {
        if (c.isMine) c.isRevealed = true;
      }
    }
    return {
      ...state,
      grid: newGrid,
      status: "lost",
    };
  }

  // 再帰的オープン用スタック
  const stack: [number, number][] = [[row, col]];
  let revealed = 0;

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const currentCell = newGrid[r][c];

    if (currentCell.isRevealed || currentCell.isFlagged || currentCell.isMine) {
      continue;
    }

    currentCell.isRevealed = true;
    revealed++;

    // 0セルなら周囲も開く
    if (currentCell.adjacentMines === 0) {
      for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 && nr < state.rows &&
          nc >= 0 && nc < state.cols &&
          !newGrid[nr][nc].isRevealed &&
          !newGrid[nr][nc].isFlagged
        ) {
          stack.push([nr, nc]);
        }
      }
    }
  }

  const newRevealedCount = state.revealedCount + revealed;
  const totalSafeCells = state.rows * state.cols - state.mineCount;
  const won = newRevealedCount >= totalSafeCells;

  return {
    ...state,
    grid: newGrid,
    revealedCount: newRevealedCount,
    status: won ? "won" : "playing",
  };
}

/**
 * フラグを切り替え
 */
export function toggleFlag(state: GameState, row: number, col: number): GameState {
  if (state.status !== "playing") return state;

  const cell = state.grid[row][col];
  if (cell.isRevealed) return state;

  const newGrid = cloneGrid(state.grid);
  newGrid[row][col].isFlagged = !newGrid[row][col].isFlagged;

  return {
    ...state,
    grid: newGrid,
    flaggedCount: state.flaggedCount + (newGrid[row][col].isFlagged ? 1 : -1),
  };
}

/**
 * 数字の色を取得
 */
export function getNumberColor(num: number): string {
  const colors: Record<number, string> = {
    1: "#0000ff",
    2: "#008000",
    3: "#ff0000",
    4: "#000080",
    5: "#800000",
    6: "#008080",
    7: "#000000",
    8: "#808080",
  };
  return colors[num] || "#000000";
}
