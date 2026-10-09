import type { GameState, Wind, Arrow, ShotResult, HitInfo } from "./types";
import {
  TARGET_X,
  TARGET_Y,
  TARGET_RADIUS,
  BOW_X,
  BOW_Y,
  ARROW_SPEED,
  GRAVITY,
  WIND_FACTOR,
  TOTAL_SHOTS,
  SCORE_ZONES,
  WIND_LEVELS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "./constants";

/** ランダムな風を生成 */
export function generateWind(): Wind {
  const speed = Math.random() * 2 - 1; // -1 ~ 1
  const level = WIND_LEVELS.find(
    (l) => speed >= l.min && speed < l.max
  ) ?? WIND_LEVELS[3];
  return { speed, label: level.label };
}

/** 初期状態を作成 */
export function createInitialState(): GameState {
  return {
    phase: "ready",
    shotNumber: 1,
    totalScore: 0,
    results: [],
    wind: generateWind(),
    arrow: null,
    aimX: TARGET_X,
    aimY: TARGET_Y,
    lastHit: null,
  };
}

/** ゲーム開始 */
export function startGame(): GameState {
  return {
    ...createInitialState(),
    phase: "aiming",
    wind: generateWind(),
  };
}

/** 狙い位置を更新 */
export function updateAim(
  state: GameState,
  x: number,
  y: number
): GameState {
  if (state.phase !== "aiming") return state;
  
  // 的の周辺のみ狙える
  const clampedX = Math.max(TARGET_X - TARGET_RADIUS - 50, Math.min(TARGET_X + TARGET_RADIUS + 50, x));
  const clampedY = Math.max(TARGET_Y - TARGET_RADIUS - 50, Math.min(TARGET_Y + TARGET_RADIUS + 50, y));
  
  return {
    ...state,
    aimX: clampedX,
    aimY: clampedY,
  };
}

/** 矢を放つ */
export function shootArrow(state: GameState): GameState {
  if (state.phase !== "aiming") return state;
  
  // 狙い位置に向かって飛ぶ
  const dx = state.aimX - BOW_X;
  const dy = state.aimY - BOW_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const vx = (dx / dist) * ARROW_SPEED;
  const vy = (dy / dist) * ARROW_SPEED;
  
  const arrow: Arrow = {
    x: BOW_X,
    y: BOW_Y,
    vx,
    vy,
    trail: [],
  };
  
  return {
    ...state,
    phase: "flying",
    arrow,
  };
}

/** 矢を更新（物理シミュレーション） */
export function updateArrow(state: GameState): GameState {
  if (state.phase !== "flying" || !state.arrow) return state;
  
  const arrow = { ...state.arrow };
  
  // 軌道を記録
  arrow.trail = [...arrow.trail, { x: arrow.x, y: arrow.y }];
  if (arrow.trail.length > 30) {
    arrow.trail = arrow.trail.slice(-30);
  }
  
  // 風の影響
  arrow.vx += state.wind.speed * WIND_FACTOR;
  
  // 重力の影響
  arrow.vy += GRAVITY;
  
  // 位置更新
  arrow.x += arrow.vx;
  arrow.y += arrow.vy;
  
  // 的に到達したかチェック（的の中心X座標で判定）
  if (arrow.x >= TARGET_X) {
    const result = calculateScore(arrow.y);
    return processShotResult(state, result, arrow);
  }
  
  // 画面外に出たら外れ
  if (
    arrow.x > CANVAS_WIDTH + 50 ||
    arrow.y < -50 ||
    arrow.y > CANVAS_HEIGHT + 50
  ) {
    const result: ShotResult = {
      score: 0,
      distance: TARGET_RADIUS + 100,
      zone: "外れ",
    };
    return processShotResult(state, result, arrow);
  }
  
  return { ...state, arrow };
}

/** スコアを計算 */
function calculateScore(arrowY: number): ShotResult {
  const distance = Math.abs(arrowY - TARGET_Y);
  
  for (const zone of SCORE_ZONES) {
    if (distance <= zone.radius) {
      return {
        score: zone.score,
        distance,
        zone: zone.name,
      };
    }
  }
  
  return {
    score: 0,
    distance,
    zone: "外れ",
  };
}

/** 射撃結果を処理 */
function processShotResult(
  state: GameState,
  result: ShotResult,
  finalArrow: Arrow
): GameState {
  const newResults = [...state.results, result];
  const newTotalScore = state.totalScore + result.score;
  const nextShotNumber = state.shotNumber + 1;
  
  // ヒット情報を生成
  const hitInfo: HitInfo = {
    x: finalArrow.x,
    y: finalArrow.y,
    score: result.score,
    isBullseye: result.score >= 10,
    timestamp: Date.now(),
  };
  
  // 最終射撃かどうか
  if (state.shotNumber >= TOTAL_SHOTS) {
    return {
      ...state,
      phase: "result",
      results: newResults,
      totalScore: newTotalScore,
      arrow: { ...finalArrow, vx: 0, vy: 0 },
      lastHit: hitInfo,
    };
  }
  
  // 次の射撃へ（少し待ってから）
  return {
    ...state,
    phase: "aiming",
    shotNumber: nextShotNumber,
    results: newResults,
    totalScore: newTotalScore,
    wind: generateWind(),
    arrow: null,
    aimX: TARGET_X,
    aimY: TARGET_Y,
    lastHit: hitInfo,
  };
}

/** 評価を取得 */
export function getRating(totalScore: number): string {
  if (totalScore >= 48) return "🏆 パーフェクト！";
  if (totalScore >= 40) return "🥇 素晴らしい！";
  if (totalScore >= 30) return "🥈 お見事！";
  if (totalScore >= 20) return "🥉 なかなか！";
  return "💪 もう一度挑戦！";
}
