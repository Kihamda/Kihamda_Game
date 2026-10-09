import type { Question, GameState } from "./types";
import { QUESTION_POOL, TOTAL_QUESTIONS } from "./constants";

/** 問題をシャッフルして指定数を取得 */
export function selectQuestions(count: number): Question[] {
  const shuffled = [...QUESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** 初期ゲーム状態を生成 */
export function createInitialState(): GameState {
  return {
    currentIndex: 0,
    score: 0,
    answers: Array(TOTAL_QUESTIONS).fill(null),
    selectedIndex: null,
    answered: false,
    combo: 0,
    maxCombo: 0,
  };
}

/** 回答を処理し新しい状態を返す */
export function processAnswer(
  state: GameState,
  selectedIndex: number,
  correctIndex: number
): GameState {
  const isCorrect = selectedIndex === correctIndex;
  const newAnswers = [...state.answers];
  newAnswers[state.currentIndex] = isCorrect;
  const newCombo = isCorrect ? state.combo + 1 : 0;

  return {
    ...state,
    score: isCorrect ? state.score + 1 : state.score,
    answers: newAnswers,
    selectedIndex,
    answered: true,
    combo: newCombo,
    maxCombo: Math.max(state.maxCombo, newCombo),
  };
}

/** 次の問題へ進む */
export function nextQuestion(state: GameState): GameState {
  return {
    ...state,
    currentIndex: state.currentIndex + 1,
    selectedIndex: null,
    answered: false,
  };
}

/** ゲーム終了判定 */
export function isGameOver(state: GameState): boolean {
  return state.currentIndex >= TOTAL_QUESTIONS;
}

/** スコアに応じた評価メッセージ */
export function getResultMessage(score: number): { emoji: string; message: string } {
  if (score === TOTAL_QUESTIONS) {
    return { emoji: "🏆", message: "パーフェクト！天才！" };
  }
  if (score >= 8) {
    return { emoji: "🎉", message: "すばらしい！博識ですね！" };
  }
  if (score >= 6) {
    return { emoji: "👍", message: "なかなかの知識量！" };
  }
  if (score >= 4) {
    return { emoji: "😊", message: "まずまずの結果！" };
  }
  return { emoji: "📚", message: "もっと勉強しよう！" };
}