import { ShareButton } from "@shared/components/ShareButton";
import type { PuzzleStage } from "../lib/types";
import { STAGES } from "../lib/dotconnect";

interface ResultScreenProps {
  stage: PuzzleStage;
  onNextStage: () => void;
  onRetry: () => void;
  onBackToStart: () => void;
}

export function ResultScreen({
  stage,
  onNextStage,
  onRetry,
  onBackToStart,
}: ResultScreenProps) {
  const hasNextStage = STAGES.some((s) => s.id === stage.id + 1);

  return (
    <div className="dotconnect-result">
      <div className="dotconnect-result-icon">🎉</div>
      <h2 className="dotconnect-result-title">ステージクリア！</h2>
      <p className="dotconnect-result-stage">
        Stage {stage.id}: {stage.name}
      </p>
      <ShareButton score={stage.id} gameTitle="Dot Connect" gameId="dotconnect" />
      <div className="dotconnect-result-btns">
        {hasNextStage && (
          <button
            type="button"
            className="dotconnect-btn dotconnect-btn--primary"
            onClick={onNextStage}
          >
            次のステージ
          </button>
        )}
        <button
          type="button"
          className="dotconnect-btn dotconnect-btn--secondary"
          onClick={onRetry}
        >
          もう一度
        </button>
        <button
          type="button"
          className="dotconnect-btn dotconnect-btn--ghost"
          onClick={onBackToStart}
        >
          ステージ選択
        </button>
      </div>
    </div>
  );
}
