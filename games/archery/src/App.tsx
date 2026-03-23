import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  ScreenShake,
} from "@shared";
import type { ScreenShakeHandle } from "@shared";
import type { GameState, HitInfo } from "./lib/types";
import {
  createInitialState,
  startGame,
  updateAim,
  shootArrow,
  updateArrow,
  getRating,
} from "./lib/archery";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TARGET_X,
  TARGET_Y,
  TARGET_RADIUS,
  BOW_X,
  BOW_Y,
  SCORE_ZONES,
  TOTAL_SHOTS,
} from "./lib/constants";
import "./App.css";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [showFlash, setShowFlash] = useState(false);
  const [popup, setPopup] = useState<{ text: string; key: number } | null>(null);
  const lastHitRef = useRef<number>(0);

  // ドーパミン演出フック
  const audio = useAudio();
  const { particles, burst, confetti, sparkle } = useParticles();

  // 効果音: 弓を引く
  const playDraw = useCallback(() => {
    audio.playTone(220, 0.2, "sine", 0.15);
    audio.playSweep(200, 280, 0.3, "sine", 0.1, 0.1);
  }, [audio]);

  // 効果音: 矢を放つ
  const playRelease = useCallback(() => {
    audio.playSweep(400, 800, 0.15, "sine", 0.25);
    audio.playTone(150, 0.1, "triangle", 0.2);
  }, [audio]);

  // 効果音: 的に当たる
  const playHit = useCallback((score: number) => {
    if (score >= 10) {
      // ブルズアイ
      audio.playPerfect();
    } else if (score >= 8) {
      audio.playSuccess();
    } else if (score >= 5) {
      audio.playTone(660, 0.15, "sine", 0.2);
    } else if (score > 0) {
      audio.playTone(440, 0.12, "sine", 0.15);
    } else {
      // 外れ
      audio.playMiss();
    }
  }, [audio]);

  // ヒット演出（副作用のみ、setStateを使わない版）
  const triggerHitVisuals = useCallback((hit: HitInfo) => {
    // キャンバス座標をDOM座標に変換
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;
    const domX = hit.x * scaleX;
    const domY = hit.y * scaleY;

    // 効果音
    playHit(hit.score);

    // パーティクル（useParticlesは内部でsetStateを使うが問題ない）
    if (hit.isBullseye) {
      // ブルズアイ: 派手な演出
      confetti(60);
      sparkle(domX, domY, 16);
      burst(domX, domY, 20);
      shakeRef.current?.shake("heavy", 400);
    } else if (hit.score >= 8) {
      // 高得点
      sparkle(domX, domY, 12);
      burst(domX, domY, 15);
      shakeRef.current?.shake("light", 200);
    } else if (hit.score >= 5) {
      burst(domX, domY, 10);
    } else if (hit.score > 0) {
      burst(domX, domY, 6);
    }
  }, [playHit, confetti, sparkle, burst]);

  const handleStart = useCallback(() => {
    setGameState(startGame());
    audio.playClick();
  }, [audio]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setGameState((prev) => {
      if (prev.phase !== "aiming") return prev;

      const canvas = canvasRef.current;
      if (!canvas) return prev;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // クリック位置に狙いを合わせて即座に発射
      const aimed = updateAim(prev, x, y);
      playRelease();
      return shootArrow(aimed);
    });
  }, [playRelease]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setGameState((prev) => {
      if (prev.phase !== "aiming") return prev;

      const canvas = canvasRef.current;
      if (!canvas) return prev;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      return updateAim(prev, x, y);
    });
  }, []);

  // マウス押下で弓引き音
  const handleMouseDown = useCallback(() => {
    if (gameState.phase === "aiming") {
      playDraw();
    }
  }, [gameState.phase, playDraw]);

  // ヒット演出を検出してステート更新
  useEffect(() => {
    if (gameState.lastHit && gameState.lastHit.timestamp !== lastHitRef.current) {
      const hit = gameState.lastHit;
      lastHitRef.current = hit.timestamp;
      
      // 副作用のみの演出を実行
      triggerHitVisuals(hit);
      
      // フラッシュとポップアップのステート更新はsetTimeoutで遅延
      if (hit.isBullseye) {
        setTimeout(() => setShowFlash(true), 0);
      }
      if (hit.score > 0) {
        setTimeout(() => setPopup({ text: `${hit.score}`, key: Date.now() }), 0);
      }
    }
  }, [gameState.lastHit, triggerHitVisuals]);
  
  // フラッシュ自動消去
  useEffect(() => {
    if (showFlash) {
      const timer = setTimeout(() => setShowFlash(false), 150);
      return () => clearTimeout(timer);
    }
  }, [showFlash]);
  
  // ポップアップ自動消去
  useEffect(() => {
    if (popup) {
      const timer = setTimeout(() => setPopup(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  // 結果画面でファンファーレ
  useEffect(() => {
    if (gameState.phase === "result") {
      if (gameState.totalScore >= 40) {
        audio.playCelebrate();
        confetti(80);
      } else {
        audio.playFanfare();
      }
    }
  }, [gameState.phase, gameState.totalScore, audio, confetti]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastState: GameState | null = null;

    const gameLoop = () => {
      setGameState((prev) => {
        // 矢の更新
        if (prev.phase === "flying") {
          const newState = updateArrow(prev);
          lastState = newState;
          return newState;
        }
        lastState = prev;
        return prev;
      });

      // 描画（lastStateが更新されたタイミングで描画）
      if (lastState) {
        render(ctx, lastState);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // 状態変化時に再描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    render(ctx, gameState);
  }, [gameState]);

  return (
    <GameShell gameId="archery" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="archery-container" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          {/* ブルズアイ時のフラッシュ */}
          {showFlash && <div className="archery-flash" />}

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="archery-canvas"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseDown={handleMouseDown}
          />

          {/* パーティクル */}
          <ParticleLayer particles={particles} />

          {/* スコアポップアップ */}
          {popup && (
            <ScorePopup
              text={popup.text}
              popupKey={popup.key}
              x={`${(TARGET_X / CANVAS_WIDTH) * 100}%`}
              y={`${(TARGET_Y / CANVAS_HEIGHT) * 100 - 15}%`}
              variant={parseInt(popup.text) >= 10 ? "critical" : parseInt(popup.text) >= 8 ? "bonus" : "default"}
              size="xl"
            />
          )}

          {/* ヘッダーUI */}
          {gameState.phase !== "ready" && gameState.phase !== "result" && (
            <div className="archery-header">
              <div className="archery-shot-info">
                <span>射撃: {gameState.shotNumber} / {TOTAL_SHOTS}</span>
              </div>
              <div className="archery-wind-display">
                <div className="archery-wind-label">風</div>
                <div className="archery-wind-indicator">
                  {gameState.wind.label}
                  {/* 風の視覚化 */}
                  <div 
                    className="archery-wind-particles"
                    style={{ 
                      animationDuration: `${2 - Math.abs(gameState.wind.speed)}s`,
                      animationDirection: gameState.wind.speed < 0 ? "reverse" : "normal",
                      opacity: Math.abs(gameState.wind.speed) * 0.8 + 0.2,
                    }}
                  />
                </div>
              </div>
              <div className="archery-score-display">
                <span>スコア: {gameState.totalScore}</span>
              </div>
            </div>
          )}

          {/* 操作説明 */}
          {gameState.phase === "aiming" && (
            <div className="archery-instructions">
              的をクリックして矢を放て！ 風の影響に注意
            </div>
          )}

          {/* スタート画面 */}
          {gameState.phase === "ready" && (
            <div className="archery-overlay">
              <h1 className="archery-title">🏹 アーチェリー</h1>
              <p className="archery-desc">
                弓矢で的を狙え！<br />
                風の影響を考慮して的の中心を狙おう<br />
                5射の合計スコアで競争！
              </p>
              <button className="archery-btn" onClick={handleStart}>
                スタート
              </button>
            </div>
          )}

          {/* 結果画面 */}
          {gameState.phase === "result" && (
            <div className="archery-overlay">
              <h2 className="archery-result-title">ゲーム終了！</h2>
              <div className="archery-result-score">{gameState.totalScore}点</div>
              <div className="archery-result-rating">{getRating(gameState.totalScore)}</div>
              <div className="archery-result-breakdown">
                {gameState.results.map((result, i) => (
                  <div
                    key={i}
                    className={`archery-result-shot ${
                      result.score >= 9 ? "great" : result.score >= 7 ? "good" : ""
                    }`}
                  >
                    {result.score}
                  </div>
                ))}
              </div>
              <button className="archery-btn" onClick={handleStart}>
                もう一度
              </button>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}

/** Canvas描画 */
function render(ctx: CanvasRenderingContext2D, state: GameState) {
  // 背景クリア
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 空
  const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.6);
  skyGradient.addColorStop(0, "#87ceeb");
  skyGradient.addColorStop(1, "#b0e0e6");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * 0.6);

  // 地面
  const groundGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.6, 0, CANVAS_HEIGHT);
  groundGradient.addColorStop(0, "#90ee90");
  groundGradient.addColorStop(1, "#228b22");
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, CANVAS_HEIGHT * 0.6, CANVAS_WIDTH, CANVAS_HEIGHT * 0.4);

  // 的を描画
  drawTarget(ctx);

  // 弓を描画
  drawBow(ctx, state);

  // 飛行中の矢を描画
  if (state.arrow && state.phase === "flying") {
    drawFlyingArrow(ctx, state.arrow);
  }

  // エイム中のクロスヘア
  if (state.phase === "aiming") {
    drawCrosshair(ctx, state.aimX, state.aimY);
    drawAimLine(ctx, state.aimX, state.aimY);
  }
}

/** 的を描画 */
function drawTarget(ctx: CanvasRenderingContext2D) {
  // 的の台座
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(TARGET_X - 10, TARGET_Y + TARGET_RADIUS, 20, 100);

  // 的の輪
  const zones = [...SCORE_ZONES].reverse();
  for (const zone of zones) {
    ctx.beginPath();
    ctx.arc(TARGET_X, TARGET_Y, zone.radius, 0, Math.PI * 2);
    ctx.fillStyle = zone.color;
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 中心の十字
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TARGET_X - 8, TARGET_Y);
  ctx.lineTo(TARGET_X + 8, TARGET_Y);
  ctx.moveTo(TARGET_X, TARGET_Y - 8);
  ctx.lineTo(TARGET_X, TARGET_Y + 8);
  ctx.stroke();
}

/** 弓を描画 */
function drawBow(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  ctx.translate(BOW_X, BOW_Y);

  // 弓の角度（狙い方向）
  const angle = Math.atan2(state.aimY - BOW_Y, state.aimX - BOW_X);
  ctx.rotate(angle);

  // 弓本体（曲線）
  ctx.strokeStyle = "#8b4513";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 60, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.stroke();

  // 弓弦
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60 * Math.cos(-Math.PI * 0.4), 60 * Math.sin(-Math.PI * 0.4));
  ctx.lineTo(state.phase === "aiming" ? -20 : 0, 0);
  ctx.lineTo(60 * Math.cos(Math.PI * 0.4), 60 * Math.sin(Math.PI * 0.4));
  ctx.stroke();

  // 矢（引き絞り中）
  if (state.phase === "aiming") {
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(-20, -2, 80, 4);
    // 矢じり
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(50, -6);
    ctx.lineTo(50, 6);
    ctx.closePath();
    ctx.fillStyle = "#555";
    ctx.fill();
  }

  ctx.restore();
}

/** 飛行中の矢を描画 */
function drawFlyingArrow(
  ctx: CanvasRenderingContext2D,
  arrow: { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[] }
) {
  // 強化されたトレイルエフェクト
  if (arrow.trail.length > 1) {
    ctx.save();
    
    // グラデーションの軌跡
    for (let i = 1; i < arrow.trail.length; i++) {
      const alpha = (i / arrow.trail.length) * 0.6;
      const width = (i / arrow.trail.length) * 3 + 1;
      
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`;
      ctx.lineWidth = width;
      ctx.moveTo(arrow.trail[i - 1].x, arrow.trail[i - 1].y);
      ctx.lineTo(arrow.trail[i].x, arrow.trail[i].y);
      ctx.stroke();
    }
    
    // 発光エフェクト
    ctx.strokeStyle = "rgba(255, 255, 200, 0.3)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(arrow.trail[0].x, arrow.trail[0].y);
    for (let i = 1; i < arrow.trail.length; i++) {
      ctx.lineTo(arrow.trail[i].x, arrow.trail[i].y);
    }
    ctx.stroke();
    
    ctx.restore();
  }

  // 矢本体
  const angle = Math.atan2(arrow.vy, arrow.vx);
  ctx.save();
  ctx.translate(arrow.x, arrow.y);
  ctx.rotate(angle);

  // 矢の発光エフェクト
  ctx.shadowColor = "rgba(255, 200, 100, 0.8)";
  ctx.shadowBlur = 10;

  // 矢の軸
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(-40, -2, 40, 4);

  // 矢じり
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-10, 5);
  ctx.closePath();
  ctx.fillStyle = "#555";
  ctx.fill();

  // 羽根
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.lineTo(-40, -8);
  ctx.lineTo(-30, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.lineTo(-40, 8);
  ctx.lineTo(-30, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** クロスヘアを描画 */
function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
  ctx.lineWidth = 2;

  // 外側の円
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.stroke();

  // 十字線
  ctx.beginPath();
  ctx.moveTo(x - 20, y);
  ctx.lineTo(x - 8, y);
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + 20, y);
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x, y - 8);
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x, y + 20);
  ctx.stroke();

  ctx.restore();
}

/** 狙い線を描画 */
function drawAimLine(ctx: CanvasRenderingContext2D, aimX: number, aimY: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 100, 100, 0.3)";
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(BOW_X, BOW_Y);
  ctx.lineTo(aimX, aimY);
  ctx.stroke();
  ctx.restore();
}
