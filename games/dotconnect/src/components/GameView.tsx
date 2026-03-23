import { useRef, useCallback } from "react";
import type { GameState, Point } from "../lib/types";
import { CELL_SIZE, DOT_SIZE, COLORS } from "../lib/constants";

interface GameViewProps {
  state: GameState;
  onStartDrawing: (row: number, col: number) => void;
  onContinueDrawing: (row: number, col: number) => void;
  onEndDrawing: () => void;
  onReset: () => void;
  onBack: () => void;
}

export function GameView({
  state,
  onStartDrawing,
  onContinueDrawing,
  onEndDrawing,
  onReset,
  onBack,
}: GameViewProps) {
  const boardRef = useRef<SVGSVGElement>(null);
  const isDrawingRef = useRef(false);

  const gridSize = state.stage.gridSize;
  const boardSize = gridSize * CELL_SIZE;

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point | null => {
      const svg = boardRef.current;
      if (!svg) return null;

      const rect = svg.getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const col = Math.floor(x / CELL_SIZE);
      const row = Math.floor(y / CELL_SIZE);

      if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
        return null;
      }

      return { row, col };
    },
    [gridSize]
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const cell = getCellFromEvent(e);
      if (!cell) return;
      
      isDrawingRef.current = true;
      onStartDrawing(cell.row, cell.col);
    },
    [getCellFromEvent, onStartDrawing]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      
      const cell = getCellFromEvent(e);
      if (!cell) return;
      
      onContinueDrawing(cell.row, cell.col);
    },
    [getCellFromEvent, onContinueDrawing]
  );

  const handlePointerUp = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      onEndDrawing();
    }
  }, [onEndDrawing]);

  // グリッド線を描画
  const renderGridLines = () => {
    const lines = [];
    for (let i = 0; i <= gridSize; i++) {
      lines.push(
        <line
          key={"h" + i}
          x1={0}
          y1={i * CELL_SIZE}
          x2={boardSize}
          y2={i * CELL_SIZE}
          stroke="#3a3a5a"
          strokeWidth={1}
        />
      );
      lines.push(
        <line
          key={"v" + i}
          x1={i * CELL_SIZE}
          y1={0}
          x2={i * CELL_SIZE}
          y2={boardSize}
          stroke="#3a3a5a"
          strokeWidth={1}
        />
      );
    }
    return lines;
  };

  // 線を描画
  const renderLines = () => {
    return Object.values(state.lines).map((line) => {
      if (line.points.length < 2) return null;

      const pathData = line.points
        .map((p, i) => {
          const x = p.col * CELL_SIZE + CELL_SIZE / 2;
          const y = p.row * CELL_SIZE + CELL_SIZE / 2;
          return i === 0 ? "M " + x + " " + y : "L " + x + " " + y;
        })
        .join(" ");

      const color = COLORS[line.colorId] || "#888";

      return (
        <path
          key={line.colorId}
          d={pathData}
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.8}
        />
      );
    });
  };

  // ドットを描画
  const renderDots = () => {
    return state.stage.dots.map((dot) => {
      const cx = dot.col * CELL_SIZE + CELL_SIZE / 2;
      const cy = dot.row * CELL_SIZE + CELL_SIZE / 2;
      const color = COLORS[dot.color] || "#888";

      return (
        <circle
          key={dot.id}
          cx={cx}
          cy={cy}
          r={DOT_SIZE / 2}
          fill={color}
          stroke="#fff"
          strokeWidth={3}
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
        />
      );
    });
  };

  const viewBoxValue = "0 0 " + boardSize + " " + boardSize;

  return (
    <div className="dotconnect-game">
      <header className="dotconnect-header">
        <span className="dotconnect-stage-label">
          Stage {state.stage.id}: {state.stage.name}
        </span>
      </header>

      <svg
        ref={boardRef}
        className="dotconnect-board"
        width={boardSize}
        height={boardSize}
        viewBox={viewBoxValue}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <rect
          x={0}
          y={0}
          width={boardSize}
          height={boardSize}
          fill="#1a1a2e"
        />
        {renderGridLines()}
        {renderLines()}
        {renderDots()}
      </svg>

      <footer className="dotconnect-footer">
        <button
          type="button"
          className="dotconnect-btn dotconnect-btn--secondary"
          onClick={onBack}
        >
          戻る
        </button>
        <button
          type="button"
          className="dotconnect-btn dotconnect-btn--reset"
          onClick={onReset}
        >
          リセット
        </button>
      </footer>
    </div>
  );
}
