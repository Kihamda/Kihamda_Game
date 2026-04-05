import { useEffect, useCallback, useRef, useState } from "react";
import type { GameState, PopEffect } from "../lib/types";
import { GAME_WIDTH, GAME_HEIGHT, BALLOON_CONFIG } from "../lib/constants";
import {
  updateBalloons,
  spawnBalloon,
  popBalloon,
  findBalloonAtPoint,
  getSpawnInterval,
  isWaveComplete,
  getWaveBalloonCount,
} from "../lib/balloondefense";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ComboCounter } from "@shared/components/ComboCounter";
import { ScorePopup } from "@shared/components/ScorePopup";

interface ScorePopupData {
  key: number;
  text: string;
  x: number;
  y: number;
  variant: "default" | "combo" | "bonus";
}

interface Props {
  state: GameState;
  onStateChange: (state: GameState) => void;
  onGameOver: () => void;
  onWaveClear: () => void;
}

export function GameView({ state, onStateChange, onGameOver, onWaveClear }: Props) {
  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopupData[]>([]);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const animationRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const effectIdRef = useRef(0);
  const popupKeyRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const prevLivesRef = useRef(state.lives);
  
  const { particles, burst } = useParticles();
  const { playTone, playSweep, playBonus, playCombo } = useAudio();

  // ポップ音 (風船を割る音)
  const playPop = useCallback(() => {
    playTone(880, 0.08, "sine", 0.2);
    playTone(1320, 0.06, "triangle", 0.15, 0.02);
  }, [playTone]);

  // リーク音 (風船が下に到達した音)
  const playLeak = useCallback(() => {
    playSweep(300, 100, 0.25, "sawtooth", 0.25);
  }, [playSweep]);

  // ポップエフェクトを追加
  const addPopEffect = useCallback((x: number, y: number, color: string) => {
    const id = effectIdRef.current++;
    setPopEffects((prev) => [...prev, { id, x, y, color, time: Date.now() }]);
    
    // 500ms後に削除
    setTimeout(() => {
      setPopEffects((prev) => prev.filter((e) => e.id !== id));
    }, 500);
  }, []);
  
  // スコアポップアップを追加
  const addScorePopup = useCallback((score: number, x: number, y: number, combo: number, isBonus: boolean) => {
    const key = popupKeyRef.current++;
    const variant = isBonus ? "bonus" : combo >= 3 ? "combo" : "default";
    const text = isBonus ? `+${score} BONUS!` : combo >= 3 ? `+${score} x${combo}` : `+${score}`;
    
    setScorePopups((prev) => [...prev, { key, text, x, y, variant }]);
    
    // 1000ms後に削除
    setTimeout(() => {
      setScorePopups((prev) => prev.filter((p) => p.key !== key));
    }, 1000);
  }, []);

  // ライフ減少時の赤フラッシュ
  useEffect(() => {
    if (state.leaked && state.lives < prevLivesRef.current) {
      // Use setTimeout to avoid direct setState in effect
      const flashTimer = setTimeout(() => setShowRedFlash(true), 0);
      playLeak();
      const resetTimer = setTimeout(() => setShowRedFlash(false), 300);
      prevLivesRef.current = state.lives;
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(resetTimer);
      };
    }
    prevLivesRef.current = state.lives;
  }, [state.lives, state.leaked, playLeak]);

  // ゲームループ
  useEffect(() => {
    const loop = (timestamp: number) => {
      // 風船の更新
      let newState = updateBalloons(state);

      // ゲームオーバー判定
      if (newState.isGameOver) {
        onGameOver();
        return;
      }

      // 風船スポーン
      const spawnInterval = getSpawnInterval(state.wave);
      if (timestamp - lastSpawnRef.current > spawnInterval && state.remainingBalloons > 0) {
        newState = spawnBalloon(newState);
        lastSpawnRef.current = timestamp;
      }

      // ウェーブクリア判定
      if (isWaveComplete(newState) && !newState.isWaveCleared) {
        onWaveClear();
        return;
      }

      if (newState !== state) {
        onStateChange(newState);
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [state, onStateChange, onGameOver, onWaveClear]);

  // タップ/クリック処理
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!gameAreaRef.current) return;
      
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const balloon = findBalloonAtPoint(state, x, y);
      if (balloon) {
        addPopEffect(balloon.x, balloon.y, balloon.color);
        
        // パーティクルバースト (風船色で)
        burst(balloon.x, balloon.y, 8);
        
        // 状態更新
        const newState = popBalloon(state, balloon.id);
        const config = BALLOON_CONFIG[balloon.type];
        
        // スコアポップアップ
        const isBonus = balloon.type === "bonus";
        addScorePopup(config.score, balloon.x, balloon.y, newState.combo, isBonus);
        
        // 効果音
        if (isBonus) {
          playBonus();
        } else if (newState.combo >= 3) {
          playCombo(newState.combo);
        } else {
          playPop();
        }
        
        onStateChange(newState);
      }
    },
    [state, onStateChange, addPopEffect, burst, addScorePopup, playPop, playBonus, playCombo],
  );

  const totalBalloons = getWaveBalloonCount(state.wave);
  const progress = (state.poppedCount / totalBalloons) * 100;

  return (
    <div
      ref={gameAreaRef}
      className={`balloon-game${showRedFlash ? " balloon-red-flash" : ""}`}
      style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      onPointerDown={handlePointerDown}
    >
      {/* HUD */}
      <div className="balloon-hud">
        <div className="balloon-hud-top">
          <div className="balloon-hud-lives">
            {Array.from({ length: state.lives }).map((_, i) => (
              <span key={i} className="balloon-heart">❤️</span>
            ))}
          </div>
          <div className="balloon-hud-score">{state.score}</div>
        </div>
        <div className="balloon-hud-wave">
          <span>Wave {state.wave}</span>
          <div className="balloon-progress">
            <div 
              className="balloon-progress-bar" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* コンボカウンター */}
      <ComboCounter combo={state.combo} position="top-right" threshold={3} />

      {/* 風船 */}
      {state.balloons.map((balloon) => {
        if (balloon.popped) return null;
        return (
          <div
            key={balloon.id}
            className={`balloon balloon-${balloon.type}`}
            style={{
              left: balloon.x - balloon.size / 2,
              top: balloon.y - balloon.size / 2,
              width: balloon.size,
              height: balloon.size * 1.2,
              backgroundColor: balloon.color,
            }}
          >
            <div className="balloon-shine" />
            <div className="balloon-string" />
          </div>
        );
      })}

      {/* パーティクルレイヤー */}
      <ParticleLayer particles={particles} />

      {/* ポップエフェクト */}
      {popEffects.map((effect) => (
        <div
          key={effect.id}
          className="balloon-pop-effect"
          style={{
            left: effect.x,
            top: effect.y,
            color: effect.color,
          }}
        >
          💥
        </div>
      ))}
      
      {/* スコアポップアップ */}
      {scorePopups.map((popup) => (
        <ScorePopup
          key={popup.key}
          popupKey={popup.key}
          text={popup.text}
          x={`${popup.x}px`}
          y={`${popup.y}px`}
          variant={popup.variant}
          size="md"
        />
      ))}
    </div>
  );
}
