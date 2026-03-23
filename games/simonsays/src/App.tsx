import { useState, useEffect, useRef, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  useHighScore,
  ParticleLayer,
  ScreenShake,
  ScorePopup,
} from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";
import "./App.css";

/* ---- Types ---- */
type Color = "red" | "blue" | "green" | "yellow";
type Phase = "idle" | "showing" | "waiting" | "gameover";

interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

/* ---- Constants ---- */
const COLORS: Color[] = ["red", "blue", "green", "yellow"];

const FREQUENCIES: Record<Color, number> = {
  red: 329.63, // E4
  blue: 261.63, // C4
  green: 392.0, // G4
  yellow: 523.25, // C5
};

// スコアマイルストーン
const SCORE_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50];

/* ---- Component ---- */
export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [level, setLevel] = useState(0);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [pressedColor, setPressedColor] = useState<Color | null>(null);
  const [message, setMessage] = useState("STARTを押してね");
  const [perfectStreak, setPerfectStreak] = useState(0); // 連続パーフェクトクリア数

  // 演出用
  const [screenFlash, setScreenFlash] = useState<"levelup" | "fail" | null>(
    null
  );

  // ScorePopup用
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    variant: "default",
    size: "md",
  });

  const timeoutRef = useRef<number[]>([]);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const lastMilestoneRef = useRef(0);

  // 共通フック
  const { playTone, playLevelUp, playGameOver, playSuccess } = useAudio();
  const { particles, sparkle, burst } = useParticles();
  const { best, update: updateHighScore } = useHighScore("simonsays");

  // ポップアップ表示
  const showPopup = useCallback(
    (text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md") => {
      setPopup((prev) => ({
        text,
        key: prev.key + 1,
        variant,
        size,
      }));
    },
    []
  );

  // ボタン音を鳴らす
  const playButtonTone = useCallback(
    (color: Color, duration = 0.3) => {
      playTone(FREQUENCIES[color], duration, "sine", 0.4);
    },
    [playTone]
  );

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
    setScreenFlash(null);
    setPerfectStreak(0);
    lastMilestoneRef.current = 0;
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
          playButtonTone(color, 0.4);
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
  }, [phase, sequence, clearAllTimeouts, playButtonTone]);

  // プレイヤー入力
  const handleColorPress = useCallback(
    (color: Color, e: React.MouseEvent<HTMLButtonElement>) => {
      if (phase !== "waiting") return;

      // ボタン押下演出
      setPressedColor(color);
      setActiveColor(color);
      playButtonTone(color, 0.2);

      // パーティクル位置を取得
      const rect = e.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      const lightOff = window.setTimeout(() => {
        setActiveColor(null);
        setPressedColor(null);
      }, 200);
      timeoutRef.current.push(lightOff);

      const expected = sequence[playerIndex];

      if (color !== expected) {
        // ミス - シェイク＋赤フラッシュ
        playGameOver();
        shakeRef.current?.shake("heavy", 400);
        setScreenFlash("fail");
        setPhase("gameover");
        setPerfectStreak(0);

        // ハイスコア更新チェック
        const isNewHighScore = updateHighScore(level);
        if (isNewHighScore) {
          showPopup(`🏆 新記録! ${level}`, "critical", "xl");
          setMessage(`新記録達成！スコア: ${level}`);
        } else {
          setMessage(`ゲームオーバー！スコア: ${level}`);
        }

        // フラッシュを消す
        const clearFlash = window.setTimeout(() => {
          setScreenFlash(null);
        }, 500);
        timeoutRef.current.push(clearFlash);
        return;
      }

      // 正解 - スパークル
      burst(x, y, 8);

      const nextIndex = playerIndex + 1;

      if (nextIndex >= sequence.length) {
        // シーケンス完了 - 大きなスパークル
        playSuccess();
        sparkle(x, y, 12);

        const newLevel = level + 1;
        setLevel(newLevel);

        // パーフェクトストリーク更新
        const newPerfectStreak = perfectStreak + 1;
        setPerfectStreak(newPerfectStreak);

        // レベルアップ - 画面フラッシュ
        playLevelUp();
        setScreenFlash("levelup");

        // ポップアップ表示（優先度: ハイスコア > パーフェクト > マイルストーン > レベル）
        let popupShown = false;

        // マイルストーンチェック
        const milestone = SCORE_MILESTONES.find(
          (m) => newLevel >= m && lastMilestoneRef.current < m
        );
        if (milestone) {
          lastMilestoneRef.current = milestone;
        }

        // パーフェクトシーケンス (3連続以上)
        if (newPerfectStreak >= 3 && newPerfectStreak % 3 === 0) {
          showPopup(`🔥 ${newPerfectStreak}連続クリア!`, "combo", "lg");
          setMessage(`素晴らしい！${newPerfectStreak}連続！`);
          popupShown = true;
        }
        // マイルストーン達成
        else if (milestone) {
          showPopup(`⭐ レベル${milestone}達成!`, "bonus", "lg");
          setMessage(`すごい！レベル${milestone}達成！`);
          popupShown = true;
        }
        // 通常レベルアップ
        if (!popupShown) {
          showPopup(`Level ${newLevel}!`, "level", "md");
          setMessage(`レベル ${newLevel}!`);
        }

        const clearFlash = window.setTimeout(() => {
          setScreenFlash(null);
        }, 300);
        timeoutRef.current.push(clearFlash);

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
    [
      phase,
      sequence,
      playerIndex,
      level,
      perfectStreak,
      playButtonTone,
      playSuccess,
      playLevelUp,
      playGameOver,
      burst,
      sparkle,
      showPopup,
      updateHighScore,
    ]
  );

  return (
    <GameShell gameId="simonsays" layout="default">
      <ScreenShake ref={shakeRef}>
        <div
          className={`simonsays-container${screenFlash === "levelup" ? " simonsays-flash-levelup" : ""}${screenFlash === "fail" ? " simonsays-flash-fail" : ""}`}
        >
          {/* パーティクル */}
          <ParticleLayer particles={particles} />

          {/* ScorePopup */}
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            variant={popup.variant}
            size={popup.size}
            y="30%"
          />

          {/* ヘッダー */}
          <header className="simonsays-header">
            <h1 className="simonsays-title">Simon Says</h1>
            <div className="simonsays-scores">
              <div className="simonsays-level">レベル: {level}</div>
              {best > 0 && (
                <div className="simonsays-best">🏆 {best}</div>
              )}
            </div>
          </header>

          {/* メッセージ */}
          <div className="simonsays-message">{message}</div>

          {/* ゲームボード */}
          <div className="simonsays-board">
            {COLORS.map((color) => (
              <button
                key={color}
                className={`simonsays-btn simonsays-btn--${color}${
                  activeColor === color ? " simonsays-btn--active" : ""
                }${pressedColor === color ? " simonsays-btn--pressed" : ""}`}
                onClick={(e) => handleColorPress(color, e)}
                disabled={phase !== "waiting"}
                aria-label={color}
              />
            ))}

            {/* 中央ボタン */}
            <div className="simonsays-center">
              {(phase === "idle" || phase === "gameover") && (
                <button className="simonsays-start" onClick={startGame}>
                  {phase === "idle" ? "START" : "RETRY"}
                </button>
              )}
            </div>
          </div>
        </div>
      </ScreenShake>
    </GameShell>
  );
}
