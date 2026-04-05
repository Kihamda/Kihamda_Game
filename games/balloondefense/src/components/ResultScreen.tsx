import { useEffect } from "react";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles } from "@shared/hooks/useParticles";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ShareButton } from "@shared/components/ShareButton";
import type { GameState } from "../lib/types";

interface Props {
  state: GameState;
  highScore: number | null;
  isNewRecord: boolean;
  onRestart: () => void;
}

export function ResultScreen({ state, highScore, isNewRecord, onRestart }: Props) {
  const { playGameOver, playCelebrate } = useAudio();
  const { particles, confetti } = useParticles();
  
  // 初回マウント時に効果音
  useEffect(() => {
    if (isNewRecord) {
      playCelebrate();
      confetti(80);
    } else {
      playGameOver();
    }
  }, [isNewRecord, playGameOver, playCelebrate, confetti]);
  
  return (
    <div className="balloon-result">
      <ParticleLayer particles={particles} />
      <h2 className="balloon-result-title">💥 ゲームオーバー</h2>

      <div className="balloon-result-score">
        <span className="balloon-result-score-label">Score</span>
        <span className="balloon-result-score-value">{state.score}</span>
      </div>

      {isNewRecord && (
        <p className="balloon-new-record">🏆 NEW RECORD!</p>
      )}

      <div className="balloon-result-stats">
        <div className="balloon-stat">
          <span className="balloon-stat-label">到達ウェーブ</span>
          <span className="balloon-stat-value">{state.wave}</span>
        </div>
        <div className="balloon-stat">
          <span className="balloon-stat-label">割った風船</span>
          <span className="balloon-stat-value">{state.poppedCount}</span>
        </div>
      </div>

      {highScore !== null && !isNewRecord && (
        <p className="balloon-result-highscore">ハイスコア: {highScore}</p>
      )}

      <button
        type="button"
        className="balloon-btn"
        onClick={onRestart}
      >
        もう一度プレイ
      </button>
      <ShareButton score={state.score} gameTitle="バルーンディフェンス" gameId="balloondefense" />
    </div>
  );
}
