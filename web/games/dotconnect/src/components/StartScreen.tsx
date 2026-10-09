import type { PuzzleStage } from "../lib/types";
import { STAGES } from "../lib/dotconnect";
import { isStageCleared } from "../lib/storage";

interface StartScreenProps {
  onSelectStage: (stage: PuzzleStage) => void;
}

export function StartScreen({ onSelectStage }: StartScreenProps) {
  return (
    <div className="dotconnect-start">
      <h1 className="dotconnect-start-title">ドットコネクト</h1>
      <p className="dotconnect-start-desc">
        同じ色のドットを線でつなごう！
        <br />
        線は交差できません
      </p>
      <div className="dotconnect-stages">
        {STAGES.map((stage) => {
          const cleared = isStageCleared(stage.id);
          return (
            <button
              key={stage.id}
              type="button"
              className={`dotconnect-stage-btn ${cleared ? "cleared" : ""}`}
              onClick={() => onSelectStage(stage)}
            >
              <span className="dotconnect-stage-num">Stage {stage.id}</span>
              <span className="dotconnect-stage-name">{stage.name}</span>
              {cleared && <span className="dotconnect-stage-check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
