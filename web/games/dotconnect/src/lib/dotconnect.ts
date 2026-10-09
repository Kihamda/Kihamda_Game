import type { Point, Dot, PuzzleStage, GameState, CellState, Line } from "./types";
import { COLOR_KEYS } from "./constants";

/** パズルステージ定義 */
export const STAGES: PuzzleStage[] = [
  {
    id: 1,
    name: "チュートリアル",
    gridSize: 5,
    dots: [
      { id: "r1", color: "red", row: 0, col: 0, pairId: "red" },
      { id: "r2", color: "red", row: 2, col: 2, pairId: "red" },
      { id: "b1", color: "blue", row: 0, col: 4, pairId: "blue" },
      { id: "b2", color: "blue", row: 4, col: 4, pairId: "blue" },
    ],
  },
  {
    id: 2,
    name: "イージー",
    gridSize: 5,
    dots: [
      { id: "r1", color: "red", row: 0, col: 0, pairId: "red" },
      { id: "r2", color: "red", row: 4, col: 0, pairId: "red" },
      { id: "b1", color: "blue", row: 0, col: 4, pairId: "blue" },
      { id: "b2", color: "blue", row: 4, col: 4, pairId: "blue" },
      { id: "g1", color: "green", row: 1, col: 1, pairId: "green" },
      { id: "g2", color: "green", row: 3, col: 3, pairId: "green" },
    ],
  },
  {
    id: 3,
    name: "ノーマル",
    gridSize: 6,
    dots: [
      { id: "r1", color: "red", row: 0, col: 0, pairId: "red" },
      { id: "r2", color: "red", row: 5, col: 5, pairId: "red" },
      { id: "b1", color: "blue", row: 0, col: 5, pairId: "blue" },
      { id: "b2", color: "blue", row: 5, col: 0, pairId: "blue" },
      { id: "g1", color: "green", row: 2, col: 1, pairId: "green" },
      { id: "g2", color: "green", row: 2, col: 4, pairId: "green" },
      { id: "y1", color: "yellow", row: 3, col: 1, pairId: "yellow" },
      { id: "y2", color: "yellow", row: 3, col: 4, pairId: "yellow" },
    ],
  },
  {
    id: 4,
    name: "ハード",
    gridSize: 6,
    dots: [
      { id: "r1", color: "red", row: 0, col: 0, pairId: "red" },
      { id: "r2", color: "red", row: 3, col: 5, pairId: "red" },
      { id: "b1", color: "blue", row: 0, col: 5, pairId: "blue" },
      { id: "b2", color: "blue", row: 5, col: 2, pairId: "blue" },
      { id: "g1", color: "green", row: 1, col: 2, pairId: "green" },
      { id: "g2", color: "green", row: 4, col: 4, pairId: "green" },
      { id: "y1", color: "yellow", row: 2, col: 0, pairId: "yellow" },
      { id: "y2", color: "yellow", row: 5, col: 5, pairId: "yellow" },
      { id: "p1", color: "purple", row: 2, col: 3, pairId: "purple" },
      { id: "p2", color: "purple", row: 5, col: 0, pairId: "purple" },
    ],
  },
  {
    id: 5,
    name: "エキスパート",
    gridSize: 7,
    dots: [
      { id: "r1", color: "red", row: 0, col: 0, pairId: "red" },
      { id: "r2", color: "red", row: 6, col: 6, pairId: "red" },
      { id: "b1", color: "blue", row: 0, col: 6, pairId: "blue" },
      { id: "b2", color: "blue", row: 6, col: 0, pairId: "blue" },
      { id: "g1", color: "green", row: 1, col: 3, pairId: "green" },
      { id: "g2", color: "green", row: 5, col: 3, pairId: "green" },
      { id: "y1", color: "yellow", row: 2, col: 1, pairId: "yellow" },
      { id: "y2", color: "yellow", row: 4, col: 5, pairId: "yellow" },
      { id: "p1", color: "purple", row: 2, col: 5, pairId: "purple" },
      { id: "p2", color: "purple", row: 4, col: 1, pairId: "purple" },
      { id: "o1", color: "orange", row: 3, col: 0, pairId: "orange" },
      { id: "o2", color: "orange", row: 3, col: 6, pairId: "orange" },
    ],
  },
];

/** 空のグリッドを作成 */
function createEmptyGrid(size: number, dots: Dot[]): CellState[][] {
  const grid: CellState[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ dot: null, lineColorId: null }))
  );
  
  for (const dot of dots) {
    grid[dot.row][dot.col].dot = dot;
  }
  
  return grid;
}

/** 初期状態を作成 */
export function createInitialState(stage: PuzzleStage): GameState {
  const colorIds = [...new Set(stage.dots.map(d => d.pairId))];
  const lines: Record<string, Line> = {};
  for (const colorId of colorIds) {
    lines[colorId] = { colorId, points: [] };
  }
  
  return {
    stage,
    grid: createEmptyGrid(stage.gridSize, stage.dots),
    lines,
    currentDrawing: null,
    completed: false,
  };
}

/** 隣接セルかどうか */
function isAdjacent(p1: Point, p2: Point): boolean {
  const dr = Math.abs(p1.row - p2.row);
  const dc = Math.abs(p1.col - p2.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/** 線にポイントが含まれているか */
function lineContainsPoint(line: Line, point: Point): boolean {
  return line.points.some(p => p.row === point.row && p.col === point.col);
}

/** ドットを取得 */
function getDotAt(state: GameState, row: number, col: number): Dot | null {
  return state.grid[row]?.[col]?.dot ?? null;
}

/** 線がペアを完成させているか */
function isLineComplete(line: Line, dots: Dot[]): boolean {
  if (line.points.length < 2) return false;
  
  const pairDots = dots.filter(d => d.pairId === line.colorId);
  if (pairDots.length !== 2) return false;
  
  const first = line.points[0];
  const last = line.points[line.points.length - 1];
  
  const startIsDot = pairDots.some(d => d.row === first.row && d.col === first.col);
  const endIsDot = pairDots.some(d => d.row === last.row && d.col === last.col);
  
  if (!startIsDot || !endIsDot) return false;
  
  // 両端が異なるドットか
  const startDot = pairDots.find(d => d.row === first.row && d.col === first.col);
  const endDot = pairDots.find(d => d.row === last.row && d.col === last.col);
  
  return startDot?.id !== endDot?.id;
}

/** 全ての線が完成しているか */
export function checkAllComplete(state: GameState): boolean {
  const colorIds = [...new Set(state.stage.dots.map(d => d.pairId))];
  
  for (const colorId of colorIds) {
    const line = state.lines[colorId];
    if (!line || !isLineComplete(line, state.stage.dots)) {
      return false;
    }
  }
  
  return true;
}

/** 描画開始 */
export function startDrawing(state: GameState, row: number, col: number): GameState {
  const dot = getDotAt(state, row, col);
  if (!dot) return state;
  
  const colorId = dot.pairId;
  const newGrid = state.grid.map(r => r.map(c => ({ ...c })));
  
  // 既存の線をクリア
  for (let r = 0; r < state.stage.gridSize; r++) {
    for (let c = 0; c < state.stage.gridSize; c++) {
      if (newGrid[r][c].lineColorId === colorId) {
        newGrid[r][c].lineColorId = null;
      }
    }
  }
  
  newGrid[row][col].lineColorId = colorId;
  
  return {
    ...state,
    grid: newGrid,
    lines: {
      ...state.lines,
      [colorId]: { colorId, points: [{ row, col }] },
    },
    currentDrawing: colorId,
  };
}

/** 描画継続 */
export function continueDrawing(state: GameState, row: number, col: number): GameState {
  if (!state.currentDrawing) return state;
  
  const colorId = state.currentDrawing;
  const line = state.lines[colorId];
  if (!line || line.points.length === 0) return state;
  
  const lastPoint = line.points[line.points.length - 1];
  const newPoint: Point = { row, col };
  
  // 範囲外チェック
  if (row < 0 || row >= state.stage.gridSize || col < 0 || col >= state.stage.gridSize) {
    return state;
  }
  
  // 隣接チェック
  if (!isAdjacent(lastPoint, newPoint)) return state;
  
  const cell = state.grid[row][col];
  const dot = cell.dot;
  
  // 他の色の線がある場所には引けない
  if (cell.lineColorId && cell.lineColorId !== colorId) {
    return state;
  }
  
  // 他の色のドットには引けない
  if (dot && dot.pairId !== colorId) {
    return state;
  }
  
  // 既に通った場所
  if (lineContainsPoint(line, newPoint)) {
    // 戻る操作: 一つ前に戻る
    if (line.points.length >= 2) {
      const prevPoint = line.points[line.points.length - 2];
      if (prevPoint.row === row && prevPoint.col === col) {
        const newPoints = line.points.slice(0, -1);
        const newGrid = state.grid.map(r => r.map(c => ({ ...c })));
        newGrid[lastPoint.row][lastPoint.col].lineColorId = null;
        
        // ドット上であれば線を残す
        const lastDot = newGrid[lastPoint.row][lastPoint.col].dot;
        if (lastDot && newPoints.length === 0) {
          // スタートドットに戻った場合は線をクリア
        }
        
        return {
          ...state,
          grid: newGrid,
          lines: {
            ...state.lines,
            [colorId]: { ...line, points: newPoints },
          },
        };
      }
    }
    return state;
  }
  
  // 新しいポイントを追加
  const newGrid = state.grid.map(r => r.map(c => ({ ...c })));
  newGrid[row][col].lineColorId = colorId;
  
  const newLines = {
    ...state.lines,
    [colorId]: { ...line, points: [...line.points, newPoint] },
  };
  
  let completed = false;
  
  // ペアのドットに到達したら描画終了
  if (dot && dot.pairId === colorId) {
    const startDot = state.stage.dots.find(
      d => d.pairId === colorId && d.row === line.points[0].row && d.col === line.points[0].col
    );
    if (startDot && startDot.id !== dot.id) {
      // 完成チェック
      const tempState: GameState = {
        ...state,
        grid: newGrid,
        lines: newLines,
        currentDrawing: null,
      };
      completed = checkAllComplete(tempState);
      
      return {
        ...tempState,
        completed,
      };
    }
  }
  
  return {
    ...state,
    grid: newGrid,
    lines: newLines,
  };
}

/** 描画終了 */
export function endDrawing(state: GameState): GameState {
  if (!state.currentDrawing) return state;
  
  const colorId = state.currentDrawing;
  const _line = state.lines[colorId];
  void _line; // Explicitly ignore
  
  // 完成していない線はそのまま残す
  return {
    ...state,
    currentDrawing: null,
  };
}

/** リセット */
export function resetStage(state: GameState): GameState {
  return createInitialState(state.stage);
}

/** 色のキーから表示用色を取得 */
export function getColorByKey(key: string): string {
  const colorIndex = COLOR_KEYS.indexOf(key);
  if (colorIndex === -1) return "#888888";
  
  const colors = [
    "#e74c3c", // red
    "#3498db", // blue
    "#27ae60", // green
    "#f1c40f", // yellow
    "#9b59b6", // purple
    "#e67e22", // orange
    "#e91e63", // pink
    "#00bcd4", // cyan
  ];
  
  return colors[colorIndex] || "#888888";
}
