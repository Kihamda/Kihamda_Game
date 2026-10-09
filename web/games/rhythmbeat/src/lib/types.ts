/** ノートの判定結果 */
export type Judgment = "perfect" | "good" | "miss";

/** ノートの状態 */
export interface Note {
  /** 一意のID */
  id: number;
  /** レーン番号 (0-3) */
  lane: number;
  /** ノートが判定ラインに到達する時間 (ms) */
  targetTime: number;
  /** 判定済みかどうか */
  judged: boolean;
  /** 判定結果 */
  judgment?: Judgment;
}

/** ゲームの状態 */
export interface GameState {
  /** 現在のスコア */
  score: number;
  /** 現在のコンボ */
  combo: number;
  /** 最大コンボ */
  maxCombo: number;
  /** Perfect数 */
  perfectCount: number;
  /** Good数 */
  goodCount: number;
  /** Miss数 */
  missCount: number;
  /** ノート一覧 */
  notes: Note[];
  /** ゲーム開始時間 (performance.now) */
  startTime: number;
  /** ゲーム終了フラグ */
  isFinished: boolean;
}

/** ゲームフェーズ */
export type GamePhase = "start" | "playing" | "result";

/** 難易度設定 */
export interface DifficultyConfig {
  /** 表示名 */
  label: string;
  /** ノートの落下速度 (px/ms) */
  speed: number;
  /** BPM */
  bpm: number;
  /** 曲の長さ (拍数) */
  totalBeats: number;
}
