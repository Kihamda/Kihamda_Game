import { useState, useEffect, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ScorePopup } from "@shared/components/ScorePopup";
import type { PopupVariant } from "@shared/components/ScorePopup";
import { ParticleLayer, useAudio, useParticles } from "@shared";
import "./App.css";

type GamePhase = "before" | "in_progress" | "after";

interface Mole {
  id: number;
  position: number;
  appearedAt: number;
}

interface PopupState {
  text: string;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

const GAME_DURATION = 30000; // 30秒
const INITIAL_SPAWN_INTERVAL = 1200; // 初期出現間隔
const MIN_SPAWN_INTERVAL = 400; // 最小出現間隔
const MOLE_DURATION = 1000; // もぐらの表示時間
const COMBO_TIMEOUT = 1500; // コンボ判定の時間窓（ミリ秒）

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("before");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [hitPosition, setHitPosition] = useState<number | null>(null);
  const [popups, setPopups] = useState<PopupState[]>([]);
  const [combo, setCombo] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("molemania-highscore");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [newHighScore, setNewHighScore] = useState(false);
  
  const moleIdRef = useRef(0);
  const gameStartTimeRef = useRef(0);
  const popupKeyRef = useRef(0);
  const lastHitTimeRef = useRef(0);
  const comboTimeoutRef = useRef<number | null>(null);

  const { playTone } = useAudio();
  const { particles, burst, confetti } = useParticles();

  const playWhack = useCallback(() => {
    playTone(600, 0.08, "sine");
  }, [playTone]);

  const playMiss = useCallback(() => {
    playTone(200, 0.05, "sawtooth");
  }, [playTone]);

  const playEnd = useCallback(() => {
    playTone(440, 0.3, "sine");
  }, [playTone]);

  const playCombo = useCallback(() => {
    playTone(800, 0.1, "sine");
  }, [playTone]);

  const playLevelUp = useCallback(() => {
    playTone(523, 0.15, "sine"); // C5
    setTimeout(() => playTone(659, 0.15, "sine"), 100); // E5
    setTimeout(() => playTone(784, 0.2, "sine"), 200); // G5
  }, [playTone]);

  // ポップアップを追加
  const addPopup = useCallback(
    (
      text: string,
      x: string,
      y: string,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md"
    ) => {
      const key = popupKeyRef.current++;
      const newPopup: PopupState = { text, key, x, y, variant, size };
      setPopups((prev) => [...prev, newPopup]);
      // 自動削除
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.key !== key));
      }, 1500);
    },
    []
  );

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

      // グリッド位置からポップアップ表示位置を計算（％ベース）
      const col = position % 3;
      const row = Math.floor(position / 3);
      const popupX = `${20 + col * 30}%`;
      const popupY = `${25 + row * 22}%`;
      
      // パーティクル用座標
      const particleX = 100 + col * 120;
      const particleY = 150 + row * 100;

      setMoles((prev) => {
        const moleAtPosition = prev.find((m) => m.position === position);
        if (moleAtPosition) {
          const now = Date.now();
          const timeSinceLastHit = now - lastHitTimeRef.current;
          lastHitTimeRef.current = now;
          
          // コンボ判定
          let newCombo = 1;
          if (timeSinceLastHit < COMBO_TIMEOUT) {
            newCombo = combo + 1;
          }
          setCombo(newCombo);
          
          // コンボタイムアウトをリセット
          if (comboTimeoutRef.current) {
            clearTimeout(comboTimeoutRef.current);
          }
          comboTimeoutRef.current = window.setTimeout(() => {
            setCombo(0);
          }, COMBO_TIMEOUT);
          
          // スコア計算（コンボボーナス）
          const basePoints = 100;
          const comboMultiplier = Math.min(newCombo, 5); // 最大5倍
          const points = basePoints * comboMultiplier;
          setScore((s) => s + points);
          
          // ポイントポップアップ
          addPopup(`+${points}`, popupX, popupY, "default", "md");
          
          // コンボポップアップ（2コンボ以上）
          if (newCombo >= 2) {
            setTimeout(() => {
              addPopup(`${newCombo}x COMBO!`, "50%", "15%", "combo", "lg");
              playCombo();
            }, 100);
          }
          
          setHitPosition(position);
          setTimeout(() => setHitPosition(null), 200);
          playWhack();
          burst(particleX, particleY, 8);
          return prev.filter((m) => m.id !== moleAtPosition.id);
        }
        // ミス時はコンボリセット
        setCombo(0);
        playMiss();
        return prev;
      });
    },
    [phase, playWhack, playMiss, playCombo, burst, combo, addPopup]
  );

  // ゲーム開始
  const startGame = useCallback(() => {
    setPhase("in_progress");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMoles([]);
    setCombo(0);
    setCurrentLevel(1);
    setNewHighScore(false);
    gameStartTimeRef.current = Date.now();
    lastHitTimeRef.current = 0;
    moleIdRef.current = 0;
    popupKeyRef.current = 0;
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
  }, []);

  // リセット
  const resetGame = useCallback(() => {
    setPhase("before");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMoles([]);
    setCombo(0);
    setCurrentLevel(1);
    setNewHighScore(false);
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
        confetti();
        playEnd();
        
        // ハイスコア判定
        setScore((currentScore) => {
          if (currentScore > highScore) {
            setHighScore(currentScore);
            setNewHighScore(true);
            localStorage.setItem("molemania-highscore", String(currentScore));
            setTimeout(() => {
              addPopup("🎉 NEW HIGH SCORE!", "50%", "35%", "critical", "xl");
            }, 500);
          }
          return currentScore;
        });
      }
    }, 100);

    return () => clearInterval(timer);
  }, [phase, confetti, playEnd, highScore, addPopup]);

  // レベルアップ判定
  useEffect(() => {
    if (phase !== "in_progress") return;
    
    const elapsed = Date.now() - gameStartTimeRef.current;
    const progress = elapsed / GAME_DURATION;
    // 10秒ごとにレベルアップ（レベル1→2→3）
    const newLevel = Math.min(3, Math.floor(progress * 3) + 1);
    
    if (newLevel > currentLevel) {
      setCurrentLevel(newLevel);
      addPopup(`⚡ LEVEL ${newLevel}!`, "50%", "50%", "level", "lg");
      playLevelUp();
    }
  }, [timeLeft, phase, currentLevel, addPopup, playLevelUp]);

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
          <div className="molemania-combo">{combo >= 2 && `${combo}x`}</div>
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
              {newHighScore && (
                <p className="molemania-highscore-notice">🎉 新記録達成！</p>
              )}
              <p className="molemania-highscore">
                ハイスコア: {Math.max(score, highScore)}
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
        
        {/* スコアポップアップ */}
        {popups.map((popup) => (
          <ScorePopup
            key={popup.key}
            text={popup.text}
            popupKey={popup.key}
            x={popup.x}
            y={popup.y}
            variant={popup.variant}
            size={popup.size}
          />
        ))}
        
        <ParticleLayer particles={particles} />
      </div>
    </GameShell>
  );
}
