import type { Pin, BallState, FrameResult } from "../lib/types";
import type { Particle, PopupVariant } from "../../../../src/shared";
import { ParticleLayer, ScorePopup } from "../../../../src/shared";
import { ScoreBoard } from "./ScoreBoard";
import { BowlingLane } from "./BowlingLane";

interface PopupState {
  text: string | null;
  variant: PopupVariant;
  key: number;
}

interface Props {
  frames: FrameResult[];
  currentFrame: number;
  currentRoll: number;
  pins: Pin[];
  ball: BallState;
  aimAngle: number;
  aimPower: number;
  isAiming: boolean;
  message: string;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onContinue: () => void;
  showContinue: boolean;
  // 演出用
  particles: Particle[];
  popup: PopupState;
  screenFlash: boolean;
  ballTrail: { x: number; y: number }[];
}

export function GameView({
  frames,
  currentFrame,
  currentRoll,
  pins,
  ball,
  aimAngle,
  aimPower,
  isAiming,
  message,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContinue,
  showContinue,
  particles,
  popup,
  screenFlash,
  ballTrail,
}: Props) {
  return (
    <div
      style={{
        width: "600px",
        height: "700px",
        display: "flex",
        flexDirection: "column",
        background: "#1a1a2e",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* スクリーンフラッシュ（ストライク時） */}
      {screenFlash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255, 255, 255, 0.7)",
            zIndex: 150,
            pointerEvents: "none",
          }}
        />
      )}

      {/* パーティクルレイヤー */}
      <ParticleLayer particles={particles} />

      {/* スコアポップアップ */}
      <ScorePopup
        text={popup.text}
        popupKey={popup.key}
        variant={popup.variant}
        size="xl"
        y="30%"
      />

      {/* スコアボード */}
      <ScoreBoard frames={frames} currentFrame={currentFrame} />

      {/* レーン */}
      <BowlingLane
        pins={pins}
        ball={ball}
        aimAngle={aimAngle}
        aimPower={aimPower}
        isAiming={isAiming}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ballTrail={ballTrail}
      />

      {/* メッセージオーバーレイ */}
      {message && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "20px 40px",
            borderRadius: "10px",
            fontSize: "28px",
            fontWeight: "bold",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          {message}
          {showContinue && (
            <button
              onClick={onContinue}
              style={{
                display: "block",
                margin: "15px auto 0",
                padding: "10px 30px",
                fontSize: "16px",
                background: "#3498db",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              続ける
            </button>
          )}
        </div>
      )}

      {/* フレーム情報 */}
      <div
        style={{
          position: "absolute",
          top: "60px",
          left: "10px",
          color: "#fff",
          fontSize: "14px",
        }}
      >
        Frame {currentFrame + 1} / Roll {currentRoll + 1}
      </div>
    </div>
  );
}
