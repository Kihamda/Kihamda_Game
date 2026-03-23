import type { ThrowResult } from "../lib/types";
import "./ScorePanel.css";

interface ScorePanelProps {
  throwResults: ThrowResult[];
  lastThrow: ThrowResult | null;
  busted: boolean;
}

export function ScorePanel({ throwResults, lastThrow, busted }: ScorePanelProps) {
  const roundScore = throwResults.reduce((sum, r) => sum + r.score, 0);

  return (
    <div className="score-panel">
      <h2 className="score-panel-title">THIS ROUND</h2>

      <div className="score-panel-throws">
        {[0, 1, 2].map((idx) => {
          const result = throwResults[idx];
          const cls = "score-panel-throw" + (result ? " score-panel-throw--hit" : "");
          return (
            <div key={idx} className={cls}>
              {result ? (
                <>
                  <span className="score-panel-throw-label">{result.label}</span>
                  <span className="score-panel-throw-score">+{result.score}</span>
                </>
              ) : (
                <span className="score-panel-throw-empty">-</span>
              )}
            </div>
          );
        })}
      </div>

      <div className={"score-panel-total" + (busted ? " score-panel-total--bust" : "")}>
        <span className="score-panel-total-label">
          {busted ? "BUST!" : "TOTAL"}
        </span>
        <span className="score-panel-total-value">
          {busted ? "×" : roundScore}
        </span>
      </div>

      {lastThrow && (
        <div className={"score-panel-last " + getScoreClass(lastThrow)}>
          <span className="score-panel-last-label">{lastThrow.label}</span>
          {lastThrow.score > 0 && (
            <span className="score-panel-last-score">+{lastThrow.score}</span>
          )}
        </div>
      )}
    </div>
  );
}

function getScoreClass(result: ThrowResult): string {
  if (result.score === 0) return "score-panel-last--miss";
  if (result.score >= 50) return "score-panel-last--bullseye";
  if (result.multiplier === 3) return "score-panel-last--triple";
  if (result.multiplier === 2) return "score-panel-last--double";
  return "";
}