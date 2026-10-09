// Pool Master ストレージ

const STORAGE_KEY = "poolmaster_stats";

export interface PoolStats {
  player1Wins: number;
  player2Wins: number;
  totalGames: number;
}

export function loadStats(): PoolStats {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as PoolStats;
    }
  } catch {
    // ignore
  }
  return { player1Wins: 0, player2Wins: 0, totalGames: 0 };
}

export function saveStats(stats: PoolStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}
