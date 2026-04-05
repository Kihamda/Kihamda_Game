import { useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer, ScorePopup, useAudio, useParticles } from "@shared";

import { StartScreen } from "./components/StartScreen";
import { StageSelect } from "./components/StageSelect";
import { GameView } from "./components/GameView";
import { ResultScreen } from "./components/ResultScreen";
import { STAGES, TOTAL_STAGES } from "./lib/constants";
import {
  createInitialState,
  movePlayer,
  undoMove,
  isCleared,
} from "./lib/iceslide";
import { loadProgress, updateProgress } from "./lib/storage";
import type { Phase, Direction, GameState } from "./lib/types";
import type { Progress } from "./lib/storage";
import "./App.css";

export default function App() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [currentStageId, setCurrentStageId] = useState(1);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);

  const currentStage = STAGES.find((s) => s.id === currentStageId) ?? STAGES[0];

  const { playTone, playSuccess, playLevelUp } = useAudio();
  const { particles, confetti } = useParticles();

  const playMove = useCallback(() => {
    playTone(400, 0.05, "sine");
  }, [playTone]);

  // メニューへ戻る（進捗も再読み込み）
  const goToMenu = useCallback(() => {
    setProgress(loadProgress());
    setPhase("menu");
  }, []);

  // ステージ選択へ遷移（進捗も再読み込み）
  const goToStageSelect = useCallback(() => {
    setProgress(loadProgress());
    setPhase("stageSelect");
  }, []);

  // ゲーム開始
  const startGame = useCallback((stageId: number) => {
    const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
    setCurrentStageId(stage.id);
    setGameState(createInitialState(stage));
    setPhase("playing");
  }, []);

  // 最初の未クリアステージから開始
  const startFromProgress = useCallback(() => {
    const prog = loadProgress();
    let stageId = 1;
    for (let i = 1; i <= TOTAL_STAGES; i++) {
      if (!prog.cleared.includes(i)) {
        stageId = i;
        break;
      }
      if (i === TOTAL_STAGES) {
        stageId = TOTAL_STAGES;
      }
    }
    startGame(stageId);
  }, [startGame]);

  // 移動
  const handleMove = useCallback(
    (direction: Direction) => {
      if (!gameState || phase !== "playing") return;

      const newState = movePlayer(currentStage, gameState, direction);
      if (newState) {
        setGameState(newState);
        playMove();

        // クリア判定
        if (isCleared(currentStage, newState.player)) {
          const newProgress = updateProgress(currentStage.id, newState.moves);
          setProgress(newProgress);
          playSuccess();
          confetti();
          // ScorePopup for stage clear
          setPopupText(`Stage ${currentStage.id} Clear!`);
          setPopupKey((k) => k + 1);
          setTimeout(() => {
            playLevelUp();
            setPhase("cleared");
          }, 300);
        }
      }
    },
    [gameState, phase, currentStage, playMove, playSuccess, playLevelUp, confetti]
  );

  // 1手戻す
  const handleUndo = useCallback(() => {
    if (!gameState) return;
    const newState = undoMove(gameState);
    if (newState) {
      setGameState(newState);
    }
  }, [gameState]);

  // リセット
  const handleReset = useCallback(() => {
    setGameState(createInitialState(currentStage));
  }, [currentStage]);

  // 次のステージ
  const handleNext = useCallback(() => {
    const nextId = currentStageId + 1;
    if (nextId <= TOTAL_STAGES) {
      startGame(nextId);
    }
  }, [currentStageId, startGame]);

  return (
    <GameShell gameId="iceslide" layout="default">
      <div className="is-root">
        {phase === "menu" && (
          <StartScreen
            onStart={startFromProgress}
            onStageSelect={goToStageSelect}
            clearedCount={progress.cleared.length}
            totalStages={TOTAL_STAGES}
          />
        )}

        {phase === "stageSelect" && (
          <StageSelect
            progress={progress}
            onSelect={startGame}
            onBack={goToMenu}
          />
        )}

        {phase === "playing" && gameState && (
          <GameView
            stage={currentStage}
            gameState={gameState}
            onMove={handleMove}
            onUndo={handleUndo}
            onReset={handleReset}
            onMenu={goToMenu}
          />
        )}

        {phase === "cleared" && gameState && (
          <ResultScreen
            stage={currentStage}
            moves={gameState.moves}
            onNext={handleNext}
            onRetry={() => startGame(currentStageId)}
            onStageSelect={goToStageSelect}
            hasNextStage={currentStageId < TOTAL_STAGES}
          />
        )}
        <ScorePopup
          text={popupText}
          popupKey={popupKey}
          variant="level"
          size="lg"
          y="35%"
        />
        <ParticleLayer particles={particles} />
      </div>
    </GameShell>
  );
}
