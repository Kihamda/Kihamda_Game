import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { GameShell, useAudio, useParticles, ParticleLayer } from "@shared";

/** ターゲットの種類 */
type TargetType = "normal" | "bonus" | "miss";

/** ターゲット */
interface Target {
  id: number;
  type: TargetType;
  x: number;
  y: number;
  size: number;
  spawnedAt: number;
}

/** スコアポップアップ */
interface ScorePopup {
  id: number;
  x: number;
  y: number;
  value: number;
  type: "plus" | "bonus" | "minus";
}

/** ゲーム統計 */
interface GameStats {
  hits: number;
  misses: number;
  bonusHits: number;
}

/** ゲームフェーズ */
type Phase = "idle" | "playing" | "finished";

/** ゲーム時間（秒） */
const GAME_DURATION = 30;

/** ターゲット生成間隔（ms） */
const SPAWN_INTERVAL = 800;

/** ターゲット寿命（ms） */
const TARGET_LIFETIME = 2000;

/** アリーナサイズ */
const ARENA_WIDTH = 600;
const ARENA_HEIGHT = 540; // 600 - header(60)

/** ターゲットサイズ範囲 */
const TARGET_SIZE_MIN = 40;
const TARGET_SIZE_MAX = 70;

/** スコア計算 */
const SCORE_NORMAL = 100;
const SCORE_BONUS = 300;
const PENALTY_MISS = -150;

/** localStorage キー */
const STORAGE_KEY = "taptap_highscore";

/** ハイスコア読み込み */
function loadHighScore(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}

/** ハイスコア保存 */
function saveHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // ignore
  }
}

/** ランダム整数生成 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** ターゲットタイプ決定 */
function decideTargetType(): TargetType {
  const rand = Math.random();
  if (rand < 0.15) return "bonus"; // 15%
  if (rand < 0.35) return "miss"; // 20%
  return "normal"; // 65%
}

/** 時間ボーナス計算（素早くタップするほど高得点） */
function calcTimeBonus(elapsed: number): number {
  // 0-500ms: 2倍, 500-1000ms: 1.5倍, 1000ms-: 1倍
  if (elapsed < 500) return 2;
  if (elapsed < 1000) return 1.5;
  return 1;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [targets, setTargets] = useState<Target[]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [stats, setStats] = useState<GameStats>({ hits: 0, misses: 0, bonusHits: 0 });
  const [highScore, setHighScore] = useState<number>(loadHighScore);

  const targetIdRef = useRef(0);
  const popupIdRef = useRef(0);
  const gameIntervalRef = useRef<number>(0);
  const spawnIntervalRef = useRef<number>(0);
  
  const { playTone } = useAudio();
  const { particles, sparkle, confetti, explosion } = useParticles();
  
  const playHit = useCallback(() => playTone(660, 0.08, 'sine'), [playTone]);
  const playBonus = useCallback(() => playTone(880, 0.15, 'sine'), [playTone]);
  const playMiss = useCallback(() => playTone(200, 0.1, 'sawtooth'), [playTone]);
  const playStart = useCallback(() => playTone(440, 0.1, 'triangle'), [playTone]);

  /** クリーンアップ */
  const cleanup = useCallback(() => {
    if (gameIntervalRef.current) {
      window.clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = 0;
    }
    if (spawnIntervalRef.current) {
      window.clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = 0;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  /** ターゲット生成 */
  const spawnTarget = useCallback(() => {
    const size = randomInt(TARGET_SIZE_MIN, TARGET_SIZE_MAX);
    const x = randomInt(10, ARENA_WIDTH - size - 10);
    const y = randomInt(10, ARENA_HEIGHT - size - 10);
    const type = decideTargetType();

    const newTarget: Target = {
      id: ++targetIdRef.current,
      type,
      x,
      y,
      size,
      spawnedAt: Date.now(),
    };

    setTargets((prev) => [...prev, newTarget]);

    // 寿命後に自動削除
    setTimeout(() => {
      setTargets((prev) => prev.filter((t) => t.id !== newTarget.id));
    }, TARGET_LIFETIME);
  }, []);

  /** ゲーム終了処理 */
  const finishGame = useCallback(() => {
    cleanup();
    setPhase("finished");
    setScore((currentScore) => {
      if (currentScore > highScore) {
        setHighScore(currentScore);
        saveHighScore(currentScore);
        confetti();
      }
      return currentScore;
    });
  }, [cleanup, highScore, confetti]);

  /** ゲーム開始 */
  const startGame = useCallback(() => {
    cleanup();
    setPhase("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setTargets([]);
    setPopups([]);
    setStats({ hits: 0, misses: 0, bonusHits: 0 });
    playStart();

    // タイマー
    gameIntervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // ターゲット生成
    spawnTarget(); // 初回即座に
    spawnIntervalRef.current = window.setInterval(spawnTarget, SPAWN_INTERVAL);
  }, [cleanup, spawnTarget, finishGame, playStart]);

  /** ターゲットタップ */
  const handleTargetClick = useCallback((target: Target) => {
    // ターゲット削除
    setTargets((prev) => prev.filter((t) => t.id !== target.id));

    const elapsed = Date.now() - target.spawnedAt;
    let points: number;
    let popupType: "plus" | "bonus" | "minus";

    if (target.type === "miss") {
      // ミスターゲット
      points = PENALTY_MISS;
      popupType = "minus";
      playMiss();
      explosion(target.x + target.size / 2, target.y + target.size / 2);
      setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
    } else if (target.type === "bonus") {
      // ボーナス
      const bonus = calcTimeBonus(elapsed);
      points = Math.round(SCORE_BONUS * bonus);
      popupType = "bonus";
      playBonus();
      sparkle(target.x + target.size / 2, target.y + target.size / 2);
      setStats((prev) => ({ ...prev, hits: prev.hits + 1, bonusHits: prev.bonusHits + 1 }));
    } else {
      // 通常
      const bonus = calcTimeBonus(elapsed);
      points = Math.round(SCORE_NORMAL * bonus);
      popupType = "plus";
      playHit();
      setStats((prev) => ({ ...prev, hits: prev.hits + 1 }));
    }

    setScore((prev) => Math.max(0, prev + points));

    // ポップアップ追加
    const popup: ScorePopup = {
      id: ++popupIdRef.current,
      x: target.x + target.size / 2,
      y: target.y,
      value: points,
      type: popupType,
    };
    setPopups((prev) => [...prev, popup]);

    // ポップアップ削除
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== popup.id));
    }, 600);
  }, [playHit, playBonus, playMiss, sparkle, explosion]);

  return (
    <GameShell gameId="taptap" layout="immersive">
      <ParticleLayer particles={particles} />
      <div className="taptap-root">
        {/* ヘッダー */}
        <div className="taptap-header">
          <div className="taptap-score">💰 {score}</div>
          <div className={`taptap-timer ${timeLeft <= 5 ? "taptap-timer--danger" : ""}`}>
            ⏱️ {timeLeft}s
          </div>
        </div>

        {/* アリーナ */}
        <div className="taptap-arena">
          {/* ターゲット */}
          {phase === "playing" &&
            targets.map((target) => (
              <button
                key={target.id}
                type="button"
                className={`taptap-target taptap-target--${target.type}`}
                style={{
                  left: target.x,
                  top: target.y,
                  width: target.size,
                  height: target.size,
                }}
                onClick={() => handleTargetClick(target)}
              >
                {target.type === "bonus" ? "★" : target.type === "miss" ? "✕" : "●"}
              </button>
            ))}

          {/* スコアポップアップ */}
          {popups.map((popup) => (
            <div
              key={popup.id}
              className={`taptap-popup taptap-popup--${popup.type}`}
              style={{ left: popup.x, top: popup.y }}
            >
              {popup.value > 0 ? `+${popup.value}` : popup.value}
            </div>
          ))}

          {/* スタート画面 */}
          {phase === "idle" && (
            <div className="taptap-overlay">
              <h1 className="taptap-title">👆 タップタップ</h1>
              <div className="taptap-panel">
                <p className="taptap-description">
                  画面に現れるターゲットを素早くタップ！
                  <br />
                  30秒で高スコアを目指そう！
                </p>
                <ul className="taptap-rules">
                  <li>
                    <span className="taptap-rule-icon taptap-rule-icon--green" />
                    緑ターゲット: +100点（素早いと2倍）
                  </li>
                  <li>
                    <span className="taptap-rule-icon taptap-rule-icon--gold" />
                    金ターゲット: +300点（ボーナス！）
                  </li>
                  <li>
                    <span className="taptap-rule-icon taptap-rule-icon--red" />
                    赤ターゲット: -150点（タップしない！）
                  </li>
                </ul>
                {highScore > 0 && (
                  <p className="taptap-highscore">🏆 ハイスコア: {highScore}</p>
                )}
                <button type="button" className="taptap-button" onClick={startGame}>
                  スタート
                </button>
              </div>
            </div>
          )}

          {/* 結果画面 */}
          {phase === "finished" && (
            <div className="taptap-overlay">
              <div className="taptap-panel">
                <p className="taptap-result-title">🎉 タイムアップ！</p>
                <p className="taptap-final-score">{score}</p>
                <div className="taptap-stats">
                  <div className="taptap-stat">
                    <span className="taptap-stat-value">{stats.hits}</span>
                    <span className="taptap-stat-label">ヒット</span>
                  </div>
                  <div className="taptap-stat">
                    <span className="taptap-stat-value">{stats.bonusHits}</span>
                    <span className="taptap-stat-label">ボーナス</span>
                  </div>
                  <div className="taptap-stat">
                    <span className="taptap-stat-value">{stats.misses}</span>
                    <span className="taptap-stat-label">ミス</span>
                  </div>
                </div>
                {score === highScore && score > 0 && (
                  <p className="taptap-newrecord">🏆 新記録！</p>
                )}
                {score !== highScore && highScore > 0 && (
                  <p className="taptap-highscore">ハイスコア: {highScore}</p>
                )}
                <button type="button" className="taptap-button" onClick={startGame}>
                  もう一度
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}