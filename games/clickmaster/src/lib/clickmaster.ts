import type { GameState, UpgradeState, UpgradeType, Milestone } from "./types";
import { INITIAL_UPGRADES, UPGRADES, MILESTONES } from "./constants";

/** 初期ゲーム状態を生成 */
export function createInitialState(): GameState {
  const upgrades: UpgradeState[] = INITIAL_UPGRADES.map((id) => ({
    id,
    level: 0,
    cost: UPGRADES[id].baseCost,
  }));

  return {
    points: 0,
    totalPoints: 0,
    clickPower: 1,
    autoClicksPerSecond: 0,
    multiplier: 1,
    upgrades,
    achievedMilestones: [],
  };
}

/** 新しく達成したマイルストーンをチェック */
export function checkMilestones(state: GameState): Milestone | null {
  for (const milestone of MILESTONES) {
    if (
      state.totalPoints >= milestone.target &&
      !state.achievedMilestones.includes(milestone.id)
    ) {
      return milestone;
    }
  }
  return null;
}

/** マイルストーンを達成済みにする */
export function achieveMilestone(state: GameState, milestoneId: string): GameState {
  if (state.achievedMilestones.includes(milestoneId)) return state;
  return {
    ...state,
    achievedMilestones: [...state.achievedMilestones, milestoneId],
  };
}

/** クリック処理 */
export function processClick(state: GameState): GameState {
  const earned = Math.floor(state.clickPower * state.multiplier);
  return {
    ...state,
    points: state.points + earned,
    totalPoints: state.totalPoints + earned,
  };
}

/** 自動クリック処理 (1秒分) */
export function processAutoClick(state: GameState): GameState {
  if (state.autoClicksPerSecond <= 0) return state;
  const earned = Math.floor(state.autoClicksPerSecond * state.multiplier);
  return {
    ...state,
    points: state.points + earned,
    totalPoints: state.totalPoints + earned,
  };
}

/** アップグレード購入可能か判定 */
export function canPurchaseUpgrade(
  state: GameState,
  upgradeId: UpgradeType
): boolean {
  const upgrade = state.upgrades.find((u) => u.id === upgradeId);
  return upgrade !== undefined && state.points >= upgrade.cost;
}

/** アップグレード購入 */
export function purchaseUpgrade(
  state: GameState,
  upgradeId: UpgradeType
): GameState {
  if (!canPurchaseUpgrade(state, upgradeId)) return state;

  const definition = UPGRADES[upgradeId];
  const upgradeIndex = state.upgrades.findIndex((u) => u.id === upgradeId);
  const upgrade = state.upgrades[upgradeIndex];

  const newLevel = upgrade.level + 1;
  const rawCost = definition.baseCost * Math.pow(definition.costMultiplier, newLevel);
  const newCost = !isFinite(rawCost) ? Number.MAX_SAFE_INTEGER : Math.floor(rawCost);

  const newUpgrades = [...state.upgrades];
  newUpgrades[upgradeIndex] = {
    ...upgrade,
    level: newLevel,
    cost: newCost,
  };

  let newState: GameState = {
    ...state,
    points: state.points - upgrade.cost,
    upgrades: newUpgrades,
  };

  // 効果を適用
  switch (upgradeId) {
    case "clickPower":
      newState = {
        ...newState,
        clickPower: newState.clickPower + definition.effect,
      };
      break;
    case "autoClicker":
      newState = {
        ...newState,
        autoClicksPerSecond: newState.autoClicksPerSecond + definition.effect,
      };
      break;
    case "multiplier":
      newState = {
        ...newState,
        multiplier: Math.min(newState.multiplier * definition.effect, 1e12), // Cap at 1 trillion
      };
      break;
  }

  return newState;
}

/** 数値をフォーマット */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + "K";
  }
  return Math.floor(num).toLocaleString();
}
