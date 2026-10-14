import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import StartScreen from "./components/StartScreen";
import GameView from "./components/GameView";
import ResultScreen from "./components/ResultScreen";
import SaveDeletionConfirmation from "./components/SaveDeletionConfirmation";
import { cloneGameSettings, normalizeGameSettings } from "./lib/settings";
import {
  loadGameState,
  readGameState,
  saveGameState,
  clearSavedGame,
  loadDevicePreferences,
  saveDevicePreferences,
} from "./lib/storage";
import {
  createEmptyBoard,
  cloneBoard,
  getWinningCells,
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
import { useAudio, useParticles, ParticleLayer, GameShell } from "@shared";
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
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);
  useEffect(() => clearTimers, [clearTimers]);
  const schedule = (action: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      action();
    }, delay);
    timers.current.add(timer);
  };
  const initialSave = useMemo(() => readGameState(), []);
  const initialSavedState = initialSave.state;
  const initialDevicePrefs = useMemo(() => loadDevicePreferences(), []);
  const [saveMessage, setSaveMessage] = useState<string | null>(initialSave.message);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);

  const { playClick, playFanfare, playArpeggio } = useAudio();
  const { particles, confetti, burst, sparkle, clear: clearParticles } = useParticles();

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
  const [winningCells, setWinningCells] = useState<Array<{ row: number; col: number }>>([]);
  const [scorePopup, setScorePopup] = useState<{ text: string; key: number } | null>(null);
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
      appState: isWinAnimation || isDraw ? "after" : appState,
      gameSettings: currentGameSettings,
      board,
      currentPlayerIndex: nextPlayerIndex ?? currentPlayerIndex,
      winner: isWinAnimation ? currentGameSettings.players[currentPlayerIndex]?.name ?? null : winner,
    };
    // Report the result of synchronizing with the browser storage API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveMessage(saveGameState(snapshot) ? null : "この進行を保存できませんでした。遊び続けられますが、再読み込みすると最後に保存できた状態へ戻るか、進行を失います。");
  }, [appState, currentGameSettings, board, currentPlayerIndex, winner, nextPlayerIndex, isWinAnimation, isDraw]);

  useEffect(() => {
    const saved = saveDevicePreferences({
      confirmationMode,
      lastGameSettings: newGameSettings,
    });
    // Preferences and game progress have separate write outcomes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefsMessage(saved ? null : "設定を保存できませんでした。再読み込みすると設定が元に戻る場合があります。");
  }, [confirmationMode, newGameSettings]);

  const initializeGame = () => {
    setDeleteMessage(null);
    clearTimers();
    setIsTransitioning(false);
    setNextPlayerIndex(null);
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
    setWinningCells([]);
    setScorePopup(null);
    clearParticles();
    setAppState("in_progress");
  };

  const handleCellClick = (row: number, col: number) => {
    if (winner !== null || isTransitioning || isWinAnimation || isDraw) return;

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
    
    // 配置時のパーティクル（小規模スパークル）
    sparkle(window.innerWidth / 2, window.innerHeight / 2, 6);

    const winCells = getWinningCells(newBoard, row, col, currentPlayer.mark, currentGameSettings);
    if (winCells) {
      const configHash = computeConfigHash(currentGameSettings);
      const newStreak = streak + 1;
      setStreak(newStreak);
      saveStreak(newStreak, configHash);
      setIsWinAnimation(true);
      setWinningCells(winCells);
      setVictoryMessage(`🎉 ${currentPlayer.name} の勝利！`);
      setScorePopup({ text: newStreak >= 2 ? `🔥 ${newStreak}連勝！` : "WIN!", key: Date.now() });
      playFanfare();
      // 派手な confetti パーティクル
      confetti(60);
      schedule(() => confetti(40), 300);
      schedule(() => {
        setWinner(currentPlayer.name);
        setAppState("after");
        setIsWinAnimation(false);
        setVictoryMessage(null);
        setWinningCells([]);
        setScorePopup(null);
      }, 2500);
    } else if (isBoardFull(newBoard)) {
      const configHash = computeConfigHash(currentGameSettings);
      saveStreak(0, configHash);
      setStreak(0);
      setIsDraw(true);
      setVictoryMessage("引き分け！");
      setScorePopup({ text: "DRAW", key: Date.now() });
      playArpeggio([330, 294], 0.22, "square", 0.15, 0.28);
      burst(window.innerWidth / 2, window.innerHeight / 2, 20);
      schedule(() => {
        setWinner(null);
        setAppState("after");
        setIsDraw(false);
        setVictoryMessage(null);
        setScorePopup(null);
      }, 2500);
    } else {
      const nextIndex =
        (currentPlayerIndex + 1) % currentGameSettings.players.length;
      setNextPlayerIndex(nextIndex);
      setIsTransitioning(true);
      schedule(() => {
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
    clearTimers();
    setAppState("before");
    setPendingMove(null);
    setIsTransitioning(false);
    setNextPlayerIndex(null);
    setLastPlacedCell(null);
    setIsWinAnimation(false);
    setVictoryMessage(null);
    setIsDraw(false);
    setWinningCells([]);
    setScorePopup(null);
    clearParticles();
  };

  const handleResumeGame = () => {
    setDeleteMessage(null);
    setAppState("in_progress");
  };

  const handleClearSave = () => {
    setDeleteConfirmation(true);
  };

  const confirmClearSave = () => {
    setDeleteConfirmation(false);
    if (clearSavedGame()) window.location.reload();
    else setDeleteMessage("保存データを削除できませんでした。現在のゲームと保存データはそのままです。");
  };

  return (
    <GameShell
      title="N人 TikTakToe"
      gameId="ntiktaktoe"
      layout="immersive"
      minScale={0.34}
      statusMessage={[saveMessage, prefsMessage, deleteMessage].filter(Boolean).join(" ") || undefined}
    >
      <div className="ntiktaktoe-root">
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
            winningCells={winningCells}
            scorePopup={scorePopup}
            onCellClick={handleCellClick}
            onConfirmMove={confirmMove}
            onCancelPendingMove={cancelMove}
            onReset={resetGame}
          />
        )}

        {appState === "after" && (
          <ResultScreen winner={winner} onReset={resetGame} />
        )}

        {/* 共通パーティクルレイヤー */}
        {deleteConfirmation && <SaveDeletionConfirmation
          onConfirm={confirmClearSave} onCancel={() => setDeleteConfirmation(false)} />}
        <ParticleLayer particles={particles} />
      </div>
    </GameShell>
  );
}

export default App;
