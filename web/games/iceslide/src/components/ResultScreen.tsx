import { getRating } from "../lib/iceslide";
import type { Stage } from "../lib/types";

interface Props {
  stage: Stage;
  moves: number;
  onNext: () => void;
  onRetry: () => void;
  onStageSelect: () => void;
  hasNextStage: boolean;
}

export function ResultScreen({
  stage,
  moves,
  onNext,
  onRetry,
  onStageSelect,
  hasNextStage,
}: Props) {
  const stars = getRating(moves, stage.par);

  return (
    <div className="is-screen">
      <h1 className="is-title">🎉 ステージクリア！</h1>
      <div className="is-result-stage">
        Stage {stage.id}: {stage.name}
      </div>
      <div className="is-result-moves">
        {moves} 手でクリア (パー: {stage.par})
      </div>
      <div className="is-result-stars">
        {"⭐".repeat(stars)}{"☆".repeat(3 - stars)}
      </div>
      <div className="is-result-message">
        {stars === 3 && "パーフェクト！🏆"}
        {stars === 2 && "すばらしい！👏"}
        {stars === 1 && "クリアおめでとう！"}
      </div>
      <div className="is-buttons">
        {hasNextStage && (
          <button className="is-btn is-btn--next" onClick={onNext}>
            次のステージへ →
          </button>
        )}
        <button className="is-btn is-btn--retry" onClick={onRetry}>
          もう一度挑戦
        </button>
        <button className="is-btn is-btn--select" onClick={onStageSelect}>
          ステージ選択
        </button>
      </div>
    </div>
  );
}
