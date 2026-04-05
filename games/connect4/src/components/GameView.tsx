import type { Board, DroppingPiece, Player, WinLine } from "../lib/types";
import { COLS, ROWS } from "../lib/types";
import { CELL_SIZE, CELL_GAP } from "../lib/constants";
import { canDropInColumn } from "../lib/connect4";

interface GameViewProps {
  board: Board;
  currentPlayer: Player;
  winner: Player | null;
  winLine: WinLine | null;
  dropping: DroppingPiece | null;
  hoveredCol: number | null;
  isCpuTurn: boolean;
  onColumnClick: (col: number) => void;
  onColumnHover: (col: number) => void;
  onBoardLeave: () => void;
}

export function GameView({
  board,
  currentPlayer,
  winner,
  winLine,
  dropping,
  hoveredCol,
  isCpuTurn,
  onColumnClick,
  onColumnHover,
  onBoardLeave,
}: GameViewProps) {
  const isWinCell = (row: number, col: number): boolean => {
    if (!winLine) return false;
    return winLine.cells.some(([r, c]) => r === row && c === col);
  };

  const getCellClassName = (row: number, col: number): string => {
    const cell = board[row][col];
    const classes = ["connect4-cell"];

    if (cell === 1) classes.push("connect4-cell--player1");
    if (cell === 2) classes.push("connect4-cell--player2");
    if (isWinCell(row, col)) classes.push("connect4-cell--win");

    return classes.join(" ");
  };

  const cellUnit = CELL_SIZE + CELL_GAP;

  return (
    <div className="connect4-game">
      <div
        className="connect4-board-wrapper"
        onMouseLeave={onBoardLeave}
      >
        {/* 列インジケーター */}
        <div className="connect4-column-indicator">
          {Array.from({ length: COLS }).map((_, col) => {
            const isHovered = hoveredCol === col;
            const canDrop = !winner && !isCpuTurn && canDropInColumn(board, col);
            return (
              <div
                key={col}
                className={`connect4-indicator ${isHovered && canDrop ? "connect4-indicator--active" : ""}`}
              >
                <div
                  className={`connect4-indicator-piece connect4-indicator-piece--player${currentPlayer}`}
                />
              </div>
            );
          })}
        </div>

        {/* ボード */}
        <div className="connect4-board">
          {Array.from({ length: ROWS }).map((_, row) =>
            Array.from({ length: COLS }).map((_, col) => (
              <div
                key={`${row}-${col}`}
                className={getCellClassName(row, col)}
                onClick={() => onColumnClick(col)}
                onMouseEnter={() => onColumnHover(col)}
              />
            ))
          )}
        </div>

        {/* 落下アニメーション用オーバーレイ */}
        {dropping && (
          <div className="connect4-dropping-overlay">
            <div
              className={`connect4-dropping-piece connect4-dropping-piece--player${dropping.player}`}
              style={{
                left: dropping.col * cellUnit,
                "--start-y": "-60px",
                "--end-y": `${dropping.targetRow * cellUnit}px`,
              } as React.CSSProperties}
            />
          </div>
        )}
      </div>
    </div>
  );
}
