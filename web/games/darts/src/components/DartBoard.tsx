import { useRef, useCallback } from "react";
import { BOARD_RADIUS, BOARD_NUMBERS, RING_RADII } from "../lib/constants";
import "./DartBoard.css";

interface FlyingDart {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

interface DartBoardProps {
  onThrow: (clientX: number, clientY: number, boardRect: DOMRect) => void;
  dartPositions: { x: number; y: number }[];
  disabled: boolean;
  flyingDart?: FlyingDart | null;
}

export function DartBoard({ onThrow, dartPositions, disabled, flyingDart }: DartBoardProps) {
  const boardRef = useRef<SVGSVGElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (disabled) return;
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      onThrow(e.clientX, e.clientY, rect);
    },
    [onThrow, disabled]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (disabled) return;
      e.preventDefault();
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      const touch = e.touches[0];
      onThrow(touch.clientX, touch.clientY, rect);
    },
    [onThrow, disabled]
  );

  const size = BOARD_RADIUS * 2;
  const center = BOARD_RADIUS;

  const renderSections = () => {
    const sections = [];
    const sectionAngle = 18;

    for (let i = 0; i < 20; i++) {
      const number = BOARD_NUMBERS[i];
      const startAngle = i * sectionAngle - 90 - sectionAngle / 2;
      const endAngle = startAngle + sectionAngle;
      const isEven = i % 2 === 0;

      sections.push(
        <path
          key={"double-" + i}
          d={describeArc(center, center, RING_RADII.doubleOuter, RING_RADII.doubleInner, startAngle, endAngle)}
          fill={isEven ? "#e74c3c" : "#27ae60"}
          stroke="#1a1a1a"
          strokeWidth="1"
        />
      );

      sections.push(
        <path
          key={"outer-single-" + i}
          d={describeArc(center, center, RING_RADII.doubleInner, RING_RADII.tripleOuter, startAngle, endAngle)}
          fill={isEven ? "#1a1a1a" : "#f5f5dc"}
          stroke="#1a1a1a"
          strokeWidth="1"
        />
      );

      sections.push(
        <path
          key={"triple-" + i}
          d={describeArc(center, center, RING_RADII.tripleOuter, RING_RADII.tripleInner, startAngle, endAngle)}
          fill={isEven ? "#e74c3c" : "#27ae60"}
          stroke="#1a1a1a"
          strokeWidth="1"
        />
      );

      sections.push(
        <path
          key={"inner-single-" + i}
          d={describeArc(center, center, RING_RADII.tripleInner, RING_RADII.bullOuter, startAngle, endAngle)}
          fill={isEven ? "#1a1a1a" : "#f5f5dc"}
          stroke="#1a1a1a"
          strokeWidth="1"
        />
      );

      const labelAngle = (startAngle + sectionAngle / 2) * (Math.PI / 180);
      const labelRadius = BOARD_RADIUS + 15;
      const labelX = center + labelRadius * Math.cos(labelAngle);
      const labelY = center + labelRadius * Math.sin(labelAngle);

      sections.push(
        <text
          key={"label-" + i}
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize="14"
          fontWeight="bold"
        >
          {number}
        </text>
      );
    }

    return sections;
  };

  const viewBoxStr = "-20 -20 " + (size + 40) + " " + (size + 40);
  const classStr = "dartboard" + (disabled ? " dartboard--disabled" : "");

  return (
    <div className="dartboard-container">
      <svg
        ref={boardRef}
        width={size + 40}
        height={size + 40}
        viewBox={viewBoxStr}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        className={classStr}
      >
        <circle cx={center} cy={center} r={BOARD_RADIUS + 5} fill="#2c2c2c" />
        {renderSections()}
        <circle
          cx={center}
          cy={center}
          r={RING_RADII.bullOuter}
          fill="#27ae60"
          stroke="#1a1a1a"
          strokeWidth="1"
        />
        <circle
          cx={center}
          cy={center}
          r={RING_RADII.bullInner}
          fill="#e74c3c"
          stroke="#1a1a1a"
          strokeWidth="1"
        />
        {dartPositions.map((pos, idx) => (
          <g key={idx} className="dart-landed">
            {/* ダーツ刺さり時のグロー */}
            <circle cx={pos.x} cy={pos.y} r={12} fill="none" stroke="#ffd700" strokeWidth="2" opacity="0.5" className="dart-glow" />
            <circle cx={pos.x} cy={pos.y} r={6} fill="#ffd700" stroke="#333" strokeWidth="2" />
            <circle cx={pos.x} cy={pos.y} r={2} fill="#333" />
          </g>
        ))}
        {/* 飛行中ダーツのトレイル */}
        {flyingDart && (
          <g className="dart-flying">
            <defs>
              <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffd700" stopOpacity="0" />
                <stop offset="100%" stopColor="#ffd700" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <line
              x1={flyingDart.from.x}
              y1={flyingDart.from.y}
              x2={flyingDart.to.x}
              y2={flyingDart.to.y}
              stroke="url(#trailGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              className="dart-trail"
            />
            <circle
              cx={flyingDart.to.x}
              cy={flyingDart.to.y}
              r={5}
              fill="#ffd700"
              className="dart-head"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

function describeArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", startOuter.x, startOuter.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    "L", startInner.x, startInner.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, endInner.x, endInner.y,
    "Z",
  ].join(" ");
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}