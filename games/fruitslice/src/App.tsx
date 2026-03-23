import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles, ParticleLayer } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 700;
const GRAVITY = 0.3;
const SPAWN_INTERVAL = 1200; // ms
const GAME_DURATION = 60000; // 60秒
const BOMB_SPAWN_CHANCE = 0.15;
const MIN_SPAWN_INTERVAL = 600;
const COMBO_TIMEOUT = 500; // コンボ判定の時間窓 (ms)

// 果物の種類
const FRUITS = [
  { emoji: "🍎", name: "りんご", color: "#ff6b6b", special: false },
  { emoji: "🍊", name: "みかん", color: "#ffa94d", special: false },
  { emoji: "🍋", name: "レモン", color: "#ffd43b", special: false },
  { emoji: "🍇", name: "ぶどう", color: "#9775fa", special: false },
  { emoji: "🍉", name: "すいか", color: "#69db7c", special: true }, // スペシャル（大きい）
  { emoji: "🍓", name: "いちご", color: "#f06595", special: false },
  { emoji: "🍑", name: "もも", color: "#fcc2d7", special: false },
  { emoji: "🥝", name: "キウイ", color: "#8fbc8f", special: false },
  { emoji: "⭐", name: "スター", color: "#ffd700", special: true }, // スペシャルフルーツ
];

type GamePhase = "before" | "in_progress" | "after";

interface FlyingObject {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  color: string;
  isBomb: boolean;
  isSpecial: boolean;
  radius: number;
  sliced: boolean;
  rotation: number;
  rotationSpeed: number;
}

interface SliceTrail {
  points: { x: number; y: number; time: number }[];
}

interface SlicedHalf {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  isLeft: boolean;
}

// 果汁パーティクル
interface JuiceParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  opacity: number;
  life: number;
}

// スコアポップアップ
interface ScorePopupData {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  scale: number;
  life: number;
}

interface GameState {
  objects: FlyingObject[];
  slicedHalves: SlicedHalf[];
  juiceParticles: JuiceParticle[];
  scorePopups: ScorePopupData[];
  score: number;
  phase: GamePhase;
  startTime: number;
  timeLeft: number;
  comboCount: number;
  lastSliceTime: number;
}

let nextId = 0;

function createFlyingObject(): FlyingObject {
  const isBomb = Math.random() < BOMB_SPAWN_CHANCE;
  const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  
  // 画面下から放物線で飛ばす
  const startX = CANVAS_WIDTH * 0.2 + Math.random() * CANVAS_WIDTH * 0.6;
  const targetX = CANVAS_WIDTH * 0.2 + Math.random() * CANVAS_WIDTH * 0.6;
  
  // 放物線の計算: 頂点がCANVAS_HEIGHT * 0.2 ~ 0.4 になるように
  const peakY = CANVAS_HEIGHT * (0.15 + Math.random() * 0.25);
  const flightTime = 80 + Math.random() * 40; // フレーム数
  
  const vx = (targetX - startX) / flightTime;
  const vy = -Math.sqrt(2 * GRAVITY * (CANVAS_HEIGHT - peakY)) * (0.9 + Math.random() * 0.2);
  
  return {
    id: nextId++,
    x: startX,
    y: CANVAS_HEIGHT + 50,
    vx,
    vy,
    emoji: isBomb ? "💣" : fruit.emoji,
    color: isBomb ? "#333" : fruit.color,
    isBomb,
    isSpecial: !isBomb && fruit.special,
    radius: isBomb ? 35 : 40,
    sliced: false,
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.2,
  };
}

function createSlicedHalves(obj: FlyingObject): SlicedHalf[] {
  const baseVx = obj.vx;
  const baseVy = obj.vy;
  
  return [
    {
      id: nextId++,
      x: obj.x - 15,
      y: obj.y,
      vx: baseVx - 2,
      vy: baseVy - 2,
      emoji: obj.emoji,
      rotation: -0.3,
      rotationSpeed: -0.1,
      opacity: 1,
      isLeft: true,
    },
    {
      id: nextId++,
      x: obj.x + 15,
      y: obj.y,
      vx: baseVx + 2,
      vy: baseVy - 2,
      emoji: obj.emoji,
      rotation: 0.3,
      rotationSpeed: 0.1,
      opacity: 1,
      isLeft: false,
    },
  ];
}

// 果汁パーティクル生成
function createJuiceParticles(x: number, y: number, color: string, count = 12): JuiceParticle[] {
  const particles: JuiceParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 3 + Math.random() * 5;
    particles.push({
      id: nextId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      color,
      size: 3 + Math.random() * 4,
      opacity: 1,
      life: 1,
    });
  }
  return particles;
}

// スコアポップアップ生成
function createScorePopup(x: number, y: number, points: number, isCombo: boolean): ScorePopupData {
  return {
    id: nextId++,
    x,
    y,
    text: isCombo ? `+${points} COMBO!` : `+${points}`,
    color: isCombo ? "#ff6b6b" : "#ffd43b",
    opacity: 1,
    scale: isCombo ? 1.5 : 1,
    life: 1,
  };
}

function createInitialState(): GameState {
  return {
    objects: [],
    slicedHalves: [],
    juiceParticles: [],
    scorePopups: [],
    score: 0,
    phase: "before",
    startTime: 0,
    timeLeft: GAME_DURATION,
    comboCount: 0,
    lastSliceTime: 0,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const sliceTrailRef = useRef<SliceTrail>({ points: [] });
  const lastSpawnRef = useRef<number>(0);
  const isSlicingRef = useRef<boolean>(false);
  const gameEndConfettiRef = useRef<boolean>(false);

  const [, setTick] = useState(0);
  const [bombFlash, setBombFlash] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  // オーディオフック
  const { playTone, playCombo, playExplosion, playGameOver } = useAudio();

  // パーティクルフック
  const { particles, burst, explosion, confetti, sparkle } = useParticles();

  // スライス音
  const playSliceSound = useCallback(() => {
    playTone(800 + Math.random() * 400, 0.08, "sine", 0.2);
  }, [playTone]);

  // キャンバス座標を画面座標に変換
  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    const container = containerRef.current;
    if (!container) return { x: canvasX, y: canvasY };

    const rect = container.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;
    
    return {
      x: rect.left + canvasX * scaleX,
      y: rect.top + canvasY * scaleY,
    };
  }, []);

  // スライス判定
  const checkSlice = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const state = gameStateRef.current;
    if (state.phase !== "in_progress") return;

    const now = Date.now();

    for (const obj of state.objects) {
      if (obj.sliced) continue;

      // 線分と円の交差判定
      const dx = x2 - x1;
      const dy = y2 - y1;
      const fx = x1 - obj.x;
      const fy = y1 - obj.y;

      const a = dx * dx + dy * dy;
      const b = 2 * (fx * dx + fy * dy);
      const c = fx * fx + fy * fy - obj.radius * obj.radius;

      const discriminant = b * b - 4 * a * c;

      if (discriminant >= 0) {
        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);

        if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
          // スライス成功
          obj.sliced = true;

          // 画面座標に変換
          const screenPos = canvasToScreen(obj.x, obj.y);

          if (obj.isBomb) {
            // 爆弾を切ったらゲームオーバー
            state.phase = "after";
            
            // 爆弾エフェクト
            playExplosion();
            setBombFlash(true);
            setScreenShake(true);
            setTimeout(() => setBombFlash(false), 200);
            setTimeout(() => setScreenShake(false), 400);
            
            // 爆発パーティクル（キャンバス内）
            const bombParticles = createJuiceParticles(obj.x, obj.y, "#ff4444", 24);
            state.juiceParticles.push(...bombParticles);
            
            // 爆発エフェクト（shared ParticleLayer）
            explosion(screenPos.x, screenPos.y, 32);
            
            playGameOver();
            setTick((t) => t + 1);
          } else {
            // コンボ判定
            if (now - state.lastSliceTime < COMBO_TIMEOUT) {
              state.comboCount++;
            } else {
              state.comboCount = 1;
            }
            state.lastSliceTime = now;

            // スコア計算 (コンボボーナス)
            const baseScore = obj.isSpecial ? 25 : 10;
            const comboBonus = Math.min(state.comboCount - 1, 5) * 5;
            const points = baseScore + comboBonus;
            state.score += points;

            // スライスされた半分を追加
            const halves = createSlicedHalves(obj);
            state.slicedHalves.push(...halves);

            // 果汁パーティクル
            const particleCount = state.comboCount > 1 ? 16 : 10;
            const juiceParticles = createJuiceParticles(obj.x, obj.y, obj.color, particleCount);
            state.juiceParticles.push(...juiceParticles);

            // スコアポップアップ
            const isCombo = state.comboCount > 1;
            const popup = createScorePopup(obj.x, obj.y - 30, points, isCombo);
            state.scorePopups.push(popup);

            // パーティクルエフェクト（shared ParticleLayer）
            // 基本バーストエフェクト（果物の色で）
            burst(screenPos.x, screenPos.y, 8);

            // スペシャルフルーツにはキラキラエフェクト
            if (obj.isSpecial) {
              sparkle(screenPos.x, screenPos.y, 12);
            }

            // コンボスライス（3コンボ以上）で爆発エフェクト
            if (state.comboCount >= 3) {
              explosion(screenPos.x, screenPos.y, 16);
            }

            // 効果音
            if (state.comboCount > 1) {
              playCombo(state.comboCount);
            } else {
              playSliceSound();
            }
          }
        }
      }
    }
  }, [playSliceSound, playCombo, playExplosion, playGameOver, canvasToScreen, burst, explosion, sparkle]);

  // ポインタイベントの座標変換
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // ポインタ開始
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const state = gameStateRef.current;
    
    if (state.phase === "before") {
      state.phase = "in_progress";
      state.startTime = Date.now();
      gameEndConfettiRef.current = false; // リセット
      setTick((t) => t + 1);
      return;
    }
    
    if (state.phase === "after") {
      gameStateRef.current = createInitialState();
      gameEndConfettiRef.current = false; // リセット
      setTick((t) => t + 1);
      return;
    }

    isSlicingRef.current = true;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    sliceTrailRef.current.points = [{ x: coords.x, y: coords.y, time: Date.now() }];
  }, [getCanvasCoords]);

  // ポインタ移動
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isSlicingRef.current) return;
    if (gameStateRef.current.phase !== "in_progress") return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    const trail = sliceTrailRef.current;
    
    if (trail.points.length > 0) {
      const lastPoint = trail.points[trail.points.length - 1];
      checkSlice(lastPoint.x, lastPoint.y, coords.x, coords.y);
    }
    
    trail.points.push({ x: coords.x, y: coords.y, time: Date.now() });
    
    // 古いポイントを削除
    const now = Date.now();
    trail.points = trail.points.filter((p) => now - p.time < 100);
  }, [getCanvasCoords, checkSlice]);

  // ポインタ終了
  const handlePointerUp = useCallback(() => {
    isSlicingRef.current = false;
    sliceTrailRef.current.points = [];
  }, []);

  // ゲーム終了時の紙吹雪エフェクト（高スコア時）
  const triggerGameEndConfetti = useCallback((score: number, gameOverByBomb: boolean) => {
    if (gameEndConfettiRef.current) return;
    gameEndConfettiRef.current = true;
    
    // 爆弾で終了した場合はコンフェッティなし
    if (gameOverByBomb) return;
    
    // スコアが50以上で紙吹雪
    if (score >= 50) {
      confetti(40);
      // 高スコア（100以上）でさらに追加
      if (score >= 100) {
        setTimeout(() => confetti(30), 300);
      }
    }
  }, [confetti]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      const now = Date.now();

      // 描画クリア
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景グラデーション
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // ゲーム中の更新
      if (state.phase === "in_progress") {
        // 時間更新
        state.timeLeft = Math.max(0, GAME_DURATION - (now - state.startTime));
        if (state.timeLeft <= 0) {
          state.phase = "after";
          // タイムアップでゲーム終了 - 紙吹雪トリガー
          triggerGameEndConfetti(state.score, false);
          setTick((t) => t + 1);
        }

        // オブジェクト生成
        const elapsed = now - state.startTime;
        const currentInterval = Math.max(MIN_SPAWN_INTERVAL, SPAWN_INTERVAL - elapsed * 0.01);
        
        if (now - lastSpawnRef.current > currentInterval) {
          state.objects.push(createFlyingObject());
          // たまに2個同時に出す
          if (Math.random() < 0.3) {
            state.objects.push(createFlyingObject());
          }
          lastSpawnRef.current = now;
        }

        // オブジェクト更新
        for (const obj of state.objects) {
          obj.x += obj.vx;
          obj.y += obj.vy;
          obj.vy += GRAVITY;
          obj.rotation += obj.rotationSpeed;
        }

        // 画面外のオブジェクトを削除
        state.objects = state.objects.filter(
          (obj) => obj.y < CANVAS_HEIGHT + 100 && !obj.sliced
        );

        // スライスされた半分を更新
        for (const half of state.slicedHalves) {
          half.x += half.vx;
          half.y += half.vy;
          half.vy += GRAVITY;
          half.rotation += half.rotationSpeed;
          half.opacity -= 0.015;
        }

        // 消えた半分を削除
        state.slicedHalves = state.slicedHalves.filter((h) => h.opacity > 0);

        // 果汁パーティクル更新
        for (const p of state.juiceParticles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += GRAVITY * 0.5;
          p.life -= 0.03;
          p.opacity = p.life;
        }
        state.juiceParticles = state.juiceParticles.filter((p) => p.life > 0);

        // スコアポップアップ更新
        for (const popup of state.scorePopups) {
          popup.y -= 1.5;
          popup.life -= 0.025;
          popup.opacity = popup.life;
          popup.scale += 0.01;
        }
        state.scorePopups = state.scorePopups.filter((p) => p.life > 0);

        // コンボタイムアウトリセット
        if (now - state.lastSliceTime > COMBO_TIMEOUT && state.comboCount > 0) {
          state.comboCount = 0;
        }
      }

      // スライス軌跡の描画
      const trail = sliceTrailRef.current;
      if (trail.points.length > 1) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(trail.points[0].x, trail.points[0].y);
        for (let i = 1; i < trail.points.length; i++) {
          ctx.lineTo(trail.points[i].x, trail.points[i].y);
        }
        ctx.stroke();

        // グロー効果
        ctx.strokeStyle = "rgba(255, 200, 100, 0.5)";
        ctx.lineWidth = 8;
        ctx.stroke();
      }

      // オブジェクト描画
      for (const obj of state.objects) {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.rotation);
        ctx.font = `${obj.radius * 1.5}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(obj.emoji, 0, 0);
        ctx.restore();
      }

      // スライスされた半分を描画
      for (const half of state.slicedHalves) {
        ctx.save();
        ctx.globalAlpha = half.opacity;
        ctx.translate(half.x, half.y);
        ctx.rotate(half.rotation);
        
        // 半分だけ表示するためにクリッピング
        ctx.beginPath();
        if (half.isLeft) {
          ctx.rect(-50, -50, 50, 100);
        } else {
          ctx.rect(0, -50, 50, 100);
        }
        ctx.clip();
        
        ctx.font = "60px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(half.emoji, 0, 0);
        ctx.restore();
      }

      // 果汁パーティクル描画
      for (const p of state.juiceParticles) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // スコアポップアップ描画
      for (const popup of state.scorePopups) {
        ctx.save();
        ctx.globalAlpha = popup.opacity;
        ctx.font = `bold ${20 * popup.scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = popup.color;
        ctx.shadowColor = popup.color;
        ctx.shadowBlur = 12;
        ctx.fillText(popup.text, popup.x, popup.y);
        ctx.restore();
      }

      // コンボカウンター描画 (ゲーム中のみ)
      if (state.phase === "in_progress" && state.comboCount > 1) {
        ctx.save();
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff6b6b";
        ctx.shadowColor = "#ff6b6b";
        ctx.shadowBlur = 16;
        ctx.fillText(`${state.comboCount}x COMBO!`, CANVAS_WIDTH / 2, 80);
        ctx.restore();
      }

      // UI描画
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`🍎 ${state.score}`, 20, 40);

      if (state.phase === "in_progress") {
        ctx.textAlign = "right";
        const seconds = Math.ceil(state.timeLeft / 1000);
        ctx.fillText(`⏱️ ${seconds}s`, CANVAS_WIDTH - 20, 40);
      }

      // ゲーム開始前
      if (state.phase === "before") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🍉 Fruit Slice 🍓", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        
        ctx.font = "24px sans-serif";
        ctx.fillText("スワイプで果物をスライス！", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.fillText("💣 爆弾を切ったらゲームオーバー", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#ffd43b";
        ctx.fillText("タップでスタート", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
      }

      // ゲーム終了
      if (state.phase === "after") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        
        const gameOverByBomb = state.timeLeft > 0;
        if (gameOverByBomb) {
          ctx.fillText("💥 BOOM! 💥", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        } else {
          ctx.fillText("⏱️ TIME UP!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        }
        
        ctx.font = "32px sans-serif";
        ctx.fillText(`スコア: ${state.score} 🍎`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#ffd43b";
        ctx.fillText("タップでリトライ", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [triggerGameEndConfetti]);

  return (
    <GameShell gameId="fruitslice" layout="immersive">
      <div
        ref={containerRef}
        className={`fruitslice-container${screenShake ? " fruitslice-shake" : ""}`}
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="fruitslice-canvas"
        />
        {/* 爆弾フラッシュオーバーレイ */}
        {bombFlash && <div className="fruitslice-flash" />}
      </div>
      {/* パーティクルエフェクトレイヤー */}
      <ParticleLayer particles={particles} />
    </GameShell>
  );
}
