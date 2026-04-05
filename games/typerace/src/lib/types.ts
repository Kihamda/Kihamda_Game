// タイピングレースの型定義

export type Phase = "idle" | "playing" | "result";

export type Difficulty = "easy" | "normal" | "hard";

export interface GameSettings {
  difficulty: Difficulty;
  timeLimit: number; // 秒
}

export interface GameStats {
  correctChars: number;
  totalChars: number;
  correctWords: number;
  totalWords: number;
  startTime: number;
  endTime: number;
}

export interface GameResult {
  wpm: number;
  accuracy: number;
  correctChars: number;
  totalChars: number;
  correctWords: number;
  totalWords: number;
  score: number;
}
