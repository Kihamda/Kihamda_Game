import { useEffect, useMemo, useState } from "react";
import "./App.css";

import StartScreen from "./components/StartScreen";
import GameView from "./components/GameView";
import ResultScreen from "./components/ResultScreen";
import { cloneGameSettings, normalizeGameSettings } from "./lib/settings";
import {
  loadGameState,
  saveGameState,
  clearSavedGame,
  loadDevicePreferences,
  saveDevicePreferences,
} from "./lib/storage";
import {
  createEmptyBoard,
  cloneBoard,
  checkWin,
  resolveMovePosition,
  isBoardFull,
} from "./lib/board";
import {
  addPlayerToSettings,
  removePlayerFromSettings,
  updatePlayerName,
  updatePlayerMark,
  updatePlayerColor,
} from "./lib/players";
import { useAudio, GameShell } from "../../../src/shared";
import { STREAK_KEY } from "./lib/constants";
import type {
  Board,
  GameSettings,
  PendingMove,
  PersistedState,
} from "./lib/types";

// ---- streak helpers -------------------------------------------------------
interface StreakData {
  count: number;
  configHash: string;
}

const computeConfigHash = (settings: GameSettings): string =>
  settings.players.map((p) => p.name).join("|");

const loadStreak = (configHash: string): number => {
  try {
    const saved = localStorage.getItem(STREAK_KEY);
    if (saved) {
      const data = JSON.parse(saved) as StreakData;
      if (data.configHash === configHash) return data.count;
    }
  } catch {
    // ignore
  }
  return 0;
};

const saveStreak = (count: number, configHash: string): void => {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify({ count, configHash }));
  } catch {
    // ignore
  }
};
// ---------------------------------------------------------------------------

function App() {
  const initialSavedState = useMemo(() => loadGameState(), []);
  const initialDevicePrefs = useMemo(() => loadDevicePreferences(), []);

  const { playClick, playFanfare, playArpeggio } = useAudio();

  const [appState, setAppState] = useState<"before" | "in_progress" | "after">(
    initialSavedState?.appState || "before",
  );
  const [currentGameSettings, setCurrentGameSettings] = useState<GameSettings>(
    initialSavedState?.gameSettings
      ? cloneGameSettings(normalizeGameSettings(initialSavedState.gameSettings))
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
  const [confirmationMode, setConfirmationMode] = useState(
    initialDevicePrefs.confirmationMode,
  );

  // ---- effect states -------------------------------------------------------
  const [lastPlacedCell, setLastPlacedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [isWinAnimation, setIsWinAnimation] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [streak, setStreak] = useState(0);
  // --------------------------------------------------------------------------

  const savedSnapshot = useMemo<Partial<PersistedState> | null>(() => {
    if (appState === "before") {
      return loadGameState() ?? initialSavedState;
    }

    return {
      appState,
      gameSettings: currentGameSettings,
      board,
      currentPlayerIndex,
      winner,
    };
  }, [
    appState,
    board,
    currentGameSettings,
    currentPlayerIndex,
    initialSavedState,
    winner,
  ]);

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
  }, [appState, currentGameSettings, board, currentPlayerIndex, winner]);

  useEffect(() => {
    saveDevicePreferences({
      confirmationMode,
      lastGameSettings: newGameSettings,
    });
  }, [confirmationMode, newGameSettings]);

  const initializeGame = () => {
    const clonedSettings = cloneGameSettings(newGameSettings);
    const configHash = computeConfigHash(clonedSettings);
    setCurrentGameSettings(clonedSettings);
    setBoard(createEmptyBoard(clonedSettings));
    setCurrentPlayerIndex(0);
    setWinner(null);
    setPendingMove(null);
    setLastPlacedCell(null);
    setIsWinAnimation(false);
    setVictoryMessage(null);
    setIsDraw(false);
    setMoveCount(0);
    setStreak(loadStreak(configHash));
    setAppState("in_progress");
  };

  const handleCellClick = (row: number, col: number) => {
    if (winner !== null || isTransitioning) return;

    const resolvedMove = resolveMovePosition(
      board,
      row,
      col,
      currentGameSettings,
    );
    if (!resolvedMove) return;

    if (confirmationMode) {
      setPendingMove(resolvedMove);
    } else {
      confirmMove(resolvedMove.row, resolvedMove.col);
    }
  };

  const confirmMove = (row: number, col: number) => {
    const currentPlayer = currentGameSettings.players[currentPlayerIndex];
    if (!currentPlayer) return;
    if (board[row]?.[col] !== null) return;

    const newBoard = cloneBoard(board);
    newBoard[row][col] = currentPlayer.mark;
    setBoard(newBoard);
    setPendingMove(null);
    setLastPlacedCell({ row, col });
    setMoveCount((c) => c + 1);
    playClick();

    if (checkWin(newBoard, row, col, currentPlayer.mark, currentGameSettings)) {
      const configHash = computeConfigHash(currentGameSettings);
      const newStreak = streak + 1;
      setStreak(newStreak);
      saveStreak(newStreak, configHash);
      setIsWinAnimation(true);
      setVictoryMessage(`🎉 ${currentPlayer.name} の勝利！`);
      playFanfare();
      setTimeout(() => {
        setWinner(currentPlayer.name);
        setAppState("after");
        setIsWinAnimation(false);
        setVictoryMessage(null);
      }, 2500);
    } else if (isBoardFull(newBoard)) {
      const configHash = computeConfigHash(currentGameSettings);
      saveStreak(0, configHash);
      setStreak(0);
      setIsDraw(true);
      setVictoryMessage("引き分け！");
      playArpeggio([330, 294], 0.22, "square", 0.15, 0.28);
      setTimeout(() => {
        setWinner(null);
        setAppState("after");
        setIsDraw(false);
        setVictoryMessage(null);
      }, 2500);
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
    setLastPlacedCell(null);
    setIsWinAnimation(false);
    setVictoryMessage(null);
    setIsDraw(false);
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
    <GameShell title="N人 TikTakToe">
    <div className="app">
      {appState === "before" && (
        <StartScreen
          savedState={savedSnapshot}
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
          lastPlacedCell={lastPlacedCell}
          isWinAnimation={isWinAnimation}
          victoryMessage={victoryMessage}
          isDraw={isDraw}
          streak={streak}
          moveCount={moveCount}
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
    </GameShell>
  );
}

export default App;
