import { useState, useEffect, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  createdAt: number;
}

type Phase = "ready" | "playing" | "ended";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const GAME_DURATION = 30000; // 30秒
const TARGET_LIFETIME = 2000; // 2秒で自動消滅
const BASE_TARGET_SIZE = 80;
const MIN_TARGET_SIZE = 30;
const SPAWN_INTERVAL_INITIAL = 1200;
const SPAWN_INTERVAL_MIN = 400;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function randomPosition(size: number): { x: number; y: number } {
  const margin = size / 2 + 10;
  return {
    x: clamp(Math.random() * GAME_WIDTH, margin, GAME_WIDTH - margin),
    y: clamp(Math.random() * GAME_HEIGHT, margin, GAME_HEIGHT - margin),
  };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [targets, setTargets] = useState<Target[]>([]);
  const [combo, setCombo] = useState(0);
  const [currentSize, setCurrentSize] = useState(BASE_TARGET_SIZE);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);

  const nextIdRef = useRef(1);
  const gameStartTimeRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const animationFrameRef = useRef(0);

  const getSpawnInterval = useCallback((elapsed: number) => {
    const progress = elapsed / GAME_DURATION;
    return Math.max(
      SPAWN_INTERVAL_MIN,
      SPAWN_INTERVAL_INITIAL - (SPAWN_INTERVAL_INITIAL - SPAWN_INTERVAL_MIN) * progress
    );
  }, []);

  const getTargetSize = useCallback((elapsed: number) => {
    const progress = elapsed / GAME_DURATION;
    return Math.max(MIN_TARGET_SIZE, BASE_TARGET_SIZE - (BASE_TARGET_SIZE - MIN_TARGET_SIZE) * progress);
  }, []);

  const spawnTarget = useCallback((size: number) => {
    const { x, y } = randomPosition(size);
    const newTarget: Target = {
      id: nextIdRef.current++,
      x,
      y,
      size,
      createdAt: Date.now(),
    };
    setTargets((prev) => [...prev, newTarget]);
  }, []);

  const startGame = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setTargets([]);
    setCombo(0);
    setCurrentSize(BASE_TARGET_SIZE);
    setHits(0);
    setMisses(0);
    nextIdRef.current = 1;
    gameStartTimeRef.current = Date.now();
    lastSpawnRef.current = 0;
  }, []);

  const handleTargetTap = useCallback((targetId: number, size: number) => {
    setTargets((prev) => prev.filter((t) => t.id !== targetId));
    
    // 小さいターゲットほど高得点
    const sizeBonus = Math.ceil((BASE_TARGET_SIZE - size) / 5) + 1;
    const comboBonus = Math.min(combo + 1, 10);
    const points = 10 * sizeBonus * comboBonus;
    
    setScore((prev) => prev + points);
    setCombo((prev) => prev + 1);
    setHits((prev) => prev + 1);
  }, [combo]);

  const handleMiss = useCallback(() => {
    setCombo(0);
    setMisses((prev) => prev + 1);
  }, []);

  const handleAreaClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== "playing") return;
      
      const target = e.target as HTMLElement;
      if (!target.classList.contains("tt-target")) {
        handleMiss();
      }
    },
    [phase, handleMiss]
  );

  // ゲームループ
  useEffect(() => {
    if (phase !== "playing") return;

    const gameLoop = () => {
      const now = Date.now();
      const elapsed = now - gameStartTimeRef.current;
      const remaining = GAME_DURATION - elapsed;

      if (remaining <= 0) {
        setPhase("ended");
        setTimeLeft(0);
        return;
      }

      setTimeLeft(remaining);

      // ターゲットサイズ更新
      const size = getTargetSize(elapsed);
      setCurrentSize(size);

      // 期限切れターゲット削除
      setTargets((prev) =>
        prev.filter((t) => now - t.createdAt < TARGET_LIFETIME)
      );

      // スポーン処理
      const spawnInterval = getSpawnInterval(elapsed);
      if (now - lastSpawnRef.current > spawnInterval) {
        spawnTarget(size);
        lastSpawnRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // 初回スポーン
    spawnTarget(currentSize);
    lastSpawnRef.current = Date.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [phase, getSpawnInterval, getTargetSize, spawnTarget, currentSize]);

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

  return (
    <GameShell gameId="taptarget" layout="immersive">
      <div
        className="tt-container"
        onClick={handleAreaClick}
        onTouchStart={handleAreaClick}
      >
        {/* ヘッダー */}
        <div className="tt-header">
          <div className="tt-stat">
            <span className="tt-stat-label">SCORE</span>
            <span className="tt-stat-value">{score.toLocaleString()}</span>
          </div>
          <div className="tt-stat tt-stat--time">
            <span className="tt-stat-label">TIME</span>
            <span className="tt-stat-value">{(timeLeft / 1000).toFixed(1)}s</span>
          </div>
          <div className="tt-stat">
            <span className="tt-stat-label">COMBO</span>
            <span className={`tt-stat-value ${combo >= 5 ? "tt-combo-fire" : ""}`}>
              x{combo}
            </span>
          </div>
        </div>

        {/* ゲームエリア */}
        <div className="tt-game-area">
          {phase === "ready" && (
            <div className="tt-overlay">
              <h1 className="tt-title">Tap Target</h1>
              <p className="tt-desc">
                ランダムに出現するターゲットをタップ！<br />
                小さいほど高得点。連続タップでコンボ！
              </p>
              <button className="tt-start-btn" onClick={startGame}>
                START
              </button>
            </div>
          )}

          {phase === "ended" && (
            <div className="tt-overlay">
              <h2 className="tt-result-title">RESULT</h2>
              <div className="tt-result-score">{score.toLocaleString()}</div>
              <div className="tt-result-stats">
                <div>ヒット: {hits}</div>
                <div>ミス: {misses}</div>
                <div>命中率: {accuracy}%</div>
              </div>
              <button className="tt-start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}

          {phase === "playing" &&
            targets.map((target) => (
              <button
                key={target.id}
                className="tt-target"
                style={{
                  left: target.x,
                  top: target.y,
                  width: target.size,
                  height: target.size,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTargetTap(target.id, target.size);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                aria-label={`ターゲット ${target.id}`}
              />
            ))}
        </div>

        {/* 難易度インジケータ */}
        {phase === "playing" && (
          <div className="tt-difficulty">
            <span>サイズ: {Math.round(currentSize)}px</span>
          </div>
        )}
      </div>
    </GameShell>
  );
}
