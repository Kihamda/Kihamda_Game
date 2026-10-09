import { useState, useCallback, useEffect, useRef } from "react";
import { GameShell, useAudio, useParticles } from "../../../src/shared";
import type { PopupVariant } from "../../../src/shared";
import { StartScreen } from "./components/StartScreen";
import { GameView } from "./components/GameView";
import { ResultScreen } from "./components/ResultScreen";
import type { GameState, FrameResult } from "./lib/types";
import {
  createInitialState,
  updateBallAndPins,
  countStandingPins,
  processRollResult,
  getFinalScore,
} from "./lib/bowling";
import { loadHighScore, saveHighScore } from "./lib/storage";
import {
  BALL_START_X,
  BALL_START_Y,
  MIN_POWER,
  MAX_POWER,
  GAME_WIDTH,
} from "./lib/constants";
import "./App.css";

/** 効果音タイプ */
type SoundType = "roll" | "hit" | "strike" | "spare" | "gutter" | "achievement";

/** ポップアップ状態 */
interface PopupState {
  text: string | null;
  variant: PopupVariant;
  key: number;
}

/** ポップアップキュー項目 */
interface PopupQueueItem {
  text: string;
  variant: PopupVariant;
  delay: number;
}

/** フレームスコア達成メッセージを取得 */
function getFrameScoreMessage(score: number): { text: string; variant: PopupVariant } | null {
  if (score >= 30) return { text: "🔥 TURKEY! 🔥", variant: "critical" };
  if (score >= 20) return { text: "DOUBLE!", variant: "bonus" };
  return null;
}

/** 最終スコア達成メッセージを取得 */
function getFinalScoreAchievement(score: number): { text: string; variant: PopupVariant } | null {
  if (score === 300) return { text: "🎯 PERFECT GAME! 🎯", variant: "critical" };
  if (score >= 250) return { text: "🏆 AMAZING! 🏆", variant: "critical" };
  if (score >= 200) return { text: "⭐ GREAT GAME! ⭐", variant: "bonus" };
  if (score >= 150) return { text: "👍 GOOD GAME!", variant: "combo" };
  if (score >= 100) return { text: "NICE EFFORT!", variant: "default" };
  return null;
}

/** フレームスコアが確定したかチェック */
function getNewlyConfirmedFrameScore(
  prevFrames: FrameResult[],
  newFrames: FrameResult[],
): { frameIndex: number; score: number } | null {
  for (let i = 0; i < 10; i++) {
    const prev = prevFrames[i];
    const next = newFrames[i];
    // 以前は未確定で、今回確定した場合
    if (prev.score === null && next.score !== null) {
      return { frameIndex: i, score: next.score };
    }
  }
  return null;
}

function App() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [isAiming, setIsAiming] = useState(false);
  const [message, setMessage] = useState("");
  const [showContinue, setShowContinue] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [popup, setPopup] = useState<PopupState>({ text: null, variant: "default", key: 0 });
  const [ballTrail, setBallTrail] = useState<{ x: number; y: number }[]>([]);
  const animationRef = useRef<number>(0);
  const popupKeyRef = useRef(0);

  // パーティクル & オーディオ
  const { particles, burst, confetti, sparkle, explosion } = useParticles();
  const audio = useAudio();

  // ハイスコア更新用 ref
  const highScoreRef = useRef(highScore);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  // ポップアップキュー処理
  const popupQueueRef = useRef<PopupQueueItem[]>([]);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processPopupQueue = useCallback(() => {
    if (popupQueueRef.current.length === 0) return;
    
    const item = popupQueueRef.current.shift()!;
    popupTimerRef.current = setTimeout(() => {
      popupKeyRef.current += 1;
      setPopup({ text: item.text, variant: item.variant, key: popupKeyRef.current });
      setTimeout(() => {
        setPopup({ text: null, variant: "default", key: popupKeyRef.current });
        processPopupQueue(); // 次のキューを処理
      }, 1200);
    }, item.delay);
  }, []);

  const queuePopup = useCallback((text: string, variant: PopupVariant, delay: number = 0) => {
    popupQueueRef.current.push({ text, variant, delay });
    if (popupQueueRef.current.length === 1) {
      processPopupQueue();
    }
  }, [processPopupQueue]);

  // 効果音プリセット
  const playSound = useCallback((type: SoundType) => {
    switch (type) {
      case "roll":
        audio.playTone(120, 0.15, "sine", 0.15);
        audio.playNoise(0.08, 0.1, 300);
        break;
      case "hit":
        audio.playNoise(0.1, 0.25, 600);
        audio.playTone(200, 0.08, "triangle", 0.2);
        break;
      case "strike":
        audio.playExplosion();
        setTimeout(() => audio.playCelebrate(), 200);
        break;
      case "spare":
        audio.playFanfare();
        break;
      case "gutter":
        audio.playMiss();
        break;
      case "achievement":
        audio.playCelebrate();
        break;
    }
  }, [audio]);

  // ポップアップ表示
  const showPopup = useCallback((text: string, variant: PopupVariant = "default") => {
    popupKeyRef.current += 1;
    setPopup({ text, variant, key: popupKeyRef.current });
    setTimeout(() => setPopup({ text: null, variant: "default", key: popupKeyRef.current }), 1500);
  }, []);

  // 投球開始時の効果音
  const prevBallActiveRef = useRef(false);
  useEffect(() => {
    if (!prevBallActiveRef.current && state.ball.active) {
      playSound("roll");
      setBallTrail([]);
    }
    prevBallActiveRef.current = state.ball.active;
  }, [state.ball.active, playSound]);

  // ピン倒れ検出用
  const prevPinsRef = useRef<number>(10);
  
  // ボールアニメーション
  useEffect(() => {
    if (state.phase !== "rolling" || !state.ball.active) return;

    let frameCount = 0;
    const animate = () => {
      setState((prev) => {
        const { ball, pins, finished } = updateBallAndPins(prev.ball, prev.pins);
        
        // トレイル更新（5フレームごと）
        frameCount++;
        if (frameCount % 3 === 0 && ball.active) {
          setBallTrail(trail => {
            const newTrail = [...trail, { x: ball.x, y: ball.y }];
            return newTrail.slice(-12); // 最大12点
          });
        }
        
        // ピンが倒れた瞬間を検出
        const currentStanding = countStandingPins(pins);
        if (currentStanding < prevPinsRef.current) {
          // 倒れたピンの位置にパーティクル
          pins.forEach(pin => {
            if (!pin.standing) {
              burst(pin.x, pin.y, 6);
            }
          });
          playSound("hit");
          prevPinsRef.current = currentStanding;
        }

        if (finished) {
          // トレイルをクリア
          setBallTrail([]);
          prevPinsRef.current = 10;
          
          // 投球結果を処理
          const standingNow = countStandingPins(pins);
          const knockedDown =
            prev.currentRoll === 0
              ? 10 - standingNow
              : countStandingPins(prev.pins) - standingNow;

          const newState = processRollResult(
            { ...prev, ball, pins },
            knockedDown,
          );

          // メッセージ設定と演出
          if (knockedDown === 10 && prev.currentRoll === 0) {
            // ストライク！
            setMessage("⚡ STRIKE! ⚡");
            showPopup("STRIKE!", "critical");
            playSound("strike");
            confetti(60);
            explosion(GAME_WIDTH / 2, 200, 30);
            setScreenFlash(true);
            setTimeout(() => setScreenFlash(false), 150);
            
            // フレームスコア確定時の追加ポップアップ
            const confirmedFrame = getNewlyConfirmedFrameScore(prev.frames, newState.frames);
            if (confirmedFrame) {
              const frameMsg = getFrameScoreMessage(confirmedFrame.score);
              if (frameMsg) {
                queuePopup(frameMsg.text, frameMsg.variant, 1500);
              }
              queuePopup(`Frame ${confirmedFrame.frameIndex + 1}: +${confirmedFrame.score}`, "level", frameMsg ? 1500 : 1500);
            }
          } else if (
            prev.currentRoll === 1 &&
            newState.frames[prev.currentFrame]?.isSpare
          ) {
            // スペア！
            setMessage("✨ SPARE! ✨");
            showPopup("SPARE!", "bonus");
            playSound("spare");
            sparkle(GAME_WIDTH / 2, 200, 16);
            
            // フレームスコア確定時の追加ポップアップ
            const confirmedFrame = getNewlyConfirmedFrameScore(prev.frames, newState.frames);
            if (confirmedFrame) {
              queuePopup(`Frame ${confirmedFrame.frameIndex + 1}: +${confirmedFrame.score}`, "level", 1500);
            }
          } else if (knockedDown > 0) {
            setMessage(`${knockedDown} 本倒した！`);
            // ピン数ポップアップ
            showPopup(`+${knockedDown}`, knockedDown >= 7 ? "combo" : "default");
            
            // フレームスコア確定時の追加ポップアップ
            const confirmedFrame = getNewlyConfirmedFrameScore(prev.frames, newState.frames);
            if (confirmedFrame) {
              queuePopup(`Frame ${confirmedFrame.frameIndex + 1}: +${confirmedFrame.score}`, "level", 1500);
            }
          } else {
            setMessage("ガター...");
            playSound("gutter");
            showPopup("GUTTER", "default");
          }
          setShowContinue(true);

          return newState;
        }

        return { ...prev, ball, pins };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.phase, state.ball.active, burst, confetti, sparkle, explosion, playSound, showPopup, queuePopup]);

  // ハイスコア更新 (gameover遷移時のみ)
  const prevPhaseRef = useRef(state.phase);
  useEffect(() => {
    if (prevPhaseRef.current !== "gameover" && state.phase === "gameover") {
      const finalScore = getFinalScore(state.frames);
      
      // 最終スコア達成ポップアップ
      const achievement = getFinalScoreAchievement(finalScore);
      if (achievement) {
        queuePopup(`Total: ${finalScore}`, "level", 500);
        queuePopup(achievement.text, achievement.variant, 300);
        if (finalScore >= 200) {
          playSound("achievement");
          confetti(80);
        }
      } else {
        queuePopup(`Total: ${finalScore}`, "default", 500);
      }
      
      // 新記録ポップアップ
      if (finalScore > highScoreRef.current) {
        saveHighScore(finalScore);
        highScoreRef.current = finalScore;
        queueMicrotask(() => setHighScore(finalScore));
        queuePopup("🎉 NEW HIGH SCORE! 🎉", "critical", 300);
        playSound("achievement");
        confetti(100);
      }
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase, state.frames, queuePopup, playSound, confetti]);

  const handleStart = useCallback(() => {
    // ポップアップキューをクリア
    popupQueueRef.current = [];
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    setPopup({ text: null, variant: "default", key: 0 });
    
    setState({
      ...createInitialState(),
      phase: "aiming",
    });
    setMessage("");
    setShowContinue(false);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (state.phase !== "aiming" || state.ball.active) return;
      setIsAiming(true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - BALL_START_X;
      const dy = BALL_START_Y - y;
      const angle = Math.atan2(dx, dy);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(MAX_POWER, Math.max(MIN_POWER, dist / 15));
      setState((prev) => ({ ...prev, aimAngle: angle, aimPower: power }));
    },
    [state.phase, state.ball.active],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isAiming || state.ball.active) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - BALL_START_X;
      const dy = BALL_START_Y - y;
      const angle = Math.atan2(dx, dy);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(MAX_POWER, Math.max(MIN_POWER, dist / 15));
      setState((prev) => ({ ...prev, aimAngle: angle, aimPower: power }));
    },
    [isAiming, state.ball.active],
  );

  const handlePointerUp = useCallback(() => {
    if (!isAiming || state.ball.active) return;
    setIsAiming(false);
    // ボール発射
    const vx = Math.sin(state.aimAngle) * state.aimPower * 0.8;
    const vy = -Math.cos(state.aimAngle) * state.aimPower * 0.8;
    setState((prev) => ({
      ...prev,
      phase: "rolling",
      ball: {
        ...prev.ball,
        vx,
        vy,
        active: true,
      },
    }));
  }, [isAiming, state.aimAngle, state.aimPower, state.ball.active]);

  const handleContinue = useCallback(() => {
    setMessage("");
    setShowContinue(false);
    setState((prev) => ({
      ...prev,
      phase: prev.phase === "gameover" ? "gameover" : "aiming",
    }));
  }, []);

  const handleRestart = useCallback(() => {
    // ポップアップキューをクリア
    popupQueueRef.current = [];
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    setPopup({ text: null, variant: "default", key: 0 });
    
    setState({
      ...createInitialState(),
      phase: "aiming",
    });
    setMessage("");
    setShowContinue(false);
  }, []);

  return (
    <GameShell gameId="bowling" layout="immersive">
      <div className="bowling-container">
        {state.phase === "start" && (
          <StartScreen onStart={handleStart} highScore={highScore} />
        )}

        {(state.phase === "aiming" ||
          state.phase === "rolling" ||
          state.phase === "result") && (
          <GameView
            frames={state.frames}
            currentFrame={state.currentFrame}
            currentRoll={state.currentRoll}
            pins={state.pins}
            ball={state.ball}
            aimAngle={state.aimAngle}
            aimPower={state.aimPower}
            isAiming={isAiming}
            message={message}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContinue={handleContinue}
            showContinue={showContinue}
            particles={particles}
            popup={popup}
            screenFlash={screenFlash}
            ballTrail={ballTrail}
          />
        )}

        {state.phase === "gameover" && !showContinue && (
          <ResultScreen
            score={getFinalScore(state.frames)}
            highScore={Math.max(highScore, getFinalScore(state.frames))}
            isNewHighScore={getFinalScore(state.frames) > highScore}
            onRestart={handleRestart}
          />
        )}

        {state.phase === "gameover" && showContinue && (
          <GameView
            frames={state.frames}
            currentFrame={state.currentFrame}
            currentRoll={state.currentRoll}
            pins={state.pins}
            ball={state.ball}
            aimAngle={state.aimAngle}
            aimPower={state.aimPower}
            isAiming={false}
            message={message}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContinue={() => {
              setMessage("");
              setShowContinue(false);
            }}
            showContinue={showContinue}
            particles={particles}
            popup={popup}
            screenFlash={screenFlash}
            ballTrail={ballTrail}
          />
        )}
      </div>
    </GameShell>
  );
}

export default App;
