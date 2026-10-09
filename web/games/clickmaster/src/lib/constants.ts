import type { UpgradeDefinition, UpgradeType, Milestone } from "./types";

/** ゲーム幅 */
export const GAME_WIDTH = 600;

/** ゲーム高さ */
export const GAME_HEIGHT = 700;

/** 自動クリック間隔 (ms) */
export const AUTO_CLICK_INTERVAL = 1000;

/** アップグレード定義 */
export const UPGRADES: Record<UpgradeType, UpgradeDefinition> = {
  autoClicker: {
    id: "autoClicker",
    name: "自動クリッカー",
    description: "毎秒自動でポイント獲得 (+1/秒)",
    baseCost: 15,
    costMultiplier: 1.15,
    effect: 1,
  },
  clickPower: {
    id: "clickPower",
    name: "クリックパワー",
    description: "クリック時の獲得ポイント増加 (+1)",
    baseCost: 10,
    costMultiplier: 1.2,
    effect: 1,
  },
  multiplier: {
    id: "multiplier",
    name: "マルチプライヤー",
    description: "全ての獲得ポイントを倍増 (x1.5)",
    baseCost: 100,
    costMultiplier: 1.5, // Balanced: matches multiplier effect rate
    effect: 1.5,
  },
};

/** 初期アップグレード状態 */
export const INITIAL_UPGRADES: UpgradeType[] = [
  "clickPower",
  "autoClicker",
  "multiplier",
];

/** マイルストーン定義 */
export const MILESTONES: Milestone[] = [
  { id: "m100", target: 100, label: "100ポイント達成！" },
  { id: "m500", target: 500, label: "500ポイント達成！" },
  { id: "m1000", target: 1000, label: "1,000ポイント達成！" },
  { id: "m5000", target: 5000, label: "5,000ポイント達成！" },
  { id: "m10000", target: 10000, label: "10,000ポイント達成！" },
  { id: "m50000", target: 50000, label: "50,000ポイント達成！" },
  { id: "m100000", target: 100000, label: "100,000ポイント達成！" },
  { id: "m500000", target: 500000, label: "500,000ポイント達成！" },
  { id: "m1000000", target: 1000000, label: "🎉 1,000,000ポイント達成！" },
  { id: "m5000000", target: 5000000, label: "⭐ 5,000,000ポイント達成！" },
  { id: "m10000000", target: 10000000, label: "🏆 10,000,000ポイント達成！" },
  { id: "m100000000", target: 100000000, label: "👑 100,000,000ポイント達成！" },
  { id: "m1000000000", target: 1000000000, label: "🌟 1,000,000,000ポイント達成！" },
];

/** ストレージキー */
export const STORAGE_KEY = "clickmaster_save";
