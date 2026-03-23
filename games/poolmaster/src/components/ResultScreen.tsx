interface Props {
  winnerName: string;
  reason: string;
  onRestart: () => void;
}

export function ResultScreen({ winnerName, reason, onRestart }: Props) {
  return (
    <div className="pool-result">
      <h2>🏆 GAME OVER</h2>
      <div className="winner-name">{winnerName} WIN!</div>
      <p>{reason}</p>
      <button type="button" className="pool-result-btn" onClick={onRestart}>
        もう一度プレイ
      </button>
    </div>
  );
}
