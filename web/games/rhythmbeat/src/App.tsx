import { useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";
import type { GameState, GamePhase, DifficultyConfig } from "./lib/types";
import { DIFFICULTIES } from "./lib/constants";
import {
  createInitialState,
  generateNotes,
} from "./lib/rhythmbeat";
import { loadHighScore, saveHighScore } from "./lib/storage";
import { StartScreen } from "./components/StartScreen";
import { GameView } from "./components/GameView";
import { ResultScreen } from "./components/ResultScreen";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("start");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [config, setConfig] = useState<DifficultyConfig>(DIFFICULTIES.normal);
  const [highScore, setHighScore] = useState<number | null>(loadHighScore);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // ゲーム開始
  const handleStart = useCallback((difficulty: string) => {
    const selectedConfig = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    setConfig(selectedConfig);

    const notes = generateNotes(selectedConfig);
    const startTime = performance.now();
    const initialState = createInitialState(notes, startTime);

    setGameState(initialState);
    setIsNewRecord(false);
    setPhase("playing");
  }, []);

  // ゲーム状態更新
  const handleStateChange = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  // ゲーム終了
  const handleFinish = useCallback(() => {
    if (!gameState) return;

    const finalScore = gameState.score;
    if (highScore === null || finalScore > highScore) {
      setHighScore(finalScore);
      saveHighScore(finalScore);
      setIsNewRecord(true);
    }
    setPhase("result");
  }, [gameState, highScore]);

  // リスタート
  const handleRestart = useCallback(() => {
    setPhase("start");
    setGameState(null);
  }, []);

  return (
    <GameShell gameId="rhythmbeat" layout="immersive">
      <div className="rhythmbeat-root">
        {phase === "start" && (
          <StartScreen highScore={highScore} onStart={handleStart} />
        )}

        {phase === "playing" && gameState && (
          <GameView
            state={gameState}
            config={config}
            onStateChange={handleStateChange}
            onFinish={handleFinish}
          />
        )}

        {phase === "result" && gameState && (
          <ResultScreen
            state={gameState}
            highScore={highScore}
            isNewRecord={isNewRecord}
            onRestart={handleRestart}
          />
        )}
      </div>
    </GameShell>
  );
}
