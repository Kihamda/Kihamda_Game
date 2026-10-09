import type { PoolStats } from "../lib/storage";

interface Props {
  onStart: () => void;
  stats: PoolStats;
}

export function StartScreen({ onStart, stats }: Props) {
  return (
    <div className="pool-start">
      <h1>🎱 Pool Master</h1>
      <p className="subtitle">8ボールルール簡易版 - 2人対戦</p>
      <button type="button" className="pool-start-btn" onClick={onStart}>
        ゲーム開始
      </button>
      {stats.totalGames > 0 && (
        <div className="pool-stats">
          対戦記録: Player 1 {stats.player1Wins}勝 / Player 2 {stats.player2Wins}勝
          (全{stats.totalGames}戦)
        </div>
      )}
    </div>
  );
}
