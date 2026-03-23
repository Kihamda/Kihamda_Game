import { useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer, useAudio, useParticles, ScorePopup } from "@shared";
import { StartScreen } from "./components/StartScreen";
import { GameView } from "./components/GameView";
import { ResultScreen } from "./components/ResultScreen";
import type { Phase, PuzzleStage, GameState } from "./lib/types";
import {
  createInitialState,
  startDrawing,
  continueDrawing,
  endDrawing,
  resetStage,
  STAGES,
} from "./lib/dotconnect";
import { markStageCleared } from "./lib/storage";
import "./App.css";

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [state, setState] = useState<GameState | null>(null);
  const [popup, setPopup] = useState<{ text: string; key: number } | null>(null);

  const { playTone } = useAudio();
  const { particles, sparkle, confetti, burst } = useParticles();

  const playDraw = useCallback(() => {
    playTone(500, 0.05, "sine");
  }, [playTone]);

  const playPathComplete = useCallback(() => {
    playTone(660, 0.15, "sine");
    setTimeout(() => playTone(880, 0.15, "sine"), 100);
  }, [playTone]);

  const playLevelComplete = useCallback(() => {
    playTone(523, 0.15, "sine");
    setTimeout(() => playTone(659, 0.15, "sine"), 100);
    setTimeout(() => playTone(784, 0.15, "sine"), 200);
    setTimeout(() => playTone(1047, 0.3, "sine"), 300);
  }, [playTone]);

  const showPopup = useCallback((text: string) => {
    setPopup({ text, key: Date.now() });
    setTimeout(() => setPopup(null), 1200);
  }, []);

  const handleSelectStage = useCallback((stage: PuzzleStage) => {
    setState(createInitialState(stage));
    setPhase("playing");
    playTone(440, 0.1, "triangle");
  }, [playTone]);

  const handleStartDrawing = useCallback((row: number, col: number) => {
    setState((prev) => (prev ? startDrawing(prev, row, col) : prev));
  }, []);

  const handleContinueDrawing = useCallback((row: number, col: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = continueDrawing(prev, row, col);
      
      // 線を引いたとき
      const prevLineCount = Object.values(prev.lines).reduce((sum, l) => sum + l.points.length, 0);
      const nextLineCount = Object.values(next.lines).reduce((sum, l) => sum + l.points.length, 0);
      if (nextLineCount > prevLineCount) {
        playDraw();
        sparkle(200 + col * 30, 150 + row * 30);
      }
      
      // パス完成チェック（currentDrawing が null になったとき = ペアのドットに到達）
      if (prev.currentDrawing && !next.currentDrawing && !next.completed) {
        playPathComplete();
        burst(200 + col * 30, 150 + row * 30);
        showPopup("つながった！");
      }
      
      // 全クリア → リザルトへ
      if (next.completed && !prev.completed) {
        markStageCleared(next.stage);
        playLevelComplete();
        confetti();
        showPopup("🎉 クリア！");
        setTimeout(() => setPhase("result"), 800);
      }
      
      return next;
    });
  }, [playDraw, playPathComplete, playLevelComplete, sparkle, burst, confetti, showPopup]);

  const handleEndDrawing = useCallback(() => {
    setState((prev) => (prev ? endDrawing(prev) : prev));
  }, []);

  const handleReset = useCallback(() => {
    setState((prev) => (prev ? resetStage(prev) : prev));
  }, []);

  const handleBack = useCallback(() => {
    setPhase("start");
    setState(null);
  }, []);

  const handleNextStage = useCallback(() => {
    if (!state) return;
    const nextStage = STAGES.find((s) => s.id === state.stage.id + 1);
    if (nextStage) {
      setState(createInitialState(nextStage));
      setPhase("playing");
    }
  }, [state]);

  const handleRetry = useCallback(() => {
    if (!state) return;
    setState(createInitialState(state.stage));
    setPhase("playing");
  }, [state]);

  return (
    <GameShell gameId="dotconnect" layout="default">
      <div className="dotconnect-root">
        {phase === "start" && (
          <StartScreen onSelectStage={handleSelectStage} />
        )}

        {phase === "playing" && state && (
          <GameView
            state={state}
            onStartDrawing={handleStartDrawing}
            onContinueDrawing={handleContinueDrawing}
            onEndDrawing={handleEndDrawing}
            onReset={handleReset}
            onBack={handleBack}
          />
        )}

        {phase === "result" && state && (
          <ResultScreen
            stage={state.stage}
            onNextStage={handleNextStage}
            onRetry={handleRetry}
            onBackToStart={handleBack}
          />
        )}
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup?.text ?? null}
          popupKey={popup?.key ?? 0}
          variant={popup?.text?.includes("クリア") ? "level" : "bonus"}
          size="lg"
        />
      </div>
    </GameShell>
  );
}
