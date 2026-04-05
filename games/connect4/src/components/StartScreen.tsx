import type { GameMode } from "../lib/types";

interface StartScreenProps {
  onStart: (mode: GameMode) => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="connect4-start">
      <h1 className="connect4-start-title">Connect 4</h1>
      <p className="connect4-start-desc">
        縦横斜め、4つ並べたら勝利！
      </p>
      <div className="connect4-start-modes">
        <button
          type="button"
          className="connect4-start-btn connect4-start-btn--pvp"
          onClick={() => onStart("pvp")}
        >
          👥 2人対戦
        </button>
        <button
          type="button"
          className="connect4-start-btn connect4-start-btn--cpu"
          onClick={() => onStart("cpu")}
        >
          🤖 CPU対戦
        </button>
      </div>
    </div>
  );
}
