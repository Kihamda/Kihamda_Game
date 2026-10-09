/** ゲームフェーズ */
export type Phase = "start" | "playing" | "result";

/** 問題データ */
export interface Question {
  /** 問題文 */
  question: string;
  /** 選択肢 (4つ) */
  choices: string[];
  /** 正解のインデックス (0-3) */
  correctIndex: number;
}

/** ゲーム状態 */
export interface GameState {
  /** 現在の問題インデックス */
  currentIndex: number;
  /** 正解数 */
  score: number;
  /** 回答済みフラグ配列 */
  answers: (boolean | null)[];
  /** 選択した回答インデックス (結果表示用) */
  selectedIndex: number | null;
  /** 回答確定済み */
  answered: boolean;
  /** 連続正解数 */
  combo: number;
  /** 最大連続正解数 */
  maxCombo: number;
}