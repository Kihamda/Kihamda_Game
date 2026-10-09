import { useState, useCallback, useEffect, useRef } from "react";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScreenShake,
  ScorePopup,
} from "../../../src/shared";
import type { PopupVariant } from "../../../src/shared";
import type { ScreenShakeHandle } from "../../../src/shared";
import { StartScreen } from "./components/StartScreen";
import { GameView } from "./components/GameView";
import { ResultScreen } from "./components/ResultScreen";
import type { GameState, EffectEvent } from "./lib/types";
import {
  createInitialState,
  updateBalls,
  processTurnResult,
  getCueBall,
} from "./lib/pool";
import { loadStats, saveStats } from "./lib/storage";
import { MIN_POWER, MAX_POWER, EIGHT_BALL } from "./lib/constants";
import "./App.css";

function App() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [stats, setStats] = useState(loadStats);
  const [isAiming, setIsAiming] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [foulFlash, setFoulFlash] = useState(false);
  const [comboDisplay, setComboDisplay] = useState<{ count: number; visible: boolean }>({ count: 0, visible: false });
  const [popup, setPopup] = useState<{
    text: string | null;
    key: number;
    variant: PopupVariant;
  }>({ text: null, key: 0, variant: "default" });
  const animationRef = useRef<number>(0);
  const pocketedThisTurnRef = useRef<number[]>([]);
  const pocketPositionsRef = useRef<{ id: number; x: number; y: number }[]>([]);
  const shakeRef = useRef<ScreenShakeHandle>(null);

  // 共通フック
  const { particles, sparkle, confetti, burst } = useParticles();
  const {
    playTone,
    playSuccess,
    playCombo,
    playCelebrate,
    playMiss,
    playNoise,
  } = useAudio();

  // 効果音関数
  const playHitSound = useCallback(() => {
    playTone(200, 0.08, "sine", 0.15);
  }, [playTone]);

  const playPocketSound = useCallback(() => {
    playSuccess();
  }, [playSuccess]);

  const playComboSound = useCallback((count: number) => {
    playCombo(count);
  }, [playCombo]);

  const playWinSound = useCallback(() => {
    playCelebrate();
  }, [playCelebrate]);

  const playFoulSound = useCallback(() => {
    playMiss();
    playNoise(0.15, 0.2, 400);
  }, [playMiss, playNoise]);

  // ScorePopupを表示するヘルパー
  const showPopup = useCallback((text: string, variant: PopupVariant = "default") => {
    setPopup((prev) => ({ text, key: prev.key + 1, variant }));
  }, []);

  // エフェクト処理
  const processEffects = useCallback((
    effects: EffectEvent[],
    pocketPositions: { id: number; x: number; y: number }[]
  ) => {
    const pocketedCount = pocketPositions.length;
    
    for (const effect of effects) {
      switch (effect.type) {
        case "pocket":
          if (effect.x !== undefined && effect.y !== undefined) {
            sparkle(effect.x, effect.y, 12);
            playPocketSound();
          }
          break;
        case "combo":
          if (effect.comboCount) {
            playComboSound(effect.comboCount);
            setComboDisplay({ count: effect.comboCount, visible: true });
            showPopup(`${effect.comboCount}連続!`, "combo");
            setTimeout(() => setComboDisplay(prev => ({ ...prev, visible: false })), 1500);
          }
          break;
        case "win":
          confetti(80);
          playWinSound();
          showPopup("🎱 WIN!", "critical");
          break;
        case "foul":
          setFoulFlash(true);
          shakeRef.current?.shake("medium", 300);
          playFoulSound();
          setTimeout(() => setFoulFlash(false), 300);
          break;
      }
    }

    // ポケットインしたボールにsparkleエフェクト
    for (const pos of pocketPositions) {
      sparkle(pos.x, pos.y, 10);
      playPocketSound();
      // 8番ボールの場合は特別なエフェクト
      if (pos.id === EIGHT_BALL) {
        burst(pos.x, pos.y, 20);
      }
    }

    // ポケットインしたボールがあり、コンボや勝利以外の場合はスコアポップアップ表示
    const hasCombo = effects.some(e => e.type === "combo");
    const hasWin = effects.some(e => e.type === "win");
    if (pocketedCount > 0 && !hasCombo && !hasWin) {
      if (pocketedCount >= 2) {
        showPopup(`${pocketedCount}球! +ボーナス`, "bonus");
      } else {
        showPopup("POCKETED!", "default");
      }
    }
  }, [sparkle, burst, confetti, playPocketSound, playComboSound, playWinSound, playFoulSound, showPopup]);

  // ボールアニメーション
  useEffect(() => {
    if (state.phase !== "rolling") return;

    const animate = () => {
      setState((prev) => {
        const { balls, pocketed, pocketPositions, allStopped } = updateBalls(
          prev.balls.map((b) => ({ ...b }))
        );

        // このターンで落ちたボールを記録
        pocketedThisTurnRef.current = [
          ...pocketedThisTurnRef.current,
          ...pocketed,
        ];
        
        // ポケット位置も記録（エフェクト用）
        pocketPositionsRef.current = [
          ...pocketPositionsRef.current,
          ...pocketPositions,
        ];

        if (allStopped) {
          // ターン結果処理
          const { newState, effects } = processTurnResult(
            { ...prev, balls },
            pocketedThisTurnRef.current
          );
          
          // エフェクト処理（非同期で実行）
          setTimeout(() => {
            processEffects(effects, pocketPositionsRef.current);
          }, 0);
          
          pocketedThisTurnRef.current = [];
          pocketPositionsRef.current = [];

          if (newState.phase !== "gameover") {
            setShowContinue(true);
          }
          return newState;
        }

        return { ...prev, balls };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.phase, processEffects]);

  // 勝敗確定時の統計更新
  useEffect(() => {
    if (state.phase === "gameover" && state.result) {
      const newStats = {
        ...stats,
        totalGames: stats.totalGames + 1,
        player1Wins:
          stats.player1Wins + (state.result.winner === 1 ? 1 : 0),
        player2Wins:
          stats.player2Wins + (state.result.winner === 2 ? 1 : 0),
      };
      saveStats(newStats);
      setStats(newStats);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.result]);

  const handleStart = useCallback(() => {
    setState({
      ...createInitialState(),
      phase: "aiming",
    });
    pocketedThisTurnRef.current = [];
    pocketPositionsRef.current = [];
    setShowContinue(false);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (state.phase !== "aiming") return;
      const cueBall = getCueBall(state.balls);
      if (!cueBall) return;

      setIsAiming(true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - cueBall.x;
      const dy = y - cueBall.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(MAX_POWER, Math.max(MIN_POWER, dist / 10));
      setState((prev) => ({ ...prev, aimAngle: angle, aimPower: power }));
    },
    [state.phase, state.balls]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isAiming) return;
      const cueBall = getCueBall(state.balls);
      if (!cueBall) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - cueBall.x;
      const dy = y - cueBall.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(MAX_POWER, Math.max(MIN_POWER, dist / 10));
      setState((prev) => ({ ...prev, aimAngle: angle, aimPower: power }));
    },
    [isAiming, state.balls]
  );

  const handlePointerUp = useCallback(() => {
    if (!isAiming) return;
    setIsAiming(false);

    const cueBall = getCueBall(state.balls);
    if (!cueBall) return;

    // ヒット音
    playHitSound();

    // キューボール発射
    const vx = Math.cos(state.aimAngle) * state.aimPower;
    const vy = Math.sin(state.aimAngle) * state.aimPower;

    setState((prev) => ({
      ...prev,
      phase: "rolling",
      message: "",
      balls: prev.balls.map((b) =>
        b.id === 0 ? { ...b, vx, vy } : b
      ),
    }));
  }, [isAiming, state.aimAngle, state.aimPower, state.balls, playHitSound]);

  const handleContinue = useCallback(() => {
    setShowContinue(false);
    setState((prev) => ({
      ...prev,
      phase: "aiming",
      message: "",
    }));
  }, []);

  const handleRestart = useCallback(() => {
    setState({
      ...createInitialState(),
      phase: "aiming",
    });
    pocketedThisTurnRef.current = [];
    pocketPositionsRef.current = [];
    setShowContinue(false);
  }, []);

  const getWinReason = () => {
    if (!state.result) return "";
    return state.result.reason === "8ball"
      ? "8番ボールを正しく沈めました！"
      : "相手が8番ボールをファウルで落としました";
  };

  return (
    <GameShell gameId="poolmaster" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className={`pool-container ${foulFlash ? "foul-flash" : ""}`}>
          {state.phase === "start" && (
            <StartScreen onStart={handleStart} stats={stats} />
          )}

          {(state.phase === "aiming" ||
            state.phase === "rolling" ||
            state.phase === "turnEnd") && (
            <GameView
              balls={state.balls}
              player1={state.player1}
              player2={state.player2}
              currentPlayer={state.currentPlayer}
              aimAngle={state.aimAngle}
              aimPower={state.aimPower}
              isAiming={isAiming}
              message={state.message}
              showContinue={showContinue}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onContinue={handleContinue}
            />
          )}

          {state.phase === "gameover" && state.result && (
            <ResultScreen
              winnerName={
                state.result.winner === 1
                  ? state.player1.name
                  : state.player2.name
              }
              reason={getWinReason()}
              onRestart={handleRestart}
            />
          )}

          {/* コンボ表示 */}
          {comboDisplay.visible && (
            <div className="pool-combo-display">
              <span className="combo-count">{comboDisplay.count}</span>
              <span className="combo-label">COMBO!</span>
            </div>
          )}

          {/* スコアポップアップ */}
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            variant={popup.variant}
            size="lg"
          />

          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />
        </div>
      </ScreenShake>
    </GameShell>
  );
}

export default App;
