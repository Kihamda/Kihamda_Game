import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  ShareButton,
  GameRecommendations,
} from "@shared";

/** ゲームフェーズ */
type Phase = "before" | "in_progress" | "after";

/** ゲーム定数 */
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const PADDLE_MARGIN = 20;
const PADDLE_SPEED = 8;
const BALL_SIZE = 14;
const INITIAL_BALL_SPEED = 6;
const BALL_SPEED_INCREMENT = 0.3;
const MAX_BALL_SPEED = 14;
const WIN_SCORE = 7;

/** トレイル用の履歴数 */
const TRAIL_LENGTH = 8;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

interface Paddle {
  y: number;
}

interface ScorePopupData {
  text: string;
  key: number;
  x: string;
  side: "left" | "right";
}

/** ボールの初期状態 */
function createInitialBall(toRight: boolean): Ball {
  const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
  const dir = toRight ? 1 : -1;
  return {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: Math.cos(angle) * INITIAL_BALL_SPEED * dir,
    vy: Math.sin(angle) * INITIAL_BALL_SPEED,
    speed: INITIAL_BALL_SPEED,
  };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("before");
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [popup, setPopup] = useState<ScorePopupData | null>(null);
  const [flashEffect, setFlashEffect] = useState<string | null>(null);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [showSpeedUp, setShowSpeedUp] = useState(false);

  // 描画用状態
  const [ball, setBall] = useState<Ball>(createInitialBall(true));
  const [paddle1, setPaddle1] = useState<Paddle>({
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  });
  const [paddle2, setPaddle2] = useState<Paddle>({
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  });

  // キー状態
  const keysRef = useRef<Set<string>>(new Set());

  // refs for game loop
  const ballRef = useRef(ball);
  const paddle1Ref = useRef(paddle1);
  const paddle2Ref = useRef(paddle2);
  const score1Ref = useRef(score1);
  const score2Ref = useRef(score2);
  const phaseRef = useRef(phase);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const popupKeyRef = useRef(0);

  // 共有フック
  const audio = useAudio();
  const { particles, burst, confetti, sparkle, explosion } = useParticles();

  // Sync refs
  useEffect(() => {
    ballRef.current = ball;
  }, [ball]);
  useEffect(() => {
    paddle1Ref.current = paddle1;
  }, [paddle1]);
  useEffect(() => {
    paddle2Ref.current = paddle2;
  }, [paddle2]);
  useEffect(() => {
    score1Ref.current = score1;
  }, [score1]);
  useEffect(() => {
    score2Ref.current = score2;
  }, [score2]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // 画面フラッシュ
  const triggerFlash = useCallback((color: string) => {
    setFlashEffect(color);
    setTimeout(() => setFlashEffect(null), 100);
  }, []);

  // ヒット効果音
  const playHit = useCallback(() => {
    audio.playTone(660, 0.06, "square", 0.2);
  }, [audio]);

  // 壁バウンド音
  const playWallBounce = useCallback(() => {
    audio.playTone(440, 0.04, "sine", 0.15);
  }, [audio]);

  // 得点音
  const playScore = useCallback(() => {
    audio.playArpeggio([523, 659, 784], 0.12, "sine", 0.25, 0.06);
  }, [audio]);

  // 勝利音
  const playWin = useCallback(() => {
    audio.playCelebrate();
  }, [audio]);

  // スピードアップ演出
  const triggerSpeedUp = useCallback(() => {
    setShowSpeedUp(true);
    audio.playTone(880, 0.1, "sawtooth", 0.15);
    setTimeout(() => setShowSpeedUp(false), 500);
  }, [audio]);

  // ゲーム開始
  const startGame = useCallback(() => {
    setPhase("in_progress");
    setScore1(0);
    setScore2(0);
    setWinner(null);
    setBall(createInitialBall(Math.random() > 0.5));
    setPaddle1({ y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 });
    setPaddle2({ y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 });
    setTrail([]);
    trailRef.current = [];
  }, []);

  // リセット
  const resetGame = useCallback(() => {
    setPhase("before");
    setScore1(0);
    setScore2(0);
    setWinner(null);
    setBall(createInitialBall(true));
    setPaddle1({ y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 });
    setPaddle2({ y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 });
    setTrail([]);
    trailRef.current = [];
  }, []);

  // キー入力
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      // ゲーム開始
      if (phaseRef.current === "before" && e.key === " ") {
        startGame();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startGame]);

  // ゲームループ
  useEffect(() => {
    if (phase !== "in_progress") return;

    let animationId: number;
    let lastSpeedLevel = INITIAL_BALL_SPEED;

    const gameLoop = () => {
      const keys = keysRef.current;
      const currentBall = ballRef.current;
      const currentPaddle1 = paddle1Ref.current;
      const currentPaddle2 = paddle2Ref.current;

      // パドル移動
      let newPaddle1Y = currentPaddle1.y;
      let newPaddle2Y = currentPaddle2.y;

      // Player 1: W/S
      if (keys.has("w")) newPaddle1Y -= PADDLE_SPEED;
      if (keys.has("s")) newPaddle1Y += PADDLE_SPEED;
      // Player 2: ArrowUp/ArrowDown
      if (keys.has("arrowup")) newPaddle2Y -= PADDLE_SPEED;
      if (keys.has("arrowdown")) newPaddle2Y += PADDLE_SPEED;

      // パドル範囲制限
      newPaddle1Y = Math.max(
        0,
        Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newPaddle1Y)
      );
      newPaddle2Y = Math.max(
        0,
        Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newPaddle2Y)
      );

      setPaddle1({ y: newPaddle1Y });
      setPaddle2({ y: newPaddle2Y });

      // ボール移動
      let newBall = { ...currentBall };
      newBall.x += newBall.vx;
      newBall.y += newBall.vy;

      // トレイル更新
      trailRef.current = [
        { x: newBall.x, y: newBall.y },
        ...trailRef.current.slice(0, TRAIL_LENGTH - 1),
      ];
      setTrail([...trailRef.current]);

      // 上下壁バウンド
      if (newBall.y - BALL_SIZE / 2 <= 0) {
        newBall.y = BALL_SIZE / 2;
        newBall.vy = -newBall.vy;
        playWallBounce();
      }
      if (newBall.y + BALL_SIZE / 2 >= CANVAS_HEIGHT) {
        newBall.y = CANVAS_HEIGHT - BALL_SIZE / 2;
        newBall.vy = -newBall.vy;
        playWallBounce();
      }

      // パドル1との衝突
      const paddle1Left = PADDLE_MARGIN;
      const paddle1Right = PADDLE_MARGIN + PADDLE_WIDTH;
      if (
        newBall.x - BALL_SIZE / 2 <= paddle1Right &&
        newBall.x + BALL_SIZE / 2 >= paddle1Left &&
        newBall.y >= newPaddle1Y &&
        newBall.y <= newPaddle1Y + PADDLE_HEIGHT &&
        newBall.vx < 0
      ) {
        newBall.x = paddle1Right + BALL_SIZE / 2;
        const hitPos = (newBall.y - newPaddle1Y) / PADDLE_HEIGHT;
        const angle = (hitPos - 0.5) * 1.2;
        newBall.speed = Math.min(
          newBall.speed + BALL_SPEED_INCREMENT,
          MAX_BALL_SPEED
        );
        newBall.vx = Math.cos(angle) * newBall.speed;
        newBall.vy = Math.sin(angle) * newBall.speed;
        playHit();
        burst(paddle1Right + 20, newBall.y, 8);
        sparkle(paddle1Right + 20, newBall.y, 4);

        // スピードアップ演出
        if (Math.floor(newBall.speed) > Math.floor(lastSpeedLevel)) {
          lastSpeedLevel = newBall.speed;
          triggerSpeedUp();
        }
      }

      // パドル2との衝突
      const paddle2Left = CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;
      const paddle2Right = CANVAS_WIDTH - PADDLE_MARGIN;
      if (
        newBall.x + BALL_SIZE / 2 >= paddle2Left &&
        newBall.x - BALL_SIZE / 2 <= paddle2Right &&
        newBall.y >= newPaddle2Y &&
        newBall.y <= newPaddle2Y + PADDLE_HEIGHT &&
        newBall.vx > 0
      ) {
        newBall.x = paddle2Left - BALL_SIZE / 2;
        const hitPos = (newBall.y - newPaddle2Y) / PADDLE_HEIGHT;
        const angle = (hitPos - 0.5) * 1.2;
        newBall.speed = Math.min(
          newBall.speed + BALL_SPEED_INCREMENT,
          MAX_BALL_SPEED
        );
        newBall.vx = -Math.cos(angle) * newBall.speed;
        newBall.vy = Math.sin(angle) * newBall.speed;
        playHit();
        burst(paddle2Left - 20, newBall.y, 8);
        sparkle(paddle2Left - 20, newBall.y, 4);

        // スピードアップ演出
        if (Math.floor(newBall.speed) > Math.floor(lastSpeedLevel)) {
          lastSpeedLevel = newBall.speed;
          triggerSpeedUp();
        }
      }

      // 得点判定
      let scored = false;
      let scoringSide: "left" | "right" | null = null;

      if (newBall.x < 0) {
        // Player 2 得点
        const newScore = score2Ref.current + 1;
        setScore2(newScore);
        scored = true;
        scoringSide = "right";
        playScore();
        triggerFlash("#3b82f6");
        explosion(CANVAS_WIDTH * 0.75, CANVAS_HEIGHT / 2, 20);
        popupKeyRef.current += 1;
        setPopup({
          text: `+1`,
          key: popupKeyRef.current,
          x: "75%",
          side: "right",
        });

        if (newScore >= WIN_SCORE) {
          setWinner(2);
          setPhase("after");
          playWin();
          confetti(60);
          return;
        }
      }

      if (newBall.x > CANVAS_WIDTH) {
        // Player 1 得点
        const newScore = score1Ref.current + 1;
        setScore1(newScore);
        scored = true;
        scoringSide = "left";
        playScore();
        triggerFlash("#ef4444");
        explosion(CANVAS_WIDTH * 0.25, CANVAS_HEIGHT / 2, 20);
        popupKeyRef.current += 1;
        setPopup({
          text: `+1`,
          key: popupKeyRef.current,
          x: "25%",
          side: "left",
        });

        if (newScore >= WIN_SCORE) {
          setWinner(1);
          setPhase("after");
          playWin();
          confetti(60);
          return;
        }
      }

      if (scored && scoringSide) {
        // ボールリセット
        newBall = createInitialBall(scoringSide === "left");
        lastSpeedLevel = INITIAL_BALL_SPEED;
        trailRef.current = [];
        setTrail([]);
      }

      setBall(newBall);
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [
    phase,
    playHit,
    playWallBounce,
    playScore,
    playWin,
    burst,
    sparkle,
    explosion,
    confetti,
    triggerFlash,
    triggerSpeedUp,
  ]);

  // ポップアップクリア
  useEffect(() => {
    if (popup) {
      const timer = setTimeout(() => setPopup(null), 800);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  return (
    <GameShell gameId="pong" layout="default">
      <div className="pong-root">
        {/* 画面フラッシュ */}
        {flashEffect && (
          <div
            className="pong-flash"
            style={{ backgroundColor: flashEffect }}
          />
        )}

        {/* パーティクル */}
        <ParticleLayer particles={particles} />

        {/* スピードアップ演出 */}
        {showSpeedUp && <div className="pong-speedup">SPEED UP!</div>}

        {/* スコアポップアップ */}
        {popup && (
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            x={popup.x}
            y="30%"
            variant={popup.side === "left" ? "combo" : "bonus"}
            size="lg"
          />
        )}

        {/* スコア表示 */}
        <div className="pong-scoreboard">
          <span className="pong-score pong-score--p1">{score1}</span>
          <span className="pong-separator">-</span>
          <span className="pong-score pong-score--p2">{score2}</span>
        </div>

        {/* ゲームキャンバス */}
        <div
          className="pong-canvas"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
          {/* センターライン */}
          <div className="pong-center-line" />

          {/* トレイル */}
          {trail.map((pos, i) => (
            <div
              key={i}
              className="pong-trail"
              style={{
                left: pos.x - BALL_SIZE / 2,
                top: pos.y - BALL_SIZE / 2,
                width: BALL_SIZE,
                height: BALL_SIZE,
                opacity: ((TRAIL_LENGTH - i) / TRAIL_LENGTH) * 0.5,
                transform: `scale(${(TRAIL_LENGTH - i) / TRAIL_LENGTH})`,
              }}
            />
          ))}

          {/* パドル1 */}
          <div
            className="pong-paddle pong-paddle--p1"
            style={{
              left: PADDLE_MARGIN,
              top: paddle1.y,
              width: PADDLE_WIDTH,
              height: PADDLE_HEIGHT,
            }}
          />

          {/* パドル2 */}
          <div
            className="pong-paddle pong-paddle--p2"
            style={{
              left: CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH,
              top: paddle2.y,
              width: PADDLE_WIDTH,
              height: PADDLE_HEIGHT,
            }}
          />

          {/* ボール */}
          <div
            className="pong-ball"
            style={{
              left: ball.x - BALL_SIZE / 2,
              top: ball.y - BALL_SIZE / 2,
              width: BALL_SIZE,
              height: BALL_SIZE,
            }}
          />
        </div>

        {/* フェーズ別UI */}
        {phase === "before" && (
          <div className="pong-overlay">
            <div className="pong-menu">
              <h1 className="pong-title">🏓 PONG</h1>
              <p className="pong-instructions">
                Player 1: <kbd>W</kbd> / <kbd>S</kbd>
                <br />
                Player 2: <kbd>↑</kbd> / <kbd>↓</kbd>
              </p>
              <p className="pong-win-condition">
                先に {WIN_SCORE} 点取った方の勝ち！
              </p>
              <button type="button" className="pong-btn" onClick={startGame}>
                ゲームスタート
              </button>
              <p className="pong-hint">またはスペースキーで開始</p>
            </div>
          </div>
        )}

        {phase === "after" && winner && (
          <div className="pong-overlay">
            <div className="pong-menu pong-menu--winner">
              <h2 className="pong-winner-text">
                🎉 Player {winner} の勝利！
              </h2>
              <p className="pong-final-score">
                {score1} - {score2}
              </p>
              <button type="button" className="pong-btn" onClick={resetGame}>
                もう一度プレイ
              </button>
              <ShareButton score={Math.max(score1, score2)} gameTitle="Pong" gameId="pong" />
              <GameRecommendations currentGameId="pong" />
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
