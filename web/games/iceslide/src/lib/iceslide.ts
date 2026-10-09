import type { Direction, GameState, PlayerState, Stage } from "./types";

/**
 * 方向に対応する移動差分
 */
const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/**
 * 指定位置が壁かどうか判定
 */
export function isWall(stage: Stage, x: number, y: number): boolean {
  if (x < 0 || x >= stage.width || y < 0 || y >= stage.height) {
    return true;
  }
  return stage.cells[y][x] === "wall";
}

/**
 * 指定位置がゴールかどうか判定
 */
export function isGoal(stage: Stage, x: number, y: number): boolean {
  if (x < 0 || x >= stage.width || y < 0 || y >= stage.height) {
    return false;
  }
  return stage.cells[y][x] === "goal";
}

/**
 * 指定方向にスライドした後の位置を計算
 * 壁にぶつかるまで滑り続ける
 */
export function calculateSlideDestination(
  stage: Stage,
  startX: number,
  startY: number,
  direction: Direction
): { x: number; y: number; path: Array<{ x: number; y: number }> } {
  const { dx, dy } = DIRECTION_DELTA[direction];
  let x = startX;
  let y = startY;
  const path: Array<{ x: number; y: number }> = [];

  while (true) {
    const nextX = x + dx;
    const nextY = y + dy;

    // 次が壁なら停止
    if (isWall(stage, nextX, nextY)) {
      break;
    }

    x = nextX;
    y = nextY;
    path.push({ x, y });

    // ゴールに到達したら停止
    if (isGoal(stage, x, y)) {
      break;
    }
  }

  return { x, y, path };
}

/**
 * 移動可能かどうか判定（移動先が現在位置と異なるか）
 */
export function canMove(
  stage: Stage,
  player: PlayerState,
  direction: Direction
): boolean {
  const dest = calculateSlideDestination(stage, player.x, player.y, direction);
  return dest.x !== player.x || dest.y !== player.y;
}

/**
 * プレイヤーを移動させて新しいゲーム状態を返す
 */
export function movePlayer(
  stage: Stage,
  state: GameState,
  direction: Direction
): GameState | null {
  if (!canMove(stage, state.player, direction)) {
    return null;
  }

  const dest = calculateSlideDestination(
    stage,
    state.player.x,
    state.player.y,
    direction
  );

  return {
    ...state,
    player: {
      x: dest.x,
      y: dest.y,
      isSliding: false,
    },
    moves: state.moves + 1,
    history: [...state.history, { x: state.player.x, y: state.player.y }],
  };
}

/**
 * 1手戻す
 */
export function undoMove(state: GameState): GameState | null {
  if (state.history.length === 0) {
    return null;
  }

  const newHistory = [...state.history];
  const lastPos = newHistory.pop()!;

  return {
    ...state,
    player: {
      x: lastPos.x,
      y: lastPos.y,
      isSliding: false,
    },
    moves: state.moves - 1,
    history: newHistory,
  };
}

/**
 * ステージをクリアしたか判定
 */
export function isCleared(stage: Stage, player: PlayerState): boolean {
  return isGoal(stage, player.x, player.y);
}

/**
 * ゲーム状態を初期化
 */
export function createInitialState(stage: Stage): GameState {
  return {
    stageId: stage.id,
    player: {
      x: stage.startX,
      y: stage.startY,
      isSliding: false,
    },
    moves: 0,
    history: [],
  };
}

/**
 * スコア評価（星の数）
 */
export function getRating(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par + 2) return 2;
  return 1;
}

/**
 * キーコードから方向に変換
 */
export function keyToDirection(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}
