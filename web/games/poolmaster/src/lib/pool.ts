// Pool Master ゲームロジック

import type { Ball, GameState, Player, BallType, EffectEvent } from "./types";
import {
  BALL_RADIUS,
  TABLE_LEFT,
  TABLE_TOP,
  TABLE_RIGHT,
  TABLE_BOTTOM,
  FRICTION,
  MIN_VELOCITY,
  CUE_BALL_START_X,
  CUE_BALL_START_Y,
  RACK_X,
  RACK_Y,
  POCKET_POSITIONS,
  POCKET_RADIUS,
  SOLID_BALLS,
  STRIPE_BALLS,
  EIGHT_BALL,
} from "./constants";

/** 初期状態生成 */
export function createInitialState(): GameState {
  return {
    phase: "start",
    balls: createInitialBalls(),
    currentPlayer: 1,
    player1: { id: 1, name: "Player 1", assignedType: null, pocketedBalls: [] },
    player2: { id: 2, name: "Player 2", assignedType: null, pocketedBalls: [] },
    aimAngle: 0,
    aimPower: 10,
    message: "",
    result: null,
    foul: false,
    cueBallPlaceable: false,
  };
}

/** ボール初期配置 */
function createInitialBalls(): Ball[] {
  const balls: Ball[] = [];

  // キューボール (id: 0)
  balls.push({
    id: 0,
    x: CUE_BALL_START_X,
    y: CUE_BALL_START_Y,
    vx: 0,
    vy: 0,
    type: "cue",
    pocketed: false,
  });

  // ラック配置 (三角形: 5行)
  // 8ボールルール: 8番は中央、先頭は1/9ランダム
  const rackOrder = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  const spacing = BALL_RADIUS * 2.1;
  let idx = 0;

  for (let row = 0; row < 5; row++) {
    const ballsInRow = row + 1;
    const startY = RACK_Y - (row * spacing) / 2;
    for (let col = 0; col < ballsInRow; col++) {
      const ballId = rackOrder[idx];
      let type: BallType = "solid";
      if (ballId === 8) type = "eight";
      else if (STRIPE_BALLS.includes(ballId)) type = "stripe";

      balls.push({
        id: ballId,
        x: RACK_X + row * spacing * 0.866, // cos(30°) ≈ 0.866
        y: startY + col * spacing,
        vx: 0,
        vy: 0,
        type,
        pocketed: false,
      });
      idx++;
    }
  }

  return balls;
}

/** ボール間衝突検出・解決 */
function resolveCollision(b1: Ball, b2: Ball): void {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = BALL_RADIUS * 2;

  if (dist < minDist && dist > 0) {
    // 正規化
    const nx = dx / dist;
    const ny = dy / dist;

    // 相対速度
    const dvx = b1.vx - b2.vx;
    const dvy = b1.vy - b2.vy;
    const dvn = dvx * nx + dvy * ny;

    // 反発係数
    const restitution = 0.95;

    // 衝突が接近方向の場合のみ処理
    if (dvn > 0) {
      const j = dvn * restitution;
      b1.vx -= j * nx;
      b1.vy -= j * ny;
      b2.vx += j * nx;
      b2.vy += j * ny;
    }

    // 重なり解消
    const overlap = minDist - dist;
    b1.x -= (overlap / 2) * nx;
    b1.y -= (overlap / 2) * ny;
    b2.x += (overlap / 2) * nx;
    b2.y += (overlap / 2) * ny;
  }
}

/** 壁衝突 */
function resolveWallCollision(ball: Ball): void {
  const margin = BALL_RADIUS;

  if (ball.x - margin < TABLE_LEFT) {
    ball.x = TABLE_LEFT + margin;
    ball.vx = -ball.vx * 0.8;
  }
  if (ball.x + margin > TABLE_RIGHT) {
    ball.x = TABLE_RIGHT - margin;
    ball.vx = -ball.vx * 0.8;
  }
  if (ball.y - margin < TABLE_TOP) {
    ball.y = TABLE_TOP + margin;
    ball.vy = -ball.vy * 0.8;
  }
  if (ball.y + margin > TABLE_BOTTOM) {
    ball.y = TABLE_BOTTOM - margin;
    ball.vy = -ball.vy * 0.8;
  }
}

/** ポケット判定 (ポケットのインデックスも返す) */
function checkPocket(ball: Ball): { pocketed: boolean; pocketIndex: number } {
  for (let i = 0; i < POCKET_POSITIONS.length; i++) {
    const pocket = POCKET_POSITIONS[i];
    const dx = ball.x - pocket.x;
    const dy = ball.y - pocket.y;
    if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS) {
      return { pocketed: true, pocketIndex: i };
    }
  }
  return { pocketed: false, pocketIndex: -1 };
}

/** ボール更新 */
export function updateBalls(balls: Ball[]): {
  balls: Ball[];
  pocketed: number[];
  pocketPositions: { id: number; x: number; y: number }[];
  allStopped: boolean;
} {
  const pocketed: number[] = [];
  const pocketPositions: { id: number; x: number; y: number }[] = [];
  const activeBalls = balls.filter((b) => !b.pocketed);

  // 移動
  for (const ball of activeBalls) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    // 小さい速度は停止
    if (Math.abs(ball.vx) < MIN_VELOCITY) ball.vx = 0;
    if (Math.abs(ball.vy) < MIN_VELOCITY) ball.vy = 0;
  }

  // ボール間衝突
  for (let i = 0; i < activeBalls.length; i++) {
    for (let j = i + 1; j < activeBalls.length; j++) {
      resolveCollision(activeBalls[i], activeBalls[j]);
    }
  }

  // 壁衝突・ポケット判定
  for (const ball of activeBalls) {
    resolveWallCollision(ball);

    const pocketResult = checkPocket(ball);
    if (pocketResult.pocketed) {
      ball.pocketed = true;
      const pocket = POCKET_POSITIONS[pocketResult.pocketIndex];
      pocketPositions.push({ id: ball.id, x: pocket.x, y: pocket.y });
      ball.vx = 0;
      ball.vy = 0;
      pocketed.push(ball.id);
    }
  }

  // 全停止判定
  const allStopped = activeBalls.every(
    (b) => b.pocketed || (b.vx === 0 && b.vy === 0)
  );

  return { balls, pocketed, pocketPositions, allStopped };
}

/** ターン結果処理 */
export function processTurnResult(
  state: GameState,
  pocketedThisTurn: number[]
): { newState: GameState; effects: EffectEvent[] } {
  const newState = { ...state };
  const effects: EffectEvent[] = [];
  const currentPlayer = state.currentPlayer === 1 ? state.player1 : state.player2;
  const opponent = state.currentPlayer === 1 ? state.player2 : state.player1;

  // キューボールがポケットされた (スクラッチファウル)
  const cueBallPocketed = pocketedThisTurn.includes(0);
  if (cueBallPocketed) {
    newState.foul = true;
    newState.message = "スクラッチ！相手ターン";
    effects.push({ type: "foul" });
    // キューボール復活
    const cueBall = newState.balls.find((b) => b.id === 0)!;
    cueBall.pocketed = false;
    cueBall.x = CUE_BALL_START_X;
    cueBall.y = CUE_BALL_START_Y;
    newState.cueBallPlaceable = true;
  }

  // 8番が落ちた
  const eightPocketed = pocketedThisTurn.includes(EIGHT_BALL);
  if (eightPocketed) {
    // 自分の持ち玉が全部落ちていて8番を落としたら勝ち
    const ownBalls =
      currentPlayer.assignedType === "solid" ? SOLID_BALLS : STRIPE_BALLS;
    const ownRemaining = newState.balls.filter(
      (b) => ownBalls.includes(b.id) && !b.pocketed
    );

    if (currentPlayer.assignedType && ownRemaining.length === 0 && !cueBallPocketed) {
      // 勝利
      newState.result = { winner: state.currentPlayer, reason: "8ball" };
      newState.phase = "gameover";
      newState.message = `${currentPlayer.name} WIN! 🎱`;
      effects.push({ type: "win" });
      return { newState, effects };
    } else {
      // 早すぎる8番 or ファウル8番 = 負け
      const winnerId = state.currentPlayer === 1 ? 2 : 1;
      newState.result = { winner: winnerId as 1 | 2, reason: "foul8ball" };
      newState.phase = "gameover";
      newState.message = `${opponent.name} WIN! (相手8番ファウル)`;
      effects.push({ type: "foul" });
      return { newState, effects };
    }
  }

  // ボール割り当て判定
  const objectBallsPocketed = pocketedThisTurn.filter((id) => id !== 0 && id !== 8);
  if (!currentPlayer.assignedType && objectBallsPocketed.length > 0) {
    const firstPocketed = objectBallsPocketed[0];
    if (SOLID_BALLS.includes(firstPocketed)) {
      if (state.currentPlayer === 1) {
        newState.player1 = { ...newState.player1, assignedType: "solid" };
        newState.player2 = { ...newState.player2, assignedType: "stripe" };
      } else {
        newState.player2 = { ...newState.player2, assignedType: "solid" };
        newState.player1 = { ...newState.player1, assignedType: "stripe" };
      }
      newState.message = `${currentPlayer.name}はソリッド(1-7)！`;
    } else {
      if (state.currentPlayer === 1) {
        newState.player1 = { ...newState.player1, assignedType: "stripe" };
        newState.player2 = { ...newState.player2, assignedType: "solid" };
      } else {
        newState.player2 = { ...newState.player2, assignedType: "stripe" };
        newState.player1 = { ...newState.player1, assignedType: "solid" };
      }
      newState.message = `${currentPlayer.name}はストライプ(9-15)！`;
    }
  }

  // 持ち玉が落ちたかチェック
  const updatedPlayer = state.currentPlayer === 1 ? newState.player1 : newState.player2;
  const ownBalls =
    updatedPlayer.assignedType === "solid"
      ? SOLID_BALLS
      : updatedPlayer.assignedType === "stripe"
        ? STRIPE_BALLS
        : [];
  const pocketedOwnBalls = objectBallsPocketed.filter((id) => ownBalls.includes(id));

  // コンボ判定 (自分のボールを複数入れた場合)
  if (pocketedOwnBalls.length >= 2) {
    effects.push({ type: "combo", comboCount: pocketedOwnBalls.length });
  }

  // 記録
  if (state.currentPlayer === 1) {
    newState.player1 = {
      ...newState.player1,
      pocketedBalls: [...newState.player1.pocketedBalls, ...pocketedOwnBalls],
    };
  } else {
    newState.player2 = {
      ...newState.player2,
      pocketedBalls: [...newState.player2.pocketedBalls, ...pocketedOwnBalls],
    };
  }

  // ターン交代判定
  if (newState.foul || pocketedOwnBalls.length === 0) {
    newState.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
    if (!newState.message) {
      newState.message = pocketedOwnBalls.length === 0 && objectBallsPocketed.length > 0
        ? "相手のボール！ターン交代"
        : "ミス！ターン交代";
    }
  } else {
    newState.message = `ナイスショット！ ${pocketedOwnBalls.length}個入った！`;
  }

  newState.foul = false;
  newState.phase = "turnEnd";
  return { newState, effects };
}

/** 全ボール停止判定 */
export function areBallsStopped(balls: Ball[]): boolean {
  return balls
    .filter((b) => !b.pocketed)
    .every((b) => b.vx === 0 && b.vy === 0);
}

/** キューボール取得 */
export function getCueBall(balls: Ball[]): Ball | undefined {
  return balls.find((b) => b.id === 0 && !b.pocketed);
}

/** プレイヤーの残りボール数 */
export function getRemainingBalls(player: Player, balls: Ball[]): number {
  if (!player.assignedType) return 7;
  const targetBalls = player.assignedType === "solid" ? SOLID_BALLS : STRIPE_BALLS;
  return balls.filter((b) => targetBalls.includes(b.id) && !b.pocketed).length;
}
