interface ResultScreenProps {
  winner: string | null;
  onReset: () => void;
}

const ResultScreen = ({ winner, onReset }: ResultScreenProps) => (
  <div className="result">
    <h1>ゲーム終了</h1>
    <h2>{winner} の勝利！</h2>
    <button onClick={onReset}>新しいゲーム</button>
  </div>
);

export default ResultScreen;
