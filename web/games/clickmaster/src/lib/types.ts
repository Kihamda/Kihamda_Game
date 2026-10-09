/** アップグレードの種類 */
export type UpgradeType = "autoClicker" | "clickPower" | "multiplier";

/** アップグレード定義 */
export interface UpgradeDefinition {
  id: UpgradeType;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  effect: number;
}

/** アップグレードの状態 */
export interface UpgradeState {
  id: UpgradeType;
  level: number;
  cost: number;
}

/** マイルストーン定義 */
export interface Milestone {
  id: string;
  target: number;
  label: string;
}

/** ゲーム状態 */
export interface GameState {
  points: number;
  totalPoints: number;
  clickPower: number;
  autoClicksPerSecond: number;
  multiplier: number;
  upgrades: UpgradeState[];
  achievedMilestones: string[];
}

/** 画面フェーズ */
export type Phase = "start" | "playing";
