import type { GameState } from "./types";
import { DIFFICULTY, PATTERNS, WORD_LIST } from "./constants";

/** 単語セット (小文字化して重複排除) */
const WORD_SET = new Set(WORD_LIST.map((w) => w.toLowerCase()));

/** ランダムなパターンを取得 */
export function getRandomPattern(): string {
  return PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
}

/** 単語がパターンを含むか確認 */
export function containsPattern(word: string, pattern: string): boolean {
  return word.toLowerCase().includes(pattern.toLowerCase());
}

/** 単語が辞書に存在するか確認 */
export function isValidWord(word: string): boolean {
  return WORD_SET.has(word.toLowerCase());
}

/** 初期ゲーム状態を作成 */
export function createInitialState(): GameState {
  return {
    phase: "start",
    currentPattern: "",
    answeredWords: [],
    score: 0,
    lives: DIFFICULTY.initialLives,
    timeLeft: DIFFICULTY.timePerRound,
    errorMessage: "",
    round: 0,
  };
}

/** 新しいラウンドを開始 */
export function startNewRound(state: GameState): GameState {
  return {
    ...state,
    phase: "playing",
    currentPattern: getRandomPattern(),
    timeLeft: DIFFICULTY.timePerRound,
    errorMessage: "",
    round: state.round + 1,
  };
}

/** 回答を検証 */
export function validateAnswer(
  state: GameState,
  word: string
): { valid: boolean; errorMessage: string } {
  const lowercaseWord = word.toLowerCase().trim();

  if (!lowercaseWord) {
    return { valid: false, errorMessage: "単語を入力してください" };
  }

  if (state.answeredWords.includes(lowercaseWord)) {
    return { valid: false, errorMessage: "その単語は既に使いました" };
  }

  if (!isValidWord(lowercaseWord)) {
    return { valid: false, errorMessage: "辞書にない単語です" };
  }

  if (!containsPattern(lowercaseWord, state.currentPattern)) {
    return {
      valid: false,
      errorMessage: `「${state.currentPattern.toUpperCase()}」を含む単語を入力してください`,
    };
  }

  return { valid: true, errorMessage: "" };
}

/** 正解時の状態更新 */
export function handleCorrectAnswer(state: GameState, word: string): GameState {
  const newState = {
    ...state,
    answeredWords: [...state.answeredWords, word.toLowerCase()],
    score: state.score + 1,
    errorMessage: "",
  };
  return startNewRound(newState);
}

/** 不正解時の状態更新 */
export function handleWrongAnswer(
  state: GameState,
  errorMessage: string
): GameState {
  return {
    ...state,
    errorMessage,
  };
}

/** タイムアップ時の状態更新 */
export function handleTimeUp(state: GameState): GameState {
  const newLives = state.lives - 1;

  if (newLives <= 0) {
    return {
      ...state,
      lives: 0,
      phase: "result",
    };
  }

  const nextState = {
    ...state,
    lives: newLives,
    errorMessage: "💥 タイムアップ！ ライフ -1",
  };
  return startNewRound(nextState);
}

/** ゲームをリセット */
export function resetGame(): GameState {
  return createInitialState();
}

/** ゲームを開始 */
export function startGame(): GameState {
  return startNewRound({
    ...createInitialState(),
    phase: "playing",
  });
}