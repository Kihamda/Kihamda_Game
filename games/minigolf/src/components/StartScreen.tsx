import { GAME_WIDTH, GAME_HEIGHT, COLORS, COURSES } from "../lib/constants";

interface Props {
  onStart: () => void;
  bestScore: number | null;
}

export function StartScreen({ onStart, bestScore }: Props) {
  const totalPar = COURSES.reduce((sum, c) => sum + c.par, 0);

  return (
    <div
      className="minigolf-start"
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
    >
      <div className="minigolf-start-content">
        <h1>⛳ Mini Golf</h1>
        <p className="minigolf-start-desc">
          マウスでドラッグして方向と強さを決め、
          <br />
          少ない打数でカップインを目指そう！
        </p>

        <div className="minigolf-start-info">
          <div className="minigolf-start-info-item">
            <span>コース数</span>
            <strong>3ホール</strong>
          </div>
          <div className="minigolf-start-info-item">
            <span>合計パー</span>
            <strong>{totalPar}</strong>
          </div>
        </div>

        {bestScore !== null && (
          <p className="minigolf-best-score">
            🏆 ベストスコア: {bestScore}打 (PAR{totalPar})
          </p>
        )}

        <button
          type="button"
          className="minigolf-start-button"
          onClick={onStart}
          style={{ backgroundColor: COLORS.grass }}
        >
          ゲームスタート
        </button>
      </div>
    </div>
  );
}