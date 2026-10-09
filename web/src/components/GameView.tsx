import type { Board, GameSettings, PendingMove } from "../lib/types";

interface GameViewProps {
  board: Board;
  gameSettings: GameSettings;
  pendingMove: PendingMove | null;
  currentPlayerIndex: number;
  nextPlayerIndex: number | null;
  isTransitioning: boolean;
  onCellClick: (row: number, col: number) => void;
  onConfirmMove: (row: number, col: number) => void;
  onCancelPendingMove: () => void;
  onReset: () => void;
}

const GameView = ({
  board,
  gameSettings,
  pendingMove,
  currentPlayerIndex,
  nextPlayerIndex,
  isTransitioning,
  onCellClick,
  onConfirmMove,
  onCancelPendingMove,
  onReset,
}: GameViewProps) => {
  const currentPlayer = gameSettings.players[currentPlayerIndex];
  const pendingMark = currentPlayer?.mark;

  return (
    <div className="game">
      {isTransitioning && nextPlayerIndex !== null && (
        <div className="transition-overlay">
          <div className="next-player-display">
            <div className="next-label">次のターン</div>
            <div className="next-player-name">
              {gameSettings.players[nextPlayerIndex].name}
            </div>
            <div
              className="next-player-mark"
              style={{
                color: gameSettings.players[nextPlayerIndex].color,
                textShadow: `0 0 30px ${gameSettings.players[nextPlayerIndex].color}80`,
              }}
            >
              {gameSettings.players[nextPlayerIndex].mark}
            </div>
          </div>
        </div>
      )}

      {pendingMove && (
        <div className="confirmation-popup">
          <div className="popup-content">
            <div className="popup-header">
              <div
                className="popup-mark"
                style={{ color: currentPlayer?.color }}
              >
                {pendingMark}
              </div>
              <div className="popup-text">ここに置きますか？</div>
            </div>
            <div className="popup-position">
              ({pendingMove.col + 1}, {pendingMove.row + 1})
            </div>
            <div className="popup-buttons">
              <button
                className="confirm-btn"
                onClick={() => onConfirmMove(pendingMove.row, pendingMove.col)}
              >
                確定
              </button>
              <button className="cancel-btn" onClick={onCancelPendingMove}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="floating-card game-info">
        <div className="player-indicator">
          <span className="label">現在のターン</span>
          <span className="player-name" style={{ color: currentPlayer?.color }}>
            {currentPlayer?.name}
          </span>
          <span className="player-mark" style={{ color: currentPlayer?.color }}>
            {currentPlayer?.mark}
          </span>
        </div>
        <div className="players-list">
          {gameSettings.players.map((player, index) => (
            <div
              key={index}
              className={`player-item ${
                index === currentPlayerIndex ? "active" : ""
              }`}
              style={{
                background:
                  index === currentPlayerIndex ? player.color : "#f5f5f5",
                color: index === currentPlayerIndex ? "white" : "#424242",
              }}
            >
              <span className="mark">{player.mark}</span>
              <span className="name">{player.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="floating-card board-controls">
        <button className="reset-button" onClick={onReset}>
          設定に戻る
        </button>
      </div>

      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${gameSettings.board.width}, 1fr)`,
          gridTemplateRows: `repeat(${gameSettings.board.height}, 1fr)`,
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const cellPlayerIndex = cell
              ? gameSettings.players.findIndex((p) => p.mark === cell)
              : -1;
            const cellColor =
              cellPlayerIndex >= 0
                ? gameSettings.players[cellPlayerIndex].color
                : undefined;
            const isPending =
              pendingMove?.row === rowIndex && pendingMove?.col === colIndex;

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`cell ${cell ? "filled" : ""} ${
                  isPending ? "pending" : ""
                }`}
                style={{
                  background: cell
                    ? cellColor
                    : isPending
                    ? `${currentPlayer?.color ?? "#7986cb"}50`
                    : undefined,
                  borderColor: isPending ? currentPlayer?.color : undefined,
                  color: isPending ? currentPlayer?.color : undefined,
                  boxShadow: isPending
                    ? `0 0 20px ${currentPlayer?.color ?? "#7986cb"}66`
                    : undefined,
                }}
                onClick={() => onCellClick(rowIndex, colIndex)}
              >
                {isPending ? pendingMark : cell}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameView;
