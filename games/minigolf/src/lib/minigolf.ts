// ミニゴルフ ゲームロジック
import type { BallState, GameState, HoleConfig, Wall, Obstacle } from "./types";
import {
  BALL_RADIUS,
  CUP_RADIUS,
  FRICTION,
  MIN_VELOCITY,
  COURSES,
} from "./constants";

/** 初期状態を作成 */
export function createInitialState(): GameState {
  const course = COURSES[0];
  return {
    phase: "start",
    currentHole: 0,
    ball: {
      x: course.ballStart.x,
      y: course.ballStart.y,
      vx: 0,
      vy: 0,
      active: false,
    },
    strokes: 0,
    scores: [],
    aimAngle: 0,
    aimPower: 5,
  };
}

/** ホールの初期状態を作成 */
export function createHoleState(holeIndex: number, prevState: GameState): GameState {
  const course = COURSES[holeIndex];
  return {
    ...prevState,
    currentHole: holeIndex,
    ball: {
      x: course.ballStart.x,
      y: course.ballStart.y,
      vx: 0,
      vy: 0,
      active: false,
    },
    strokes: 0,
    aimAngle: 0,
    aimPower: 5,
  };
}

/** 壁との衝突検出と反射 */
function collideWithWall(
  ball: BallState,
  wall: Wall
): { collided: boolean; newVx: number; newVy: number; newX: number; newY: number } {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;

  // ボールの中心から壁への距離
  const distToLine =
    ((ball.x - wall.x1) * nx + (ball.y - wall.y1) * ny);

  if (Math.abs(distToLine) > BALL_RADIUS) {
    return { collided: false, newVx: ball.vx, newVy: ball.vy, newX: ball.x, newY: ball.y };
  }

  // ボールが壁の範囲内かチェック
  const t = ((ball.x - wall.x1) * dx + (ball.y - wall.y1) * dy) / (len * len);
  if (t < 0 || t > 1) {
    return { collided: false, newVx: ball.vx, newVy: ball.vy, newX: ball.x, newY: ball.y };
  }

  // 反射
  const dot = ball.vx * nx + ball.vy * ny;
  const newVx = ball.vx - 2 * dot * nx;
  const newVy = ball.vy - 2 * dot * ny;

  // ボールを壁の外に押し出す
  const pushDist = BALL_RADIUS - Math.abs(distToLine) + 1;
  const sign = distToLine >= 0 ? 1 : -1;
  const newX = ball.x + nx * pushDist * sign;
  const newY = ball.y + ny * pushDist * sign;

  return { collided: true, newVx: newVx * 0.8, newVy: newVy * 0.8, newX, newY };
}

/** 矩形障害物との衝突 */
function collideWithRectangle(
  ball: BallState,
  obs: Obstacle
): { collided: boolean; newVx: number; newVy: number; newX: number; newY: number } {
  if (obs.type !== "rectangle" || !obs.width || !obs.height) {
    return { collided: false, newVx: ball.vx, newVy: ball.vy, newX: ball.x, newY: ball.y };
  }

  const left = obs.x;
  const right = obs.x + obs.width;
  const top = obs.y;
  const bottom = obs.y + obs.height;

  // 最も近い点を見つける
  const closestX = Math.max(left, Math.min(ball.x, right));
  const closestY = Math.max(top, Math.min(ball.y, bottom));

  const distX = ball.x - closestX;
  const distY = ball.y - closestY;
  const dist = Math.sqrt(distX * distX + distY * distY);

  if (dist >= BALL_RADIUS) {
    return { collided: false, newVx: ball.vx, newVy: ball.vy, newX: ball.x, newY: ball.y };
  }

  // 反射方向
  const nx = dist > 0 ? distX / dist : 0;
  const ny = dist > 0 ? distY / dist : -1;
  const dot = ball.vx * nx + ball.vy * ny;
  const newVx = ball.vx - 2 * dot * nx;
  const newVy = ball.vy - 2 * dot * ny;

  // 押し出し
  const pushDist = BALL_RADIUS - dist + 1;
  const newX = ball.x + nx * pushDist;
  const newY = ball.y + ny * pushDist;

  return { collided: true, newVx: newVx * 0.8, newVy: newVy * 0.8, newX, newY };
}

/** 円形障害物との衝突 */
function collideWithCircle(
  ball: BallState,
  obs: Obstacle
): { collided: boolean; newVx: number; newVy: number; newX: number; newY: number } {
  if (obs.type !== "circle" || !obs.radius) {
    return { collided: false, newVx: ball.vx, newVy: ball.vy, newX: ball.x, newY: ball.y };
  }

  const dx = ball.x - obs.x;
  const dy = ball.y - obs.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = BALL_RADIUS + obs.radius;

  if (dist >= minDist) {
    return { collided: false, newVx: ball.vx, newVy: ball.vy, newX: ball.x, newY: ball.y };
  }

  // 反射方向
  const nx = dx / dist;
  const ny = dy / dist;
  const dot = ball.vx * nx + ball.vy * ny;
  const newVx = ball.vx - 2 * dot * nx;
  const newVy = ball.vy - 2 * dot * ny;

  // 押し出し
  const pushDist = minDist - dist + 1;
  const newX = ball.x + nx * pushDist;
  const newY = ball.y + ny * pushDist;

  return { collided: true, newVx: newVx * 0.8, newVy: newVy * 0.8, newX, newY };
}

/** カップに入ったかチェック */
export function checkHoleIn(ball: BallState, cup: { x: number; y: number }): boolean {
  const dx = ball.x - cup.x;
  const dy = ball.y - cup.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  
  // カップの中心に近く、速度が十分遅い場合にホールイン
  return dist < CUP_RADIUS - BALL_RADIUS && speed < 8;
}

/** ボールの物理更新 */
export function updateBall(
  ball: BallState,
  course: HoleConfig
): { ball: BallState; stopped: boolean; holeIn: boolean } {
  if (!ball.active) {
    return { ball, stopped: true, holeIn: false };
  }

  let newX = ball.x + ball.vx;
  let newY = ball.y + ball.vy;
  let newVx = ball.vx * FRICTION;
  let newVy = ball.vy * FRICTION;

  // 壁との衝突
  for (const wall of course.walls) {
    const result = collideWithWall(
      { ...ball, x: newX, y: newY, vx: newVx, vy: newVy },
      wall
    );
    if (result.collided) {
      newX = result.newX;
      newY = result.newY;
      newVx = result.newVx;
      newVy = result.newVy;
    }
  }

  // 障害物との衝突
  for (const obs of course.obstacles) {
    let result;
    if (obs.type === "rectangle") {
      result = collideWithRectangle(
        { ...ball, x: newX, y: newY, vx: newVx, vy: newVy },
        obs
      );
    } else {
      result = collideWithCircle(
        { ...ball, x: newX, y: newY, vx: newVx, vy: newVy },
        obs
      );
    }
    if (result.collided) {
      newX = result.newX;
      newY = result.newY;
      newVx = result.newVx;
      newVy = result.newVy;
    }
  }

  // 速度が十分小さくなったら停止
  const speed = Math.sqrt(newVx * newVx + newVy * newVy);
  const stopped = speed < MIN_VELOCITY;

  const newBall: BallState = {
    x: newX,
    y: newY,
    vx: stopped ? 0 : newVx,
    vy: stopped ? 0 : newVy,
    active: !stopped,
  };

  // ホールインチェック
  const holeIn = checkHoleIn(newBall, course.cup);

  return { ball: newBall, stopped, holeIn };
}

/** スコアのパー比較文字列 */
export function getScoreLabel(strokes: number, par: number): string {
  const diff = strokes - par;
  if (strokes === 1) return "Hole in One!";
  if (diff === -3) return "Albatross";
  if (diff === -2) return "Eagle";
  if (diff === -1) return "Birdie";
  if (diff === 0) return "Par";
  if (diff === 1) return "Bogey";
  if (diff === 2) return "Double Bogey";
  if (diff >= 3) return `+${diff}`;
  return `${diff}`;
}

/** 合計スコアを計算 */
export function getTotalScore(scores: { strokes: number; par: number }[]): number {
  return scores.reduce((sum, s) => sum + s.strokes, 0);
}

/** 合計パーを計算 */
export function getTotalPar(scores: { strokes: number; par: number }[]): number {
  return scores.reduce((sum, s) => sum + s.par, 0);
}