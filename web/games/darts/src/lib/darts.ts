import type { ThrowResult, GameState, RoundState } from "./types";
import {
  INITIAL_SCORE,
  THROWS_PER_ROUND,
  RING_RADII,
  BOARD_NUMBERS,
  BOARD_RADIUS,
} from "./constants";

/**
 * クリック位置からスコアを計算
 */
export function calculateScore(
  clickX: number,
  clickY: number,
  centerX: number,
  centerY: number
): ThrowResult {
  const dx = clickX - centerX;
  const dy = clickY - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const position = { x: dx, y: dy };

  // ボード外
  if (distance > BOARD_RADIUS) {
    return {
      score: 0,
      multiplier: 1,
      section: 0,
      label: "MISS",
      position,
    };
  }

  // ブル判定
  if (distance <= RING_RADII.bullInner) {
    return {
      score: 50,
      multiplier: 2,
      section: 25,
      label: "D-BULL",
      position,
    };
  }

  if (distance <= RING_RADII.bullOuter) {
    return {
      score: 25,
      multiplier: 1,
      section: 25,
      label: "BULL",
      position,
    };
  }

  // 角度からセクション番号を求める
  // atan2は右が0度、上が-90度なので調整
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  // 上を0度に調整
  angle = angle + 90;
  if (angle < 0) angle += 360;

  // 各セクションは18度 (360/20)
  // 20は -9度 ~ 9度 (上を中心に)
  const sectionAngle = 18;
  const adjustedAngle = (angle + sectionAngle / 2) % 360;
  const sectionIndex = Math.floor(adjustedAngle / sectionAngle);
  const sectionNumber = BOARD_NUMBERS[sectionIndex];

  // リング判定
  let multiplier: 1 | 2 | 3 = 1;
  let ringLabel = "";

  if (distance >= RING_RADII.doubleInner && distance <= RING_RADII.doubleOuter) {
    multiplier = 2;
    ringLabel = "D";
  } else if (distance >= RING_RADII.tripleInner && distance <= RING_RADII.tripleOuter) {
    multiplier = 3;
    ringLabel = "T";
  }

  const score = sectionNumber * multiplier;
  const label = ringLabel ? `${ringLabel}${sectionNumber}` : `${sectionNumber}`;

  return {
    score,
    multiplier,
    section: sectionNumber,
    label,
    position,
  };
}

/**
 * 初期ゲーム状態を生成
 */
export function createInitialState(): GameState {
  return {
    phase: "ready",
    score: INITIAL_SCORE,
    round: {
      roundNumber: 1,
      throwsInRound: 0,
      throwResults: [],
    },
    history: [],
    busted: false,
  };
}

/**
 * 投擲を処理して新しい状態を返す
 */
export function processThrow(state: GameState, result: ThrowResult): GameState {
  if (state.phase !== "playing") {
    return state;
  }

  const newScore = state.score - result.score;
  const newHistory = [...state.history, result];
  const newThrowResults = [...state.round.throwResults, result];
  const newThrowsInRound = state.round.throwsInRound + 1;

  // バースト判定 (0未満、または1になった場合)
  // 301ゲームでは最後はダブルで上がる必要があるが、簡略化のため0ちょうどなら勝ち
  if (newScore < 0 || newScore === 1) {
    // バースト: ラウンドの得点を無効にする
    return {
      ...state,
      busted: true,
      round: {
        ...state.round,
        throwResults: newThrowResults,
        throwsInRound: newThrowsInRound,
      },
      history: newHistory,
    };
  }

  // 勝利判定
  if (newScore === 0) {
    return {
      ...state,
      phase: "finished",
      score: 0,
      round: {
        ...state.round,
        throwResults: newThrowResults,
        throwsInRound: newThrowsInRound,
      },
      history: newHistory,
      busted: false,
    };
  }

  // ラウンド継続
  return {
    ...state,
    score: newScore,
    round: {
      ...state.round,
      throwResults: newThrowResults,
      throwsInRound: newThrowsInRound,
    },
    history: newHistory,
    busted: false,
  };
}

/**
 * 次のラウンドに進む
 */
export function nextRound(state: GameState): GameState {
  if (state.round.throwsInRound < THROWS_PER_ROUND) {
    return state;
  }

  // バーストしていた場合、スコアを戻す
  let newScore = state.score;
  if (state.busted) {
    const roundScore = state.round.throwResults.reduce((sum, r) => sum + r.score, 0);
    newScore = state.score + roundScore;
  }

  const newRound: RoundState = {
    roundNumber: state.round.roundNumber + 1,
    throwsInRound: 0,
    throwResults: [],
  };

  return {
    ...state,
    score: newScore,
    round: newRound,
    busted: false,
  };
}

/**
 * ラウンドが終了したかどうか
 */
export function isRoundComplete(state: GameState): boolean {
  return state.round.throwsInRound >= THROWS_PER_ROUND || state.busted;
}
