import type { Note, GameState, Judgment, DifficultyConfig } from "./types";
import {
  LANE_COUNT,
  PERFECT_WINDOW,
  GOOD_WINDOW,
  SCORE_PERFECT,
  SCORE_GOOD,
  COMBO_BONUS_RATE,
  JUDGE_LINE_Y,
  GAME_HEIGHT,
} from "./constants";

/** 初期状態を生成 */
export function createInitialState(notes: Note[], startTime: number): GameState {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfectCount: 0,
    goodCount: 0,
    missCount: 0,
    notes,
    startTime,
    isFinished: false,
  };
}

/** ノート譜面を生成 */
export function generateNotes(config: DifficultyConfig): Note[] {
  const notes: Note[] = [];
  const beatInterval = 60000 / config.bpm; // 1拍の長さ (ms)
  let noteId = 0;

  // 拍ごとにノートを配置
  for (let beat = 0; beat < config.totalBeats; beat++) {
    const targetTime = beat * beatInterval + 2000; // 2秒後から開始
    
    // ランダムにレーンを選択
    // 8拍に1回は同時押し
    if (beat % 8 === 4) {
      // 2レーン同時押し
      const lanes = getRandomLanes(2);
      for (const lane of lanes) {
        notes.push({
          id: noteId++,
          lane,
          targetTime,
          judged: false,
        });
      }
    } else if (beat % 2 === 0) {
      // 2拍に1回ノート
      const lane = Math.floor(Math.random() * LANE_COUNT);
      notes.push({
        id: noteId++,
        lane,
        targetTime,
        judged: false,
      });
    }
  }

  return notes;
}

/** ランダムなレーンを複数選択 */
function getRandomLanes(count: number): number[] {
  const lanes: number[] = [];
  while (lanes.length < count) {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    if (!lanes.includes(lane)) {
      lanes.push(lane);
    }
  }
  return lanes;
}

/** ノートのY座標を計算 */
export function calculateNoteY(
  note: Note,
  currentTime: number,
  speed: number,
): number {
  const timeToJudge = note.targetTime - currentTime;
  return JUDGE_LINE_Y - timeToJudge * speed;
}

/** ノートが画面内にあるか判定 */
export function isNoteVisible(noteY: number): boolean {
  return noteY > -100 && noteY < GAME_HEIGHT + 100;
}

/** ノートが見逃されたか判定 */
export function isNoteMissed(note: Note, currentTime: number): boolean {
  return !note.judged && currentTime - note.targetTime > GOOD_WINDOW;
}

/** 判定結果を取得 */
export function getJudgment(timeDiff: number): Judgment | null {
  const absDiff = Math.abs(timeDiff);
  if (absDiff <= PERFECT_WINDOW) return "perfect";
  if (absDiff <= GOOD_WINDOW) return "good";
  return null;
}

/** レーンでタップした時の処理 */
export function processLaneTap(
  state: GameState,
  lane: number,
  currentTime: number,
): GameState {
  // 未判定のノートの中で最も近いものを探す
  let closestNote: Note | null = null;
  let closestDiff = Infinity;

  for (const note of state.notes) {
    if (note.judged || note.lane !== lane) continue;
    
    const diff = currentTime - note.targetTime;
    const absDiff = Math.abs(diff);
    
    // 判定範囲内かつ最も近い
    if (absDiff <= GOOD_WINDOW && absDiff < closestDiff) {
      closestNote = note;
      closestDiff = absDiff;
    }
  }

  if (!closestNote) {
    return state;
  }

  const judgment = getJudgment(closestDiff);
  if (!judgment) {
    return state;
  }

  return applyJudgment(state, closestNote.id, judgment);
}

/** 判定を適用 */
export function applyJudgment(
  state: GameState,
  noteId: number,
  judgment: Judgment,
): GameState {
  const newNotes = state.notes.map((note) =>
    note.id === noteId ? { ...note, judged: true, judgment } : note,
  );

  let newCombo = state.combo;
  let newScore = state.score;
  let newPerfect = state.perfectCount;
  let newGood = state.goodCount;
  let newMiss = state.missCount;

  if (judgment === "perfect") {
    newCombo += 1;
    const bonus = Math.floor(SCORE_PERFECT * newCombo * COMBO_BONUS_RATE);
    newScore += SCORE_PERFECT + bonus;
    newPerfect += 1;
  } else if (judgment === "good") {
    newCombo += 1;
    const bonus = Math.floor(SCORE_GOOD * newCombo * COMBO_BONUS_RATE);
    newScore += SCORE_GOOD + bonus;
    newGood += 1;
  } else {
    newCombo = 0;
    newMiss += 1;
  }

  return {
    ...state,
    notes: newNotes,
    score: newScore,
    combo: newCombo,
    maxCombo: Math.max(state.maxCombo, newCombo),
    perfectCount: newPerfect,
    goodCount: newGood,
    missCount: newMiss,
  };
}

/** ミス判定を処理 */
export function processMissedNotes(
  state: GameState,
  currentTime: number,
): GameState {
  let newState = state;

  for (const note of state.notes) {
    if (isNoteMissed(note, currentTime)) {
      newState = applyJudgment(newState, note.id, "miss");
    }
  }

  return newState;
}

/** ゲーム終了判定 */
export function checkGameFinished(state: GameState): boolean {
  return state.notes.every((note) => note.judged);
}

/** 最終スコアの計算 */
export function calculateFinalScore(state: GameState): number {
  return state.score;
}

/** 達成率の計算 */
export function calculateAccuracy(state: GameState): number {
  const total = state.perfectCount + state.goodCount + state.missCount;
  if (total === 0) return 0;
  
  const score = state.perfectCount * 100 + state.goodCount * 50;
  const maxScore = total * 100;
  return Math.round((score / maxScore) * 100);
}
