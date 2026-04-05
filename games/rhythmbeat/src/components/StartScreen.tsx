import { DIFFICULTIES, LANE_COLORS, LANE_KEYS } from "../lib/constants";

interface Props {
  highScore: number | null;
  onStart: (difficulty: string) => void;
}

export function StartScreen({ highScore, onStart }: Props) {
  return (
    <div className="rhythmbeat-start">
      <h1 className="rhythmbeat-title">🎵 Rhythm Beat</h1>
      <p className="rhythmbeat-description">
        ノートが判定ラインに来たらタップ！
      </p>

      <div className="rhythmbeat-controls">
        <p className="rhythmbeat-controls-title">操作方法</p>
        <div className="rhythmbeat-keys">
          {LANE_KEYS.map((key, i) => (
            <span
              key={key}
              className="rhythmbeat-key"
              style={{ backgroundColor: LANE_COLORS[i] }}
            >
              {key.toUpperCase()}
            </span>
          ))}
        </div>
        <p className="rhythmbeat-controls-hint">または各レーンをタップ</p>
      </div>

      {highScore !== null && (
        <p className="rhythmbeat-highscore">🏆 ハイスコア: {highScore}</p>
      )}

      <div className="rhythmbeat-difficulty-list">
        {Object.entries(DIFFICULTIES).map(([key, config]) => (
          <button
            key={key}
            type="button"
            className="rhythmbeat-difficulty-btn"
            onClick={() => onStart(key)}
          >
            {config.label}
            <span className="rhythmbeat-difficulty-bpm">{config.bpm} BPM</span>
          </button>
        ))}
      </div>
    </div>
  );
}
