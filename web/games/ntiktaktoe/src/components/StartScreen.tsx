import type { GameMode, GameSettings, PersistedState } from "../lib/types";

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

  const updateGameMode = (mode: GameMode) => {
    onNewGameSettingsChange({
      ...newGameSettings,
      gameMode: mode,
    });
  };

  return (
    <div className="start-screen ntiktaktoe-settings">
      <h1 className="game-title">エクストリーム○×ゲーム</h1>

      <div className="start-layout ntiktaktoe-settings-grid">
        <div className="left-column">
          <div className="ntiktaktoe-settings-section start-card resume-card">
            <h2>続行</h2>
            <div className="save-scope-guidance">
              <p>進行・設定・連勝履歴は、この端末のこのブラウザに保存します。同じサイトのURLで再開できます。別の端末やブラウザには引き継げません。</p>
              <p>ブラウザのデータ削除などで記録が消える場合があります。進行や設定を保存できないときは画面に案内します。</p>
            </div>
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
                  進行データを削除
                </button>
                <p>削除するのは進行だけです。設定と連勝履歴は残ります。</p>
              </>
            ) : (
              <div className="no-save-data">
                <p>保存されたゲームデータはありません</p>
              </div>
            )}
          </div>

          <div className="ntiktaktoe-settings-section start-card settings-card">
            <h2>設定</h2>
            <div className="settings-options">
              <div className="setting-row mode-row">
                <label>ゲームモード</label>
                <select aria-label="ゲームモード"
                  value={newGameSettings.gameMode}
                  onChange={(e) => updateGameMode(e.target.value as GameMode)}
                >
                  <option value="classic">クラシック</option>
                  <option value="gravity">重力あり</option>
                </select>
              </div>
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

        <div className="ntiktaktoe-settings-section start-card new-game-card">
          <h2>新規ゲーム</h2>
          <p>ゲーム開始で、保存済みの進行を新しいゲームに置き換えます。</p>

          <div className="new-game-section">
            <h3>盤面設定</h3>
            <div className="setting-row">
              <label>盤面サイズ</label>
              <div className="size-inputs">
                <input
                  type="number"
                  min="3"
                  max="30"
                  aria-label="盤面の列数"
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
                  aria-label="盤面の行数"
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
                aria-label="勝利に必要な連続数"
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
                    aria-label={`プレイヤー${index + 1}の名前`}
                    value={player.name}
                    onChange={(e) => onUpdatePlayerName(index, e.target.value)}
                    placeholder="プレイヤー名"
                  />
                  <input
                    type="text"
                    maxLength={2}
                    aria-label={`プレイヤー${index + 1}の記号`}
                    value={player.mark}
                    onChange={(e) => onUpdatePlayerMark(index, e.target.value)}
                    placeholder="記号"
                  />
                  <input
                    type="color"
                    aria-label={`プレイヤー${index + 1}の色`}
                    value={player.color}
                    onChange={(e) => onUpdatePlayerColor(index, e.target.value)}
                    title="テーマカラー"
                  />
                  {newGameSettings.players.length > 2 && (
                    <button
                      aria-label={`プレイヤー${index + 1}を削除`}
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
