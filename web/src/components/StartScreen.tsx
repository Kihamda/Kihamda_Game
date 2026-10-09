import type { GameSettings, PersistedState } from "../lib/types";

interface StartScreenProps {
  savedState: Partial<PersistedState> | null;
  newGameSettings: GameSettings;
  confirmationMode: boolean;
  onNewGameSettingsChange: (settings: GameSettings) => void;
  onToggleConfirmation: (enabled: boolean) => void;
  onStartNewGame: () => void;
  onResumeGame: () => void;
  onClearSave: () => void;
  onAddPlayer: () => void;
  onRemovePlayer: (index: number) => void;
  onUpdatePlayerName: (index: number, name: string) => void;
  onUpdatePlayerMark: (index: number, mark: string) => void;
  onUpdatePlayerColor: (index: number, color: string) => void;
}

const StartScreen = ({
  savedState,
  newGameSettings,
  confirmationMode,
  onNewGameSettingsChange,
  onToggleConfirmation,
  onStartNewGame,
  onResumeGame,
  onClearSave,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayerName,
  onUpdatePlayerMark,
  onUpdatePlayerColor,
}: StartScreenProps) => {
  const savedGameSettings = savedState?.gameSettings ?? null;
  const hasSavedGame = Boolean(savedGameSettings && savedState?.board?.length);
  const savedCurrentPlayerIndex =
    typeof savedState?.currentPlayerIndex === "number"
      ? savedState.currentPlayerIndex
      : 0;
  const normalizedSavedPlayerIndex = savedGameSettings
    ? Math.min(
        savedCurrentPlayerIndex,
        Math.max(savedGameSettings.players.length - 1, 0),
      )
    : 0;

  const updateBoard = (key: "width" | "height", value: number) => {
    const sanitized = Math.max(3, Math.min(30, value || 3));
    onNewGameSettingsChange({
      ...newGameSettings,
      board: {
        ...newGameSettings.board,
        [key]: sanitized,
      },
    });
  };

  const updateWinLength = (value: number) => {
    const max = Math.max(
      newGameSettings.board.width,
      newGameSettings.board.height,
    );
    const sanitized = Math.max(3, Math.min(max, value || 3));
    onNewGameSettingsChange({
      ...newGameSettings,
      winLength: sanitized,
    });
  };

  const toggleConfirmation = (checked: boolean) => {
    onToggleConfirmation(checked);
  };

  return (
    <div className="start-screen">
      <h1 className="game-title">エクストリーム○×ゲーム</h1>

      <div className="start-layout">
        <div className="left-column">
          <div className="start-card resume-card">
            <h2>続行</h2>
            {hasSavedGame ? (
              <>
                <div className="resume-info">
                  <p>
                    盤面: {savedGameSettings?.board.width}×
                    {savedGameSettings?.board.height}
                  </p>
                  <p>プレイヤー: {savedGameSettings?.players.length}人</p>
                  <p>
                    現在のターン:
                    {
                      savedGameSettings?.players[normalizedSavedPlayerIndex]
                        ?.name
                    }
                  </p>
                </div>
                <button className="card-button primary" onClick={onResumeGame}>
                  ゲームを再開
                </button>
                <button className="card-button secondary" onClick={onClearSave}>
                  保存データを削除
                </button>
              </>
            ) : (
              <div className="no-save-data">
                <p>保存されたゲームデータはありません</p>
              </div>
            )}
          </div>

          <div className="start-card settings-card">
            <h2>設定</h2>
            <div className="settings-options">
              <label className="checkbox-label-inline">
                <input
                  type="checkbox"
                  checked={confirmationMode}
                  onChange={(e) => toggleConfirmation(e.target.checked)}
                />
                <span>設置時に確認ポップアップを表示</span>
              </label>
            </div>
          </div>
        </div>

        <div className="start-card new-game-card">
          <h2>新規ゲーム</h2>

          <div className="new-game-section">
            <h3>盤面設定</h3>
            <div className="setting-row">
              <label>盤面サイズ</label>
              <div className="size-inputs">
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={newGameSettings.board.width}
                  onChange={(e) =>
                    updateBoard("width", parseInt(e.target.value, 10))
                  }
                />
                <span>×</span>
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={newGameSettings.board.height}
                  onChange={(e) =>
                    updateBoard("height", parseInt(e.target.value, 10))
                  }
                />
              </div>
            </div>

            <div className="setting-row">
              <label>勝利条件</label>
              <input
                type="number"
                min="3"
                max={Math.max(
                  newGameSettings.board.width,
                  newGameSettings.board.height,
                )}
                value={newGameSettings.winLength}
                onChange={(e) => updateWinLength(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="new-game-section">
            <h3>プレイヤー設定</h3>
            <div className="players-config">
              {newGameSettings.players.map((player, index) => (
                <div key={index} className="player-config-item">
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => onUpdatePlayerName(index, e.target.value)}
                    placeholder="プレイヤー名"
                  />
                  <input
                    type="text"
                    maxLength={2}
                    value={player.mark}
                    onChange={(e) => onUpdatePlayerMark(index, e.target.value)}
                    placeholder="記号"
                  />
                  <input
                    type="color"
                    value={player.color}
                    onChange={(e) => onUpdatePlayerColor(index, e.target.value)}
                    title="テーマカラー"
                  />
                  {newGameSettings.players.length > 2 && (
                    <button
                      className="remove-player-btn"
                      onClick={() => onRemovePlayer(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="card-button secondary" onClick={onAddPlayer}>
              + プレイヤーを追加
            </button>
          </div>

          <button
            className="card-button primary large"
            onClick={onStartNewGame}
          >
            ゲーム開始
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
