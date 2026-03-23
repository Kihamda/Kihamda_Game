import { useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";
import type { GameState, GamePhase } from "./lib/types";
import {
  createInitialState,
  startNextWave,
} from "./lib/balloondefense";
import { loadHighScore, saveHighScore } from "./lib/storage";
import { StartScreen } from "./components/StartScreen";
import { GameView } from "./components/GameView";
import { ResultScreen } from "./components/ResultScreen";
import { WaveClearScreen } from "./components/WaveClearScreen";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("start");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [highScore, setHighScore] = useState<number | null>(loadHighScore);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // ゲーム開始
  const handleStart = useCallback(() => {
    const initialState = createInitialState();
    setGameState(initialState);
    setIsNewRecord(false);
    setPhase("playing");
  }, []);

  // ゲーム状態更新
  const handleStateChange = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  // ゲームオーバー
  const handleGameOver = useCallback(() => {
    if (!gameState) return;

    const finalScore = gameState.score;
    if (highScore === null || finalScore > highScore) {
      setHighScore(finalScore);
      saveHighScore(finalScore);
      setIsNewRecord(true);
    }
    setPhase("result");
  }, [gameState, highScore]);

  // ウェーブクリア
  const handleWaveClear = useCallback(() => {
    setPhase("waveClear");
  }, []);

  // 次のウェーブへ
  const handleNextWave = useCallback(() => {
    if (!gameState) return;
    const newState = startNextWave(gameState);
    setGameState(newState);
    setPhase("playing");
  }, [gameState]);

  // リスタート
  const handleRestart = useCallback(() => {
    setPhase("start");
    setGameState(null);
  }, []);

  return (
    <GameShell gameId="balloondefense" layout="immersive">
      <div className="balloon-root">
        {phase === "start" && (
          <StartScreen highScore={highScore} onStart={handleStart} />
        )}

        {phase === "playing" && gameState && (
          <GameView
            state={gameState}
            onStateChange={handleStateChange}
            onGameOver={handleGameOver}
            onWaveClear={handleWaveClear}
          />
        )}

        {phase === "waveClear" && gameState && (
          <WaveClearScreen
            wave={gameState.wave}
            onNextWave={handleNextWave}
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
