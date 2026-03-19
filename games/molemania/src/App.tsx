import { useState, useEffect, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

type GamePhase = "before" | "in_progress" | "after";

interface Mole {
  id: number;
  position: number;
  appearedAt: number;
}

const GAME_DURATION = 30000; // 30秒
const INITIAL_SPAWN_INTERVAL = 1200; // 初期出現間隔
const MIN_SPAWN_INTERVAL = 400; // 最小出現間隔
const MOLE_DURATION = 1000; // もぐらの表示時間

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("before");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [hitPosition, setHitPosition] = useState<number | null>(null);
  const moleIdRef = useRef(0);
  const gameStartTimeRef = useRef(0);

  // 難易度に応じた出現間隔を計算
  const getSpawnInterval = useCallback(() => {
    const elapsed = Date.now() - gameStartTimeRef.current;
    const progress = Math.min(elapsed / GAME_DURATION, 1);
    return (
      INITIAL_SPAWN_INTERVAL -
      (INITIAL_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL) * progress
    );
  }, []);

  // もぐらを出現させる
  const spawnMole = useCallback(() => {
    setMoles((prev) => {
      const occupiedPositions = new Set(prev.map((m) => m.position));
      const availablePositions = Array.from({ length: 9 }, (_, i) => i).filter(
        (p) => !occupiedPositions.has(p)
      );

      if (availablePositions.length === 0) return prev;

      const position =
        availablePositions[
          Math.floor(Math.random() * availablePositions.length)
        ];
      const newMole: Mole = {
        id: moleIdRef.current++,
        position,
        appearedAt: Date.now(),
      };

      // 一定時間後に消える
      setTimeout(() => {
        setMoles((current) => current.filter((m) => m.id !== newMole.id));
      }, MOLE_DURATION);

      return [...prev, newMole];
    });
  }, []);

  // もぐらを叩く
  const handleWhack = useCallback(
    (position: number) => {
      if (phase !== "in_progress") return;

      setMoles((prev) => {
        const moleAtPosition = prev.find((m) => m.position === position);
        if (moleAtPosition) {
          setScore((s) => s + 100);
          setHitPosition(position);
          setTimeout(() => setHitPosition(null), 200);
          return prev.filter((m) => m.id !== moleAtPosition.id);
        }
        return prev;
      });
    },
    [phase]
  );

  // ゲーム開始
  const startGame = useCallback(() => {
    setPhase("in_progress");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMoles([]);
    gameStartTimeRef.current = Date.now();
    moleIdRef.current = 0;
  }, []);

  // リセット
  const resetGame = useCallback(() => {
    setPhase("before");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMoles([]);
  }, []);

  // ゲームタイマー
  useEffect(() => {
    if (phase !== "in_progress") return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - gameStartTimeRef.current;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setPhase("after");
        setMoles([]);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [phase]);

  // もぐら出現タイマー
  useEffect(() => {
    if (phase !== "in_progress") return;

    let timeoutId: number;

    const scheduleNextSpawn = () => {
      const interval = getSpawnInterval();
      timeoutId = window.setTimeout(() => {
        spawnMole();
        scheduleNextSpawn();
      }, interval);
    };

    // 初回即座に出現
    spawnMole();
    scheduleNextSpawn();

    return () => clearTimeout(timeoutId);
  }, [phase, getSpawnInterval, spawnMole]);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}秒`;
  };

  return (
    <GameShell gameId="molemania" layout="default">
      <div className="molemania-container">
        {/* ヘッダー */}
        <header className="molemania-header">
          <div className="molemania-score">スコア: {score}</div>
          <div className="molemania-timer">残り: {formatTime(timeLeft)}</div>
        </header>

        {/* ゲームエリア */}
        <main className="molemania-game-area">
          {phase === "before" && (
            <div className="molemania-overlay">
              <h1 className="molemania-title">🔨 もぐらたたき</h1>
              <p className="molemania-instruction">
                もぐらをクリック/タップして叩こう！
                <br />
                制限時間は30秒です
              </p>
              <button className="molemania-button" onClick={startGame}>
                ゲームスタート
              </button>
            </div>
          )}

          {phase === "after" && (
            <div className="molemania-overlay">
              <h2 className="molemania-result-title">タイムアップ！</h2>
              <p className="molemania-final-score">
                スコア: <strong>{score}</strong>
              </p>
              <button className="molemania-button" onClick={resetGame}>
                もう一度遊ぶ
              </button>
            </div>
          )}

          {/* 3x3 グリッド */}
          <div className="molemania-grid">
            {Array.from({ length: 9 }, (_, index) => {
              const hasMole = moles.some((m) => m.position === index);
              const isHit = hitPosition === index;

              return (
                <button
                  key={index}
                  type="button"
                  className={`molemania-hole ${isHit ? "molemania-hole--hit" : ""}`}
                  onClick={() => handleWhack(index)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleWhack(index);
                  }}
                  aria-label={`穴${index + 1}${hasMole ? " (もぐらがいます)" : ""}`}
                >
                  <div className="molemania-hole-inner">
                    <div
                      className={`molemania-mole ${hasMole ? "molemania-mole--visible" : ""}`}
                    >
                      🐹
                    </div>
                  </div>
                  <div className="molemania-hole-rim" />
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </GameShell>
  );
}
