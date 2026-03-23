/** ゲームフェーズ */
export type Phase = "start" | "playing" | "result";

/** ゲーム状態 */
export interface GameState {
  phase: Phase;
  /** 現在の出題 (含むべき文字列) */
  currentPattern: string;
  /** 回答済みの単語リスト */
  answeredWords: string[];
  /** スコア (正解数) */
  score: number;
  /** 残りライフ */
  lives: number;
  /** 残り時間 (秒) */
  timeLeft: number;
  /** エラーメッセージ */
  errorMessage: string;
  /** 現在のラウンド数 */
  round: number;
}

/** 難易度設定 */
export interface DifficultyConfig {
  timePerRound: number;
  initialLives: number;
}