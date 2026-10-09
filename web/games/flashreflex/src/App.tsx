import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import {
  GameShell,
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  ComboCounter,
  ShareButton,
  GameRecommendations,
} from "@shared";
import type { PopupVariant } from "@shared";

/** ゲームフェーズ */
type Phase = "idle" | "waiting" | "ready" | "result" | "finished";

/** 判定ランク（実際の判定結果） */
type RankResult = "perfect" | "good" | "ok" | "slow";

/** 判定ランク（状態用、nullは未判定） */
type Rank = RankResult | null;

/** 総ラウンド数 */
const TOTAL_ROUNDS = 5;

/** 待機時間の範囲 (ms) */
const WAIT_MIN = 1500;
const WAIT_MAX = 4000;

/** 判定閾値 (ms) */
const THRESHOLD_PERFECT = 180;
const THRESHOLD_GOOD = 250;
const THRESHOLD_OK = 350;

/** localStorage のキー */
const STORAGE_KEY = "flashreflex_highscore";

/** ハイスコア読み込み */
function loadHighScore(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

/** ハイスコア保存 */
function saveHighScore(ms: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(ms));
  } catch {
    // ignore
  }
}

/** タイムから判定ランクを取得 */
function getRank(ms: number): RankResult {
  if (ms <= THRESHOLD_PERFECT) return "perfect";
  if (ms <= THRESHOLD_GOOD) return "good";
  if (ms <= THRESHOLD_OK) return "ok";
  return "slow";
}

/** ランク情報 */
const RANK_INFO: Record<
  RankResult,
  { label: string; color: string; variant: PopupVariant }
> = {
  perfect: { label: "⚡ PERFECT!", color: "#ff9ff3", variant: "critical" },
  good: { label: "✨ GOOD!", color: "#48dbfb", variant: "bonus" },
  ok: { label: "👍 OK!", color: "#feca57", variant: "combo" },
  slow: { label: "😅 SLOW", color: "#94a3b8", variant: "default" },
};

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [highScore, setHighScore] = useState<number | null>(loadHighScore);
  const [tooEarly, setTooEarly] = useState(false);
  const [currentRank, setCurrentRank] = useState<Rank>(null);
  const [combo, setCombo] = useState(0);
  const [flashEffect, setFlashEffect] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);

  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 共有フック
  const audio = useAudio();
  const { particles, sparkle, confetti, explosion } = useParticles();

  // タイマークリア
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
  }, []);

  // アンマウント時にタイマークリア
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // 画面フラッシュ
  const triggerFlash = useCallback((color: string) => {
    setFlashEffect(color);
    setTimeout(() => setFlashEffect(null), 150);
  }, []);

  // パーティクル発生位置（画面中央）
  const getCenterPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { x: rect.width / 2, y: rect.height / 2 };
    }
    return { x: 400, y: 300 };
  }, []);

  // ラウンド開始
  const startRound = useCallback(() => {
    setTooEarly(false);
    setCurrentTime(null);
    setCurrentRank(null);
    setPhase("waiting");

    // Ready音
    audio.playTone(440, 0.1, "sine", 0.15);

    const delay = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
    timerRef.current = window.setTimeout(() => {
      startTimeRef.current = performance.now();
      setPhase("ready");
      // Go!音
      audio.playArpeggio([523, 659, 784], 0.12, "sine", 0.25, 0.04);
      triggerFlash("#16a34a");
    }, delay);
  }, [audio, triggerFlash]);

  // ゲーム開始
  const startGame = useCallback(() => {
    setRound(1);
    setTimes([]);
    setCurrentTime(null);
    setTooEarly(false);
    setCurrentRank(null);
    setCombo(0);
    startRound();
  }, [startRound]);

  // クリック処理
  const handleClick = useCallback(() => {
    if (phase === "idle" || phase === "finished") {
      return;
    }

    if (phase === "waiting") {
      // フライング
      clearTimer();
      setTooEarly(true);
      setCombo(0);
      setPhase("result");
      setCurrentTime(null);
      setCurrentRank(null);
      // Fail音
      audio.playMiss();
      triggerFlash("#dc2626");
      return;
    }

    if (phase === "ready") {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      const rank = getRank(elapsed);
      const pos = getCenterPosition();

      setCurrentTime(elapsed);
      setCurrentRank(rank);
      setTimes((prev) => [...prev, elapsed]);
      setPhase("result");
      setPopupKey((k) => k + 1);

      // ランクに応じた演出
      if (rank === "perfect") {
        // Perfect: 大きめスパークル + 爆発 + パーフェクト音
        audio.playPerfect();
        sparkle(pos.x, pos.y, 16);
        explosion(pos.x, pos.y, 20);
        triggerFlash("#ff9ff3");
        setCombo((c) => c + 1);
      } else if (rank === "good") {
        // Good: スパークル + 成功音
        audio.playSuccess();
        sparkle(pos.x, pos.y, 12);
        triggerFlash("#48dbfb");
        setCombo((c) => c + 1);
      } else if (rank === "ok") {
        // OK: 小さめスパークル + クリック音
        audio.playClick();
        sparkle(pos.x, pos.y, 6);
        setCombo((c) => c + 1);
      } else {
        // Slow: コンボリセット
        audio.playTone(220, 0.15, "sine", 0.15);
        setCombo(0);
      }
    }
  }, [
    phase,
    clearTimer,
    audio,
    sparkle,
    explosion,
    triggerFlash,
    getCenterPosition,
  ]);

  // 次のラウンドへ
  const nextRound = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      // 終了
      const avg =
        times.length > 0
          ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
          : 0;

      const isNewRecord = avg > 0 && (highScore === null || avg < highScore);
      if (isNewRecord) {
        setHighScore(avg);
        saveHighScore(avg);
      }
      setPhase("finished");

      // 終了演出
      const pos = getCenterPosition();
      if (isNewRecord) {
        audio.playCelebrate();
        confetti(60);
        explosion(pos.x, pos.y, 30);
      } else {
        audio.playFanfare();
        confetti(30);
      }
    } else {
      setRound((r) => r + 1);
      startRound();
    }
  }, [
    round,
    times,
    highScore,
    startRound,
    audio,
    confetti,
    explosion,
    getCenterPosition,
  ]);

  // 平均計算
  const average =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

  // 背景色決定
  const getBgClass = () => {
    if (phase === "ready") return "bg-green";
    if (phase === "waiting") return "bg-red";
    return "bg-default";
  };

  return (
    <GameShell gameId="flashreflex" layout="immersive">
      <div
        ref={containerRef}
        className={`flashreflex-root ${getBgClass()}`}
        onClick={handleClick}
      >
        {/* 画面フラッシュ効果 */}
        {flashEffect && (
          <div
            className="flashreflex-flash"
            style={{ backgroundColor: flashEffect }}
          />
        )}

        {/* パーティクル */}
        <ParticleLayer particles={particles} />

        {/* コンボカウンター */}
        <ComboCounter combo={combo} position="top-right" threshold={2} />

        {/* スコアポップアップ */}
        {phase === "result" && currentRank && (
          <ScorePopup
            text={RANK_INFO[currentRank].label}
            popupKey={popupKey}
            variant={RANK_INFO[currentRank].variant}
            size="lg"
            y="25%"
          />
        )}

        <div className="flashreflex-content">
          <h1 className="flashreflex-title">⚡ Flash Reflex</h1>

          {phase === "idle" && (
            <div className="flashreflex-panel">
              <p className="flashreflex-description">
                画面が<span className="text-green">緑</span>
                に変わったらすぐクリック！
              </p>
              <p className="flashreflex-description">
                5回計測して平均を算出します
              </p>
              <div className="flashreflex-rank-guide">
                <span className="rank-perfect">
                  ⚡ Perfect ≤{THRESHOLD_PERFECT}ms
                </span>
                <span className="rank-good">✨ Good ≤{THRESHOLD_GOOD}ms</span>
                <span className="rank-ok">👍 OK ≤{THRESHOLD_OK}ms</span>
              </div>
              {highScore !== null && (
                <p className="flashreflex-highscore">
                  🏆 ハイスコア: {highScore} ms
                </p>
              )}
              <button
                type="button"
                className="flashreflex-button"
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
              >
                スタート
              </button>
            </div>
          )}

          {phase === "waiting" && (
            <div className="flashreflex-panel">
              <p className="flashreflex-instruction">待って...</p>
              <p className="flashreflex-round">
                Round {round} / {TOTAL_ROUNDS}
              </p>
            </div>
          )}

          {phase === "ready" && (
            <div className="flashreflex-panel">
              <p className="flashreflex-go">クリック！</p>
            </div>
          )}

          {phase === "result" && (
            <div className="flashreflex-panel">
              {tooEarly ? (
                <>
                  <p className="flashreflex-early">🚫 フライング！</p>
                  <p className="flashreflex-sublabel">早すぎました</p>
                </>
              ) : (
                <>
                  <p
                    className="flashreflex-time"
                    style={{
                      color: currentRank
                        ? RANK_INFO[currentRank].color
                        : undefined,
                    }}
                  >
                    {currentTime} ms
                  </p>
                  <p className="flashreflex-sublabel">
                    Round {round} / {TOTAL_ROUNDS}
                  </p>
                </>
              )}
              <button
                type="button"
                className="flashreflex-button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (tooEarly) {
                    // フライング時はリトライ
                    startRound();
                  } else {
                    nextRound();
                  }
                }}
              >
                {tooEarly
                  ? "リトライ"
                  : round >= TOTAL_ROUNDS
                    ? "結果を見る"
                    : "次へ"}
              </button>
            </div>
          )}

          {phase === "finished" && (
            <div className="flashreflex-panel">
              <p className="flashreflex-finished-title">🎉 結果</p>
              <p className="flashreflex-average">平均: {average} ms</p>
              <div className="flashreflex-times">
                {times.map((t, i) => {
                  const rank = getRank(t);
                  return (
                    <span
                      key={i}
                      className="flashreflex-time-chip"
                      style={{
                        borderColor: RANK_INFO[rank].color,
                        color: RANK_INFO[rank].color,
                      }}
                    >
                      {t} ms
                    </span>
                  );
                })}
              </div>
              {highScore !== null && average === highScore && (
                <p className="flashreflex-newrecord">🏆 新記録！</p>
              )}
              {highScore !== null && average !== highScore && (
                <p className="flashreflex-highscore">
                  ハイスコア: {highScore} ms
                </p>
              )}
              <ShareButton score={average ?? 0} gameTitle="Flash Reflex" gameId="flashreflex" />
              <GameRecommendations currentGameId="flashreflex" />
              <button
                type="button"
                className="flashreflex-button"
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
              >
                もう一度
              </button>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
