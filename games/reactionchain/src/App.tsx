import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
} from "@shared";
import type { PopupVariant } from "@shared";

/** ゲームフェーズ */
type Phase = "start" | "playing" | "levelComplete" | "gameOver" | "gameClear";

/** 泡の状態 */
interface Bubble {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  state: "floating" | "exploding" | "removed";
  explodeTime?: number;
}

/** レベル設定 */
interface LevelConfig {
  bubbleCount: number;
  targetCount: number;
  clicksAllowed: number;
}

/** 定数 */
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const BUBBLE_MIN_RADIUS = 20;
const BUBBLE_MAX_RADIUS = 35;
const EXPLOSION_RADIUS = 80;
const EXPLOSION_DURATION = 600;
const BUBBLE_SPEED = 0.8;

/** カラーパレット */
const BUBBLE_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#6c5ce7",
  "#a29bfe", "#fd79a8", "#00b894", "#e17055", "#00cec9",
];

/** レベル設定 */
const LEVELS: LevelConfig[] = [
  { bubbleCount: 10, targetCount: 5, clicksAllowed: 1 },
  { bubbleCount: 15, targetCount: 10, clicksAllowed: 1 },
  { bubbleCount: 20, targetCount: 15, clicksAllowed: 2 },
  { bubbleCount: 25, targetCount: 20, clicksAllowed: 2 },
  { bubbleCount: 30, targetCount: 25, clicksAllowed: 2 },
  { bubbleCount: 35, targetCount: 30, clicksAllowed: 3 },
  { bubbleCount: 40, targetCount: 35, clicksAllowed: 3 },
  { bubbleCount: 50, targetCount: 45, clicksAllowed: 3 },
];

/** localStorage キー */
const STORAGE_KEY = "reactionchain_best_level";

/** ベストレベル取得 */
function loadBestLevel(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}

/** ベストレベル保存 */
function saveBestLevel(level: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(level));
  } catch {
    // ignore
  }
}

/** 泡を生成 */
function createBubble(id: number, existingBubbles: Bubble[]): Bubble {
  const radius = BUBBLE_MIN_RADIUS + Math.random() * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS);
  let x: number, y: number;
  let attempts = 0;
  
  do {
    x = radius + Math.random() * (GAME_WIDTH - radius * 2);
    y = radius + Math.random() * (GAME_HEIGHT - radius * 2);
    attempts++;
  } while (
    attempts < 50 &&
    existingBubbles.some(b => {
      const dx = b.x - x;
      const dy = b.y - y;
      return Math.sqrt(dx * dx + dy * dy) < b.radius + radius + 5;
    })
  );

  const angle = Math.random() * Math.PI * 2;
  const speed = BUBBLE_SPEED * (0.5 + Math.random() * 0.5);

  return {
    id,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
    state: "floating",
  };
}

/** 泡の配列を生成 */
function createBubbles(count: number): Bubble[] {
  const bubbles: Bubble[] = [];
  for (let i = 0; i < count; i++) {
    bubbles.push(createBubble(i, bubbles));
  }
  return bubbles;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [level, setLevel] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [clicksRemaining, setClicksRemaining] = useState(0);
  const [poppedCount, setPoppedCount] = useState(0);
  const [totalPopped, setTotalPopped] = useState(0);
  const [chainCount, setChainCount] = useState(0);
  const [maxChain, setMaxChain] = useState(0);
  const [bestLevel, setBestLevel] = useState(() => loadBestLevel());
  
  // Popup state
  const [popup, setPopup] = useState<{
    text: string;
    key: number;
    x: string;
    y: string;
    variant: PopupVariant;
  } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Dopamine effects
  const { playClick, playCombo, playCelebrate, playGameOver, playExplosion } = useAudio();
  const { particles, burst, explosion, confetti } = useParticles();

  const currentConfig = LEVELS[Math.min(level, LEVELS.length - 1)];

  /** レベル開始 */
  const startLevel = useCallback((lvl: number) => {
    const config = LEVELS[Math.min(lvl, LEVELS.length - 1)];
    setBubbles(createBubbles(config.bubbleCount));
    setClicksRemaining(config.clicksAllowed);
    setPoppedCount(0);
    setChainCount(0);
    setPhase("playing");
  }, []);

  /** ゲーム開始 */
  const startGame = useCallback(() => {
    setLevel(0);
    setTotalPopped(0);
    setMaxChain(0);
    startLevel(0);
  }, [startLevel]);

  /** 次のレベルへ */
  const nextLevel = useCallback(() => {
    const newLevel = level + 1;
    if (newLevel >= LEVELS.length) {
      setPhase("gameClear");
      if (newLevel > bestLevel) {
        saveBestLevel(newLevel);
        setBestLevel(newLevel);
      }
    } else {
      setLevel(newLevel);
      startLevel(newLevel);
    }
  }, [level, bestLevel, startLevel]);

  /** リトライ */
  const retryLevel = useCallback(() => {
    startLevel(level);
  }, [level, startLevel]);

  /** タイトルへ */
  const backToStart = useCallback(() => {
    setPhase("start");
  }, []);

  /** ポップアップ表示 */
  const showPopup = useCallback((
    text: string,
    x: number,
    y: number,
    variant: PopupVariant = "default"
  ) => {
    // Canvas座標をパーセント座標に変換
    const percentX = `${(x / GAME_WIDTH) * 100}%`;
    const percentY = `${(y / GAME_HEIGHT) * 100}%`;
    setPopup({ text, key: Date.now(), x: percentX, y: percentY, variant });
  }, []);

  /** 泡クリック処理 */
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== "playing" || clicksRemaining <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // クリック位置に最も近い泡を探す
    let closestBubble: Bubble | null = null;
    let closestDist = Infinity;

    for (const bubble of bubbles) {
      if (bubble.state !== "floating") continue;
      const dx = bubble.x - clickX;
      const dy = bubble.y - clickY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bubble.radius && dist < closestDist) {
        closestBubble = bubble;
        closestDist = dist;
      }
    }

    if (closestBubble) {
      // 泡を爆発させる
      setBubbles(prev => prev.map(b => 
        b.id === closestBubble!.id
          ? { ...b, state: "exploding" as const, explodeTime: Date.now() }
          : b
      ));
      setClicksRemaining(prev => prev - 1);
      setChainCount(1);
      
      // Dopamine effects for initial click
      playClick();
      burst(e.clientX, e.clientY, 8);
    } else {
      // 空クリック
      setClicksRemaining(prev => prev - 1);
    }
  }, [phase, clicksRemaining, bubbles, playClick, burst]);

  /** ゲームループ */
  useEffect(() => {
    if (phase !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // 泡の更新
      setBubbles(prevBubbles => {
        const now = Date.now();
        let newPoppedThisFrame = 0;
        let chainTriggered = false;

        const updated = prevBubbles.map(bubble => {
          if (bubble.state === "removed") return bubble;

          if (bubble.state === "exploding") {
            // 爆発終了チェック
            if (now - (bubble.explodeTime || 0) > EXPLOSION_DURATION) {
              newPoppedThisFrame++;
              return { ...bubble, state: "removed" as const };
            }
            return bubble;
          }

          // 浮遊中の泡
          let newX = bubble.x + bubble.vx * deltaTime * 0.1;
          let newY = bubble.y + bubble.vy * deltaTime * 0.1;
          let newVx = bubble.vx;
          let newVy = bubble.vy;

          // 壁との衝突
          if (newX - bubble.radius < 0 || newX + bubble.radius > GAME_WIDTH) {
            newVx = -newVx;
            newX = Math.max(bubble.radius, Math.min(GAME_WIDTH - bubble.radius, newX));
          }
          if (newY - bubble.radius < 0 || newY + bubble.radius > GAME_HEIGHT) {
            newVy = -newVy;
            newY = Math.max(bubble.radius, Math.min(GAME_HEIGHT - bubble.radius, newY));
          }

          // 爆発中の泡との衝突判定
          for (const other of prevBubbles) {
            if (other.state !== "exploding" || other.id === bubble.id) continue;
            const dx = bubble.x - other.x;
            const dy = bubble.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < EXPLOSION_RADIUS + bubble.radius) {
              chainTriggered = true;
              return {
                ...bubble,
                state: "exploding" as const,
                explodeTime: now + Math.random() * 100,
              };
            }
          }

          return { ...bubble, x: newX, y: newY, vx: newVx, vy: newVy };
        });

        if (chainTriggered) {
          setChainCount(prev => prev + 1);
        }

        if (newPoppedThisFrame > 0) {
          setPoppedCount(prev => prev + newPoppedThisFrame);
          setTotalPopped(prev => prev + newPoppedThisFrame);
        }

        return updated;
      });

      // 描画
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 背景
      const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 泡を描画
      for (const bubble of bubbles) {
        if (bubble.state === "removed") continue;

        if (bubble.state === "exploding") {
          // 爆発エフェクト
          const elapsed = Date.now() - (bubble.explodeTime || 0);
          const progress = elapsed / EXPLOSION_DURATION;
          const currentRadius = EXPLOSION_RADIUS * Math.min(1, progress * 2);
          const alpha = Math.max(0, 1 - progress);

          // 爆発リング
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, currentRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
          ctx.lineWidth = 3;
          ctx.stroke();

          // 内側の光
          const innerGradient = ctx.createRadialGradient(
            bubble.x, bubble.y, 0,
            bubble.x, bubble.y, currentRadius
          );
          innerGradient.addColorStop(0, `rgba(255, 255, 200, ${alpha * 0.8})`);
          innerGradient.addColorStop(0.5, `${bubble.color}${Math.floor(alpha * 99).toString(16).padStart(2, '0')}`);
          innerGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = innerGradient;
          ctx.fill();

        } else {
          // 通常の泡
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
          
          // グラデーション
          const bubbleGradient = ctx.createRadialGradient(
            bubble.x - bubble.radius * 0.3,
            bubble.y - bubble.radius * 0.3,
            0,
            bubble.x,
            bubble.y,
            bubble.radius
          );
          bubbleGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
          bubbleGradient.addColorStop(0.3, bubble.color);
          bubbleGradient.addColorStop(1, bubble.color + "aa");
          ctx.fillStyle = bubbleGradient;
          ctx.fill();

          // 光沢
          ctx.beginPath();
          ctx.arc(
            bubble.x - bubble.radius * 0.25,
            bubble.y - bubble.radius * 0.25,
            bubble.radius * 0.2,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [phase, bubbles]);

  /** ゲーム状態チェック */
  useEffect(() => {
    if (phase !== "playing") return;

    const floating = bubbles.filter(b => b.state === "floating").length;
    const exploding = bubbles.filter(b => b.state === "exploding").length;

    // 全ての爆発が終了
    if (exploding === 0 && bubbles.some(b => b.state === "removed")) {
      setMaxChain(prev => Math.max(prev, chainCount));

      if (poppedCount >= currentConfig.targetCount) {
        // レベルクリア
        if (level + 1 > bestLevel) {
          saveBestLevel(level + 1);
          setBestLevel(level + 1);
        }
        playCelebrate();
        confetti(40);
        setPhase("levelComplete");
      } else if (clicksRemaining <= 0 && floating > 0) {
        // ゲームオーバー
        playGameOver();
        setPhase("gameOver");
      }
    }
  }, [phase, bubbles, clicksRemaining, poppedCount, currentConfig.targetCount, chainCount, level, bestLevel, playCelebrate, confetti, playGameOver]);

  /** 連鎖時のエフェクト */
  const prevChainRef = useRef(0);
  useEffect(() => {
    if (phase !== "playing") return;
    if (chainCount <= 1 || chainCount === prevChainRef.current) return;
    
    prevChainRef.current = chainCount;
    
    // Find an exploding bubble to center the effect
    const explodingBubble = bubbles.find(b => b.state === "exploding");
    if (explodingBubble) {
      // Convert canvas coords to screen coords
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const screenX = rect.left + (explodingBubble.x / GAME_WIDTH) * rect.width;
        const screenY = rect.top + (explodingBubble.y / GAME_HEIGHT) * rect.height;
        
        playCombo(chainCount);
        playExplosion();
        explosion(screenX, screenY, 16);
        
        // Show chain popup
        showPopup(
          `🔥 ${chainCount}連鎖!`,
          explodingBubble.x,
          explodingBubble.y,
          chainCount >= 5 ? "critical" : chainCount >= 3 ? "combo" : "default"
        );
      }
    }
  }, [phase, chainCount, bubbles, playCombo, playExplosion, explosion, showPopup]);

  return (
    <GameShell gameId="reactionchain" layout="immersive">
      <div className="reactionchain-root">
        {phase === "start" && (
          <div className="reactionchain-overlay">
            <div className="reactionchain-panel">
              <h1 className="reactionchain-title">💥 Reaction Chain</h1>
              <p className="reactionchain-description">
                泡をクリックして爆発！<br />
                連鎖反応で多くの泡を消そう！
              </p>
              <div className="reactionchain-rules">
                <p>🎯 目標数の泡を消せばクリア</p>
                <p>👆 クリック回数は限られている</p>
                <p>💫 爆発が他の泡に触れると連鎖！</p>
              </div>
              {bestLevel > 0 && (
                <p className="reactionchain-best">
                  🏆 到達レベル: {bestLevel}
                </p>
              )}
              <button
                type="button"
                className="reactionchain-button primary"
                onClick={startGame}
              >
                スタート！
              </button>
            </div>
          </div>
        )}

        {phase === "playing" && (
          <>
            <div className="reactionchain-hud">
              <div className="reactionchain-hud-item">
                <span className="reactionchain-hud-label">LEVEL</span>
                <span className="reactionchain-hud-value">{level + 1}</span>
              </div>
              <div className="reactionchain-hud-item">
                <span className="reactionchain-hud-label">消した泡</span>
                <span className="reactionchain-hud-value">
                  {poppedCount} / {currentConfig.targetCount}
                </span>
              </div>
              <div className="reactionchain-hud-item">
                <span className="reactionchain-hud-label">残りクリック</span>
                <span className="reactionchain-hud-value clicks">
                  {"👆".repeat(clicksRemaining)}
                </span>
              </div>
              <div className="reactionchain-hud-item">
                <span className="reactionchain-hud-label">連鎖</span>
                <span className={`reactionchain-hud-value ${chainCount >= 3 ? "chain-bonus" : ""}`}>
                  {chainCount}
                </span>
              </div>
            </div>
            <div className="reactionchain-canvas-container">
              <canvas
                ref={canvasRef}
                width={GAME_WIDTH}
                height={GAME_HEIGHT}
                className="reactionchain-canvas"
                onClick={handleCanvasClick}
              />
              {popup && (
                <ScorePopup
                  text={popup.text}
                  popupKey={popup.key}
                  x={popup.x}
                  y={popup.y}
                  variant={popup.variant}
                  size="lg"
                />
              )}
            </div>
          </>
        )}

        {/* Particle layer for all phases */}
        <ParticleLayer particles={particles} />

        {phase === "levelComplete" && (
          <div className="reactionchain-overlay">
            <div className="reactionchain-panel result">
              <h2 className="reactionchain-result-title">🎉 レベルクリア！</h2>
              <div className="reactionchain-result-stats">
                <div className="reactionchain-result-stat">
                  <span>消した泡</span>
                  <span>{poppedCount}</span>
                </div>
                <div className="reactionchain-result-stat">
                  <span>最大連鎖</span>
                  <span>{maxChain}</span>
                </div>
              </div>
              <div className="reactionchain-result-buttons">
                <button
                  type="button"
                  className="reactionchain-button primary"
                  onClick={nextLevel}
                >
                  次のレベルへ
                </button>
                <button
                  type="button"
                  className="reactionchain-button secondary"
                  onClick={backToStart}
                >
                  タイトルへ
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "gameOver" && (
          <div className="reactionchain-overlay">
            <div className="reactionchain-panel result">
              <h2 className="reactionchain-result-title">💔 ゲームオーバー</h2>
              <p className="reactionchain-result-message">
                目標: {currentConfig.targetCount}個<br />
                消した数: {poppedCount}個
              </p>
              <div className="reactionchain-result-stats">
                <div className="reactionchain-result-stat">
                  <span>到達レベル</span>
                  <span>{level + 1}</span>
                </div>
                <div className="reactionchain-result-stat">
                  <span>合計消した泡</span>
                  <span>{totalPopped}</span>
                </div>
              </div>
              <div className="reactionchain-result-buttons">
                <button
                  type="button"
                  className="reactionchain-button primary"
                  onClick={retryLevel}
                >
                  リトライ
                </button>
                <button
                  type="button"
                  className="reactionchain-button secondary"
                  onClick={backToStart}
                >
                  タイトルへ
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "gameClear" && (
          <div className="reactionchain-overlay">
            <div className="reactionchain-panel result clear">
              <h2 className="reactionchain-result-title">🏆 全レベルクリア！</h2>
              <p className="reactionchain-result-message">
                おめでとう！全{LEVELS.length}レベルをクリアしました！
              </p>
              <div className="reactionchain-result-stats">
                <div className="reactionchain-result-stat">
                  <span>合計消した泡</span>
                  <span>{totalPopped}</span>
                </div>
                <div className="reactionchain-result-stat">
                  <span>最大連鎖</span>
                  <span>{maxChain}</span>
                </div>
              </div>
              <div className="reactionchain-result-buttons">
                <button
                  type="button"
                  className="reactionchain-button primary"
                  onClick={startGame}
                >
                  最初から
                </button>
                <button
                  type="button"
                  className="reactionchain-button secondary"
                  onClick={backToStart}
                >
                  タイトルへ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
