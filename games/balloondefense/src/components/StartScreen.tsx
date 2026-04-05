interface Props {
  highScore: number | null;
  onStart: () => void;
}

export function StartScreen({ highScore, onStart }: Props) {
  return (
    <div className="balloon-start">
      <h1 className="balloon-title">🎈 バルーンディフェンス</h1>
      <p className="balloon-description">
        風船をタップして割れ！<br />
        画面下に到達させるとライフが減るよ
      </p>

      <div className="balloon-rules">
        <p className="balloon-rules-title">風船の種類</p>
        <ul className="balloon-rules-list">
          <li><span className="balloon-icon normal">🎈</span> 通常: 10点</li>
          <li><span className="balloon-icon fast">🎈</span> 高速: 20点</li>
          <li><span className="balloon-icon small">🎈</span> 小さい: 30点</li>
          <li><span className="balloon-icon bonus">🎈</span> ボーナス: 50点</li>
        </ul>
      </div>

      {highScore !== null && (
        <p className="balloon-highscore">🏆 ハイスコア: {highScore}</p>
      )}

      <button
        type="button"
        className="balloon-btn balloon-btn-start"
        onClick={onStart}
      >
        ゲームスタート
      </button>
    </div>
  );
}
