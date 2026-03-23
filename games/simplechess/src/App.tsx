import { useState, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
} from "@shared";
import type { PopupVariant } from "@shared";
import {
  createInitialState,
  handleCellClick,
  isSelectedCell,
  isValidMoveCell,
  getPieceValue,
} from "./lib/chess";
import { PIECE_SYMBOLS } from "./lib/constants";
import type { GameState, Position, PieceType } from "./lib/types";
import { BOARD_SIZE } from "./lib/types";
import "./App.css";

interface PopupState {
  text: string | null;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

export default function App() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    x: "50%",
    y: "40%",
    variant: "default",
    size: "md",
  });
  const boardRef = useRef<HTMLDivElement>(null);

  const { playClick, playSuccess, playExplosion, playPerfect, playMiss } =
    useAudio();
  const { particles, burst, explosion, confetti } = useParticles();

  // Get position on screen for effects
  const getCellCenter = (pos: Position): { x: number; y: number } => {
    if (!boardRef.current) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const rect = boardRef.current.getBoundingClientRect();
    const cellSize = rect.width / BOARD_SIZE;
    return {
      x: rect.left + pos.col * cellSize + cellSize / 2,
      y: rect.top + pos.row * cellSize + cellSize / 2,
    };
  };

  const showPopup = useCallback((
    text: string,
    pos: Position,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md"
  ) => {
    const { x, y } = getCellCenter(pos);
    setPopup({
      text,
      key: Date.now(),
      x: `${x}px`,
      y: `${y}px`,
      variant,
      size,
    });
  }, []);

  const handleClick = useCallback(
    (pos: Position) => {
      setState((prev) => {
        const { board, currentPlayer, selectedPosition, validMoves, isCheckmate, isStalemate } =
          prev;

        // Game ended - no action
        if (isCheckmate || isStalemate) return prev;

        const clickedPiece = board[pos.row][pos.col];

        // Check if this is a valid move
        const isValidMove =
          selectedPosition &&
          validMoves.some((m) => m.row === pos.row && m.col === pos.col);

        if (isValidMove && selectedPosition) {
          // Execute the move
          const newState = handleCellClick(prev, pos);
          const capturedPiece = board[pos.row][pos.col];
          const { x, y } = getCellCenter(pos);

          // Handle capture
          if (capturedPiece) {
            const value = getPieceValue(capturedPiece.type);
            const isHighValue = capturedPiece.type === "queen" || capturedPiece.type === "rook";

            if (isHighValue) {
              playExplosion();
              explosion(x, y, 20);
              showPopup(
                `${PIECE_SYMBOLS[capturedPiece.color][capturedPiece.type]} +${value}!`,
                pos,
                "critical",
                "lg"
              );
            } else {
              playSuccess();
              burst(x, y, 12);
              showPopup(
                `+${value}`,
                pos,
                "default",
                "md"
              );
            }
          }

          // Handle checkmate
          if (newState.isCheckmate) {
            setTimeout(() => {
              playPerfect();
              confetti(60);
              const winner = newState.currentPlayer === "white" ? "黒" : "白";
              showPopup(`🎉 ${winner}の勝利!`, pos, "level", "xl");
            }, 200);
          }
          // Handle check
          else if (newState.isCheck) {
            setTimeout(() => {
              playMiss();
              showPopup("チェック!", pos, "combo", "lg");
            }, 100);
          }

          return newState;
        }

        // Selecting own piece
        if (clickedPiece?.color === currentPlayer) {
          playClick();
          return handleCellClick(prev, pos);
        }

        // Invalid click when piece is selected (not a valid move)
        if (selectedPosition && clickedPiece && clickedPiece.color !== currentPlayer) {
          playMiss();
          return {
            ...prev,
            selectedPosition: null,
            validMoves: [],
          };
        }

        // Deselect
        return handleCellClick(prev, pos);
      });
    },
    [playClick, playSuccess, playExplosion, playPerfect, playMiss, burst, explosion, confetti, showPopup]
  );

  const handleReset = useCallback(() => {
    setState(createInitialState());
    setPopup((p) => ({ ...p, text: null }));
  }, []);

  const renderStatus = () => {
    if (state.isCheckmate) {
      const winner = state.currentPlayer === "white" ? "黒" : "白";
      return (
        <p className="simplechess-status simplechess-status--end">
          🎉 チェックメイト！ {winner} の勝利！
        </p>
      );
    }
    if (state.isStalemate) {
      return (
        <p className="simplechess-status simplechess-status--end">
          ステイルメイト - 引き分け
        </p>
      );
    }
    const playerName = state.currentPlayer === "white" ? "白" : "黒";
    const checkText = state.isCheck ? " - チェック！" : "";
    return (
      <p
        className={`simplechess-status simplechess-status--${state.currentPlayer}${
          state.isCheck ? " simplechess-status--check" : ""
        }`}
      >
        {playerName} の番{checkText}
      </p>
    );
  };

  const getCellClassName = (row: number, col: number): string => {
    const pos: Position = { row, col };
    const isLight = (row + col) % 2 === 0;
    const classes = [
      "simplechess-cell",
      isLight ? "simplechess-cell--light" : "simplechess-cell--dark",
    ];

    if (isSelectedCell(state, pos)) {
      classes.push("simplechess-cell--selected");
    }
    if (isValidMoveCell(state, pos)) {
      const hasPiece = state.board[row][col] !== null;
      classes.push(
        hasPiece ? "simplechess-cell--valid-capture" : "simplechess-cell--valid-move"
      );
    }

    return classes.join(" ");
  };

  const renderCaptured = (pieces: PieceType[], color: "white" | "black") => {
    const sorted = [...pieces].sort((a, b) => getPieceValue(b) - getPieceValue(a));
    return sorted.map((type, i) => (
      <span key={`${type}-${i}`} className="simplechess-captured-piece">
        {PIECE_SYMBOLS[color][type]}
      </span>
    ));
  };

  return (
    <GameShell gameId="simplechess" layout="default">
      <div className="simplechess-root">
        <header className="simplechess-header">
          <h1 className="simplechess-title">Simple Chess</h1>
          {renderStatus()}
        </header>

        <div className="simplechess-captured">
          <div className="simplechess-captured-side">
            {renderCaptured(state.capturedBlack, "black")}
          </div>
          <div className="simplechess-captured-side">
            {renderCaptured(state.capturedWhite, "white")}
          </div>
        </div>

        <div className="simplechess-board" ref={boardRef}>
          {Array.from({ length: BOARD_SIZE }).map((_, row) =>
            Array.from({ length: BOARD_SIZE }).map((_, col) => {
              const piece = state.board[row][col];
              return (
                <div
                  key={`${row}-${col}`}
                  className={getCellClassName(row, col)}
                  onClick={() => handleClick({ row, col })}
                >
                  {piece && (
                    <span
                      className={`simplechess-piece simplechess-piece--${piece.color}`}
                    >
                      {PIECE_SYMBOLS[piece.color][piece.type]}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className="simplechess-footer">
          <button
            type="button"
            className="simplechess-reset-btn"
            onClick={handleReset}
          >
            リセット
          </button>
        </footer>
      </div>
      <ParticleLayer particles={particles} />
      <ScorePopup
        text={popup.text}
        popupKey={popup.key}
        x={popup.x}
        y={popup.y}
        variant={popup.variant}
        size={popup.size}
      />
    </GameShell>
  );
}
