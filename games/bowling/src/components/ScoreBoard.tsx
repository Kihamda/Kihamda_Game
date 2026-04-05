import type { FrameResult } from "../lib/types";
import { COLORS } from "../lib/constants";

interface Props {
  frames: FrameResult[];
  currentFrame: number;
}

export function ScoreBoard({ frames, currentFrame }: Props) {
  const renderRoll = (value: number | null, isStrike: boolean, isSpare: boolean, rollIndex: number): string => {
    if (value === null) return "";
    if (isStrike && rollIndex === 0) return "X";
    if (isSpare && rollIndex === 1) return "/";
    if (value === 10) return "X";
    if (value === 0) return "-";
    return value.toString();
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      gap: "2px",
      marginBottom: "8px",
    }}>
      {frames.map((frame, i) => (
        <div
          key={i}
          style={{
            background: i === currentFrame ? COLORS.strike : COLORS.scoreBoard,
            color: "#fff",
            padding: "4px",
            borderRadius: "4px",
            minWidth: i === 9 ? "60px" : "45px",
            textAlign: "center",
            fontSize: "12px",
          }}
        >
          <div style={{ borderBottom: "1px solid #555", marginBottom: "2px" }}>
            {i + 1}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "2px", fontSize: "11px" }}>
            <span style={{ 
              color: frame.isStrike ? COLORS.strike : "#fff",
              fontWeight: frame.isStrike ? "bold" : "normal",
            }}>
              {renderRoll(frame.roll1, frame.isStrike, frame.isSpare, 0)}
            </span>
            <span style={{
              color: frame.isSpare ? COLORS.spare : "#fff",
              fontWeight: frame.isSpare ? "bold" : "normal",
            }}>
              {renderRoll(frame.roll2, false, frame.isSpare, 1)}
            </span>
            {i === 9 && (
              <span>
                {frame.roll3 !== null ? (frame.roll3 === 10 ? "X" : frame.roll3 === 0 ? "-" : frame.roll3) : ""}
              </span>
            )}
          </div>
          <div style={{ fontWeight: "bold", fontSize: "13px", marginTop: "2px" }}>
            {frame.cumulativeScore ?? ""}
          </div>
        </div>
      ))}
    </div>
  );
}
