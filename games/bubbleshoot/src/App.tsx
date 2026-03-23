import { useState, useCallback, useEffect, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer, ComboCounter } from "@shared";
import "./App.css";

/** ScorePopupのエントリ */
interface PopupEntry {
  id: number;
  text: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  x: string;
  y: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ec4899"];
const BUBBLE_RADIUS = 20;
const BOARD_WIDTH = 400;
const BOARD_HEIGHT = 500;
const COLS = 10;
const INITIAL_ROWS = 5;
const SHOOTER_Y = BOARD_HEIGHT - 40;

interface Bubble {
  id: number;
  color: string;
  row: number;
  col: number;
  x: number;
  y: number;
  removing?: boolean;
  falling?: boolean;
}

interface ShootingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

type Phase = "start" | "playing" | "result";

// ─────────────────────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────────────────────

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function getBubblePosition(row: number, col: number): { x: number; y: number } {
  const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0;
  return {
    x: col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + offset,
    y: row * BUBBLE_RADIUS * 1.7 + BUBBLE_RADIUS,
  };
}

function getGridPosition(x: number, _y: number, row: number): number {
  const offset = row % 2 === 1 ? BUBBLE_RADIUS : 0;
  return Math.round((x - BUBBLE_RADIUS - offset) / (BUBBLE_RADIUS * 2));
}

function initBubbles(): Bubble[] {
  let id = 0;
  const bubbles: Bubble[] = [];
  for (let row = 0; row < INITIAL_ROWS; row++) {
    const maxCols = row % 2 === 1 ? COLS - 1 : COLS;
    for (let col = 0; col < maxCols; col++) {
      const pos = getBubblePosition(row, col);
      bubbles.push({
        id: id++,
        color: randomColor(),
        row,
        col,
        x: pos.x,
        y: pos.y,
      });
    }
  }
  return bubbles;
}

function getNeighbors(row: number, col: number): { row: number; col: number }[] {
  const isOdd = row % 2 === 1;
  if (isOdd) {
    return [
      { row: row - 1, col },
      { row: row - 1, col: col + 1 },
      { row, col: col - 1 },
      { row, col: col + 1 },
      { row: row + 1, col },
      { row: row + 1, col: col + 1 },
    ];
  }
  return [
    { row: row - 1, col: col - 1 },
    { row: row - 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
    { row: row + 1, col: col - 1 },
    { row: row + 1, col },
  ];
}

function findConnectedSameColor(
  bubbles: Bubble[],
  target: Bubble
): Set<number> {
  const bubbleMap = new Map<string, Bubble>();
  for (const b of bubbles) {
    bubbleMap.set(`${b.row},${b.col}`, b);
  }

  const visited = new Set<number>();
  const queue: Bubble[] = [target];
  visited.add(target.id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighbors(current.row, current.col);

    for (const n of neighbors) {
      const neighbor = bubbleMap.get(`${n.row},${n.col}`);
      if (neighbor && !visited.has(neighbor.id) && neighbor.color === target.color) {
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

function findFloatingBubbles(bubbles: Bubble[]): Set<number> {
  const bubbleMap = new Map<string, Bubble>();
  for (const b of bubbles) {
    bubbleMap.set(`${b.row},${b.col}`, b);
  }

  // 上辺から到達可能なバブルを見つける
  const connected = new Set<number>();
  const topBubbles = bubbles.filter((b) => b.row === 0);

  const queue: Bubble[] = [...topBubbles];
  for (const b of topBubbles) {
    connected.add(b.id);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighbors(current.row, current.col);

    for (const n of neighbors) {
      const neighbor = bubbleMap.get(`${n.row},${n.col}`);
      if (neighbor && !connected.has(neighbor.id)) {
        connected.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  // 接続されていないバブルを浮いているとみなす
  const floating = new Set<number>();
  for (const b of bubbles) {
    if (!connected.has(b.id)) {
      floating.add(b.id);
    }
  }

  return floating;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [bubbles, setBubbles] = useState<Bubble[]>(() => initBubbles());
  const [shooting, setShooting] = useState<ShootingBubble | null>(null);
  const [nextColor, setNextColor] = useState<string>(() => randomColor());
  const [aimAngle, setAimAngle] = useState<number>(-Math.PI / 2);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [message, setMessage] = useState("");
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [combo, setCombo] = useState(0);
  const [screenShake, setScreenShake] = useState(false);
  const [popups, setPopups] = useState<PopupEntry[]>([]);
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem("bubbleshoot_highscore") || 0);
    } catch {
      return 0;
    }
  });
  const nextIdRef = useRef(100);
  const popupIdRef = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Dopamine hooks
  const { particles, confetti, sparkle, explosion } = useParticles();
  const { playTone } = useAudio();

  const playPop = useCallback((count: number) => playTone(500 + count * 40, 0.08, 'sine'), [playTone]);
  const playComboSound = useCallback((c: number) => playTone(440 + c * 60, 0.12, 'sine'), [playTone]);
  const playWin = useCallback(() => playTone(880, 0.3, 'sine'), [playTone]);
  const playLose = useCallback(() => playTone(180, 0.4, 'sawtooth'), [playTone]);

  // ScorePopup表示ヘルパー
  const showPopup = useCallback((
    text: string,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md",
    x = "50%",
    y = "40%"
  ) => {
    const id = ++popupIdRef.current;
    setPopups((prev) => [...prev, { id, text, variant, size, x, y }]);
    // 自動削除
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1500);
  }, []);

  // ハイスコア保存
  const saveHighScore = useCallback((newScore: number) => {
    try {
      const current = Number(localStorage.getItem("bubbleshoot_highscore") || 0);
      if (newScore > current) {
        localStorage.setItem("bubbleshoot_highscore", String(newScore));
        setHighScore(newScore);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  const startGame = useCallback(() => {
    setBubbles(initBubbles());
    setShooting(null);
    setNextColor(randomColor());
    setAimAngle(-Math.PI / 2);
    setScore(0);
    setShots(0);
    setIsAnimating(false);
    setMessage("");
    setGameResult(null);
    setCombo(0);
    setPopups([]);
    nextIdRef.current = 100;
    setPhase("playing");
  }, []);

  // マウス/タッチで照準角度を更新
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (phase !== "playing" || isAnimating || shooting) return;
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - BOARD_WIDTH / 2;
      const y = e.clientY - rect.top - SHOOTER_Y;

      // 発射可能な角度範囲を制限
      let angle = Math.atan2(y, x);
      if (angle > -0.1) angle = -0.1;
      if (angle < -Math.PI + 0.1) angle = -Math.PI + 0.1;

      setAimAngle(angle);
    },
    [phase, isAnimating, shooting]
  );

  // 発射
  const shoot = useCallback(() => {
    if (phase !== "playing" || isAnimating || shooting) return;

    const speed = 12;
    setShooting({
      x: BOARD_WIDTH / 2,
      y: SHOOTER_Y,
      vx: Math.cos(aimAngle) * speed,
      vy: Math.sin(aimAngle) * speed,
      color: nextColor,
    });
    setNextColor(randomColor());
    setShots((s) => s + 1);
  }, [phase, isAnimating, shooting, aimAngle, nextColor]);

  // 発射中のアニメーション
  useEffect(() => {
    if (!shooting) return;

    const animate = () => {
      setShooting((prev) => {
        if (!prev) return null;

        let { x, y, vx } = prev;
        const { vy } = prev;
        x += vx;
        y += vy;

        // 壁反射
        if (x < BUBBLE_RADIUS) {
          x = BUBBLE_RADIUS;
          vx = -vx;
        }
        if (x > BOARD_WIDTH - BUBBLE_RADIUS) {
          x = BOARD_WIDTH - BUBBLE_RADIUS;
          vx = -vx;
        }

        // 上端に到達
        if (y < BUBBLE_RADIUS) {
          const row = 0;
          const col = getGridPosition(x, y, row);
          handleBubblePlacement(row, col, prev.color);
          return null;
        }

        // 既存バブルとの衝突判定
        for (const b of bubbles) {
          const dx = x - b.x;
          const dy = y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < BUBBLE_RADIUS * 2 - 5) {
            // 配置位置を決定
            const row = Math.round((y - BUBBLE_RADIUS) / (BUBBLE_RADIUS * 1.7));
            const col = getGridPosition(x, y, row);
            handleBubblePlacement(row, col, prev.color);
            return null;
          }
        }

        return { ...prev, x, y, vx, vy };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shooting, bubbles]);

  // バブル配置処理
  const handleBubblePlacement = useCallback(
    (row: number, col: number, color: string) => {
      setIsAnimating(true);

      // 配置位置を確定
      const maxCols = row % 2 === 1 ? COLS - 1 : COLS;
      const clampedCol = Math.max(0, Math.min(col, maxCols - 1));
      const pos = getBubblePosition(row, clampedCol);

      const newBubble: Bubble = {
        id: nextIdRef.current++,
        color,
        row,
        col: clampedCol,
        x: pos.x,
        y: pos.y,
      };

      setBubbles((prev) => {
        const newBubbles = [...prev, newBubble];

        // 同色の連結を探す
        const connected = findConnectedSameColor(newBubbles, newBubble);

        if (connected.size >= 3) {
          // Dopamine effects!
          playPop(connected.size);
          sparkle(BOARD_WIDTH / 2, 200);
          setCombo(c => {
            const newCombo = c + 1;
            if (newCombo >= 3) {
              playComboSound(newCombo);
              // コンボ時のポップアップ
              showPopup(`🔥 ${newCombo}コンボ!`, "combo", "lg", "50%", "25%");
            }
            return newCombo;
          });

          // 消去処理
          const toRemove = connected;
          const afterRemove = newBubbles.filter((b) => !toRemove.has(b.id));

          // 浮いているバブルを検出
          const floating = findFloatingBubbles(afterRemove);
          const allRemoved = new Set([...toRemove, ...floating]);

          if (floating.size > 0) {
            explosion(BOARD_WIDTH / 2, 250);
            // 連鎖反応ポップアップ
            showPopup(`💥 連鎖 +${floating.size * 5}`, "bonus", "md", "50%", "35%");
          }

          const points = allRemoved.size * 10 + (floating.size > 0 ? floating.size * 5 : 0);
          setScore((s) => s + points);

          // マッチポップアップ（消去バブル数に応じてサイズ変更）
          const matchSize: "sm" | "md" | "lg" | "xl" = 
            connected.size >= 6 ? "xl" : 
            connected.size >= 5 ? "lg" : 
            connected.size >= 4 ? "md" : "sm";
          const matchVariant: PopupVariant = 
            connected.size >= 6 ? "critical" : 
            connected.size >= 5 ? "bonus" : "default";
          showPopup(`+${connected.size * 10}`, matchVariant, matchSize, "50%", "45%");

          if (allRemoved.size > 3) {
            setMessage(`💥 ${allRemoved.size}個消去! +${points}`);
          } else {
            setMessage(`+${points}`);
          }

          // 消去アニメーション
          const withRemoving = newBubbles.map((b) =>
            allRemoved.has(b.id) ? { ...b, removing: true, falling: floating.has(b.id) } : b
          );

          setTimeout(() => {
            setBubbles(afterRemove.filter((b) => !floating.has(b.id)));
            setMessage("");
            setIsAnimating(false);
          }, 400);

          return withRemoving;
        }

        setCombo(0);
        setMessage("");
        setIsAnimating(false);
        return newBubbles;
      });
    },
    [playPop, playComboSound, sparkle, explosion, showPopup]
  );

  // 勝利/敗北判定
  useEffect(() => {
    if (phase !== "playing" || isAnimating) return;

    // 全消しで勝利
    if (bubbles.length === 0) {
      setGameResult("win");
      playWin();
      confetti();
      // レベルクリアポップアップ
      showPopup("🎉 クリア!", "level", "xl", "50%", "30%");
      // ハイスコアチェック
      const isNewRecord = saveHighScore(score);
      if (isNewRecord) {
        setTimeout(() => {
          showPopup("🏆 NEW RECORD!", "critical", "lg", "50%", "45%");
        }, 300);
      }
      setTimeout(() => setPhase("result"), 1000);
      return;
    }

    // バブルが下に来すぎたら敗北
    const maxY = Math.max(...bubbles.map((b) => b.y));
    if (maxY > SHOOTER_Y - BUBBLE_RADIUS * 2) {
      setGameResult("lose");
      playLose();
      explosion(BOARD_WIDTH / 2, BOARD_HEIGHT / 2);
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);
      // ゲームオーバーでもハイスコアチェック
      const isNewRecord = saveHighScore(score);
      if (isNewRecord && score > 0) {
        showPopup("🏆 NEW RECORD!", "bonus", "lg", "50%", "40%");
      }
      setTimeout(() => setPhase("result"), 800);
    }
  }, [phase, bubbles, isAnimating, playWin, playLose, confetti, explosion, showPopup, saveHighScore, score]);

  // 照準線の終点
  const aimLength = 300;
  const aimEndX = BOARD_WIDTH / 2 + Math.cos(aimAngle) * aimLength;
  const aimEndY = SHOOTER_Y + Math.sin(aimAngle) * aimLength;

  return (
    <GameShell gameId="bubbleshoot" layout="immersive">
      <div 
        className={`bs-root ${screenShake ? 'bs-shake' : ''}`}
      >
        <style>{`
          .bs-root.bs-shake {
            animation: bs-shake 0.3s ease-in-out;
          }
          @keyframes bs-shake {
            0%, 100% { transform: translate(0, 0); }
            20% { transform: translate(-3px, 2px); }
            40% { transform: translate(3px, -2px); }
            60% { transform: translate(-2px, 3px); }
            80% { transform: translate(2px, -3px); }
          }
        `}</style>
        <ParticleLayer particles={particles} />
        {combo >= 3 && phase === "playing" && <ComboCounter combo={combo} />}
        
        {/* ScorePopups */}
        {popups.map((p) => (
          <ScorePopup
            key={p.id}
            text={p.text}
            popupKey={p.id}
            variant={p.variant}
            size={p.size}
            x={p.x}
            y={p.y}
          />
        ))}
        
        {phase === "start" && (
          <div className="bs-screen">
            <h1 className="bs-title">🫧 Bubble Shoot</h1>
            <p className="bs-desc">バブルシューター！</p>
            <div className="bs-preview">
              {COLORS.map((color, i) => (
                <div
                  key={i}
                  className="bs-preview-bubble"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="bs-rules">
              <p>🎯 照準を合わせてクリックで発射</p>
              <p>🫧 同色3つ以上で消える</p>
              <p>💥 浮いたバブルも落下！</p>
              <p>🏆 全て消せばクリア！</p>
            </div>
            <button className="bs-btn bs-btn--start" onClick={startGame}>
              スタート
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="bs-game">
            <div className="bs-hud">
              <span className="bs-stat">🎯 {score.toLocaleString()}</span>
              <span className="bs-stat">🔫 {shots} 発</span>
              <span className="bs-stat">🫧 残り {bubbles.length}</span>
            </div>
            {message && <div className="bs-message">{message}</div>}
            <div
              ref={boardRef}
              className="bs-board"
              onPointerMove={handlePointerMove}
              onClick={shoot}
            >
              <svg className="bs-svg" viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}>
                {/* 照準線 */}
                {!shooting && (
                  <line
                    x1={BOARD_WIDTH / 2}
                    y1={SHOOTER_Y}
                    x2={aimEndX}
                    y2={aimEndY}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={2}
                    strokeDasharray="8,4"
                  />
                )}

                {/* バブル */}
                {bubbles.map((b) => (
                  <circle
                    key={b.id}
                    cx={b.x}
                    cy={b.y}
                    r={BUBBLE_RADIUS - 2}
                    fill={b.color}
                    className={`bs-bubble ${b.removing ? "bs-bubble--removing" : ""} ${b.falling ? "bs-bubble--falling" : ""}`}
                  />
                ))}

                {/* 発射中のバブル */}
                {shooting && (
                  <circle
                    cx={shooting.x}
                    cy={shooting.y}
                    r={BUBBLE_RADIUS - 2}
                    fill={shooting.color}
                    className="bs-bubble--shooting"
                  />
                )}

                {/* 発射台 */}
                <circle
                  cx={BOARD_WIDTH / 2}
                  cy={SHOOTER_Y}
                  r={BUBBLE_RADIUS - 2}
                  fill={nextColor}
                  stroke="#fff"
                  strokeWidth={3}
                  className="bs-shooter"
                />
                <polygon
                  points={`${BOARD_WIDTH / 2},${SHOOTER_Y - 30} ${BOARD_WIDTH / 2 - 8},${SHOOTER_Y - 10} ${BOARD_WIDTH / 2 + 8},${SHOOTER_Y - 10}`}
                  fill="#fff"
                  opacity={0.8}
                  transform={`rotate(${(aimAngle * 180) / Math.PI + 90}, ${BOARD_WIDTH / 2}, ${SHOOTER_Y})`}
                />
              </svg>
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="bs-screen">
            <h1 className="bs-title">
              {gameResult === "win" ? "🎉 クリア！" : "💔 ゲームオーバー"}
            </h1>
            <div className="bs-result-stats">
              <p className="bs-result-item">
                <span className="bs-result-label">スコア</span>
                <span className="bs-result-value">{score.toLocaleString()}</span>
              </p>
              <p className="bs-result-item">
                <span className="bs-result-label">発射数</span>
                <span className="bs-result-value">{shots} 発</span>
              </p>
              <p className="bs-result-item">
                <span className="bs-result-label">ハイスコア</span>
                <span className="bs-result-value">{highScore.toLocaleString()}</span>
              </p>
            </div>
            <p className="bs-rating">
              {gameResult === "win" && score >= 500 && "⭐⭐⭐ パーフェクト！"}
              {gameResult === "win" && score >= 200 && score < 500 && "⭐⭐ すばらしい！"}
              {gameResult === "win" && score < 200 && "⭐ クリア！"}
              {gameResult === "lose" && "次はクリアを目指そう！"}
              {score === highScore && score > 0 && " 🏆"}
            </p>
            <button className="bs-btn bs-btn--restart" onClick={startGame}>
              もう一度
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}