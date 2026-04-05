import { ShareButton } from "@shared";

interface ResultScreenProps {
  winner: string | null;
  onReset: () => void;
}

const ResultScreen = ({ winner, onReset }: ResultScreenProps) => (
  <div className="result">
    <h1>ゲーム終了</h1>
    {winner ? (
      <h2>{winner} の勝利</h2>
    ) : (
      <h2 className="draw-title">引き分け！</h2>
    )}
    <button onClick={onReset}>新しいゲーム</button>
    <ShareButton score={1} gameTitle="Nine Tik Tak Toe" gameId="ntiktaktoe" />
  </div>
);

export default ResultScreen;
