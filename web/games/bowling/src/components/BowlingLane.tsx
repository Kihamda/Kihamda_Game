import type { Pin, BallState } from "../lib/types";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LANE_LEFT,
  LANE_RIGHT,
  LANE_TOP,
  LANE_BOTTOM,
  BALL_RADIUS,
  PIN_RADIUS,
  BALL_START_X,
  BALL_START_Y,
  COLORS,
} from "../lib/constants";

interface Props {
  pins: Pin[];
  ball: BallState;
  aimAngle: number;
  aimPower: number;
  isAiming: boolean;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  ballTrail: { x: number; y: number }[];
}

export function BowlingLane({
  pins,
  ball,
  aimAngle,
  aimPower,
  isAiming,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  ballTrail,
}: Props) {
  // 照準線の終点計算
  const aimEndX = BALL_START_X + Math.sin(aimAngle) * aimPower * 10;
  const aimEndY = BALL_START_Y - Math.cos(aimAngle) * aimPower * 10;

  return (
    <svg
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      style={{ touchAction: "none", cursor: "crosshair" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* 背景 */}
      <rect width={GAME_WIDTH} height={GAME_HEIGHT} fill="#1a1a2e" />

      {/* ガター */}
      <rect
        x={LANE_LEFT - 20}
        y={LANE_TOP}
        width={20}
        height={LANE_BOTTOM - LANE_TOP}
        fill={COLORS.laneGutter}
      />
      <rect
        x={LANE_RIGHT}
        y={LANE_TOP}
        width={20}
        height={LANE_BOTTOM - LANE_TOP}
        fill={COLORS.laneGutter}
      />

      {/* レーン */}
      <rect
        x={LANE_LEFT}
        y={LANE_TOP}
        width={LANE_RIGHT - LANE_LEFT}
        height={LANE_BOTTOM - LANE_TOP}
        fill={COLORS.lane}
      />

      {/* レーンの模様 */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={LANE_LEFT + (LANE_RIGHT - LANE_LEFT) * (i + 1) / 6}
          y1={LANE_TOP}
          x2={LANE_LEFT + (LANE_RIGHT - LANE_LEFT) * (i + 1) / 6}
          y2={LANE_BOTTOM}
          stroke="#c4a574"
          strokeWidth="1"
        />
      ))}

      {/* ファウルライン */}
      <line
        x1={LANE_LEFT}
        y1={LANE_BOTTOM - 80}
        x2={LANE_RIGHT}
        y2={LANE_BOTTOM - 80}
        stroke="#e74c3c"
        strokeWidth="3"
      />

      {/* ピン */}
      {pins.map((pin) => (
        <g key={pin.id}>
          <circle
            cx={pin.x}
            cy={pin.y}
            r={PIN_RADIUS}
            fill={pin.standing ? COLORS.pinStanding : COLORS.pinFallen}
            stroke={COLORS.pinStroke}
            strokeWidth="2"
            opacity={pin.standing ? 1 : 0.3}
          />
          {pin.standing && (
            <circle
              cx={pin.x}
              cy={pin.y - 3}
              r={PIN_RADIUS * 0.3}
              fill="#e74c3c"
            />
          )}
        </g>
      ))}

      {/* 照準線 */}
      {isAiming && !ball.active && (
        <>
          <line
            x1={BALL_START_X}
            y1={BALL_START_Y}
            x2={aimEndX}
            y2={aimEndY}
            stroke={COLORS.aimLine}
            strokeWidth="3"
            strokeDasharray="10,5"
            opacity="0.8"
          />
          {/* パワーインジケーター */}
          <rect
            x={GAME_WIDTH - 40}
            y={200}
            width={20}
            height={200}
            fill="#333"
            rx="5"
          />
          <rect
            x={GAME_WIDTH - 38}
            y={200 + 200 - (aimPower / 20) * 196}
            width={16}
            height={(aimPower / 20) * 196}
            fill={COLORS.powerBar}
            rx="3"
          />
          <text x={GAME_WIDTH - 30} y={420} fill="#fff" fontSize="12" textAnchor="middle">
            PWR
          </text>
        </>
      )}

      {/* ボールトレイル */}
      {ballTrail.length > 1 && (
        <>
          <defs>
            <linearGradient id="trail-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3498db" stopOpacity="0" />
              <stop offset="100%" stopColor="#3498db" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {ballTrail.map((pos, i) => {
            if (i === 0) return null;
            const opacity = (i / ballTrail.length) * 0.6;
            const size = (i / ballTrail.length) * BALL_RADIUS * 0.8;
            return (
              <circle
                key={i}
                cx={pos.x}
                cy={pos.y}
                r={size}
                fill="#3498db"
                opacity={opacity}
              />
            );
          })}
        </>
      )}

      {/* ボール */}
      <circle
        cx={ball.active ? ball.x : BALL_START_X}
        cy={ball.active ? ball.y : BALL_START_Y}
        r={BALL_RADIUS}
        fill={COLORS.ball}
      />
      {/* ボールの穴 */}
      <circle
        cx={(ball.active ? ball.x : BALL_START_X) - 5}
        cy={(ball.active ? ball.y : BALL_START_Y) - 5}
        r={4}
        fill="#1a1a2e"
      />
      <circle
        cx={(ball.active ? ball.x : BALL_START_X) + 5}
        cy={(ball.active ? ball.y : BALL_START_Y) - 5}
        r={4}
        fill="#1a1a2e"
      />
      <circle
        cx={(ball.active ? ball.x : BALL_START_X)}
        cy={(ball.active ? ball.y : BALL_START_Y) + 5}
        r={4}
        fill="#1a1a2e"
      />

      {/* 操作ヒント */}
      {!ball.active && (
        <text
          x={GAME_WIDTH / 2}
          y={GAME_HEIGHT - 40}
          fill="#fff"
          fontSize="14"
          textAnchor="middle"
        >
          ドラッグで方向と強さを決定 → 離して投球
        </text>
      )}
    </svg>
  );
}
