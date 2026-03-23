import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer, ComboCounter } from "@shared";
import type { Phase, Bubble, ShootingBubble, GameResult } from "./lib/types";
import {
  BUBBLE_RADIUS,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SHOOTER_Y,
  SHOOT_SPEED,
  DANGER_LINE_Y,
  SHOTS_PER_ROW,
} from "./lib/constants";
import {
  initBubbles,
  getBubblePosition,
  getGridCol,
  getGridRow,
  findConnectedSameColor,
  findFloatingBubbles,
  addTopRow,
  checkCollision,
  normalizeGridPos,
  randomColor,
} from "./lib/bubblepop";

interface ScorePopupData {
  id: number;
  text: string;
  x: string;
  y: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("bubblepop_highscore");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [result, setResult] = useState<GameResult>(null);
  const [combo, setCombo] = useState(0);
  const [screenShake, setScreenShake] = useState(false);
  const [popups, setPopups] = useState<ScorePopupData[]>([]);
  const popupIdRef = useRef(0);

  // スコアポップアップ追加関数
  const addPopup = useCallback((
    text: string,
    x: number,
    y: number,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md"
  ) => {
    const id = ++popupIdRef.current;
    const popup: ScorePopupData = {
      id,
      text,
      x: `${x}px`,
      y: `${y}px`,
      variant,
      size,
    };
    setPopups(prev => [...prev, popup]);
    // 自動削除（アニメーション時間後）
    const duration = variant === "level" ? 1500 : variant === "critical" ? 1200 : 900;
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, duration);
  }, []);

  // Dopamine hooks
  const { particles, confetti, sparkle, explosion } = useParticles();
  const { playTone } = useAudio();

  const playPop = useCallback((count: number) => playTone(400 + count * 30, 0.08, 'sine'), [playTone]);
  const playCombo = useCallback((c: number) => playTone(440 + c * 60, 0.12, 'sine'), [playTone]);
  const playWin = useCallback(() => playTone(880, 0.3, 'sine'), [playTone]);
  const playLose = useCallback(() => playTone(180, 0.4, 'sawtooth'), [playTone]);

  const gameStateRef = useRef({
    bubbles: [] as Bubble[],
    shooting: null as ShootingBubble | null,
    nextId: 0,
    aimAngle: -Math.PI / 2,
    shotCount: 0,
    currentColor: randomColor(),
    nextColor: randomColor(),
    score: 0,
  });

  const startGame = useCallback(() => {
    const state = gameStateRef.current;
    const bubbles = initBubbles();
    state.bubbles = bubbles;
    state.nextId = bubbles.length;
    state.shooting = null;
    state.aimAngle = -Math.PI / 2;
    state.shotCount = 0;
    state.currentColor = randomColor();
    state.nextColor = randomColor();
    state.score = 0;
    setScore(0);
    setResult(null);
    setPhase("playing");
  }, []);

  const shoot = useCallback(() => {
    const state = gameStateRef.current;
    if (state.shooting) return;

    const angle = state.aimAngle;
    state.shooting = {
      x: BOARD_WIDTH / 2,
      y: SHOOTER_Y,
      vx: Math.cos(angle) * SHOOT_SPEED,
      vy: Math.sin(angle) * SHOOT_SPEED,
      color: state.currentColor,
    };
    state.currentColor = state.nextColor;
    state.nextColor = randomColor();
  }, []);

  // キー入力
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "start" || phase === "result") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          startGame();
        }
        return;
      }

      const state = gameStateRef.current;
      if (e.key === "ArrowLeft") {
        state.aimAngle = Math.max(-Math.PI + 0.1, state.aimAngle - 0.05);
      } else if (e.key === "ArrowRight") {
        state.aimAngle = Math.min(-0.1, state.aimAngle + 0.05);
      } else if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        shoot();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, startGame, shoot]);

  // ゲームループ
  useEffect(() => {
    if (phase !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      const state = gameStateRef.current;

      // シューティング更新
      if (state.shooting) {
        const s = state.shooting;
        s.x += s.vx;
        s.y += s.vy;

        // 壁反射
        if (s.x < BUBBLE_RADIUS || s.x > BOARD_WIDTH - BUBBLE_RADIUS) {
          s.vx *= -1;
          s.x = Math.max(BUBBLE_RADIUS, Math.min(BOARD_WIDTH - BUBBLE_RADIUS, s.x));
        }

        // 上辺到達
        if (s.y < BUBBLE_RADIUS + 10) {
          const row = 0;
          const col = getGridCol(s.x, row);
          const pos = normalizeGridPos(row, col);
          const bubblePos = getBubblePosition(pos.row, pos.col);
          
          state.bubbles.push({
            id: state.nextId++,
            color: s.color,
            row: pos.row,
            col: pos.col,
            x: bubblePos.x,
            y: bubblePos.y,
          });
          state.shooting = null;
          processBubblePlacement(pos.row, pos.col);
        } else {
          // バブル衝突
          const hit = checkCollision(s.x, s.y, state.bubbles);
          if (hit) {
            const row = getGridRow(s.y);
            const col = getGridCol(s.x, row);
            const pos = normalizeGridPos(row, col);
            const bubblePos = getBubblePosition(pos.row, pos.col);

            state.bubbles.push({
              id: state.nextId++,
              color: s.color,
              row: pos.row,
              col: pos.col,
              x: bubblePos.x,
              y: bubblePos.y,
            });
            state.shooting = null;
            processBubblePlacement(pos.row, pos.col);
          }
        }
      }

      render(ctx);
      animationId = requestAnimationFrame(gameLoop);
    };

    const processBubblePlacement = (row: number, col: number) => {
      const state = gameStateRef.current;
      const placed = state.bubbles.find(b => b.row === row && b.col === col);
      if (!placed) return;

      // 同色連結チェック
      const connected = findConnectedSameColor(state.bubbles, placed);
      if (connected.size >= 3) {
        // 消えるバブルの中心位置を計算
        const connectedBubbles = state.bubbles.filter(b => connected.has(b.id));
        const avgX = connectedBubbles.reduce((sum, b) => sum + b.x, 0) / connectedBubbles.length;
        const avgY = connectedBubbles.reduce((sum, b) => sum + b.y, 0) / connectedBubbles.length;

        state.bubbles = state.bubbles.filter(b => !connected.has(b.id));
        const popPoints = connected.size * 10;
        state.score += popPoints;
        setScore(state.score);
        
        // Dopamine effects for pop
        playPop(connected.size);
        sparkle(BOARD_WIDTH / 2, 200);
        
        // ScorePopup for bubble pop - bigger groups get bigger text
        const popSize = connected.size >= 6 ? "lg" : connected.size >= 4 ? "md" : "sm";
        addPopup(`+${popPoints}`, avgX, avgY, "default", popSize);

        setCombo(c => {
          const newCombo = c + 1;
          if (newCombo >= 3) {
            playCombo(newCombo);
            // Combo multiplier popup
            const comboBonus = newCombo * 5;
            state.score += comboBonus;
            setScore(state.score);
            addPopup(`🔥 x${newCombo} +${comboBonus}`, BOARD_WIDTH / 2, avgY - 30, "combo", "md");
          }
          return newCombo;
        });

        // 浮きバブルチェック（連鎖反応）
        const floating = findFloatingBubbles(state.bubbles);
        if (floating.size > 0) {
          // 浮きバブルの中心位置を計算
          const floatingBubbles = state.bubbles.filter(b => floating.has(b.id));
          const floatAvgX = floatingBubbles.reduce((sum, b) => sum + b.x, 0) / floatingBubbles.length;
          const floatAvgY = floatingBubbles.reduce((sum, b) => sum + b.y, 0) / floatingBubbles.length;

          state.bubbles = state.bubbles.filter(b => !floating.has(b.id));
          const floatPoints = floating.size * 20;
          state.score += floatPoints;
          setScore(state.score);
          
          explosion(BOARD_WIDTH / 2, 250);
          
          // Chain reaction popup - bonus variant
          const chainSize = floating.size >= 5 ? "xl" : floating.size >= 3 ? "lg" : "md";
          addPopup(`⛓️ CHAIN +${floatPoints}`, floatAvgX, floatAvgY, "bonus", chainSize);
        }
      } else {
        setCombo(0);
      }

      // 発射カウント
      state.shotCount++;
      if (state.shotCount >= SHOTS_PER_ROW) {
        state.shotCount = 0;
        const result = addTopRow(state.bubbles, state.nextId);
        state.bubbles = result.bubbles;
        state.nextId = result.nextId;
      }

      // ゲームオーバー判定
      const isDanger = state.bubbles.some(b => b.y > DANGER_LINE_Y);
      if (isDanger) {
        const isNewHighScore = state.score > highScore;
        if (isNewHighScore) {
          setHighScore(state.score);
          localStorage.setItem("bubblepop_highscore", String(state.score));
          confetti();
          // High score popup
          addPopup(`🏆 NEW HIGH SCORE!`, BOARD_WIDTH / 2, BOARD_HEIGHT / 2 - 60, "critical", "xl");
        }
        playLose();
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 300);
        explosion(BOARD_WIDTH / 2, BOARD_HEIGHT / 2);
        setResult("lose");
        setPhase("result");
      }

      // 勝利判定
      if (state.bubbles.length === 0) {
        const isNewHighScore = state.score > highScore;
        if (isNewHighScore) {
          setHighScore(state.score);
          localStorage.setItem("bubblepop_highscore", String(state.score));
          // High score popup
          addPopup(`🏆 NEW HIGH SCORE!`, BOARD_WIDTH / 2, BOARD_HEIGHT / 2 - 60, "critical", "xl");
        }
        playWin();
        confetti();
        // Level completion popup
        addPopup(`🎉 LEVEL CLEAR!`, BOARD_WIDTH / 2, BOARD_HEIGHT / 2, "level", "xl");
        setResult("win");
        setPhase("result");
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      const state = gameStateRef.current;

      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      // 危険ライン
      ctx.strokeStyle = "rgba(255, 100, 100, 0.5)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, DANGER_LINE_Y);
      ctx.lineTo(BOARD_WIDTH, DANGER_LINE_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // バブル
      for (const b of state.bubbles) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.stroke();
      }

      // シューティング中のバブル
      if (state.shooting) {
        ctx.fillStyle = state.shooting.color;
        ctx.beginPath();
        ctx.arc(state.shooting.x, state.shooting.y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // 発射台
      ctx.fillStyle = state.currentColor;
      ctx.beginPath();
      ctx.arc(BOARD_WIDTH / 2, SHOOTER_Y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 照準線
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(BOARD_WIDTH / 2, SHOOTER_Y);
      ctx.lineTo(
        BOARD_WIDTH / 2 + Math.cos(state.aimAngle) * 100,
        SHOOTER_Y + Math.sin(state.aimAngle) * 100
      );
      ctx.stroke();

      // 次のバブル
      ctx.fillStyle = state.nextColor;
      ctx.beginPath();
      ctx.arc(50, SHOOTER_Y, BUBBLE_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.fillText("NEXT", 35, SHOOTER_Y + 30);

      // スコア
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("SCORE: " + state.score, 10, 30);
      ctx.fillStyle = "#ffd700";
      ctx.fillText("HIGH: " + Math.max(state.score, highScore), BOARD_WIDTH - 140, 30);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [phase, highScore, confetti, explosion, playCombo, playLose, playPop, playWin, sparkle, addPopup]);

  // 初期描画
  useEffect(() => {
    if (phase !== "playing") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    }
  }, [phase]);

  return (
    <GameShell gameId="bubblepop" layout="immersive">
      <div 
        className={`bubblepop-game ${screenShake ? 'shake' : ''}`}
        style={{ 
          width: BOARD_WIDTH, 
          height: BOARD_HEIGHT, 
          position: "relative", 
          background: "#1a1a2e", 
          borderRadius: 8, 
          overflow: "hidden"
        }}
      >
        <style>{`
          .bubblepop-game.shake {
            animation: shake 0.3s ease-in-out;
          }
          @keyframes shake {
            0%, 100% { transform: translate(0, 0); }
            20% { transform: translate(-3px, 2px); }
            40% { transform: translate(3px, -2px); }
            60% { transform: translate(-2px, 3px); }
            80% { transform: translate(2px, -3px); }
          }
        `}</style>
        <canvas ref={canvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} style={{ display: "block" }} />
        <ParticleLayer particles={particles} />
        {combo >= 3 && phase === "playing" && (
          <ComboCounter combo={combo} />
        )}
        
        {/* Score Popups */}
        {popups.map(popup => (
          <ScorePopup
            key={popup.id}
            text={popup.text}
            popupKey={popup.id}
            x={popup.x}
            y={popup.y}
            variant={popup.variant}
            size={popup.size}
          />
        ))}

        {phase === "start" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.9)", gap: 16 }}>
            <h1 style={{ fontSize: 48, color: "#4ecdc4", margin: 0 }}>Bubble Pop</h1>
            <p style={{ fontSize: 16, color: "#a0a0c0" }}>←→キーで照準、スペースで発射</p>
            <p style={{ fontSize: 16, color: "#a0a0c0" }}>3つ以上同色を消そう!</p>
            <button onClick={startGame} style={{ padding: "16px 48px", fontSize: 24, fontWeight: "bold", color: "#1a1a2e", background: "linear-gradient(135deg, #4ecdc4, #2ab7a9)", border: "none", borderRadius: 12, cursor: "pointer" }}>
              START
            </button>
          </div>
        )}

        {phase === "result" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.9)", gap: 16 }}>
            <h1 style={{ fontSize: 48, color: result === "win" ? "#44ff44" : "#ff4444", margin: 0 }}>
              {result === "win" ? "🎉 CLEAR!" : "GAME OVER"}
            </h1>
            <p style={{ fontSize: 32, color: "#fff", margin: 0 }}>Score: {score}</p>
            {score >= highScore && score > 0 && (
              <p style={{ fontSize: 24, color: "#ffd700", margin: 0 }}>🏆 New Record!</p>
            )}
            <button onClick={startGame} style={{ padding: "16px 48px", fontSize: 24, fontWeight: "bold", color: "#1a1a2e", background: "linear-gradient(135deg, #4ecdc4, #2ab7a9)", border: "none", borderRadius: 12, cursor: "pointer" }}>
              RETRY
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
