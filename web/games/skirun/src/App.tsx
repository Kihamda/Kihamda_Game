import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell } from "@shared/components/GameShell";
import { ScreenShake, type ScreenShakeHandle } from "@shared/components/ScreenShake";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { ShareButton } from "@shared/components/ShareButton";
import { GameRecommendations } from "@shared/components/GameRecommendations";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";

// =====================
// 型定義
// =====================
type Phase = "idle" | "playing" | "result";

type ObstacleType = "tree" | "gate-left" | "gate-right";

interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  passed: boolean;
}

interface Player {
  x: number;
  velocityX: number;
}

// =====================
// 定数
// =====================
const GAME_WIDTH = 500;
const GAME_HEIGHT = 700;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 40;
const PLAYER_Y = 100; // プレイヤーの固定Y位置
const TREE_SIZE = 36;
const GATE_WIDTH = 60;
const GATE_HEIGHT = 20;
const SCROLL_SPEED = 5;
const PLAYER_ACCEL = 0.8;
const PLAYER_FRICTION = 0.92;
const MAX_VELOCITY = 8;
const COURSE_LENGTH = 10000; // コース全長
const SPAWN_INTERVAL = 120; // 障害物生成間隔(px)
const STORAGE_KEY = "skirun_besttime";
const GATE_BONUS_MS = 500; // 旗門通過ボーナス(ms)

// 雪パーティクル用
interface SnowParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
}

// ポップアップ用
interface PopupState {
  text: string;
  key: number;
  x: string;
  y: string;
  variant: "default" | "combo" | "bonus" | "critical" | "level";
}

// =====================
// ユーティリティ関数
// =====================
function loadBestTime(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

function saveBestTime(time: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(time));
  } catch {
    // ignore
  }
}

function formatTime(ms: number): string {
  const sec = ms / 1000;
  return sec.toFixed(2);
}

function generateObstacle(id: number, y: number): Obstacle {
  const rand = Math.random();
  if (rand < 0.4) {
    // 木
    return {
      id,
      type: "tree",
      x: Math.random() * (GAME_WIDTH - TREE_SIZE),
      y,
      passed: false,
    };
  } else if (rand < 0.7) {
    // 旗門左
    return {
      id,
      type: "gate-left",
      x: 50 + Math.random() * (GAME_WIDTH / 2 - 100),
      y,
      passed: false,
    };
  } else {
    // 旗門右
    return {
      id,
      type: "gate-right",
      x: GAME_WIDTH / 2 + Math.random() * (GAME_WIDTH / 2 - 100),
      y,
      passed: false,
    };
  }
}

function checkCollision(
  playerX: number,
  obstacle: Obstacle,
  screenY: number
): boolean {
  // プレイヤーの当たり判定
  const px = playerX;
  const py = PLAYER_Y;
  const pw = PLAYER_WIDTH;
  const ph = PLAYER_HEIGHT;

  if (obstacle.type === "tree") {
    // 木との衝突
    const ox = obstacle.x;
    const oy = screenY;
    const treeHitbox = TREE_SIZE * 0.7;
    return (
      px < ox + treeHitbox &&
      px + pw > ox &&
      py < oy + treeHitbox &&
      py + ph > oy
    );
  }
  // 旗門は衝突しない（通過判定のみ）
  return false;
}

function checkGatePassed(
  playerX: number,
  obstacle: Obstacle,
  screenY: number
): boolean {
  if (obstacle.type !== "gate-left" && obstacle.type !== "gate-right") {
    return false;
  }
  // 旗門を通過したかチェック
  const py = PLAYER_Y;
  const gateY = screenY;
  // プレイヤーの中心が旗門の範囲内にいるか
  const playerCenterX = playerX + PLAYER_WIDTH / 2;
  const gateLeft = obstacle.x;
  const gateRight = obstacle.x + GATE_WIDTH;
  return (
    py < gateY + GATE_HEIGHT &&
    py + PLAYER_HEIGHT > gateY &&
    playerCenterX >= gateLeft &&
    playerCenterX <= gateRight
  );
}

// =====================
// メインコンポーネント
// =====================
export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [player, setPlayer] = useState<Player>({ x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2, velocityX: 0 });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [distance, setDistance] = useState(0);
  const [gateCount, setGateCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(loadBestTime);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // ドーパミン演出用state
  const [snowParticles, setSnowParticles] = useState<SnowParticle[]>([]);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const popupKeyRef = useRef(0);

  // refs
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastSpawnYRef = useRef<number>(0);
  const obstacleIdRef = useRef<number>(0);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const snowIdRef = useRef(0);
  const prevSpeedRef = useRef(0);

  // hooks
  const { particles, sparkle, confetti } = useParticles();
  const { playTone, playSweep, playArpeggio, playNoise, playCelebrate } = useAudio();

  // ゲーム開始
  const startGame = useCallback(() => {
    setPhase("playing");
    setPlayer({ x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2, velocityX: 0 });
    setObstacles([]);
    setDistance(0);
    setGateCount(0);
    setElapsedTime(0);
    setIsNewRecord(false);
    setGameOver(false);
    setPopup(null);
    setSnowParticles([]);
    startTimeRef.current = performance.now();
    lastSpawnYRef.current = 0;
    obstacleIdRef.current = 0;
    keysRef.current = { left: false, right: false };
    prevSpeedRef.current = 0;
    // swoosh音
    playSweep(800, 400, 0.15, "sine", 0.15);
  }, [playSweep]);

  // ゲームループ
  useEffect(() => {
    if (phase !== "playing") return;

    const gameLoop = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      setElapsedTime(elapsed);

      // プレイヤー移動
      setPlayer((prev) => {
        let vx = prev.velocityX;
        if (keysRef.current.left) vx -= PLAYER_ACCEL;
        if (keysRef.current.right) vx += PLAYER_ACCEL;
        vx *= PLAYER_FRICTION;
        vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, vx));
        let nx = prev.x + vx;
        nx = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, nx));
        return { x: nx, velocityX: vx };
      });

      // 距離更新
      setDistance((prev) => {
        const next = prev + SCROLL_SPEED;
        return Math.min(next, COURSE_LENGTH);
      });

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // 障害物生成と衝突判定
  useEffect(() => {
    if (phase !== "playing") return;

    // 障害物生成
    while (lastSpawnYRef.current < distance + GAME_HEIGHT) {
      lastSpawnYRef.current += SPAWN_INTERVAL;
      if (lastSpawnYRef.current > 200 && lastSpawnYRef.current < COURSE_LENGTH - 200) {
        const obs = generateObstacle(obstacleIdRef.current++, lastSpawnYRef.current);
        setObstacles((prev) => [...prev, obs]);
      }
    }

    // 衝突判定と旗門通過
    setObstacles((prev) => {
      let hitTree = false;
      let passedGateX: number | null = null;
      let passedGateY: number | null = null;
      const updated = prev.map((obs) => {
        const screenY = obs.y - distance + GAME_HEIGHT - 100;
        // 画面外（上に出た）は削除対象
        if (screenY < -50) return { ...obs, passed: true };

        // 衝突判定
        if (checkCollision(player.x, obs, screenY)) {
          hitTree = true;
        }

        // 旗門通過判定
        if (!obs.passed && (obs.type === "gate-left" || obs.type === "gate-right")) {
          if (checkGatePassed(player.x, obs, screenY)) {
            setGateCount((c) => c + 1);
            passedGateX = obs.x + GATE_WIDTH / 2;
            passedGateY = screenY;
            return { ...obs, passed: true };
          }
        }

        return obs;
      });

      // 旗門通過演出
      if (passedGateX !== null && passedGateY !== null) {
        sparkle(passedGateX, passedGateY, 10);
        // 旗門通過音
        playTone(880, 0.1, "sine", 0.2);
        playTone(1320, 0.08, "sine", 0.15, 0.05);
        // ポップアップ
        popupKeyRef.current++;
        setPopup({
          text: `-0.5秒 🚩`,
          key: popupKeyRef.current,
          x: `${passedGateX}px`,
          y: `${passedGateY + 50}px`,
          variant: "bonus",
        });
        setTimeout(() => setPopup(null), 800);
      }

      if (hitTree && !gameOver) {
        // クラッシュ演出
        shakeRef.current?.shake("heavy", 400);
        playNoise(0.3, 0.4, 600);
        playSweep(300, 80, 0.4, "sawtooth", 0.3);
        setGameOver(true);
        setPhase("result");
      }

      return updated.filter((o) => o.y - distance + GAME_HEIGHT - 100 > -50);
    });

    // ゴール判定
    if (distance >= COURSE_LENGTH && !gameOver) {
      const finalTime = elapsedTime - gateCount * GATE_BONUS_MS;
      const currentBest = loadBestTime();
      if (currentBest === null || finalTime < currentBest) {
        setBestTime(finalTime);
        saveBestTime(finalTime);
        setIsNewRecord(true);
      }
      // ゴール演出
      confetti(60);
      playCelebrate();
      playArpeggio([659, 784, 988, 1319], 0.2, "sine", 0.25, 0.1);
      setPhase("result");
    }
  }, [phase, distance, player.x, elapsedTime, gateCount, gameOver, sparkle, confetti, playTone, playNoise, playSweep, playCelebrate, playArpeggio]);

  // スピードアップ時の雪パーティクル増加
  useEffect(() => {
    if (phase !== "playing") return;

    const speed = Math.abs(player.velocityX);
    const prevSpeed = prevSpeedRef.current;
    prevSpeedRef.current = speed;

    // 高速移動時に雪パーティクル生成
    if (speed > MAX_VELOCITY * 0.5 && Math.random() < speed / MAX_VELOCITY) {
      const newSnow: SnowParticle = {
        id: snowIdRef.current++,
        x: Math.random() * GAME_WIDTH,
        y: -10,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 3 + 2 + speed,
        drift: (Math.random() - 0.5) * 2,
      };
      setSnowParticles((prev) => [...prev.slice(-30), newSnow]);

      // swoosh音（速度上昇時のみ）
      if (speed > prevSpeed + 0.5 && speed > MAX_VELOCITY * 0.7) {
        playTone(400 + speed * 50, 0.08, "sine", 0.08);
      }
    }
  }, [phase, player.velocityX, playTone]);

  // 雪パーティクルのアニメーション
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      setSnowParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y + p.speed,
            x: p.x + p.drift,
          }))
          .filter((p) => p.y < GAME_HEIGHT + 20)
      );
    }, 30);
    return () => clearInterval(interval);
  }, [phase]);

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // タッチ操作
  const handleTouchStart = useCallback((side: "left" | "right") => {
    keysRef.current[side] = true;
  }, []);

  const handleTouchEnd = useCallback((side: "left" | "right") => {
    keysRef.current[side] = false;
  }, []);

  // 進捗率
  const progress = Math.min(100, (distance / COURSE_LENGTH) * 100);
  const finalTime = elapsedTime - gateCount * GATE_BONUS_MS;

  return (
    <GameShell gameId="skirun" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="skirun-root">
          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />

          {phase === "idle" && (
          <div className="skirun-panel">
            <h1 className="skirun-title">⛷️ スキーラン</h1>
            <p className="skirun-description">
              下り坂を滑り降りてゴールを目指せ！
            </p>
            <p className="skirun-description small">
              🚩 旗門通過で0.5秒ボーナス
            </p>
            <p className="skirun-description small">
              🌲 木に当たるとゲームオーバー
            </p>
            <div className="skirun-controls">
              <span className="skirun-key">←</span>
              <span className="skirun-key">→</span>
            </div>
            {bestTime !== null && (
              <p className="skirun-besttime">🏆 ベスト: {formatTime(bestTime)}秒</p>
            )}
            <button
              type="button"
              className="skirun-button"
              onClick={startGame}
            >
              スタート
            </button>
          </div>
        )}

        {phase === "playing" && (
          <div className="skirun-game">
            {/* HUD */}
            <div className="skirun-hud">
              <div className="skirun-stat">
                <span className="stat-label">タイム</span>
                <span className="stat-value">{formatTime(elapsedTime)}秒</span>
              </div>
              <div className="skirun-stat">
                <span className="stat-label">旗門</span>
                <span className="stat-value gate">🚩{gateCount}</span>
              </div>
            </div>

            {/* 進捗バー */}
            <div className="skirun-progress">
              <div
                className="skirun-progress-fill"
                style={{ width: `${progress}%` }}
              />
              <span className="skirun-progress-text">
                {Math.floor(progress)}%
              </span>
            </div>

            {/* ゲームエリア */}
            <div className="skirun-area">
              {/* 雪のライン（背景エフェクト） */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="skirun-snowline"
                  style={{
                    top: ((distance * 0.5 + i * 100) % GAME_HEIGHT) + "px",
                    left: (i % 2 === 0 ? 30 : 70) + "%",
                    opacity: 0.15,
                  }}
                />
              ))}

              {/* 障害物 */}
              {obstacles.map((obs) => {
                const screenY = obs.y - distance + GAME_HEIGHT - 100;
                if (screenY < -50 || screenY > GAME_HEIGHT + 50) return null;
                return (
                  <div
                    key={obs.id}
                    className={`skirun-obstacle skirun-${obs.type} ${obs.passed ? "passed" : ""}`}
                    style={{
                      left: obs.x + "px",
                      top: screenY + "px",
                    }}
                  >
                    {obs.type === "tree" && "🌲"}
                    {obs.type === "gate-left" && "🚩"}
                    {obs.type === "gate-right" && "🚩"}
                  </div>
                );
              })}

              {/* プレイヤー */}
              <div
                className="skirun-player"
                style={{
                  left: player.x + "px",
                  top: PLAYER_Y + "px",
                }}
              >
                ⛷️
              </div>

              {/* ゴールライン */}
              {distance > COURSE_LENGTH - GAME_HEIGHT && (
                <div
                  className="skirun-goal"
                  style={{
                    top: COURSE_LENGTH - distance + GAME_HEIGHT - 100 - 30 + "px",
                  }}
                >
                  🏁 GOAL 🏁
                </div>
              )}
              {/* 雪パーティクル */}
              {snowParticles.map((p) => (
                <div
                  key={p.id}
                  className="skirun-snow-particle"
                  style={{
                    left: p.x + "px",
                    top: p.y + "px",
                    width: p.size + "px",
                    height: p.size + "px",
                  }}
                />
              ))}

              {/* ポップアップ */}
              {popup && (
                <ScorePopup
                  text={popup.text}
                  popupKey={popup.key}
                  x={popup.x}
                  y={popup.y}
                  variant={popup.variant}
                />
              )}
            </div>

            {/* タッチコントロール */}
            <div className="skirun-touch-controls">
              <button
                type="button"
                className="skirun-touch-btn"
                onPointerDown={() => handleTouchStart("left")}
                onPointerUp={() => handleTouchEnd("left")}
                onPointerLeave={() => handleTouchEnd("left")}
              >
                ←
              </button>
              <button
                type="button"
                className="skirun-touch-btn"
                onPointerDown={() => handleTouchStart("right")}
                onPointerUp={() => handleTouchEnd("right")}
                onPointerLeave={() => handleTouchEnd("right")}
              >
                →
              </button>
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="skirun-panel">
            {gameOver ? (
              <>
                <p className="skirun-result-title">💥 クラッシュ！</p>
                <p className="skirun-final">進行: {Math.floor(progress)}%</p>
              </>
            ) : (
              <>
                <p className="skirun-result-title">🎉 ゴール！</p>
                <p className="skirun-final">タイム: {formatTime(elapsedTime)}秒</p>
                <p className="skirun-bonus">旗門ボーナス: -{formatTime(gateCount * GATE_BONUS_MS)}秒</p>
                <p className="skirun-final-time">最終タイム: {formatTime(finalTime)}秒</p>
                {gateCount > 0 && (
                  <p className="skirun-time-bonus">⏱️ 旗門{gateCount}個通過!</p>
                )}
                {isNewRecord && (
                  <p className="skirun-newrecord">🏆 新記録！</p>
                )}
              </>
            )}
            {bestTime !== null && !isNewRecord && (
              <p className="skirun-besttime">ベスト: {formatTime(bestTime)}秒</p>
            )}
            <button
              type="button"
              className="skirun-button"
              onClick={startGame}
            >
              もう一度
            </button>
            <ShareButton score={Math.floor(finalTime * 10)} gameTitle="スキーラン" gameId="skirun" />
            <GameRecommendations currentGameId="skirun" />
          </div>
        )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
