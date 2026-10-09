import { STORAGE_KEY } from "../lib/constants";

interface Props {
  onStart: (continueGame: boolean) => void;
}

export function StartScreen({ onStart }: Props) {
  const hasSave = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  })();

  return (
    <div className="clickmaster-start">
      <h1>Click Master</h1>
      <p>
        クリックでポイントを稼いでアップグレードを購入しよう！
        自動生成やクリックパワーを強化して累計スコアを伸ばせ！
      </p>
      <div className="clickmaster-start-buttons">
        {hasSave && (
          <button
            type="button"
            className="clickmaster-btn clickmaster-btn-primary"
            onClick={() => onStart(true)}
          >
            続きから
          </button>
        )}
        <button
          type="button"
          className="clickmaster-btn"
          onClick={() => onStart(false)}
        >
          {hasSave ? "最初から" : "ゲーム開始"}
        </button>
      </div>
    </div>
  );
}
