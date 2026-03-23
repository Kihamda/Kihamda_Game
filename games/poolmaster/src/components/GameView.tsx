import type { Ball, Player } from "../lib/types";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TABLE_LEFT,
  TABLE_TOP,
  TABLE_WIDTH,
  TABLE_HEIGHT,
  BALL_RADIUS,
  POCKET_POSITIONS,
  POCKET_RADIUS,
  COLORS,
  MAX_POWER,
  SOLID_BALLS,
} from "../lib/constants";
import { getCueBall, getRemainingBalls } from "../lib/pool";

interface Props {
  balls: Ball[];
  player1: Player;
  player2: Player;
  currentPlayer: 1 | 2;
  aimAngle: number;
  aimPower: number;
  isAiming: boolean;
  message: string;
  showContinue: boolean;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
  onContinue: () => void;
}

function getBallColor(ball: Ball): string {
  if (ball.type === "cue") return COLORS.cueBall;
  if (ball.type === "eight") return COLORS.eightBall;
  if (ball.type === "solid") {
    const idx = SOLID_BALLS.indexOf(ball.id);
    return COLORS.solidBalls[idx] || "#888";
  }
  // stripe
  const idx = ball.id - 9;
  return COLORS.stripeBalls[idx] || "#888";
}

function renderBall(ball: Ball) {
  if (ball.pocketed) return null;

  const color = getBallColor(ball);
  const isStripe = ball.type === "stripe";
  const isCue = ball.type === "cue";

  return (
    <g key={ball.id}>
      {/* ボール本体 */}
      <circle
        cx={ball.x}
        cy={ball.y}
        r={BALL_RADIUS}
        fill={color}
        stroke={isCue ? COLORS.cueBallStroke : "#222"}
        strokeWidth={1}
      />
      {/* ストライプの白帯 */}
      {isStripe && (
        <rect
          x={ball.x - BALL_RADIUS}
          y={ball.y - 4}
          width={BALL_RADIUS * 2}
          height={8}
          fill="#fff"
          clipPath={`circle(${BALL_RADIUS}px at ${BALL_RADIUS}px 4px)`}
          style={{ clipPath: `circle(${BALL_RADIUS}px at 50% 50%)` }}
        />
      )}
      {/* 番号表示(キューボール以外) */}
      {!isCue && (
        <text
          x={ball.x}
          y={ball.y + 3}
          textAnchor="middle"
          fill={ball.type === "eight" || ball.type === "solid" ? "#fff" : "#000"}
          className="ball-number"
        >
          {ball.id}
        </text>
      )}
    </g>
  );
}

export function GameView({
  balls,
  player1,
  player2,
  currentPlayer,
  aimAngle,
  aimPower,
  isAiming,
  message,
  showContinue,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContinue,
}: Props) {
  const cueBall = getCueBall(balls);
  const powerPercent = (aimPower / MAX_POWER) * 100;
  
  // パワーレベルに応じた色
  const getPowerColor = () => {
    if (powerPercent < 40) return "#27ae60";
    if (powerPercent < 70) return "#f1c40f";
    return "#e74c3c";
  };

  return (
    <div className="pool-game">
      <svg
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="pool-svg"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* テーブル枠 */}
        <rect
          x={0}
          y={0}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          fill={COLORS.tableBorder}
        />

        {/* フェルト */}
        <rect
          x={TABLE_LEFT}
          y={TABLE_TOP}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          fill={COLORS.tableCloth}
        />

        {/* ポケット */}
        {POCKET_POSITIONS.map((pocket, i) => (
          <circle
            key={i}
            cx={pocket.x}
            cy={pocket.y}
            r={POCKET_RADIUS}
            fill={COLORS.pocket}
          />
        ))}

        {/* クッション装飾線 */}
        <rect
          x={TABLE_LEFT + 5}
          y={TABLE_TOP + 5}
          width={TABLE_WIDTH - 10}
          height={TABLE_HEIGHT - 10}
          fill="none"
          stroke={COLORS.cushion}
          strokeWidth={3}
        />

        {/* エイムライン */}
        {isAiming && cueBall && (
          <>
            {/* メインライン */}
            <line
              x1={cueBall.x}
              y1={cueBall.y}
              x2={cueBall.x + Math.cos(aimAngle) * aimPower * 10}
              y2={cueBall.y + Math.sin(aimAngle) * aimPower * 10}
              stroke={COLORS.aimLine}
              strokeWidth={2}
              strokeDasharray="5,5"
            />
            {/* パワーインジケーター円 */}
            <circle
              cx={cueBall.x}
              cy={cueBall.y}
              r={BALL_RADIUS + aimPower * 1.5}
              fill="none"
              stroke={getPowerColor()}
              strokeWidth={2}
              opacity={0.5}
              className="power-indicator"
            />
          </>
        )}

        {/* ボール */}
        {balls.map(renderBall)}
      </svg>

      {/* プレイヤー情報 */}
      <div className="pool-ui">
        <div className={`pool-player-info ${currentPlayer === 1 ? "active" : ""}`}>
          <span className="pool-player-name">{player1.name}</span>
          <span className="pool-player-type">
            {player1.assignedType === "solid"
              ? "ソリッド(1-7)"
              : player1.assignedType === "stripe"
                ? "ストライプ(9-15)"
                : "未決定"}
          </span>
          <span className="pool-player-remaining">
            残り: {getRemainingBalls(player1, balls)}個
          </span>
        </div>

        <div className={`pool-player-info ${currentPlayer === 2 ? "active" : ""}`}>
          <span className="pool-player-name">{player2.name}</span>
          <span className="pool-player-type">
            {player2.assignedType === "solid"
              ? "ソリッド(1-7)"
              : player2.assignedType === "stripe"
                ? "ストライプ(9-15)"
                : "未決定"}
          </span>
          <span className="pool-player-remaining">
            残り: {getRemainingBalls(player2, balls)}個
          </span>
        </div>
      </div>

      {/* パワーバー (強化版) */}
      {isAiming && (
        <div className="pool-power-bar">
          <div 
            className="pool-power-fill" 
            style={{ 
              width: `${powerPercent}%`,
              background: `linear-gradient(90deg, #27ae60 0%, ${getPowerColor()} 100%)`
            }} 
          />
          <div className="pool-power-glow" style={{ 
            width: `${powerPercent}%`,
            background: getPowerColor(),
          }} />
          <span className="pool-power-label">{Math.round(powerPercent)}%</span>
        </div>
      )}

      {/* メッセージ */}
      {message && <div className="pool-message">{message}</div>}

      {/* 続けるボタン */}
      {showContinue && (
        <button type="button" className="pool-continue-btn" onClick={onContinue}>
          続ける
        </button>
      )}
    </div>
  );
}
