import type { GameState, LetterResult, LetterState } from "./types";
import { MAX_ATTEMPTS, WORD_LENGTH, WORD_LIST } from "./constants";

export function getRandomWord(): string {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}

export function createInitialState(): GameState {
  return {
    phase: "start",
    targetWord: "",
    attempts: [],
    currentAttempt: "",
    currentRow: 0,
    keyboardState: {},
    message: "",
  };
}

export function startGame(): GameState {
  return {
    phase: "playing",
    targetWord: getRandomWord(),
    attempts: [],
    currentAttempt: "",
    currentRow: 0,
    keyboardState: {},
    message: "",
  };
}

export function evaluateGuess(guess: string, target: string): LetterResult[] {
  const result: LetterResult[] = [];
  const targetArr = target.split("");
  const guessArr = guess.split("");
  const targetCounts: Record<string, number> = {};

  // Count letters in target
  for (const letter of targetArr) {
    targetCounts[letter] = (targetCounts[letter] || 0) + 1;
  }

  // First pass: mark correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = { letter: guessArr[i], state: "correct" };
      targetCounts[guessArr[i]]--;
    }
  }

  // Second pass: mark present/absent
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i]) continue;

    if (targetCounts[guessArr[i]] > 0) {
      result[i] = { letter: guessArr[i], state: "present" };
      targetCounts[guessArr[i]]--;
    } else {
      result[i] = { letter: guessArr[i], state: "absent" };
    }
  }

  return result;
}

export function updateKeyboardState(
  current: Record<string, LetterState>,
  results: LetterResult[]
): Record<string, LetterState> {
  const updated = { ...current };
  const priority: Record<LetterState, number> = {
    correct: 3,
    present: 2,
    absent: 1,
    empty: 0,
  };

  for (const { letter, state } of results) {
    const upperLetter = letter.toUpperCase();
    const existing = updated[upperLetter];
    if (!existing || priority[state] > priority[existing]) {
      updated[upperLetter] = state;
    }
  }

  return updated;
}

export function submitGuess(state: GameState): GameState {
  const guess = state.currentAttempt.toLowerCase();

  if (guess.length !== WORD_LENGTH) {
    return { ...state, message: "5文字入力してください" };
  }

  // Validate word is in dictionary
  if (!WORD_LIST.includes(guess)) {
    return { ...state, message: "この単語は辞書にありません" };
  }

  const results = evaluateGuess(guess, state.targetWord);
  const newAttempts = [...state.attempts, results];
  const newKeyboardState = updateKeyboardState(state.keyboardState, results);
  const isWin = guess === state.targetWord;
  const isLoss = newAttempts.length >= MAX_ATTEMPTS && !isWin;

  return {
    ...state,
    attempts: newAttempts,
    currentAttempt: "",
    currentRow: state.currentRow + 1,
    keyboardState: newKeyboardState,
    message: "",
    phase: isWin ? "won" : isLoss ? "lost" : "playing",
  };
}

export function addLetter(state: GameState, letter: string): GameState {
  if (state.currentAttempt.length >= WORD_LENGTH) return state;
  return {
    ...state,
    currentAttempt: state.currentAttempt + letter.toUpperCase(),
    message: "",
  };
}

export function removeLetter(state: GameState): GameState {
  if (state.currentAttempt.length === 0) return state;
  return {
    ...state,
    currentAttempt: state.currentAttempt.slice(0, -1),
    message: "",
  };
}
