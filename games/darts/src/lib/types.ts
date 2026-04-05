/** ダーツの投擲結果 */
export interface ThrowResult {
  /** スコア値 */
  score: number;
  /** 倍率 (1: シングル, 2: ダブル, 3: トリプル) */
  multiplier: 1 | 2 | 3;
  /** セクション番号 (1-20, 25はブル) */
  section: number;
  /** 表示用ラベル */
  label: string;
  /** ヒット位置 (中心からの相対座標) */
  position: { x: number; y: number };
}

/** ラウンドの状態 */
export interface RoundState {
  /** 現在のラウンド番号 (1-) */
  roundNumber: number;
  /** ラウンド内の投擲回数 (0-2) */
  throwsInRound: number;
  /** ラウンド内の投擲結果 */
  throwResults: ThrowResult[];
}

/** ゲーム全体の状態 */
export interface GameState {
  /** ゲームフェーズ */
  phase: "ready" | "playing" | "finished";
  /** 現在のスコア (301から減算) */
  score: number;
  /** 現在のラウンド */
  round: RoundState;
  /** 全投擲履歴 */
  history: ThrowResult[];
  /** バースト（オーバー）したか */
  busted: boolean;
}

/** ダーツボードのセクション情報 */
export interface BoardSection {
  /** セクション番号 */
  number: number;
  /** 開始角度 (deg) */
  startAngle: number;
  /** 終了角度 (deg) */
  endAngle: number;
}
