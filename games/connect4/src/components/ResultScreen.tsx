import { ShareButton } from "@shared/components/ShareButton";
import type { GameMode, Player } from "../lib/types";

interface ResultScreenProps {
  winner: Player | null;
  isDraw: boolean;
  gameMode: GameMode;
  onRestart: () => void;
  onBackToStart: () => void;
}

export function ResultScreen({
  winner,
  isDraw,
  gameMode,
  onRestart,
  onBackToStart,
}: ResultScreenProps) {
  const getResultMessage = () => {
    if (isDraw) return "引き分け！";
    if (gameMode === "cpu") {
      return winner === 1 ? "🎉 あなたの勝利！" : "🤖 CPUの勝利...";
    }
    return winner === 1 ? "🔴 赤の勝利！" : "🟡 黄の勝利！";
  };

  // スコアは勝利=1、引き分け=0、敗北=-1として扱う
  const getScore = () => {
    if (isDraw) return 0;
    if (gameMode === "cpu") {
      return winner === 1 ? 1 : 0;
    }
    return winner === 1 ? 1 : 2; // 2Pモードではプレイヤー番号をスコアとして使用
  };

  return (
    <div className="connect4-result">
      <h2 className="connect4-result-title">{getResultMessage()}</h2>
      <div className="connect4-result-btns">
        <button
          type="button"
          className="connect4-result-btn"
          onClick={onRestart}
        >
          もう一度
        </button>
        <button
          type="button"
          className="connect4-result-btn connect4-result-btn--back"
          onClick={onBackToStart}
        >
          モード選択へ
        </button>
      </div>
      <ShareButton score={getScore()} gameTitle="Connect 4" gameId="connect4" />
    </div>
  );
}
