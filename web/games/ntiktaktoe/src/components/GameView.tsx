import { ScorePopup } from "@shared";
import { useEffect, useRef } from "react";
import type { Board, GameSettings, PendingMove } from "../lib/types";

interface CellPosition {
  row: number;
  col: number;
}

interface GameViewProps {
  board: Board;
  gameSettings: GameSettings;
  pendingMove: PendingMove | null;
  currentPlayerIndex: number;
  nextPlayerIndex: number | null;
  isTransitioning: boolean;
  lastPlacedCell: CellPosition | null;
  isWinAnimation: boolean;
  victoryMessage: string | null;
  isDraw: boolean;
  streak: number;
  moveCount: number;
  winningCells: CellPosition[];
  scorePopup: { text: string; key: number } | null;
  onCellClick: (row: number, col: number) => void;
  onConfirmMove: (row: number, col: number) => void;
  onCancelPendingMove: () => void;
  onReset: () => void;
}

function MoveConfirmation({ move, mark, onConfirm, onCancel }: {
  move: PendingMove;
  mark: string | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallback = element?.closest(".game")?.querySelector<HTMLButtonElement>(".reset-button");
    element?.showModal();
    cancelButton.current?.focus();
    return () => {
      element?.close();
      if (opener?.isConnected && !opener.matches(":disabled")) opener.focus();
      else if (fallback?.isConnected) fallback.focus();
    };
  }, []);
  return <dialog ref={dialog} className="move-confirm-dialog" aria-labelledby="move-confirm-title"
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    }}
    onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <h2 id="move-confirm-title">ここに置きますか？</h2>
    <p>{mark}：{move.row + 1}行{move.col + 1}列</p>
    <div className="move-confirm-actions">
      <button onClick={onConfirm}>確定</button>
      <button ref={cancelButton} onClick={onCancel}>キャンセル</button>
    </div>
  </dialog>;
}

// Pre-computed particle directions (angle in degrees → unit vector)
const PARTICLE_ANGLES_6 = [0, 60, 120, 180, 240, 300];
const PARTICLE_ANGLES_8 = [0, 45, 90, 135, 180, 225, 270, 315];
const toVec = (deg: number) => ({
  x: Math.round(Math.cos((deg * Math.PI) / 180) * 100) / 100,
  y: Math.round(Math.sin((deg * Math.PI) / 180) * 100) / 100,
});

interface ParticlesProps {
  isWin: boolean;
  color: string;
  animKey: number;
}

const Particles = ({ isWin, color, animKey }: ParticlesProps) => {
  const angles = isWin ? PARTICLE_ANGLES_8 : PARTICLE_ANGLES_6;
  const distance = isWin ? 64 : 36;
  return (
    <div className={`particles ${isWin ? "particles--win" : "particles--place"}`} key={animKey}>
      {angles.map((angle, i) => {
        const { x, y } = toVec(angle);
        return (
          <div
            key={i}
            className="particle"
            style={{
              "--tx": `${Math.round(x * distance)}px`,
              "--ty": `${Math.round(y * distance)}px`,
              "--color": color,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
};

const GameView = ({
  board,
  gameSettings,
  pendingMove,
  currentPlayerIndex,
  nextPlayerIndex,
  isTransitioning,
  lastPlacedCell,
  isWinAnimation,
  victoryMessage,
  isDraw,
  streak,
  moveCount,
  winningCells,
  scorePopup,
  onCellClick,
  onConfirmMove,
  onCancelPendingMove,
  onReset,
}: GameViewProps) => {
  const currentPlayer = gameSettings.players[currentPlayerIndex];
  const pendingMark = currentPlayer?.mark;

  // 勝利セルかどうかを判定するヘルパー
  const isWinningCell = (row: number, col: number): boolean => {
    return winningCells.some((c) => c.row === row && c.col === col);
  };

  return (
    <div className={`ntiktaktoe-game game${isWinAnimation ? " game--shake" : ""}`}>
      {/* Victory / Draw popup */}
      {victoryMessage && (
        <div className={`victory-popup${isDraw ? " victory-popup--draw" : ""}`}>
          <span>{victoryMessage}</span>
        </div>
      )}

      {/* Streak badge */}
      {streak >= 2 && (
        <div className="streak-badge">
          🔥 {streak}連勝中！
        </div>
      )}

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
        <MoveConfirmation move={pendingMove} mark={pendingMark}
          onConfirm={() => onConfirmMove(pendingMove.row, pendingMove.col)}
          onCancel={onCancelPendingMove} />
      )}

      <div className="floating-card game-info">
        <div className="mode-badge">
          モード:
          {gameSettings.gameMode === "gravity" ? "重力あり" : "クラシック"}
        </div>
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
        className="ntiktaktoe-board board"
        style={{
          width: Math.min(540, 480 * gameSettings.board.width / gameSettings.board.height),
          height: Math.min(480, 540 * gameSettings.board.height / gameSettings.board.width),
          gridTemplateColumns: `repeat(${gameSettings.board.width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gameSettings.board.height}, minmax(0, 1fr))`,
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
            const isLastPlaced =
              lastPlacedCell?.row === rowIndex &&
              lastPlacedCell?.col === colIndex;
            const isWinCell = isWinningCell(rowIndex, colIndex);

            return (
              <button
                type="button"
                aria-label={`セル ${rowIndex + 1}-${colIndex + 1}${cell ? ` ${cell}` : ""}`}
                disabled={cell !== null || isTransitioning || isWinAnimation || isDraw}
                key={`${rowIndex}-${colIndex}`}
                className={`ntiktaktoe-cell cell ${cell ? "filled" : ""} ${
                  isPending ? "pending" : ""
                } ${isLastPlaced ? "cell--placed" : ""} ${isWinCell ? "cell--winning" : ""}`}
                style={{
                  background: cell
                    ? cellColor
                    : isPending
                      ? `${currentPlayer?.color ?? "#7986cb"}50`
                      : undefined,
                  borderColor: isPending ? currentPlayer?.color : undefined,
                  color: isPending ? currentPlayer?.color : undefined,
                  boxShadow: isWinCell
                    ? `0 0 20px ${cellColor}, 0 0 40px ${cellColor}, 0 0 60px ${cellColor}80`
                    : isPending
                      ? `0 0 20px ${currentPlayer?.color ?? "#7986cb"}66`
                      : undefined,
                  "--glow-color": cellColor,
                } as React.CSSProperties}
                onClick={() => onCellClick(rowIndex, colIndex)}
              >
                {isPending ? pendingMark : cell}

                {/* Particles on place or win */}
                {isLastPlaced && (
                  <Particles
                    isWin={isWinAnimation}
                    color={cellColor ?? currentPlayer?.color ?? "#7986cb"}
                    animKey={moveCount}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>

      {/* スコアポップアップ */}
      <ScorePopup
        text={scorePopup?.text ?? null}
        popupKey={scorePopup?.key}
        y="30%"
        variant={isDraw ? "default" : "critical"}
        size="xl"
      />
    </div>
  );
};

export default GameView;
