import { useEffect } from "react";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import { ParticleLayer } from "@shared/components/ParticleLayer";

interface Props {
  wave: number;
  onNextWave: () => void;
}

export function WaveClearScreen({ wave, onNextWave }: Props) {
  const { particles, confetti } = useParticles();
  const { playLevelUp } = useAudio();
  
  // 初回マウント時に紙吹雪と効果音
  useEffect(() => {
    confetti(60);
    playLevelUp();
  }, [confetti, playLevelUp]);
  
  return (
    <div className="balloon-wave-clear">
      <ParticleLayer particles={particles} />
      <h2 className="balloon-wave-clear-title">🎉 Wave {wave} クリア!</h2>
      <p className="balloon-wave-clear-message">
        次のウェーブはさらに難しくなるよ！
      </p>
      <button
        type="button"
        className="balloon-btn"
        onClick={onNextWave}
      >
        Wave {wave + 1} へ
      </button>
    </div>
  );
}
