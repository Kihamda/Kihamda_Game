import { useState, useEffect, useRef, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import "./App.css";

/* ---- Types ---- */
type Color = "red" | "blue" | "green" | "yellow";
type Phase = "idle" | "showing" | "waiting" | "gameover";

/* ---- Constants ---- */
const COLORS: Color[] = ["red", "blue", "green", "yellow"];

const FREQUENCIES: Record<Color, number> = {
  red: 329.63, // E4
  blue: 261.63, // C4
  green: 392.0, // G4
  yellow: 523.25, // C5
};

/* ---- Audio Context ---- */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(color: Color, duration = 0.3): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = FREQUENCIES[color];
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

function playErrorSound(): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.value = 100;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.5);
}

/* ---- Component ---- */
export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [level, setLevel] = useState(0);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [message, setMessage] = useState("STARTを押してね");

  const timeoutRef = useRef<number[]>([]);

  // タイムアウトをクリア
  const clearAllTimeouts = useCallback(() => {
    timeoutRef.current.forEach((id) => clearTimeout(id));
    timeoutRef.current = [];
  }, []);

  // 新しいゲーム開始
  const startGame = useCallback(() => {
    clearAllTimeouts();
    const firstColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    setSequence([firstColor]);
    setLevel(1);
    setPlayerIndex(0);
    setPhase("showing");
    setMessage("見て覚えて...");
  }, [clearAllTimeouts]);

  // シーケンス表示
  useEffect(() => {
    if (phase !== "showing") return;

    const showSequence = () => {
      clearAllTimeouts();
      let delay = 500;

      sequence.forEach((color, idx) => {
        // 点灯
        const lightOn = window.setTimeout(() => {
          setActiveColor(color);
          playTone(color, 0.4);
        }, delay);
        timeoutRef.current.push(lightOn);

        // 消灯
        const lightOff = window.setTimeout(() => {
          setActiveColor(null);
        }, delay + 400);
        timeoutRef.current.push(lightOff);

        delay += 600;

        // 最後の音が終わったらプレイヤーのターン
        if (idx === sequence.length - 1) {
          const endShow = window.setTimeout(() => {
            setPhase("waiting");
            setMessage("あなたの番！");
          }, delay);
          timeoutRef.current.push(endShow);
        }
      });
    };

    showSequence();

    return () => clearAllTimeouts();
  }, [phase, sequence, clearAllTimeouts]);

  // プレイヤー入力
  const handleColorPress = useCallback(
    (color: Color) => {
      if (phase !== "waiting") return;

      // ボタン光らせる
      setActiveColor(color);
      playTone(color, 0.2);

      const lightOff = window.setTimeout(() => {
        setActiveColor(null);
      }, 200);
      timeoutRef.current.push(lightOff);

      const expected = sequence[playerIndex];

      if (color !== expected) {
        // ミス
        playErrorSound();
        setPhase("gameover");
        setMessage(`ゲームオーバー！スコア: ${level}`);
        return;
      }

      const nextIndex = playerIndex + 1;

      if (nextIndex >= sequence.length) {
        // ラウンドクリア
        const newLevel = level + 1;
        setLevel(newLevel);
        setMessage(`レベル ${newLevel}!`);

        const nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        const newSequence = [...sequence, nextColor];

        const showNext = window.setTimeout(() => {
          setSequence(newSequence);
          setPlayerIndex(0);
          setPhase("showing");
          setMessage("見て覚えて...");
        }, 1000);
        timeoutRef.current.push(showNext);
      } else {
        setPlayerIndex(nextIndex);
      }
    },
    [phase, sequence, playerIndex, level],
  );

  return (
    <GameShell gameId="simonecho" layout="default">
      <div className="simonecho-container">
        {/* ヘッダー */}
        <header className="simonecho-header">
          <h1 className="simonecho-title">Simon Echo</h1>
          <div className="simonecho-level">レベル: {level}</div>
        </header>

        {/* メッセージ */}
        <div className="simonecho-message">{message}</div>

        {/* ゲームボード */}
        <div className="simonecho-board">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`simonecho-btn simonecho-btn--${color}${
                activeColor === color ? " simonecho-btn--active" : ""
              }`}
              onClick={() => handleColorPress(color)}
              disabled={phase !== "waiting"}
              aria-label={color}
            />
          ))}

          {/* 中央ボタン */}
          <div className="simonecho-center">
            {(phase === "idle" || phase === "gameover") && (
              <button className="simonecho-start" onClick={startGame}>
                {phase === "idle" ? "START" : "RETRY"}
              </button>
            )}
          </div>
        </div>
      </div>
    </GameShell>
  );
}
