import { useRef, useEffect, useState, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { useAudio, useParticles, useHighScore, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import { ParticleLayer } from "@shared";
import "./App.css";

// ゲーム定数
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 600;

const BALL_RADIUS = 12;
const GRAVITY_STRENGTH = 0.3;
const MAX_VELOCITY = 8;
const FRICTION = 0.98;
const GOAL_RADIUS = 25;

// スコア関連定数
const STAGE_CLEAR_BONUS = 1000;
const TIME_BONUS_MULTIPLIER = 50;
const PERFECT_STAGE_THRESHOLD = 3; // 3秒以内でクリア
const PERFECT_BONUS = 500;
const SCORE_MILESTONES = [1000, 2500, 5000, 10000, 20000];

type GamePhase = "start" | "playing" | "cleared" | "gameover";

interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  x?: string;
  y?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

interface Vector {
  x: number;
  y: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "wall" | "spike";
}

interface Stage {
  ball: Vector;
  goal: Vector;
  obstacles: Obstacle[];
}

// ステージデータ
const STAGES: Stage[] = [
  // Stage 1: 簡単な導入
  {
    ball: { x: 80, y: 100 },
    goal: { x: 420, y: 500 },
    obstacles: [
      { x: 150, y: 250, width: 200, height: 20, type: "wall" },
    ],
  },
  // Stage 2: 障害物を避ける
  {
    ball: { x: 250, y: 80 },
    goal: { x: 250, y: 520 },
    obstacles: [
      { x: 0, y: 200, width: 200, height: 20, type: "wall" },
      { x: 300, y: 200, width: 200, height: 20, type: "wall" },
      { x: 100, y: 350, width: 300, height: 20, type: "wall" },
    ],
  },
  // Stage 3: スパイク登場
  {
    ball: { x: 60, y: 540 },
    goal: { x: 440, y: 540 },
    obstacles: [
      { x: 150, y: 400, width: 200, height: 20, type: "wall" },
      { x: 200, y: 500, width: 100, height: 20, type: "spike" },
    ],
  },
  // Stage 4: 迷路風
  {
    ball: { x: 60, y: 60 },
    goal: { x: 440, y: 540 },
    obstacles: [
      { x: 100, y: 0, width: 20, height: 180, type: "wall" },
      { x: 100, y: 180, width: 300, height: 20, type: "wall" },
      { x: 380, y: 180, width: 20, height: 200, type: "wall" },
      { x: 100, y: 380, width: 300, height: 20, type: "wall" },
      { x: 100, y: 380, width: 20, height: 220, type: "wall" },
      { x: 200, y: 280, width: 80, height: 20, type: "spike" },
    ],
  },
  // Stage 5: 最終ステージ
  {
    ball: { x: 250, y: 50 },
    goal: { x: 250, y: 550 },
    obstacles: [
      { x: 0, y: 120, width: 180, height: 20, type: "wall" },
      { x: 320, y: 120, width: 180, height: 20, type: "wall" },
      { x: 200, y: 200, width: 100, height: 20, type: "spike" },
      { x: 100, y: 300, width: 300, height: 20, type: "wall" },
      { x: 0, y: 400, width: 150, height: 20, type: "wall" },
      { x: 350, y: 400, width: 150, height: 20, type: "wall" },
      { x: 180, y: 480, width: 140, height: 20, type: "spike" },
    ],
  },
];

interface GameState {
  phase: GamePhase;
  stageIndex: number;
  ballPos: Vector;
  ballVel: Vector;
  gravity: Vector;
  score: number;
  stageStartTime: number;
  lastMilestoneIndex: number;
  perfectStages: number;
}

function createInitialState(stageIndex: number = 0): GameState {
  const stage = STAGES[stageIndex];
  return {
    phase: "start",
    stageIndex,
    ballPos: { ...stage.ball },
    ballVel: { x: 0, y: 0 },
    gravity: { x: 0, y: GRAVITY_STRENGTH },
    score: 0,
    stageStartTime: 0,
    lastMilestoneIndex: -1,
    perfectStages: 0,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(createInitialState());
  const animationFrameRef = useRef<number>(0);
  const mousePositionRef = useRef<Vector | null>(null);

  const [, setTick] = useState(0);
  
  // Popup state
  const [popup, setPopup] = useState<PopupState>({ text: null, key: 0, variant: "default" });
  const popupQueueRef = useRef<PopupState[]>([]);
  
  // High score
  const { best: highScore, update: updateHighScore } = useHighScore("gravityball");
  
  // Dopamine hooks
  const { particles, sparkle, confetti, explosion } = useParticles();
  const { playTone } = useAudio();
  
  // Refs for effects used in game loop
  const sparkleRef = useRef<(x: number, y: number) => void>(() => {});
  const confettiRef = useRef<() => void>(() => {});
  const explosionRef = useRef<(x: number, y: number) => void>(() => {});
  const playGoalRef = useRef<() => void>(() => {});
  const playDeathRef = useRef<() => void>(() => {});
  const playClearRef = useRef<() => void>(() => {});
  const playMilestoneRef = useRef<() => void>(() => {});
  
  // Popup display helper
  const showPopup = useCallback((text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md", x = "50%", y = "40%") => {
    const newPopup = { text, key: Date.now(), variant, size, x, y };
    popupQueueRef.current.push(newPopup);
    
    // Process queue if not currently showing
    if (!popup.text) {
      const next = popupQueueRef.current.shift();
      if (next) setPopup(next);
    }
  }, [popup.text]);
  
  // Clear popup and show next in queue
  useEffect(() => {
    if (!popup.text) return;
    const timer = setTimeout(() => {
      const next = popupQueueRef.current.shift();
      setPopup(next ?? { text: null, key: 0, variant: "default" });
    }, 1200);
    return () => clearTimeout(timer);
  }, [popup.key, popup.text]);
  
  useEffect(() => {
    sparkleRef.current = sparkle;
    confettiRef.current = confetti;
    explosionRef.current = explosion;
    playGoalRef.current = () => playTone(660, 0.15, 'sine');
    playDeathRef.current = () => playTone(180, 0.3, 'sawtooth');
    playClearRef.current = () => playTone(880, 0.3, 'sine');
    playMilestoneRef.current = () => playTone(740, 0.2, 'triangle');
  }, [sparkle, confetti, explosion, playTone]);

  // マウス/タッチによる重力変更
  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const relX = (clientX - rect.left) * scaleX;
    const relY = (clientY - rect.top) * scaleY;

    mousePositionRef.current = { x: relX, y: relY };

    // ポインタ位置から重力方向を計算（画面中心からの方向）
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const dx = relX - centerX;
    const dy = relY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 10) {
      gameStateRef.current.gravity = {
        x: (dx / dist) * GRAVITY_STRENGTH,
        y: (dy / dist) * GRAVITY_STRENGTH,
      };
    }
  }, []);

  // デバイス傾きによる重力変更
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // 左右傾き (-90 to 90)
      const beta = e.beta ?? 0;   // 前後傾き (-180 to 180)

      // 傾きを正規化して重力に変換
      const gx = Math.max(-1, Math.min(1, gamma / 45)) * GRAVITY_STRENGTH;
      const gy = Math.max(-1, Math.min(1, (beta - 45) / 45)) * GRAVITY_STRENGTH;

      gameStateRef.current.gravity = { x: gx, y: gy };
    };

    // デバイスオリエンテーションをリクエスト（iOS対応）
    if (typeof DeviceOrientationEvent !== "undefined" && 
        "requestPermission" in DeviceOrientationEvent) {
      // iOS 13+: ユーザーアクションで許可を求める
    } else {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  // ゲーム開始
  const startGame = useCallback(() => {
    gameStateRef.current.phase = "playing";
    gameStateRef.current.stageStartTime = Date.now();
    setTick((t) => t + 1);
  }, []);

  // ステージリセット
  const resetStage = useCallback(() => {
    const stage = STAGES[gameStateRef.current.stageIndex];
    gameStateRef.current.ballPos = { ...stage.ball };
    gameStateRef.current.ballVel = { x: 0, y: 0 };
    gameStateRef.current.phase = "playing";
    gameStateRef.current.stageStartTime = Date.now();
    setTick((t) => t + 1);
  }, []);

  // Calculate and add stage clear score
  const calculateStageScore = useCallback((stageIndex: number, clearTimeSeconds: number) => {
    const state = gameStateRef.current;
    let bonus = 0;
    const messages: { text: string; variant: PopupVariant; size: "sm" | "md" | "lg" | "xl" }[] = [];
    
    // Base stage clear bonus
    bonus += STAGE_CLEAR_BONUS;
    messages.push({ text: `Stage ${stageIndex + 1} Clear! +${STAGE_CLEAR_BONUS}`, variant: "level", size: "lg" });
    
    // Time bonus (faster = more points)
    const timeBonus = Math.max(0, Math.floor((30 - clearTimeSeconds) * TIME_BONUS_MULTIPLIER));
    if (timeBonus > 0) {
      bonus += timeBonus;
      messages.push({ text: `⏱️ Time Bonus +${timeBonus}`, variant: "bonus", size: "md" });
    }
    
    // Perfect clear bonus (under threshold seconds)
    if (clearTimeSeconds < PERFECT_STAGE_THRESHOLD) {
      bonus += PERFECT_BONUS;
      state.perfectStages++;
      messages.push({ text: `⚡ Perfect! +${PERFECT_BONUS}`, variant: "critical", size: "lg" });
    }
    
    // Apply bonus
    state.score += bonus;
    
    // Check for milestone
    const newMilestoneIndex = SCORE_MILESTONES.findIndex((m, i) => 
      i > state.lastMilestoneIndex && state.score >= m
    );
    if (newMilestoneIndex !== -1 && newMilestoneIndex > state.lastMilestoneIndex) {
      const milestone = SCORE_MILESTONES[newMilestoneIndex];
      state.lastMilestoneIndex = newMilestoneIndex;
      messages.push({ text: `🎯 ${milestone.toLocaleString()} Points!`, variant: "combo", size: "xl" });
      playMilestoneRef.current();
    }
    
    // Show popups sequentially
    messages.forEach((msg, i) => {
      setTimeout(() => {
        showPopup(msg.text, msg.variant, msg.size);
      }, i * 800);
    });
    
    return bonus;
  }, [showPopup]);

  // 次のステージへ
  const nextStage = useCallback(() => {
    const state = gameStateRef.current;
    const currentScore = state.score;
    const currentMilestone = state.lastMilestoneIndex;
    const currentPerfect = state.perfectStages;
    
    const nextIndex = state.stageIndex + 1;
    if (nextIndex < STAGES.length) {
      const stage = STAGES[nextIndex];
      gameStateRef.current = {
        ...createInitialState(nextIndex),
        score: currentScore,
        lastMilestoneIndex: currentMilestone,
        perfectStages: currentPerfect,
      };
      gameStateRef.current.ballPos = { ...stage.ball };
      gameStateRef.current.phase = "playing";
      gameStateRef.current.stageStartTime = Date.now();
    } else {
      gameStateRef.current.phase = "cleared";
      // Check for high score
      const isNew = updateHighScore(state.score);
      if (isNew) {
        setTimeout(() => {
          showPopup("🏆 NEW HIGH SCORE!", "critical", "xl");
        }, 1500);
      }
    }
    setTick((t) => t + 1);
  }, [showPopup, updateHighScore]);

  // リスタート
  const restartGame = useCallback(() => {
    gameStateRef.current = createInitialState(0);
    popupQueueRef.current = [];
    setPopup({ text: null, key: 0, variant: "default" });
    setTick((t) => t + 1);
  }, []);

  // 衝突判定：ボールと矩形
  const checkCollision = (
    ballX: number,
    ballY: number,
    obs: Obstacle
  ): { hit: boolean; normalX: number; normalY: number } => {
    const closestX = Math.max(obs.x, Math.min(ballX, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(ballY, obs.y + obs.height));

    const dx = ballX - closestX;
    const dy = ballY - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < BALL_RADIUS * BALL_RADIUS) {
      const dist = Math.sqrt(distSq) || 1;
      return { hit: true, normalX: dx / dist, normalY: dy / dist };
    }
    return { hit: false, normalX: 0, normalY: 0 };
  };

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      const stage = STAGES[state.stageIndex];

      // 描画クリア
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 背景
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 重力方向インジケーター
      const centerX = CANVAS_WIDTH / 2;
      const centerY = CANVAS_HEIGHT / 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + state.gravity.x * 150,
        centerY + state.gravity.y * 150
      );
      ctx.stroke();

      // 障害物描画
      for (const obs of stage.obstacles) {
        if (obs.type === "wall") {
          ctx.fillStyle = "#4a5568";
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeStyle = "#718096";
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        } else {
          // スパイク
          ctx.fillStyle = "#e53e3e";
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          // スパイク模様
          ctx.fillStyle = "#c53030";
          const spikeCount = Math.floor(obs.width / 20);
          for (let i = 0; i < spikeCount; i++) {
            ctx.beginPath();
            ctx.moveTo(obs.x + i * 20, obs.y);
            ctx.lineTo(obs.x + i * 20 + 10, obs.y - 8);
            ctx.lineTo(obs.x + i * 20 + 20, obs.y);
            ctx.fill();
          }
        }
      }

      // ゴール描画
      ctx.fillStyle = "#48bb78";
      ctx.beginPath();
      ctx.arc(stage.goal.x, stage.goal.y, GOAL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#276749";
      ctx.beginPath();
      ctx.arc(stage.goal.x, stage.goal.y, GOAL_RADIUS * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#48bb78";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GOAL", stage.goal.x, stage.goal.y);

      // ボール描画
      ctx.fillStyle = "#4299e1";
      ctx.beginPath();
      ctx.arc(state.ballPos.x, state.ballPos.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#63b3ed";
      ctx.beginPath();
      ctx.arc(
        state.ballPos.x - 3,
        state.ballPos.y - 3,
        BALL_RADIUS * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // ステージ情報
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Stage ${state.stageIndex + 1} / ${STAGES.length}`, 15, 15);
      
      // スコア表示
      ctx.textAlign = "right";
      ctx.fillText(`Score: ${state.score.toLocaleString()}`, CANVAS_WIDTH - 15, 15);
      
      // ハイスコア表示
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#a0aec0";
      ctx.fillText(`High: ${highScore.toLocaleString()}`, CANVAS_WIDTH - 15, 40);

      // プレイ中の更新
      if (state.phase === "playing") {
        // 重力適用
        state.ballVel.x += state.gravity.x;
        state.ballVel.y += state.gravity.y;

        // 摩擦
        state.ballVel.x *= FRICTION;
        state.ballVel.y *= FRICTION;

        // 速度制限
        const speed = Math.sqrt(
          state.ballVel.x * state.ballVel.x + state.ballVel.y * state.ballVel.y
        );
        if (speed > MAX_VELOCITY) {
          state.ballVel.x = (state.ballVel.x / speed) * MAX_VELOCITY;
          state.ballVel.y = (state.ballVel.y / speed) * MAX_VELOCITY;
        }

        // 位置更新
        state.ballPos.x += state.ballVel.x;
        state.ballPos.y += state.ballVel.y;

        // 壁との衝突
        if (state.ballPos.x - BALL_RADIUS < 0) {
          state.ballPos.x = BALL_RADIUS;
          state.ballVel.x = -state.ballVel.x * 0.6;
        }
        if (state.ballPos.x + BALL_RADIUS > CANVAS_WIDTH) {
          state.ballPos.x = CANVAS_WIDTH - BALL_RADIUS;
          state.ballVel.x = -state.ballVel.x * 0.6;
        }
        if (state.ballPos.y - BALL_RADIUS < 0) {
          state.ballPos.y = BALL_RADIUS;
          state.ballVel.y = -state.ballVel.y * 0.6;
        }
        if (state.ballPos.y + BALL_RADIUS > CANVAS_HEIGHT) {
          state.ballPos.y = CANVAS_HEIGHT - BALL_RADIUS;
          state.ballVel.y = -state.ballVel.y * 0.6;
        }

        // 障害物との衝突
        for (const obs of stage.obstacles) {
          const collision = checkCollision(state.ballPos.x, state.ballPos.y, obs);
          if (collision.hit) {
            if (obs.type === "spike") {
              // スパイクに当たったらゲームオーバー
              state.phase = "gameover";
              playDeathRef.current();
              explosionRef.current(state.ballPos.x, state.ballPos.y);
              setTick((t) => t + 1);
              break;
            } else {
              // 壁で反射
              state.ballPos.x += collision.normalX * 2;
              state.ballPos.y += collision.normalY * 2;

              // 反射計算
              const dot =
                state.ballVel.x * collision.normalX +
                state.ballVel.y * collision.normalY;
              state.ballVel.x = (state.ballVel.x - 2 * dot * collision.normalX) * 0.6;
              state.ballVel.y = (state.ballVel.y - 2 * dot * collision.normalY) * 0.6;
            }
          }
        }

        // ゴール判定 (circles overlap when distance < sum of radii)
        const dx = state.ballPos.x - stage.goal.x;
        const dy = state.ballPos.y - stage.goal.y;
        const distToGoal = Math.sqrt(dx * dx + dy * dy);
        if (distToGoal < GOAL_RADIUS + BALL_RADIUS) {
          // Calculate clear time and score
          const clearTimeSeconds = (Date.now() - state.stageStartTime) / 1000;
          calculateStageScore(state.stageIndex, clearTimeSeconds);
          
          if (state.stageIndex + 1 >= STAGES.length) {
            state.phase = "cleared";
            playClearRef.current();
            confettiRef.current();
            // Check for all clear achievements
            if (state.perfectStages >= STAGES.length) {
              setTimeout(() => {
                showPopup("🌟 ALL PERFECT!", "critical", "xl");
              }, 2000);
            }
          } else {
            // 次ステージへの遷移をスケジュール
            playGoalRef.current();
            sparkleRef.current(stage.goal.x, stage.goal.y);
            setTimeout(() => nextStage(), 1500);
            state.phase = "start"; // 一時停止
          }
          setTick((t) => t + 1);
        }
      }

      // スタート画面
      if (state.phase === "start") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`Stage ${state.stageIndex + 1}`, centerX, centerY - 50);
        ctx.font = "18px sans-serif";
        ctx.fillText("タップ/クリックでスタート", centerX, centerY + 10);
        ctx.fillText("マウス or 傾きで重力操作", centerX, centerY + 40);
      }

      // ゲームオーバー画面
      if (state.phase === "gameover") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#e53e3e";
        ctx.font = "bold 40px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", centerX, centerY - 50);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`Score: ${state.score.toLocaleString()}`, centerX, centerY);
        ctx.font = "20px sans-serif";
        ctx.fillText("タップでリトライ", centerX, centerY + 50);
      }

      // クリア画面
      if (state.phase === "cleared") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#48bb78";
        ctx.font = "bold 40px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🎉 ALL CLEAR! 🎉", centerX, centerY - 60);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(`Final Score: ${state.score.toLocaleString()}`, centerX, centerY);
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#a0aec0";
        ctx.fillText(`High Score: ${highScore.toLocaleString()}`, centerX, centerY + 35);
        ctx.fillStyle = "#fff";
        ctx.font = "20px sans-serif";
        ctx.fillText("タップで最初から", centerX, centerY + 80);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [calculateStageScore, highScore, nextStage, showPopup]);

  // クリックハンドラー
  const handleClick = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === "start") {
      startGame();
    } else if (state.phase === "gameover") {
      resetStage();
    } else if (state.phase === "cleared") {
      restartGame();
    }
  }, [startGame, resetStage, restartGame]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    },
    [handlePointerMove]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [handlePointerMove]
  );

  // iOS用の許可リクエスト
  const requestOrientationPermission = useCallback(async () => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      "requestPermission" in DeviceOrientationEvent
    ) {
      try {
        const permission = await (
          DeviceOrientationEvent as unknown as {
            requestPermission: () => Promise<string>;
          }
        ).requestPermission();
        if (permission === "granted") {
          window.addEventListener("deviceorientation", (e) => {
            const gamma = e.gamma ?? 0;
            const beta = e.beta ?? 0;
            const gx =
              Math.max(-1, Math.min(1, gamma / 45)) * GRAVITY_STRENGTH;
            const gy =
              Math.max(-1, Math.min(1, (beta - 45) / 45)) * GRAVITY_STRENGTH;
            gameStateRef.current.gravity = { x: gx, y: gy };
          });
        }
      } catch {
        // 許可されなかった
      }
    }
    handleClick();
  }, [handleClick]);

  return (
    <GameShell gameId="gravityball" layout="default">
      <div
        ref={containerRef}
        className="gravityball-container"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        onClick={requestOrientationPermission}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="gravityball-canvas"
        />
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size={popup.size}
          x={popup.x}
          y={popup.y}
        />
      </div>
    </GameShell>
  );
}
