import type { HoleScore } from "../lib/types";
import { GAME_WIDTH, GAME_HEIGHT, COLORS, COURSES } from "../lib/constants";
import { getScoreLabel, getTotalScore, getTotalPar } from "../lib/minigolf";

interface Props {
  scores: HoleScore[];
  bestScore: number | null;
  isNewBest: boolean;
  onRestart: () => void;
}

export function ResultScreen({ scores, bestScore, isNewBest, onRestart }: Props) {
  const totalScore = getTotalScore(scores);
  const totalPar = getTotalPar(scores);
  const diff = totalScore - totalPar;

  return (
    <div
      className="minigolf-result"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
    >
      <div className="minigolf-result-content">
        <h1>🎉 ラウンド終了！</h1>

        {isNewBest && <p className="minigolf-new-best">🏆 ベストスコア更新！</p>}

        <div className="minigolf-result-total">
          <span className="minigolf-result-label">トータルスコア</span>
          <span className="minigolf-result-score">
            {totalScore}打
            <span className="minigolf-result-diff">
              ({diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff})
            </span>
          </span>
        </div>

        <table className="minigolf-result-table">
          <thead>
            <tr>
              <th>ホール</th>
              <th>パー</th>
              <th>スコア</th>
              <th>結果</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{COURSES[i].par}</td>
                <td>{score.strokes}</td>
                <td className={`minigolf-score-label minigolf-score-${score.strokes <= score.par ? "good" : "bad"}`}>
                  {getScoreLabel(score.strokes, score.par)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {bestScore !== null && !isNewBest && (
          <p className="minigolf-best-record">ベストスコア: {bestScore}打</p>
        )}

        <button
          type="button"
          className="minigolf-restart-button"
          onClick={onRestart}
          style={{ backgroundColor: COLORS.grass }}
        >
          もう一度プレイ
        </button>
      </div>
    </div>
  );
}