import type { Balloon, BalloonType, GameState } from "./types";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  INITIAL_LIVES,
  BALLOON_CONFIG,
  WAVE_CONFIG,
} from "./constants";

/** コンボが切れる時間 (ms) */
export const COMBO_TIMEOUT = 1500;

/** 初期ゲーム状態を生成 */
export function createInitialState(): GameState {
  return {
    score: 0,
    lives: INITIAL_LIVES,
    wave: 1,
    balloons: [],
    remainingBalloons: WAVE_CONFIG.baseBalloonCount,
    poppedCount: 0,
    isGameOver: false,
    isWaveCleared: false,
    combo: 0,
    lastPopTime: 0,
    leaked: false,
  };
}

/** ウェーブの風船総数を計算 */
export function getWaveBalloonCount(wave: number): number {
  return WAVE_CONFIG.baseBalloonCount + (wave - 1) * WAVE_CONFIG.balloonIncrement;
}

/** ウェーブのスポーン間隔を計算 */
export function getSpawnInterval(wave: number): number {
  const interval = WAVE_CONFIG.baseSpawnInterval - wave * 80;
  return Math.max(interval, WAVE_CONFIG.minSpawnInterval);
}

/** 風船の種類をランダムに決定 */
function getBalloonType(wave: number): BalloonType {
  const rand = Math.random();
  
  // ウェーブが進むほど特殊風船の確率が上がる
  const fastChance = Math.min(0.2, wave * 0.03);
  const smallChance = Math.min(0.15, wave * 0.02);
  const bonusChance = 0.05;
  
  if (rand < bonusChance) return "bonus";
  if (rand < bonusChance + fastChance) return "fast";
  if (rand < bonusChance + fastChance + smallChance) return "small";
  return "normal";
}

/** 新しい風船を生成 */
let balloonIdCounter = 0;
export function createBalloon(wave: number): Balloon {
  const type = getBalloonType(wave);
  const config = BALLOON_CONFIG[type];
  const colors = config.colors;
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // サイズにランダム幅を持たせる
  const sizeVariation = type === "normal" ? Math.random() * 20 - 10 : 0;
  const size = config.baseSize + sizeVariation;
  
  // 速度をウェーブに応じて増加
  const speedMultiplier = 1 + (wave - 1) * WAVE_CONFIG.speedMultiplier;
  const speed = config.baseSpeed * speedMultiplier * (0.9 + Math.random() * 0.2);
  
  // X座標は風船が画面内に収まるように
  const x = Math.random() * (GAME_WIDTH - size) + size / 2;
  
  return {
    id: ++balloonIdCounter,
    x,
    y: -size,
    speed,
    type,
    size,
    color,
    popped: false,
  };
}

/** 風船を更新 */
export function updateBalloons(state: GameState): GameState {
  let newLives = state.lives;
  let isGameOver = state.isGameOver;
  let leaked = false;
  
  // コンボタイムアウトチェック
  const now = Date.now();
  let combo = state.combo;
  if (combo > 0 && now - state.lastPopTime > COMBO_TIMEOUT) {
    combo = 0;
  }
  
  const updatedBalloons = state.balloons
    .map((balloon) => {
      if (balloon.popped) return balloon;
      return {
        ...balloon,
        y: balloon.y + balloon.speed,
      };
    })
    .filter((balloon) => {
      // 画面下に到達した風船を処理
      if (!balloon.popped && balloon.y > GAME_HEIGHT + balloon.size / 2) {
        newLives--;
        leaked = true;
        combo = 0; // リーク時にコンボリセット
        if (newLives <= 0) {
          isGameOver = true;
        }
        return false;
      }
      // 破裂した風船も一定時間後に削除
      if (balloon.popped) {
        return false;
      }
      return true;
    });
  
  return {
    ...state,
    balloons: updatedBalloons,
    lives: newLives,
    isGameOver,
    combo,
    leaked,
  };
}

/** 風船をタップで割る */
export function popBalloon(
  state: GameState,
  balloonId: number,
): GameState {
  const balloon = state.balloons.find((b) => b.id === balloonId);
  if (!balloon || balloon.popped) return state;
  
  const config = BALLOON_CONFIG[balloon.type];
  const now = Date.now();
  
  // コンボ計算
  const timeSinceLastPop = now - state.lastPopTime;
  const newCombo = timeSinceLastPop <= COMBO_TIMEOUT ? state.combo + 1 : 1;
  
  // コンボボーナス (combo 3以上で +10%, 5以上で +20%, 10以上で +50%)
  let comboMultiplier = 1;
  if (newCombo >= 10) comboMultiplier = 1.5;
  else if (newCombo >= 5) comboMultiplier = 1.2;
  else if (newCombo >= 3) comboMultiplier = 1.1;
  
  const baseScore = config.score;
  const finalScore = Math.floor(baseScore * comboMultiplier);
  const newScore = state.score + finalScore;
  const newPoppedCount = state.poppedCount + 1;
  const totalBalloons = getWaveBalloonCount(state.wave);
  
  const updatedBalloons = state.balloons.map((b) =>
    b.id === balloonId ? { ...b, popped: true } : b,
  );
  
  // ウェーブクリア判定
  const isWaveCleared = newPoppedCount >= totalBalloons && state.remainingBalloons <= 0;
  
  return {
    ...state,
    score: newScore,
    balloons: updatedBalloons,
    poppedCount: newPoppedCount,
    isWaveCleared,
    combo: newCombo,
    lastPopTime: now,
  };
}

/** 風船スポーン処理 */
export function spawnBalloon(state: GameState): GameState {
  if (state.remainingBalloons <= 0) return state;
  
  const newBalloon = createBalloon(state.wave);
  
  return {
    ...state,
    balloons: [...state.balloons, newBalloon],
    remainingBalloons: state.remainingBalloons - 1,
  };
}

/** 次のウェーブを開始 */
export function startNextWave(state: GameState): GameState {
  const nextWave = state.wave + 1;
  const balloonCount = getWaveBalloonCount(nextWave);
  
  return {
    ...state,
    wave: nextWave,
    balloons: [],
    remainingBalloons: balloonCount,
    poppedCount: 0,
    isWaveCleared: false,
    combo: 0,
    lastPopTime: 0,
    leaked: false,
  };
}

/** 座標が風船内かどうかを判定 */
export function isPointInBalloon(
  x: number,
  y: number,
  balloon: Balloon,
): boolean {
  const dx = x - balloon.x;
  const dy = y - balloon.y;
  const radius = balloon.size / 2;
  return dx * dx + dy * dy <= radius * radius;
}

/** タップ位置の風船を探す */
export function findBalloonAtPoint(
  state: GameState,
  x: number,
  y: number,
): Balloon | null {
  // 上に表示されている風船から優先（後から追加されたものが上）
  for (let i = state.balloons.length - 1; i >= 0; i--) {
    const balloon = state.balloons[i];
    if (!balloon.popped && isPointInBalloon(x, y, balloon)) {
      return balloon;
    }
  }
  return null;
}

/** ウェーブが終了したかチェック */
export function isWaveComplete(state: GameState): boolean {
  return (
    state.remainingBalloons <= 0 &&
    state.balloons.filter((b) => !b.popped).length === 0
  );
}
