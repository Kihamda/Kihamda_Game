// Falling Blocks - Game logic (pure functions)

import type { GameState, Tetromino, TetrominoType, Position, GameEvent } from "./types";
import {
  BOARD_ROWS,
  BOARD_COLS,
  TETROMINO_SHAPES,
  TETROMINO_TYPES,
  SCORE_PER_LINE,
  LINES_PER_LEVEL,
} from "./constants";

/** イベントなし */
const NO_EVENT: GameEvent = { type: "none" };

// Create empty board
export function createEmptyBoard(): (TetrominoType | null)[][] {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => null)
  );
}

// Get random tetromino type
export function getRandomTetrominoType(): TetrominoType {
  return TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
}

// Create a new tetromino at spawn position
export function createTetromino(type: TetrominoType): Tetromino {
  const shape = TETROMINO_SHAPES[type];
  const spawnRow = 0;
  const spawnCol = Math.floor(BOARD_COLS / 2);

  return {
    type,
    positions: shape.map((pos) => ({
      row: pos.row + spawnRow,
      col: pos.col + spawnCol,
    })),
    rotation: 0,
  };
}

// Initialize game state
export function initGame(): GameState {
  const firstType = getRandomTetrominoType();
  const nextType = getRandomTetrominoType();

  return {
    board: createEmptyBoard(),
    currentPiece: createTetromino(firstType),
    nextPiece: nextType,
    score: 0,
    level: 1,
    linesCleared: 0,
    gameOver: false,
    isPaused: false,
    lastEvent: NO_EVENT,
  };
}

// Check if position is valid (within bounds and not colliding)
export function isValidPosition(
  board: (TetrominoType | null)[][],
  positions: Position[]
): boolean {
  return positions.every((pos) => {
    if (pos.row < 0 || pos.row >= BOARD_ROWS) return false;
    if (pos.col < 0 || pos.col >= BOARD_COLS) return false;
    if (pos.row >= 0 && board[pos.row][pos.col] !== null) return false;
    return true;
  });
}

// Move piece horizontally
export function movePiece(
  state: GameState,
  deltaCol: number
): GameState {
  if (!state.currentPiece || state.gameOver || state.isPaused) return state;

  const newPositions = state.currentPiece.positions.map((pos) => ({
    row: pos.row,
    col: pos.col + deltaCol,
  }));

  if (isValidPosition(state.board, newPositions)) {
    return {
      ...state,
      currentPiece: {
        ...state.currentPiece,
        positions: newPositions,
      },
    };
  }

  return state;
}

// Rotate piece clockwise
export function rotatePiece(state: GameState): GameState {
  if (!state.currentPiece || state.gameOver || state.isPaused) return state;

  // O-piece doesn't rotate
  if (state.currentPiece.type === "O") return state;

  // Find center of rotation (use first non-pivot position as reference)
  const pivot = state.currentPiece.positions[1]; // Usually the center

  const newPositions = state.currentPiece.positions.map((pos) => {
    const relRow = pos.row - pivot.row;
    const relCol = pos.col - pivot.col;
    // Clockwise rotation: (r, c) -> (c, -r)
    return {
      row: pivot.row + relCol,
      col: pivot.col - relRow,
    };
  });

  // Try rotation, then wall kicks
  const kicks = [0, 1, -1, 2, -2];
  for (const kick of kicks) {
    const kickedPositions = newPositions.map((pos) => ({
      row: pos.row,
      col: pos.col + kick,
    }));
    if (isValidPosition(state.board, kickedPositions)) {
      return {
        ...state,
        currentPiece: {
          ...state.currentPiece,
          positions: kickedPositions,
          rotation: (state.currentPiece.rotation + 1) % 4,
        },
      };
    }
  }

  return state;
}

// Lock piece into board
export function lockPiece(state: GameState): GameState {
  if (!state.currentPiece) return state;

  const newBoard = state.board.map((row) => [...row]);
  for (const pos of state.currentPiece.positions) {
    if (pos.row >= 0 && pos.row < BOARD_ROWS) {
      newBoard[pos.row][pos.col] = state.currentPiece.type;
    }
  }

  return {
    ...state,
    board: newBoard,
    currentPiece: null,
  };
}

// Clear completed lines and return new state
export function clearLines(state: GameState): GameState {
  // どの行が完全に埋まっているか記録
  const clearedRows: number[] = [];
  state.board.forEach((row, index) => {
    if (row.every((cell) => cell !== null)) {
      clearedRows.push(index);
    }
  });

  const newBoard = state.board.filter(
    (row) => !row.every((cell) => cell !== null)
  );

  const clearedCount = BOARD_ROWS - newBoard.length;

  // Add empty rows at top
  while (newBoard.length < BOARD_ROWS) {
    newBoard.unshift(Array.from({ length: BOARD_COLS }, () => null));
  }

  const newLinesCleared = state.linesCleared + clearedCount;
  const newLevel = Math.floor(newLinesCleared / LINES_PER_LEVEL) + 1;
  const scoreGain = SCORE_PER_LINE[clearedCount] || 0;
  const levelUp = newLevel > state.level;

  // イベントを決定
  let event: GameEvent;
  if (clearedCount === 4) {
    event = { type: "tetris", linesCleared: 4, clearedRows };
  } else if (levelUp) {
    event = { type: "levelup", linesCleared: clearedCount, clearedRows };
  } else if (clearedCount > 0) {
    event = { type: "clear", linesCleared: clearedCount, clearedRows };
  } else {
    event = { type: "drop" };
  }

  return {
    ...state,
    board: newBoard,
    score: state.score + scoreGain * state.level,
    linesCleared: newLinesCleared,
    level: newLevel,
    lastEvent: event,
  };
}

// Spawn next piece
export function spawnNextPiece(state: GameState): GameState {
  const newPiece = createTetromino(state.nextPiece);

  // Check if spawn position is valid (game over if not)
  if (!isValidPosition(state.board, newPiece.positions)) {
    return {
      ...state,
      gameOver: true,
    };
  }

  return {
    ...state,
    currentPiece: newPiece,
    nextPiece: getRandomTetrominoType(),
  };
}

// Drop piece by one row
export function dropPiece(state: GameState): GameState {
  if (!state.currentPiece || state.gameOver || state.isPaused) return state;

  const newPositions = state.currentPiece.positions.map((pos) => ({
    row: pos.row + 1,
    col: pos.col,
  }));

  if (isValidPosition(state.board, newPositions)) {
    return {
      ...state,
      currentPiece: {
        ...state.currentPiece,
        positions: newPositions,
      },
    };
  }

  // Cannot drop further - lock, clear, spawn
  let newState = lockPiece(state);
  newState = clearLines(newState);
  newState = spawnNextPiece(newState);

  return newState;
}

// Hard drop - instantly drop to bottom
export function hardDrop(state: GameState): GameState {
  if (!state.currentPiece || state.gameOver || state.isPaused) return state;

  let newState = state;
  let dropped = true;

  while (dropped) {
    const prevPositions = newState.currentPiece?.positions;
    newState = dropPiece(newState);
    dropped = newState.currentPiece?.positions !== prevPositions && newState.currentPiece !== null;
  }

  return newState;
}

// Get ghost piece positions (preview of where piece will land)
export function getGhostPositions(
  board: (TetrominoType | null)[][],
  piece: Tetromino | null
): Position[] {
  if (!piece) return [];

  let ghostPositions = [...piece.positions];
  let canDrop = true;

  while (canDrop) {
    const nextPositions = ghostPositions.map((pos) => ({
      row: pos.row + 1,
      col: pos.col,
    }));

    if (isValidPosition(board, nextPositions)) {
      ghostPositions = nextPositions;
    } else {
      canDrop = false;
    }
  }

  return ghostPositions;
}

// Calculate drop interval based on level
export function getDropInterval(level: number): number {
  const interval = 1000 - (level - 1) * 80;
  return Math.max(interval, 100);
}
