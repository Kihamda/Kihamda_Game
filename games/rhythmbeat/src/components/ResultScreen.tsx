import { useEffect, useRef } from "react";
import type { GameState } from "../lib/types";
import { calculateAccuracy } from "../lib/rhythmbeat";
import { useParticles, useAudio, ParticleLayer, ShareButton, GameRecommendations } from "@shared";

interface Props {
  state: GameState;
  highScore: number | null;
  isNewRecord: boolean;
  onRestart: () => void;
}

export function ResultScreen({ state, highScore, isNewRecord, onRestart }: Props) {
  const accuracy = calculateAccuracy(state);
  const { particles, confetti, explosion } = useParticles();
  const audio = useAudio();
  const hasPlayedRef = useRef(false);

  // フルコンボ判定
  const isFullCombo = state.missCount === 0 && state.notes.length > 0;
  // オールパーフェクト判定
  const isAllPerfect =
    isFullCombo && state.perfectCount === state.notes.length;

  // 結果画面表示時の演出
  useEffect(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    // 演出のタイミングをずらして実行
    setTimeout(() => {
      if (isAllPerfect) {
        // オールパーフェクト: 豪華なconfetti + 爆発 + ファンファーレ
        audio.playCelebrate();
        confetti(80);
        setTimeout(() => explosion(250, 350, 30), 200);
        setTimeout(() => confetti(60), 500);
      } else if (isFullCombo) {
        // フルコンボ: confetti + ファンファーレ
        audio.playFanfare();
        confetti(50);
        setTimeout(() => confetti(30), 300);
      } else if (isNewRecord) {
        // 新記録: 控えめなconfetti
        audio.playBonus();
        confetti(30);
      } else {
        // 通常終了
        audio.playSuccess();
      }
    }, 100);
  }, [isAllPerfect, isFullCombo, isNewRecord, audio, confetti, explosion]);

  return (
    <div className="rhythmbeat-result">
      {/* パーティクルレイヤー */}
      <ParticleLayer particles={particles} />

      <h2 className="rhythmbeat-result-title">
        {isAllPerfect
          ? "🌟 ALL PERFECT! 🌟"
          : isFullCombo
            ? "🎉 FULL COMBO! 🎉"
            : "🎉 Result"}
      </h2>

      <div className="rhythmbeat-result-score">
        <span className="rhythmbeat-result-score-label">Score</span>
        <span className="rhythmbeat-result-score-value">{state.score}</span>
      </div>

      {isNewRecord && (
        <p className="rhythmbeat-new-record">🏆 NEW RECORD!</p>
      )}

      <div className="rhythmbeat-result-stats">
        <div className="rhythmbeat-stat">
          <span className="rhythmbeat-stat-label">Perfect</span>
          <span className="rhythmbeat-stat-value perfect">{state.perfectCount}</span>
        </div>
        <div className="rhythmbeat-stat">
          <span className="rhythmbeat-stat-label">Good</span>
          <span className="rhythmbeat-stat-value good">{state.goodCount}</span>
        </div>
        <div className="rhythmbeat-stat">
          <span className="rhythmbeat-stat-label">Miss</span>
          <span className="rhythmbeat-stat-value miss">{state.missCount}</span>
        </div>
      </div>

      <div className="rhythmbeat-result-extra">
        <p>最大コンボ: {state.maxCombo}</p>
        <p>達成率: {accuracy}%</p>
        {highScore !== null && !isNewRecord && (
          <p>ハイスコア: {highScore}</p>
        )}
      </div>

      <button
        type="button"
        className="rhythmbeat-btn"
        onClick={onRestart}
      >
        もう一度
      </button>
      <ShareButton score={state.score} gameTitle="Rhythm Beat" gameId="rhythmbeat" />
      <GameRecommendations currentGameId="rhythmbeat" />
    </div>
  );
}
