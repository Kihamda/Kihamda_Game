import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { useAudio, GameShell, useHighScore } from "../../../src/shared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = [
  { name: "あか", hex: "#ef4444" },
  { name: "あお", hex: "#3b82f6" },
  { name: "みどり", hex: "#22c55e" },
  { name: "きいろ", hex: "#eab308" },
] as const;

type Color = (typeof COLORS)[number];

const BG_MAP: Record<string, string> = {
  "#ef4444": "linear-gradient(135deg, #2d0a0a 0%, #1a1a2e 100%)",
  "#3b82f6": "linear-gradient(135deg, #0a142d 0%, #1a1a2e 100%)",
  "#22c55e": "linear-gradient(135deg, #0a2d14 0%, #1a1a2e 100%)",
  "#eab308": "linear-gradient(135deg, #2d200a 0%, #1a1a2e 100%)",
};
const DEFAULT_BG = "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)";

type GameState = "start" | "playing" | "gameover";

interface Question {
  word: Color;
  displayColor: Color;
}

interface ScorePopupItem {
  id: number;
  text: string;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function getTimeLimit(questionCount: number): number {
  if (questionCount < 6) return 3000;
  if (questionCount < 11) return 2000;
  return 1500;
}

function generateQuestion(): Question {
  const wordIdx = Math.floor(Math.random() * COLORS.length);
  let colorIdx = Math.floor(Math.random() * COLORS.length);
  if (colorIdx === wordIdx) {
    colorIdx = (colorIdx + 1) % COLORS.length;
  }
  return { word: COLORS[wordIdx], displayColor: COLORS[colorIdx] };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [gameState, setGameState] = useState<GameState>("start");
  const [question, setQuestion] = useState<Question>(generateQuestion);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashColor, setFlashColor] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [popups, setPopups] = useState<ScorePopupItem[]>([]);
  const [bgColor, setBgColor] = useState(DEFAULT_BG);

  const { playArpeggio, playMiss, playFanfare } = useAudio();
  const { best: bestScore, update: updateBest } = useHighScore("colorburst");
  const scoreRef = useRef(0);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  const startTimeRef = useRef<number>(0);
  const timeLimitRef = useRef<number>(3000);
  const popupIdRef = useRef(0);
  const processingRef = useRef(false);

  /** 次の問題をセットしてタイマーをリセットする */
  const nextQuestion = useCallback((newQC: number): void => {
    const q = generateQuestion();
    setQuestion(q);
    setBgColor(BG_MAP[q.displayColor.hex] ?? DEFAULT_BG);
    timeLimitRef.current = getTimeLimit(newQC);
    startTimeRef.current = Date.now();
    setTimeLeft(1);
    processingRef.current = false;
  }, []);

  // ---------------------------------------------------------------------------
  // Timeout handler (定義は timer effect より先に必要)
  // ---------------------------------------------------------------------------
  const handleTimeout = useCallback((): void => {
    if (processingRef.current) return;
    processingRef.current = true;

    playMiss();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setCombo(0);

    const newMisses = misses + 1;
    setMisses(newMisses);

    if (newMisses >= 3) {
      updateBest(scoreRef.current);
      setGameState("gameover");
      return;
    }

    const newQC = questionCount + 1;
    setQuestionCount(newQC);
    nextQuestion(newQC);
  }, [misses, questionCount, playMiss, nextQuestion, updateBest]);

  // ---------------------------------------------------------------------------
  // Timer interval — question / handleTimeout 変化のたびにリセット
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (gameState !== "playing") return;

    const TICK = 40;
    const id = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = 1 - elapsed / timeLimitRef.current;
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(id);
        handleTimeout();
      } else {
        setTimeLeft(remaining);
      }
    }, TICK);

    return () => clearInterval(id);
  }, [gameState, question, handleTimeout]);

  // ---------------------------------------------------------------------------
  // Answer handler
  // ---------------------------------------------------------------------------
  const handleAnswer = useCallback(
    (color: Color): void => {
      if (gameState !== "playing" || processingRef.current) return;
      processingRef.current = true;

      const isCorrect = color.hex === question.displayColor.hex;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 1 - elapsed / timeLimitRef.current);

      if (isCorrect) {
        const timeBonus =
          Math.floor((remaining * timeLimitRef.current) / 1000) * 2;
        const gained = 10 + timeBonus;

        playArpeggio([440, 660], 0.2, "sine", 0.3, 0.12);
        setScore((s) => s + gained);

        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo % 5 === 0) {
          playFanfare();
          setShowStreak(true);
          setTimeout(() => setShowStreak(false), 1200);
        }

        setFlashColor(question.displayColor.hex);
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 300);

        const pid = ++popupIdRef.current;
        setPopups((p) => [...p, { id: pid, text: `+${gained} CORRECT!` }]);
        setTimeout(() => setPopups((p) => p.filter((x) => x.id !== pid)), 1000);
      } else {
        playMiss();
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setCombo(0);

        const newMisses = misses + 1;
        setMisses(newMisses);

        if (newMisses >= 3) {
          updateBest(scoreRef.current);
          setGameState("gameover");
          return;
        }
      }

      const newQC = questionCount + 1;
      setQuestionCount(newQC);
      nextQuestion(newQC);
    },
    [
      gameState,
      question,
      combo,
      misses,
      questionCount,
      playArpeggio,
      playMiss,
      playFanfare,
      nextQuestion,
      updateBest,
    ],
  );

  // ---------------------------------------------------------------------------
  // Start / Restart
  // ---------------------------------------------------------------------------
  const startGame = useCallback((): void => {
    setScore(0);
    setCombo(0);
    setMisses(0);
    setQuestionCount(0);
    setIsFlashing(false);
    setFlashColor("");
    setIsShaking(false);
    setShowStreak(false);
    setPopups([]);
    processingRef.current = false;

    const q = generateQuestion();
    setQuestion(q);
    setBgColor(BG_MAP[q.displayColor.hex] ?? DEFAULT_BG);
    timeLimitRef.current = getTimeLimit(0);
    startTimeRef.current = Date.now();
    setTimeLeft(1);
    setGameState("playing");
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <GameShell title="Color Burst">
      <div
        className={`app${isShaking ? " shake" : ""}`}
        style={{ background: bgColor } as React.CSSProperties}
      >
        {/* 正解フラッシュ */}
        {isFlashing && (
          <div
            className="flash-overlay"
            style={{ backgroundColor: flashColor }}
          />
        )}

        {/* コンボ STREAK 演出 */}
        {showStreak && <div className="streak-banner">STREAK!</div>}

        {/* スコアポップアップ */}
        {popups.map((p) => (
          <div key={p.id} className="score-popup">
            {p.text}
          </div>
        ))}

        {/* ============================================================
          START SCREEN
      ============================================================ */}
        {gameState === "start" && (
          <div className="screen start-screen">
            <h1 className="game-title">Color Burst</h1>
            <p className="game-desc">
              テキストが「表示されている色」のボタンを押せ
            </p>
            <p className="game-desc-sub">文字の意味に惑わされるな</p>
            <button className="btn-start" onClick={startGame}>
              START
            </button>
          </div>
        )}

        {/* ============================================================
          GAME SCREEN
      ============================================================ */}
        {gameState === "playing" && (
          <div className="screen game-screen">
            {/* HUD */}
            <div className="hud">
              <div className="hud-score">
                <span className="hud-label">SCORE</span>
                <span className="hud-value">{score}</span>
              </div>
              <div className="hud-combo">
                {combo >= 2 && <span className="combo-badge">x{combo}</span>}
              </div>
              <div className="hud-misses">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    className={`heart${i < misses ? " heart-broken" : ""}`}
                  >
                    {i < misses ? "💔" : "❤️"}
                  </span>
                ))}
              </div>
            </div>

            {/* タイムバー */}
            <div className="timebar-wrap">
              <div
                className={`timebar${timeLeft < 0.3 ? " timebar-danger" : ""}`}
                style={{
                  width: `${timeLeft * 100}%`,
                  backgroundColor: timeLeft < 0.3 ? "#ef4444" : "#22c55e",
                }}
              />
            </div>

            {/* ワード */}
            <div className="word-area">
              <span
                className="word-text"
                style={{ color: question.displayColor.hex }}
              >
                {question.word.name}
              </span>
            </div>

            {/* カラーボタン */}
            <div className="buttons-area">
              {COLORS.map((color) => (
                <button
                  key={color.hex}
                  className="color-btn"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleAnswer(color)}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
          GAMEOVER SCREEN
      ============================================================ */}
        {gameState === "gameover" && (
          <div className="screen gameover-screen">
            <h2 className="gameover-title">GAME OVER</h2>
            <p className="final-score">SCORE: {score}</p>
            <p
              className="game-hiscore"
              style={{ fontSize: 18, opacity: 0.7, margin: "4px 0 8px" }}
            >
              BEST: {bestScore}
            </p>
            <p className="final-questions">問題数: {questionCount}</p>
            <button className="btn-start" onClick={startGame}>
              もういちど
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
