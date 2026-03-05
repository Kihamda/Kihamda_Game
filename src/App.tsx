import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import StartScreen from "./components/StartScreen";
import GameView from "./components/GameView";
import ResultScreen from "./components/ResultScreen";
import { cloneGameSettings } from "./lib/settings";
import {
  loadGameState,
  saveGameState,
  clearSavedGame,
  loadDevicePreferences,
  saveDevicePreferences,
} from "./lib/storage";
import { createEmptyBoard, cloneBoard, checkWin } from "./lib/board";
import {
  addPlayerToSettings,
  removePlayerFromSettings,
  updatePlayerName,
  updatePlayerMark,
  updatePlayerColor,
} from "./lib/players";
import type {
  Board,
  GameSettings,
  PendingMove,
  PersistedState,
} from "./lib/types";

function App() {
  const initialSavedState = useMemo(() => loadGameState(), []);
  const initialDevicePrefs = useMemo(() => loadDevicePreferences(), []);

  const [appState, setAppState] = useState<"before" | "in_progress" | "after">(
    initialSavedState?.appState || "before",
  );
  const [currentGameSettings, setCurrentGameSettings] = useState<GameSettings>(
    initialSavedState?.gameSettings
      ? cloneGameSettings(initialSavedState.gameSettings)
      : cloneGameSettings(initialDevicePrefs.lastGameSettings),
  );
  const [newGameSettings, setNewGameSettings] = useState<GameSettings>(
    cloneGameSettings(initialDevicePrefs.lastGameSettings),
  );
  const [board, setBoard] = useState<Board>(initialSavedState?.board || []);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(
    initialSavedState?.currentPlayerIndex || 0,
  );
  const [winner, setWinner] = useState<string | null>(
    initialSavedState?.winner || null,
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextPlayerIndex, setNextPlayerIndex] = useState<number | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const savedSnapshotRef = useRef<Partial<PersistedState> | null>(
    initialSavedState,
  );
  const [confirmationMode, setConfirmationMode] = useState(
    initialDevicePrefs.confirmationMode,
  );

  useEffect(() => {
    if (appState === "before") return;
    const snapshot: PersistedState = {
      appState,
      gameSettings: currentGameSettings,
      board,
      currentPlayerIndex,
      winner,
    };
    saveGameState(snapshot);
    savedSnapshotRef.current = snapshot;
  }, [appState, currentGameSettings, board, currentPlayerIndex, winner]);

  useEffect(() => {
    saveDevicePreferences({
      confirmationMode,
      lastGameSettings: newGameSettings,
    });
  }, [confirmationMode, newGameSettings]);

  const initializeGame = () => {
    const clonedSettings = cloneGameSettings(newGameSettings);
    setCurrentGameSettings(clonedSettings);
    setBoard(createEmptyBoard(clonedSettings));
    setCurrentPlayerIndex(0);
    setWinner(null);
    setPendingMove(null);
    setAppState("in_progress");
  };

  const handleCellClick = (row: number, col: number) => {
    if (board[row]?.[col] !== null || winner !== null || isTransitioning)
      return;

    if (confirmationMode) {
      setPendingMove({ row, col });
    } else {
      confirmMove(row, col);
    }
  };

  const confirmMove = (row: number, col: number) => {
    const currentPlayer = currentGameSettings.players[currentPlayerIndex];
    if (!currentPlayer) return;
    const newBoard = cloneBoard(board);
    newBoard[row][col] = currentPlayer.mark;
    setBoard(newBoard);
    setPendingMove(null);

    if (checkWin(newBoard, row, col, currentPlayer.mark, currentGameSettings)) {
      setTimeout(() => {
        setWinner(currentPlayer.name);
        setAppState("after");
      }, 300);
    } else {
      const nextIndex =
        (currentPlayerIndex + 1) % currentGameSettings.players.length;
      setNextPlayerIndex(nextIndex);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPlayerIndex(nextIndex);
        setNextPlayerIndex(null);
        setIsTransitioning(false);
      }, 1500);
    }
  };

  const cancelMove = () => {
    setPendingMove(null);
  };

  const handleAddPlayer = () => {
    setNewGameSettings((prev) => addPlayerToSettings(prev));
  };

  const handleRemovePlayer = (index: number) => {
    setNewGameSettings((prev) => removePlayerFromSettings(prev, index));
  };

  const handleUpdatePlayerName = (index: number, name: string) => {
    setNewGameSettings((prev) => updatePlayerName(prev, index, name));
  };

  const handleUpdatePlayerMark = (index: number, mark: string) => {
    setNewGameSettings((prev) => updatePlayerMark(prev, index, mark));
  };

  const handleUpdatePlayerColor = (index: number, color: string) => {
    setNewGameSettings((prev) => updatePlayerColor(prev, index, color));
  };

  const resetGame = () => {
    setAppState("before");
    setPendingMove(null);
    setIsTransitioning(false);
    setNextPlayerIndex(null);
  };

  const handleResumeGame = () => {
    setAppState("in_progress");
  };

  const handleClearSave = () => {
    if (confirm("保存データを削除してリセットしますか？")) {
      clearSavedGame();
      window.location.reload();
    }
  };

  return (
    <div className="app">
      {appState === "before" && (
        <StartScreen
          savedState={savedSnapshotRef.current}
          newGameSettings={newGameSettings}
          confirmationMode={confirmationMode}
          onNewGameSettingsChange={setNewGameSettings}
          onToggleConfirmation={setConfirmationMode}
          onStartNewGame={initializeGame}
          onResumeGame={handleResumeGame}
          onClearSave={handleClearSave}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          onUpdatePlayerName={handleUpdatePlayerName}
          onUpdatePlayerMark={handleUpdatePlayerMark}
          onUpdatePlayerColor={handleUpdatePlayerColor}
        />
      )}

      {appState === "in_progress" && (
        <GameView
          board={board}
          gameSettings={currentGameSettings}
          pendingMove={pendingMove}
          currentPlayerIndex={currentPlayerIndex}
          nextPlayerIndex={nextPlayerIndex}
          isTransitioning={isTransitioning}
          onCellClick={handleCellClick}
          onConfirmMove={confirmMove}
          onCancelPendingMove={cancelMove}
          onReset={resetGame}
        />
      )}

      {appState === "after" && (
        <ResultScreen winner={winner} onReset={resetGame} />
      )}
    </div>
  );
}

export default App;
