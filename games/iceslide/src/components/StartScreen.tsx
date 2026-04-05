interface Props {
  onStart: () => void;
  onStageSelect: () => void;
  clearedCount: number;
  totalStages: number;
}

export function StartScreen({ onStart, onStageSelect, clearedCount, totalStages }: Props) {
  return (
    <div className="is-screen">
      <h1 className="is-title">❄️ アイススライドパズル</h1>
      <p className="is-desc">
        氷の上を滑って、ゴールを目指そう！
        <br />
        壁にぶつかるまで止まれない…
      </p>
      <div className="is-progress">
        クリア: {clearedCount} / {totalStages} ステージ
      </div>
      <div className="is-buttons">
        <button className="is-btn is-btn--start" onClick={onStart}>
          ゲームスタート
        </button>
        <button className="is-btn is-btn--select" onClick={onStageSelect}>
          ステージ選択
        </button>
      </div>
      <div className="is-controls-hint">
        <p>操作: 矢印キー or WASD or スワイプ</p>
      </div>
    </div>
  );
}
