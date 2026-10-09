import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  ScreenShake,
  ShareButton,
  GameRecommendations,
} from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 600;
const GAME_TIME = 60; // 秒
const RARE_SCORE_THRESHOLD = 100; // このスコア以上でレア魚判定

// 魚の種類
interface FishType {
  name: string;
  emoji: string;
  score: number;
  rarity: number; // 0-1 (低いほどレア)
  targetWidth: number; // タイミングバーの幅 (%)
  speed: number; // インジケーター速度
}

const FISH_TYPES: FishType[] = [
  { name: "イワシ", emoji: "🐟", score: 10, rarity: 0.4, targetWidth: 40, speed: 2 },
  { name: "アジ", emoji: "🐟", score: 20, rarity: 0.25, targetWidth: 35, speed: 2.5 },
  { name: "サバ", emoji: "🐟", score: 30, rarity: 0.15, targetWidth: 30, speed: 3 },
  { name: "タイ", emoji: "🐠", score: 50, rarity: 0.1, targetWidth: 25, speed: 3.5 },
  { name: "マグロ", emoji: "🐟", score: 100, rarity: 0.05, targetWidth: 20, speed: 4 },
  { name: "サメ", emoji: "🦈", score: 200, rarity: 0.03, targetWidth: 15, speed: 5 },
  { name: "クジラ", emoji: "🐋", score: 500, rarity: 0.02, targetWidth: 10, speed: 6 },
];

type GamePhase = "before" | "waiting" | "bite" | "reeling" | "after";

interface CatchPopup {
  fish: FishType;
  timestamp: number;
}

interface ScorePopupInfo {
  text: string;
  variant: PopupVariant;
  key: number;
}

// トレイル用パーティクル
interface TrailParticle {
  id: number;
  x: number;
  y: number;
  alpha: number;
  size: number;
}

interface GameState {
  phase: GamePhase;
  score: number;
  timeLeft: number;
  currentFish: FishType | null;
  indicatorPos: number; // 0-100
  indicatorDirection: number; // 1 or -1
  targetStart: number; // 0-100
  biteTimer: number;
  catchCount: number;
  missCount: number;
  isCasting: boolean; // キャスト中フラグ
  castProgress: number; // キャストアニメーション進行度 0-1
}

function selectRandomFish(): FishType {
  const rand = Math.random();
  let cumulative = 0;
  for (const fish of FISH_TYPES) {
    cumulative += fish.rarity;
    if (rand <= cumulative) {
      return fish;
    }
  }
  return FISH_TYPES[0];
}

function createInitialState(): GameState {
  return {
    phase: "before",
    score: 0,
    timeLeft: GAME_TIME,
    currentFish: null,
    indicatorPos: 0,
    indicatorDirection: 1,
    targetStart: 30,
    biteTimer: 0,
    catchCount: 0,
    missCount: 0,
    isCasting: false,
    castProgress: 0,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const trailParticlesRef = useRef<TrailParticle[]>([]);
  const trailIdRef = useRef(0);

  const [, setTick] = useState(0);
  const [catchPopup, setCatchPopup] = useState<CatchPopup | null>(null);
  const [scorePopup, setScorePopup] = useState<ScorePopupInfo | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [showResult, setShowResult] = useState(false);
  // リザルト画面用のスナップショット
  const [resultData, setResultData] = useState<{ score: number; catchCount: number; missCount: number } | null>(null);

  // 共有フック
  const { particles, sparkle, confetti, burst } = useParticles();
  const {
    playTone,
    playSweep,
    playSuccess,
    playMiss,
    playCelebrate,
    playGameOver,
    playBonus,
  } = useAudio();

  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  // 効果音: キャスト
  const playCastSound = useCallback(() => {
    playSweep(400, 800, 0.3, "sine", 0.2);
  }, [playSweep]);

  // 効果音: バイト（魚がかかった）
  const playBiteSound = useCallback(() => {
    playTone(880, 0.1, "square", 0.3);
    playTone(1100, 0.15, "square", 0.25, 0.1);
  }, [playTone]);

  // 効果音: キャッチ
  const playCatchSound = useCallback((isRare: boolean) => {
    if (isRare) {
      playCelebrate();
      playBonus();
    } else {
      playSuccess();
    }
  }, [playSuccess, playCelebrate, playBonus]);

  // 効果音: エスケープ（逃げた）
  const playEscapeSound = useCallback(() => {
    playMiss();
  }, [playMiss]);

  // ゲーム開始
  const startGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    gameStateRef.current.phase = "waiting";
    gameStateRef.current.isCasting = true;
    gameStateRef.current.castProgress = 0;
    gameStateRef.current.biteTimer = 1000 + Math.random() * 3000;
    lastTimeRef.current = performance.now();
    setShowResult(false);
    playCastSound();
    forceUpdate();
  }, [forceUpdate, playCastSound]);

  // リセット
  const resetGame = useCallback(() => {
    gameStateRef.current = createInitialState();
    setCatchPopup(null);
    setScorePopup(null);
    setShowResult(false);
    setResultData(null);
    forceUpdate();
  }, [forceUpdate]);

  // クリック処理
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;

    if (state.phase === "before") {
      startGame();
      return;
    }

    if (state.phase === "after") {
      resetGame();
      return;
    }

    if (state.phase === "bite") {
      // 魚がかかった！リーリング開始
      const fish = selectRandomFish();
      state.currentFish = fish;
      state.indicatorPos = 0;
      state.indicatorDirection = 1;
      state.targetStart = 30 + Math.random() * (70 - fish.targetWidth - 30);
      state.phase = "reeling";
      playBiteSound();
      forceUpdate();
      return;
    }

    if (state.phase === "reeling" && state.currentFish) {
      // タイミングチェック
      const fish = state.currentFish;
      const targetEnd = state.targetStart + fish.targetWidth;

      if (state.indicatorPos >= state.targetStart && state.indicatorPos <= targetEnd) {
        // 成功！
        state.score += fish.score;
        state.catchCount += 1;
        setCatchPopup({ fish, timestamp: Date.now() });

        const isRare = fish.score >= RARE_SCORE_THRESHOLD;

        // エフェクト発動
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT * 0.4;
        sparkle(centerX, centerY, 12);

        if (isRare) {
          // レア魚演出
          confetti(60);
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 150);
          burst(centerX, centerY, 20);
          setScorePopup({
            text: `🎉 +${fish.score}pt 🎉`,
            variant: "critical",
            key: Date.now(),
          });
        } else {
          setScorePopup({
            text: `+${fish.score}pt`,
            variant: "default",
            key: Date.now(),
          });
        }

        playCatchSound(isRare);
        setTimeout(() => {
          setCatchPopup(null);
          setScorePopup(null);
        }, 1500);
      } else {
        // 失敗
        state.missCount += 1;
        playEscapeSound();
        shakeRef.current?.shake("light", 200);
        setScorePopup({
          text: "逃げられた...",
          variant: "default",
          key: Date.now(),
        });
        setTimeout(() => setScorePopup(null), 1000);
      }

      // 次の待機状態へ（キャストアニメーション付き）
      state.currentFish = null;
      state.phase = "waiting";
      state.isCasting = true;
      state.castProgress = 0;
      state.biteTimer = 1000 + Math.random() * 3000;
      playCastSound();
      forceUpdate();
      return;
    }
  }, [startGame, resetGame, forceUpdate, sparkle, confetti, burst, playCastSound, playBiteSound, playCatchSound, playEscapeSound]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let prevPhase: GamePhase = gameStateRef.current.phase;

    const gameLoop = (currentTime: number) => {
      const state = gameStateRef.current;
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // 背景描画
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#87ceeb");
      gradient.addColorStop(0.3, "#4a90d9");
      gradient.addColorStop(1, "#1e3a5f");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 水面ライン
      const waterLineY = CANVAS_HEIGHT * 0.35;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < CANVAS_WIDTH; x += 20) {
        const waveY = waterLineY + Math.sin((x + currentTime * 0.002) * 0.05) * 5;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();

      // 泳ぐ魚を描画（背景装飾）
      const fishTime = currentTime * 0.001;
      for (let i = 0; i < 5; i++) {
        const fishX = ((fishTime * 30 + i * 150) % (CANVAS_WIDTH + 100)) - 50;
        const fishY = waterLineY + 100 + i * 60 + Math.sin(fishTime + i) * 20;
        ctx.font = "24px sans-serif";
        ctx.fillText("🐟", fishX, fishY);
      }

      // 釣り竿描画
      const rodX = CANVAS_WIDTH * 0.7;
      const rodY = waterLineY - 80;
      ctx.strokeStyle = "#8b4513";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rodX + 80, rodY + 100);
      ctx.quadraticCurveTo(rodX + 40, rodY + 50, rodX, rodY);
      ctx.stroke();

      // キャストアニメーション更新
      if (state.isCasting) {
        state.castProgress += deltaTime / 500; // 500msでキャスト完了
        if (state.castProgress >= 1) {
          state.isCasting = false;
          state.castProgress = 1;
        }
      }

      // 釣り糸
      const bobberX = CANVAS_WIDTH * 0.45;
      const bobberBaseY = waterLineY + 30;

      // キャスト中は浮きの位置をアニメーション
      let actualBobberX = bobberX;
      let actualBobberY = bobberBaseY;

      if (state.isCasting && state.phase !== "before" && state.phase !== "after") {
        const progress = state.castProgress;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const startX = rodX;
        const startY = rodY;
        actualBobberX = startX + (bobberX - startX) * easeOut;
        actualBobberY = startY + (bobberBaseY - startY) * easeOut - Math.sin(progress * Math.PI) * 80;

        // トレイルパーティクル追加
        if (Math.random() < 0.4) {
          trailParticlesRef.current.push({
            id: trailIdRef.current++,
            x: actualBobberX,
            y: actualBobberY,
            alpha: 1,
            size: Math.random() * 4 + 2,
          });
        }
      } else if (state.phase === "bite") {
        actualBobberY = bobberBaseY + Math.sin(currentTime * 0.02) * 10;
      }

      // トレイルパーティクル更新と描画
      trailParticlesRef.current = trailParticlesRef.current.filter((p) => {
        p.alpha -= deltaTime / 400;
        if (p.alpha <= 0) return false;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fill();
        return true;
      });

      // 釣り糸描画
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rodX, rodY);
      ctx.quadraticCurveTo(CANVAS_WIDTH * 0.55, waterLineY - 20, actualBobberX, actualBobberY);
      ctx.stroke();

      // 浮き描画
      if (state.phase !== "before" && state.phase !== "after") {
        ctx.beginPath();
        ctx.arc(actualBobberX, actualBobberY, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#ff0000";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(actualBobberX, actualBobberY + 8, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(actualBobberX, actualBobberY + 4, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ゲーム中の更新
      if (state.phase !== "before" && state.phase !== "after") {
        // 時間更新
        state.timeLeft -= deltaTime / 1000;
        if (state.timeLeft <= 0) {
          state.timeLeft = 0;
          state.phase = "after";
          // タイムアップ演出 - 結果データをスナップショット
          setResultData({
            score: state.score,
            catchCount: state.catchCount,
            missCount: state.missCount,
          });
          setShowResult(true);
          playGameOver();
          if (state.catchCount > 0) {
            confetti(40);
          }
          forceUpdate();
        }
      }

      // フェーズ変化を検知
      if (prevPhase !== state.phase) {
        prevPhase = state.phase;
      }

      // 待機中 - 魚がかかるまでのタイマー
      if (state.phase === "waiting" && !state.isCasting) {
        state.biteTimer -= deltaTime;
        if (state.biteTimer <= 0) {
          state.phase = "bite";
          forceUpdate();
        }
      }

      // リーリング中 - インジケーター更新
      if (state.phase === "reeling" && state.currentFish) {
        state.indicatorPos += state.indicatorDirection * state.currentFish.speed;
        if (state.indicatorPos >= 100) {
          state.indicatorPos = 100;
          state.indicatorDirection = -1;
        } else if (state.indicatorPos <= 0) {
          state.indicatorPos = 0;
          state.indicatorDirection = 1;
        }
      }

      // UI描画
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "left";

      // スコア
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(15, 15, 140, 40);
      ctx.fillStyle = "#fff";
      ctx.fillText(`スコア: ${state.score}`, 25, 42);

      // 時間
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(CANVAS_WIDTH - 155, 15, 140, 40);
      ctx.fillStyle = state.timeLeft <= 10 ? "#ff6b6b" : "#fff";
      ctx.textAlign = "right";
      ctx.fillText(`残り: ${Math.ceil(state.timeLeft)}秒`, CANVAS_WIDTH - 25, 42);

      // 釣果カウント
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(15, 65, 180, 35);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`釣果: ${state.catchCount} 逃: ${state.missCount}`, 25, 88);

      // 状態メッセージ
      ctx.textAlign = "center";
      ctx.font = "bold 28px sans-serif";

      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 48px sans-serif";
        ctx.fillText("🎣 釣りゲーム 🎣", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        ctx.font = "24px sans-serif";
        ctx.fillText("制限時間内に魚を釣り上げよう！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#ffd700";
        ctx.fillText("クリックでスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
      }

      if (state.phase === "waiting" && !state.isCasting) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillText("待機中...", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 100);
      }

      if (state.phase === "bite") {
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText("🎣 HIT! クリック! 🎣", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 100);
      }

      // リーリングUI
      if (state.phase === "reeling" && state.currentFish) {
        const fish = state.currentFish;
        const barWidth = 300;
        const barHeight = 40;
        const barX = (CANVAS_WIDTH - barWidth) / 2;
        const barY = CANVAS_HEIGHT - 130;

        // 魚の名前表示
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(`${fish.emoji} ${fish.name} (${fish.score}pt)`, CANVAS_WIDTH / 2, barY - 20);

        // バー背景
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // ターゲットゾーン
        const targetX = barX + (state.targetStart / 100) * barWidth;
        const targetW = (fish.targetWidth / 100) * barWidth;
        ctx.fillStyle = "rgba(76, 175, 80, 0.7)";
        ctx.fillRect(targetX, barY, targetW, barHeight);

        // インジケーター
        const indicatorX = barX + (state.indicatorPos / 100) * barWidth;
        ctx.fillStyle = "#fff";
        ctx.fillRect(indicatorX - 4, barY, 8, barHeight);

        // 枠
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.font = "18px sans-serif";
        ctx.fillStyle = "#fff";
        ctx.fillText("緑のゾーンでクリック！", CANVAS_WIDTH / 2, barY + barHeight + 25);
      }

      // アフター画面はCanvasで描画せず、React側で制御
      if (state.phase === "after" && !showResult) {
        // showResultがtrueになるまで待つ（トランジション用）
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [forceUpdate, playGameOver, confetti, showResult]);

  return (
    <GameShell gameId="fishing" layout="default">
      <ScreenShake ref={shakeRef}>
        <div
          className="fishing-container"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onClick={handleClick}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="fishing-canvas"
          />

          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />

          {/* 画面フラッシュ（レア魚） */}
          {showFlash && <div className="fishing-flash" />}

          {/* キャッチポップアップ */}
          {catchPopup && (
            <div className="fishing-catch-popup" key={catchPopup.timestamp}>
              <h3>{catchPopup.fish.emoji} {catchPopup.fish.name}!</h3>
              <p>+{catchPopup.fish.score}pt</p>
            </div>
          )}

          {/* スコアポップアップ */}
          {scorePopup && (
            <ScorePopup
              text={scorePopup.text}
              popupKey={scorePopup.key}
              variant={scorePopup.variant}
              size="lg"
              y="35%"
            />
          )}

          {/* リザルト画面 */}
          {showResult && resultData && (
            <div className="fishing-result-overlay">
              <div className="fishing-result-content">
                <h2 className="fishing-result-title">⏰ タイムアップ! ⏰</h2>
                <div className="fishing-result-score">
                  <span className="fishing-result-label">スコア</span>
                  <span className="fishing-result-value">{resultData.score}</span>
                </div>
                <div className="fishing-result-stats">
                  <div className="fishing-result-stat">
                    <span className="stat-icon">🐟</span>
                    <span className="stat-value">{resultData.catchCount}</span>
                    <span className="stat-label">匹</span>
                  </div>
                  <div className="fishing-result-stat">
                    <span className="stat-icon">💨</span>
                    <span className="stat-value">{resultData.missCount}</span>
                    <span className="stat-label">逃</span>
                  </div>
                </div>
                <ShareButton score={resultData.score} gameTitle="Fishing" gameId="fishing" />
                <GameRecommendations currentGameId="fishing" />
                <p className="fishing-result-retry">クリックでリトライ</p>
              </div>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}