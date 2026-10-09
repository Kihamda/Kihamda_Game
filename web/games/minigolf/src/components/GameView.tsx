import type { BallState, HoleConfig, TrailPoint } from "../lib/types";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BALL_RADIUS,
  CUP_RADIUS,
  COLORS,
  MAX_POWER,
  MIN_POWER,
} from "../lib/constants";

interface Props {
  course: HoleConfig;
  ball: BallState;
  strokes: number;
  aimAngle: number;
  aimPower: number;
  isAiming: boolean;
  currentHole: number;
  message: string;
  showContinue: boolean;
  trail: TrailPoint[];
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
  onContinue: () => void;
}

export function GameView({
  course,
  ball,
  strokes,
  aimAngle,
  aimPower,
  isAiming,
  currentHole,
  message,
  showContinue,
  trail,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContinue,
}: Props) {
  const aimLineLength = (aimPower / MAX_POWER) * 100;
  const aimEndX = ball.x + Math.cos(aimAngle) * aimLineLength;
  const aimEndY = ball.y + Math.sin(aimAngle) * aimLineLength;
  
  // パワーゲージの計算
  const powerPercent = ((aimPower - MIN_POWER) / (MAX_POWER - MIN_POWER)) * 100;
  const powerColor = powerPercent > 70 ? "#ff6b6b" : powerPercent > 40 ? "#ffd93d" : "#4ecdc4";

  return (
    <div className="minigolf-game">
      {/* スコアボード */}
      <div className="minigolf-scoreboard">
        <div className="minigolf-hole-info">
          <span>HOLE {currentHole + 1}</span>
          <span className="minigolf-par">PAR {course.par}</span>
        </div>
        <div className="minigolf-strokes">
          打数: <strong>{strokes}</strong>
        </div>
      </div>

      {/* ゲーム画面 */}
      <svg
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        viewBox={`0 0 ${GAME_WIDTH} ${GAME_HEIGHT}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ touchAction: "none", cursor: isAiming ? "grabbing" : "grab" }}
      >
        {/* 背景 */}
        <rect width={GAME_WIDTH} height={GAME_HEIGHT} fill={COLORS.grassDark} />

        {/* コース内の芝生 */}
        <polygon
          points={course.walls.map((w) => `${w.x1},${w.y1}`).join(" ")}
          fill={COLORS.grass}
        />

        {/* 障害物 */}
        {course.obstacles.map((obs, i) =>
          obs.type === "rectangle" ? (
            <rect
              key={i}
              x={obs.x}
              y={obs.y}
              width={obs.width}
              height={obs.height}
              fill={COLORS.obstacle}
              rx={3}
            />
          ) : (
            <circle
              key={i}
              cx={obs.x}
              cy={obs.y}
              r={obs.radius}
              fill={COLORS.obstacle}
            />
          )
        )}

        {/* 壁 */}
        {course.walls.map((wall, i) => (
          <line
            key={i}
            x1={wall.x1}
            y1={wall.y1}
            x2={wall.x2}
            y2={wall.y2}
            stroke={COLORS.wall}
            strokeWidth={8}
            strokeLinecap="round"
          />
        ))}

        {/* カップ */}
        <circle cx={course.cup.x} cy={course.cup.y} r={CUP_RADIUS} fill={COLORS.cup} />
        <circle
          cx={course.cup.x}
          cy={course.cup.y}
          r={CUP_RADIUS - 4}
          fill={COLORS.cupInner}
        />

        {/* フラグ */}
        <line
          x1={course.cup.x}
          y1={course.cup.y - CUP_RADIUS}
          x2={course.cup.x}
          y2={course.cup.y - CUP_RADIUS - 35}
          stroke={COLORS.flagPole}
          strokeWidth={2}
        />
        <polygon
          points={`
            ${course.cup.x},${course.cup.y - CUP_RADIUS - 35}
            ${course.cup.x + 20},${course.cup.y - CUP_RADIUS - 27}
            ${course.cup.x},${course.cup.y - CUP_RADIUS - 19}
          `}
          fill={COLORS.flag}
        />

        {/* ボールトレイル */}
        {trail.map((point, index) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={BALL_RADIUS * 0.6 * (index / trail.length)}
            fill="#ffffff"
            opacity={point.opacity * 0.5}
          />
        ))}

        {/* エイムライン */}
        {isAiming && !ball.active && (
          <>
            <line
              x1={ball.x}
              y1={ball.y}
              x2={aimEndX}
              y2={aimEndY}
              stroke={COLORS.aimLine}
              strokeWidth={3}
              strokeDasharray="8,4"
              opacity={0.8}
            />
            {/* パワーインジケーター */}
            <circle
              cx={aimEndX}
              cy={aimEndY}
              r={6}
              fill={COLORS.powerBar}
              stroke={COLORS.aimLine}
              strokeWidth={2}
            />
          </>
        )}

        {/* ボール */}
        <circle
          cx={ball.x}
          cy={ball.y}
          r={BALL_RADIUS}
          fill={COLORS.ball}
          stroke={COLORS.ballStroke}
          strokeWidth={2}
        />

        {/* ボールのディンプル模様 */}
        <circle cx={ball.x - 3} cy={ball.y - 3} r={2} fill="#ddd" opacity={0.5} />
        <circle cx={ball.x + 2} cy={ball.y + 2} r={2} fill="#ddd" opacity={0.5} />
      </svg>

      {/* パワーゲージ（エイム中のみ表示） */}
      {isAiming && !ball.active && (
        <div className="minigolf-power-gauge">
          <div className="minigolf-power-label">POWER</div>
          <div className="minigolf-power-bar-container">
            <div
              className="minigolf-power-bar-fill"
              style={{
                width: `${powerPercent}%`,
                backgroundColor: powerColor,
              }}
            />
          </div>
          <div className="minigolf-power-value">{Math.round(powerPercent)}%</div>
        </div>
      )}

      {/* メッセージ表示 */}
      {message && (
        <div className="minigolf-message">
          <p>{message}</p>
          {showContinue && (
            <button type="button" onClick={onContinue} className="minigolf-continue-btn">
              続ける
            </button>
          )}
        </div>
      )}
    </div>
  );
}