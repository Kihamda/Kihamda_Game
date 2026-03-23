import type { Stage } from "../lib/types";
import type { Progress } from "../lib/storage";
import { STAGES } from "../lib/constants";

interface Props {
  progress: Progress;
  onSelect: (stageId: number) => void;
  onBack: () => void;
}

export function StageSelect({ progress, onSelect, onBack }: Props) {
  const isUnlocked = (stage: Stage): boolean => {
    // Stage 1 is always unlocked
    if (stage.id === 1) return true;
    // Unlock if previous stage is cleared
    return progress.cleared.includes(stage.id - 1);
  };

  return (
    <div className="is-screen">
      <h1 className="is-title">ステージ選択</h1>
      <div className="is-stage-grid">
        {STAGES.map((stage) => {
          const unlocked = isUnlocked(stage);
          const cleared = progress.cleared.includes(stage.id);
          const bestMoves = progress.bestMoves[stage.id];
          const stars = cleared
            ? bestMoves <= stage.par
              ? 3
              : bestMoves <= stage.par + 2
                ? 2
                : 1
            : 0;

          return (
            <button
              key={stage.id}
              className={`is-stage-btn ${cleared ? "is-stage-btn--cleared" : ""} ${!unlocked ? "is-stage-btn--locked" : ""}`}
              onClick={() => unlocked && onSelect(stage.id)}
              disabled={!unlocked}
            >
              <span className="is-stage-num">{stage.id}</span>
              {cleared && (
                <span className="is-stage-stars">
                  {"⭐".repeat(stars)}{"☆".repeat(3 - stars)}
                </span>
              )}
              {!unlocked && <span className="is-stage-lock">🔒</span>}
            </button>
          );
        })}
      </div>
      <button className="is-btn is-btn--back" onClick={onBack}>
        戻る
      </button>
    </div>
  );
}
