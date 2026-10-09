export type LetterState = "correct" | "present" | "absent" | "empty";

export interface LetterResult {
  letter: string;
  state: LetterState;
}

export type GamePhase = "start" | "playing" | "won" | "lost";

export interface GameState {
  phase: GamePhase;
  targetWord: string;
  attempts: LetterResult[][];
  currentAttempt: string;
  currentRow: number;
  keyboardState: Record<string, LetterState>;
  message: string;
}
