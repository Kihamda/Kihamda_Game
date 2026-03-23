// ボウリングゲームロジック

import type { GameState, FrameResult, Pin, BallState } from "./types";
import {
  PIN_POSITIONS,
  BALL_START_X,
  BALL_START_Y,
  BALL_RADIUS,
  PIN_RADIUS,
  LANE_LEFT,
  LANE_RIGHT,
  LANE_TOP,
  TOTAL_FRAMES,
} from "./constants";

/** 初期ピン配置を生成 */
export function createInitialPins(): Pin[] {
  return PIN_POSITIONS.map((pos, index) => ({
    id: index,
    x: pos.x,
    y: pos.y,
    standing: true,
  }));
}

/** 初期フレーム結果を生成 */
export function createInitialFrames(): FrameResult[] {
  return Array.from({ length: TOTAL_FRAMES }, () => ({
    roll1: null,
    roll2: null,
    roll3: null,
    isStrike: false,
    isSpare: false,
    score: null,
    cumulativeScore: null,
  }));
}

/** 初期ボール状態 */
export function createInitialBall(): BallState {
  return {
    x: BALL_START_X,
    y: BALL_START_Y,
    vx: 0,
    vy: 0,
    active: false,
  };
}

/** 初期ゲーム状態を生成 */
export function createInitialState(): GameState {
  return {
    phase: "start",
    frames: createInitialFrames(),
    currentFrame: 0,
    currentRoll: 0,
    pins: createInitialPins(),
    ball: createInitialBall(),
    aimAngle: 0,
    aimPower: 12,
    totalScore: 0,
  };
}

/** 立っているピン数をカウント */
export function countStandingPins(pins: Pin[]): number {
  return pins.filter((p) => p.standing).length;
}

/** ピンをリセット */
export function resetPins(pins: Pin[]): Pin[] {
  return pins.map((p) => ({ ...p, standing: true }));
}

/** ボールとピンの衝突判定と更新 */
export function updateBallAndPins(
  ball: BallState,
  pins: Pin[],
): { ball: BallState; pins: Pin[]; finished: boolean } {
  if (!ball.active) {
    return { ball, pins, finished: true };
  }

  // ボール移動
  const newBall = {
    ...ball,
    x: ball.x + ball.vx,
    y: ball.y + ball.vy,
  };

  // 摩擦
  newBall.vx *= 0.995;
  newBall.vy *= 0.995;

  // レーン境界チェック
  if (newBall.x < LANE_LEFT + BALL_RADIUS) {
    newBall.x = LANE_LEFT + BALL_RADIUS;
    newBall.vx *= -0.5;
  }
  if (newBall.x > LANE_RIGHT - BALL_RADIUS) {
    newBall.x = LANE_RIGHT - BALL_RADIUS;
    newBall.vx *= -0.5;
  }

  // ピンとの衝突
  let newPins = pins.map((pin) => {
    if (!pin.standing) return pin;

    const dx = newBall.x - pin.x;
    const dy = newBall.y - pin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = BALL_RADIUS + PIN_RADIUS;

    if (dist < minDist) {
      // ピンを倒す
      // ボールにも少し影響
      const angle = Math.atan2(dy, dx);
      newBall.vx += Math.cos(angle) * 0.3;
      newBall.vy += Math.sin(angle) * 0.3;
      return { ...pin, standing: false };
    }
    return pin;
  });

  // ピン同士の連鎖倒れ (簡易実装)
  newPins = applyPinChainReaction(newPins);

  // ボールがレーン奥まで到達したか、速度がほぼゼロか
  const speed = Math.sqrt(newBall.vx ** 2 + newBall.vy ** 2);
  const finished = newBall.y < LANE_TOP || speed < 0.3;

  if (finished) {
    newBall.active = false;
  }

  return { ball: newBall, pins: newPins, finished };
}

/** ピンの連鎖倒れ処理 */
function applyPinChainReaction(pins: Pin[]): Pin[] {
  // 倒れたピンの近くにある立っているピンを連鎖的に倒す
  let changed = true;
  let result = [...pins];
  
  while (changed) {
    changed = false;
    result = result.map((pin) => {
      if (!pin.standing) return pin;
      
      // 倒れたピンの近くにある立っているピンをランダムで倒す
      const nearbyFallen = result.filter(
        (p) =>
          !p.standing &&
          p.id !== pin.id &&
          Math.sqrt((p.x - pin.x) ** 2 + (p.y - pin.y) ** 2) < PIN_RADIUS * 3
      );
      
      if (nearbyFallen.length > 0 && Math.random() < 0.4) {
        changed = true;
        return { ...pin, standing: false };
      }
      return pin;
    });
  }
  
  return result;
}

/** スコア計算 */
export function calculateScores(frames: FrameResult[]): FrameResult[] {
  const result = frames.map((f) => ({ ...f }));
  let cumulative = 0;

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const frame = result[i];
    if (frame.roll1 === null) break;

    let frameScore = 0;

    if (i < 9) {
      // 1-9フレーム
      if (frame.isStrike) {
        frameScore = 10;
        // 次の2投を加算
        const bonus = getNextTwoRolls(result, i);
        if (bonus !== null) {
          frameScore += bonus;
          frame.score = frameScore;
        }
      } else if (frame.isSpare) {
        frameScore = 10;
        // 次の1投を加算
        const bonus = getNextOneRoll(result, i);
        if (bonus !== null) {
          frameScore += bonus;
          frame.score = frameScore;
        }
      } else {
        frameScore = (frame.roll1 ?? 0) + (frame.roll2 ?? 0);
        frame.score = frameScore;
      }
    } else {
      // 10フレーム
      frameScore =
        (frame.roll1 ?? 0) + (frame.roll2 ?? 0) + (frame.roll3 ?? 0);
      frame.score = frameScore;
    }

    if (frame.score !== null) {
      cumulative += frame.score;
      frame.cumulativeScore = cumulative;
    }
  }

  return result;
}

/** 次の2投の合計を取得 */
function getNextTwoRolls(
  frames: FrameResult[],
  frameIndex: number,
): number | null {
  const rolls: number[] = [];
  
  for (let i = frameIndex + 1; i < TOTAL_FRAMES && rolls.length < 2; i++) {
    const f = frames[i];
    if (f.roll1 !== null) rolls.push(f.roll1);
    if (rolls.length < 2 && f.roll2 !== null) rolls.push(f.roll2);
  }
  
  // 10フレームの3投目も考慮
  if (rolls.length < 2 && frameIndex === 8) {
    const f10 = frames[9];
    if (f10.roll1 !== null) rolls.push(f10.roll1);
    if (rolls.length < 2 && f10.roll2 !== null) rolls.push(f10.roll2);
  }
  
  return rolls.length >= 2 ? rolls[0] + rolls[1] : null;
}

/** 次の1投を取得 */
function getNextOneRoll(
  frames: FrameResult[],
  frameIndex: number,
): number | null {
  const nextFrame = frames[frameIndex + 1];
  return nextFrame?.roll1 ?? null;
}

/** フレーム終了判定と次フレームへの移行 */
export function processRollResult(
  state: GameState,
  knockedDown: number,
): GameState {
  const { currentFrame, currentRoll, pins } = state;
  const frames = [...state.frames];
  const frame = { ...frames[currentFrame] };

  if (currentFrame < 9) {
    // 1-9フレーム
    if (currentRoll === 0) {
      frame.roll1 = knockedDown;
      if (knockedDown === 10) {
        frame.isStrike = true;
        frames[currentFrame] = frame;
        return {
          ...state,
          frames: calculateScores(frames),
          currentFrame: currentFrame + 1,
          currentRoll: 0,
          pins: createInitialPins(),
          ball: createInitialBall(),
          phase: currentFrame + 1 >= 10 ? "gameover" : "result",
        };
      }
    } else {
      frame.roll2 = knockedDown;
      if ((frame.roll1 ?? 0) + knockedDown === 10) {
        frame.isSpare = true;
      }
      frames[currentFrame] = frame;
      return {
        ...state,
        frames: calculateScores(frames),
        currentFrame: currentFrame + 1,
        currentRoll: 0,
        pins: createInitialPins(),
        ball: createInitialBall(),
        phase: currentFrame + 1 >= 10 ? "gameover" : "result",
      };
    }
  } else {
    // 10フレーム
    if (currentRoll === 0) {
      frame.roll1 = knockedDown;
      if (knockedDown === 10) {
        frame.isStrike = true;
        frames[currentFrame] = frame;
        return {
          ...state,
          frames: calculateScores(frames),
          currentRoll: 1,
          pins: createInitialPins(),
          ball: createInitialBall(),
          phase: "result",
        };
      }
    } else if (currentRoll === 1) {
      frame.roll2 = knockedDown;
      const total = (frame.roll1 ?? 0) + knockedDown;
      if (frame.isStrike || total === 10) {
        if (!frame.isStrike && total === 10) {
          frame.isSpare = true;
        }
        frames[currentFrame] = frame;
        return {
          ...state,
          frames: calculateScores(frames),
          currentRoll: 2,
          pins: frame.isStrike || frame.isSpare ? createInitialPins() : pins,
          ball: createInitialBall(),
          phase: "result",
        };
      } else {
        // ゲーム終了
        frames[currentFrame] = frame;
        return {
          ...state,
          frames: calculateScores(frames),
          phase: "gameover",
        };
      }
    } else {
      // 3投目
      frame.roll3 = knockedDown;
      frames[currentFrame] = frame;
      return {
        ...state,
        frames: calculateScores(frames),
        phase: "gameover",
      };
    }
  }

  frames[currentFrame] = frame;
  return {
    ...state,
    frames: calculateScores(frames),
    currentRoll: currentRoll + 1,
    ball: createInitialBall(),
    phase: "result",
  };
}

/** 最終スコアを計算 */
export function getFinalScore(frames: FrameResult[]): number {
  const lastFrame = frames[9];
  return lastFrame?.cumulativeScore ?? 0;
}
