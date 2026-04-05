import { useState, useCallback, useEffect, useRef } from "react";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
} from "../../../src/shared";
import type { PopupVariant } from "../../../src/shared";
import { StartScreen } from "./components/StartScreen";
import { GameView } from "./components/GameView";
import { ResultScreen } from "./components/ResultScreen";
import type { GameState, HoleScore, TrailPoint } from "./lib/types";
import {
  createInitialState,
  createHoleState,
  updateBall,
  getScoreLabel,
  getTotalScore,
} from "./lib/minigolf";
import { loadBestScore, saveBestScore } from "./lib/storage";
import { COURSES, MIN_POWER, MAX_POWER } from "./lib/constants";
import "./App.css";

function App() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [bestScore, setBestScore] = useState(loadBestScore);
  const [isAiming, setIsAiming] = useState(false);
  const [message, setMessage] = useState("");
  const [showContinue, setShowContinue] = useState(false);
  const animationRef = useRef<number>(0);
  
  // ドーパミン演出用
  const { particles, confetti, burst, explosion, sparkle } = useParticles();
  const { playTone, playSweep, playArpeggio, playCelebrate, playPerfect } = useAudio();
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [showFlash, setShowFlash] = useState(false);
  const [scorePopup, setScorePopup] = useState<{
    text: string;
    key: number;
    variant: PopupVariant;
  } | null>(null);
  const trailIdRef = useRef(0);

  // 効果音関数
  const playPutt = useCallback(() => {
    playTone(200, 0.08, "sine", 0.3);
    playTone(150, 0.1, "sine", 0.2, 0.02);
  }, [playTone]);

  const playRoll = useCallback(() => {
    playTone(80, 0.05, "sine", 0.1);
  }, [playTone]);

  const playHole = useCallback(() => {
    playSweep(400, 800, 0.3, "sine", 0.25);
    playTone(523, 0.15, "triangle", 0.2, 0.1);
    playTone(659, 0.15, "triangle", 0.2, 0.2);
    playTone(784, 0.2, "triangle", 0.25, 0.3);
  }, [playSweep, playTone]);

  const playHoleInOne = useCallback(() => {
    playArpeggio([523, 659, 784, 1047, 1319, 1568], 0.2, "sine", 0.3, 0.08);
    playCelebrate();
    setTimeout(() => playPerfect(), 500);
  }, [playArpeggio, playCelebrate, playPerfect]);

  // ボールアニメーション
  useEffect(() => {
    if (state.phase !== "rolling" || !state.ball.active) return;

    const course = COURSES[state.currentHole];
    let rollSoundCounter = 0;

    const animate = () => {
      setState((prev) => {
        const { ball, stopped, holeIn } = updateBall(prev.ball, course);

        // トレイル更新（ボールが動いている間）
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > 0.5) {
          setTrail((prevTrail) => {
            const newPoint: TrailPoint = {
              id: trailIdRef.current++,
              x: ball.x,
              y: ball.y,
              opacity: Math.min(1, speed / 5),
            };
            // 最大20ポイント保持
            return [...prevTrail.slice(-19), newPoint];
          });

          // 転がり音（時々再生）
          rollSoundCounter++;
          if (rollSoundCounter % 10 === 0) {
            playRoll();
          }
        }

        if (holeIn) {
          // ホールイン！
          const newScore: HoleScore = {
            strokes: prev.strokes,
            par: course.par,
            completed: true,
          };
          const newScores = [...prev.scores, newScore];
          const label = getScoreLabel(prev.strokes, course.par);
          setMessage(`⛳ ${label}!`);
          setShowContinue(true);

          // ドーパミン演出
          const diff = prev.strokes - course.par;
          const isHoleInOne = prev.strokes === 1;
          
          // スコアポップアップ
          let variant: PopupVariant = "default";
          if (isHoleInOne) variant = "critical";
          else if (diff <= -2) variant = "bonus";
          else if (diff === -1) variant = "combo";
          else if (diff === 0) variant = "default";
          else variant = "default";
          
          setScorePopup({
            text: label,
            key: Date.now(),
            variant,
          });
          
          // 紙吹雪とエフェクト
          const cupX = course.cup.x;
          const cupY = course.cup.y;
          
          if (isHoleInOne) {
            // ホールインワン：大演出
            playHoleInOne();
            confetti(100);
            explosion(cupX, cupY, 30);
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 150);
            setTimeout(() => confetti(50), 300);
          } else if (diff <= -2) {
            // イーグル以上
            playHole();
            confetti(60);
            explosion(cupX, cupY, 20);
            setTimeout(() => playCelebrate(), 200);
          } else if (diff === -1) {
            // バーディ
            playHole();
            confetti(40);
            sparkle(cupX, cupY, 12);
          } else {
            // パー以下
            playHole();
            burst(cupX, cupY, 15);
          }
          
          // トレイルをクリア
          setTrail([]);

          // 最終ホールかチェック
          const isLastHole = prev.currentHole >= COURSES.length - 1;

          return {
            ...prev,
            ball: { ...ball, active: false },
            scores: newScores,
            phase: isLastHole ? "gameover" : "holein",
          };
        }

        if (stopped) {
          setTrail([]);
          return {
            ...prev,
            ball,
            phase: "aiming",
          };
        }

        return { ...prev, ball };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.phase, state.ball.active, state.currentHole, playRoll, playHole, playHoleInOne, confetti, explosion, sparkle, burst, playCelebrate]);

  // トレイルの自動フェードアウト
  useEffect(() => {
    if (trail.length === 0) return;
    const timer = setInterval(() => {
      setTrail((prev) =>
        prev
          .map((p) => ({ ...p, opacity: p.opacity - 0.1 }))
          .filter((p) => p.opacity > 0)
      );
    }, 50);
    return () => clearInterval(timer);
  }, [trail.length]);

  // ゲームオーバー時にベストスコア更新
  const prevPhaseRef = useRef(state.phase);
  useEffect(() => {
    if (prevPhaseRef.current !== "gameover" && state.phase === "gameover") {
      const total = getTotalScore(state.scores);
      const current = loadBestScore();
      if (current === null || total < current) {
        saveBestScore(total);
        queueMicrotask(() => setBestScore(total));
      }
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase, state.scores]);

  const handleStart = useCallback(() => {
    const newState = createHoleState(0, createInitialState());
    setState({
      ...newState,
      phase: "aiming",
      scores: [],
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
      const dx = x - state.ball.x;
      const dy = y - state.ball.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(MAX_POWER, Math.max(MIN_POWER, dist / 10));

      setState((prev) => ({ ...prev, aimAngle: angle, aimPower: power }));
    },
    [state.phase, state.ball.active, state.ball.x, state.ball.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isAiming || state.ball.active) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - state.ball.x;
      const dy = y - state.ball.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(MAX_POWER, Math.max(MIN_POWER, dist / 10));

      setState((prev) => ({ ...prev, aimAngle: angle, aimPower: power }));
    },
    [isAiming, state.ball.active, state.ball.x, state.ball.y]
  );

  const handlePointerUp = useCallback(() => {
    if (!isAiming || state.ball.active) return;
    setIsAiming(false);

    // パット音
    playPutt();

    // ボール発射
    const vx = Math.cos(state.aimAngle) * state.aimPower * 0.5;
    const vy = Math.sin(state.aimAngle) * state.aimPower * 0.5;

    setState((prev) => ({
      ...prev,
      phase: "rolling",
      strokes: prev.strokes + 1,
      ball: {
        ...prev.ball,
        vx,
        vy,
        active: true,
      },
    }));
  }, [isAiming, state.aimAngle, state.aimPower, state.ball.active, playPutt]);

  const handleContinue = useCallback(() => {
    setMessage("");
    setShowContinue(false);
    setScorePopup(null);

    if (state.phase === "gameover") {
      // 結果画面へ
      return;
    }

    // 次のホールへ
    const nextHole = state.currentHole + 1;
    if (nextHole < COURSES.length) {
      setState((prev) => ({
        ...createHoleState(nextHole, prev),
        phase: "aiming",
      }));
    }
  }, [state.phase, state.currentHole]);

  const handleRestart = useCallback(() => {
    const newState = createHoleState(0, createInitialState());
    setState({
      ...newState,
      phase: "aiming",
      scores: [],
    });
    setMessage("");
    setShowContinue(false);
    setScorePopup(null);
  }, []);

  const course = COURSES[state.currentHole];
  const totalScore = getTotalScore(state.scores);
  const isNewBest = bestScore === null || totalScore < bestScore;

  return (
    <GameShell gameId="minigolf" layout="immersive">
      <div className="minigolf-container">
        {/* 画面フラッシュ（ホールインワン時） */}
        {showFlash && <div className="minigolf-flash" />}
        
        {/* パーティクルレイヤー */}
        <ParticleLayer particles={particles} />
        
        {/* スコアポップアップ */}
        {scorePopup && (
          <ScorePopup
            text={scorePopup.text}
            popupKey={scorePopup.key}
            variant={scorePopup.variant}
            size="xl"
            y="30%"
          />
        )}

        {state.phase === "start" && (
          <StartScreen onStart={handleStart} bestScore={bestScore} />
        )}

        {(state.phase === "aiming" ||
          state.phase === "rolling" ||
          state.phase === "holein") && (
          <GameView
            course={course}
            ball={state.ball}
            strokes={state.strokes}
            aimAngle={state.aimAngle}
            aimPower={state.aimPower}
            isAiming={isAiming}
            currentHole={state.currentHole}
            message={message}
            showContinue={showContinue}
            trail={trail}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContinue={handleContinue}
          />
        )}

        {state.phase === "gameover" && !showContinue && (
          <ResultScreen
            scores={state.scores}
            bestScore={bestScore}
            isNewBest={isNewBest}
            onRestart={handleRestart}
          />
        )}

        {state.phase === "gameover" && showContinue && (
          <GameView
            course={course}
            ball={state.ball}
            strokes={state.strokes}
            aimAngle={state.aimAngle}
            aimPower={state.aimPower}
            isAiming={false}
            currentHole={state.currentHole}
            message={message}
            showContinue={showContinue}
            trail={trail}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContinue={handleContinue}
          />
        )}
      </div>
    </GameShell>
  );
}

export default App;