import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScorePopup,
  GameShell,
} from "../../../src/shared";

type Phase = "ready" | "waiting" | "go" | "roundResult" | "finished";

// ---- Settings ----
type RoundCount = 3 | 5 | 10 | 20;
type WaitMode = "predictable" | "normal" | "tricky";
type PenaltyMode = "mild" | "normal" | "severe";

interface Settings {
  rounds: RoundCount;
  waitMode: WaitMode;
  penaltyMode: PenaltyMode;
}

const DEFAULT_SETTINGS: Settings = {
  rounds: 5,
  waitMode: "normal",
  penaltyMode: "normal",
};

const ROUND_OPTIONS: { value: RoundCount; label: string; desc: string }[] = [
  { value: 3, label: "3", desc: "サクッと" },
  { value: 5, label: "5", desc: "ふつう" },
  { value: 10, label: "10", desc: "じっくり" },
  { value: 20, label: "20", desc: "持久力" },
];

const WAIT_OPTIONS: { value: WaitMode; label: string; desc: string }[] = [
  { value: "predictable", label: "PREDICTABLE", desc: "読みやすい" },
  { value: "normal", label: "NORMAL", desc: "ふつう" },
  { value: "tricky", label: "TRICKY", desc: "読めない" },
];

const PENALTY_OPTIONS: { value: PenaltyMode; label: string; desc: string }[] = [
  { value: "mild", label: "MILD", desc: "300ms" },
  { value: "normal", label: "NORMAL", desc: "700ms" },
  { value: "severe", label: "SEVERE", desc: "1500ms" },
];

const WAIT_RANGES: Record<WaitMode, { min: number; range: number }> = {
  predictable: { min: 1000, range: 1000 },
  normal: { min: 1200, range: 2000 },
  tricky: { min: 800, range: 4200 },
};

const PENALTY_VALUES: Record<PenaltyMode, number> = {
  mild: 300,
  normal: 700,
  severe: 1500,
};

const STREAK_THRESHOLD_MS = 350;
const STORAGE_KEY = "flashreflex_settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// Particle origin: approximate center of the .panel element
const PARTICLE_ORIGIN_X = 300;
const PARTICLE_ORIGIN_Y = 160;

function getRank(avg: number, falseStartCount: number): string {
  if (falseStartCount >= 2) return "";
  if (avg <= 200) return "💎 PERFECT!";
  if (avg <= 280) return "⚡ EXCELLENT!";
  if (avg <= 350) return "🔥 GREAT!";
  if (avg <= 450) return "👍 GOOD";
  return "";
}

function App() {
  const timerRef = useRef<number | null>(null);
  const goTimeRef = useRef<number | null>(null);
  const prevBestRef = useRef<number | null>(null);

  const { playTone, playFanfare } = useAudio();
  const { particles, burst } = useParticles();

  const [phase, setPhase] = useState<Phase>("ready");
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState<number[]>([]);
  const [statusText, setStatusText] = useState("スタートを押して準備しよう");

  const [scorePopup, setScorePopup] = useState<string | null>(null);
  const [scorePopupKey, setScorePopupKey] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shakeClass, setShakeClass] = useState<"" | "shake" | "celebrate">("");
  const [rankLabel, setRankLabel] = useState("");

  const [settings, setSettings] = useState<Settings>(loadSettings);
  const totalRounds = settings.rounds;
  const penaltyMs = PENALTY_VALUES[settings.penaltyMode];
  const waitRange = WAIT_RANGES[settings.waitMode];

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  // ---- Particle helpers ----
  const spawnParticles = (count: number, mega = false) => {
    burst(PARTICLE_ORIGIN_X, PARTICLE_ORIGIN_Y, mega ? count * 2 : count);
  };

  const triggerShake = (type: "shake" | "celebrate") => {
    setShakeClass(type);
    window.setTimeout(() => setShakeClass(""), 650);
  };

  const showPopup = (text: string) => {
    setScorePopup(text);
    setScorePopupKey((k) => k + 1);
    window.setTimeout(() => setScorePopup(null), 1400);
  };

  const average = useMemo(() => {
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, value) => sum + value, 0);
    return Math.round(total / scores.length);
  }, [scores]);

  const best = useMemo(() => {
    if (scores.length === 0) return 0;
    return Math.min(...scores);
  }, [scores]);

  const falseStarts = useMemo(
    () => scores.filter((score) => score === penaltyMs).length,
    [scores, penaltyMs],
  );

  const clearRoundTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const beginWaiting = () => {
    clearRoundTimer();
    goTimeRef.current = null;
    setPhase("waiting");
    setStatusText("赤の間は待機 緑に変わった瞬間にタップ");

    const delay = Math.floor(Math.random() * waitRange.range) + waitRange.min;
    timerRef.current = window.setTimeout(() => {
      goTimeRef.current = performance.now();
      setPhase("go");
      setStatusText("今だ タップ");
      // Go signal: short warning beep
      playTone(880, 0.08, "square", 0.2);
    }, delay);
  };

  const finishRound = (reactionMs: number) => {
    const nextScores = [...scores, reactionMs];
    setScores(nextScores);

    const isFalseStart = reactionMs === penaltyMs;
    const isSlow = !isFalseStart && reactionMs > 500;
    const isGood = !isFalseStart && reactionMs <= STREAK_THRESHOLD_MS;

    // Streak tracking
    const newStreak = isGood ? streak + 1 : 0;
    setStreak(newStreak);

    // Best score tracking
    const currentBest = prevBestRef.current;
    const isBestUpdate =
      !isFalseStart && (currentBest === null || reactionMs < currentBest);
    if (isBestUpdate) prevBestRef.current = reactionMs;

    // Shake / particle / sound
    if (isFalseStart || isSlow) {
      triggerShake("shake");
      playTone(110, 0.4, "sawtooth", 0.2);
    } else if (isBestUpdate) {
      spawnParticles(24, true);
      triggerShake("celebrate");
      playFanfare();
    } else {
      spawnParticles(12, false);
      playTone(660, 0.1, "triangle", 0.22);
      window.setTimeout(() => playTone(880, 0.08, "triangle", 0.18), 60);
    }

    // Score popup
    if (!isFalseStart) {
      let label = "";
      if (reactionMs <= 200) label = "⚡ INSANE!";
      else if (reactionMs <= 280) label = "🔥 FAST!";
      else if (reactionMs <= 350) label = "✨ GOOD!";
      else if (reactionMs <= 500) label = "👍 OK";
      showPopup(`+${reactionMs}ms ${label}`);
    }

    if (round >= totalRounds) {
      setPhase("finished");
      setStatusText("計測完了");

      // Perfect run?
      const allGood = nextScores.every(
        (s) => s !== penaltyMs && s <= STREAK_THRESHOLD_MS,
      );
      if (allGood) {
        window.setTimeout(() => spawnParticles(40, true), 200);
        window.setTimeout(() => spawnParticles(30, true), 550);
      }

      // Rank
      const finalAvg = Math.round(
        nextScores.reduce((a, b) => a + b, 0) / nextScores.length,
      );
      const finalFs = nextScores.filter(
        (s) => s === penaltyMs,
      ).length;
      const rank = getRank(finalAvg, finalFs);
      if (rank) window.setTimeout(() => setRankLabel(rank), 800);
      return;
    }

    setPhase("roundResult");
    setStatusText(`ラウンド ${round} 完了`);
  };

  const startGame = () => {
    setRound(1);
    setScores([]);
    setStreak(0);
    setRankLabel("");
    prevBestRef.current = null;
    setStatusText("集中していこう");
    beginWaiting();
  };

  const nextRound = () => {
    setRound((prev) => prev + 1);
    beginWaiting();
  };

  const retryGame = () => {
    setRound(1);
    setScores([]);
    setStreak(0);
    setRankLabel("");
    prevBestRef.current = null;
    setStatusText("リトライ開始");
    beginWaiting();
  };

  const handleTap = () => {
    if (phase === "waiting") {
      clearRoundTimer();
      setStatusText(`フライング ${penaltyMs}ms ペナルティ`);
      finishRound(penaltyMs);
      return;
    }

    if (phase !== "go") {
      return;
    }

    const now = performance.now();
    const start = goTimeRef.current;
    if (start === null) return;

    const reaction = Math.max(1, Math.round(now - start));
    setStatusText(`${reaction} ms`);
    finishRound(reaction);
  };

  const latestScore = scores[scores.length - 1] ?? 0;

  return (
    <GameShell title="Flash Reflex" gameId="flashreflex">
      <main className={`app${shakeClass ? ` ${shakeClass}` : ""}`}>
        <section className="panel">
          <ParticleLayer particles={particles} />

          <h1>Flash Reflex</h1>
          <p className="subtitle">{totalRounds}ラウンド反応速度チャレンジ</p>

          <div className="ruleBox">
            <h2>ルール</h2>
            <ul>
              <li>赤の間は待機 緑になったらすぐタップ</li>
              <li>早押しはフライングで {penaltyMs}ms 扱い</li>
              <li>{totalRounds}ラウンドの平均が小さいほど強い</li>
            </ul>
          </div>

          <p className="statusText">{statusText}</p>

          <div className="tapWrapper">
            <button
              className={`tapArea ${phase === "go" ? "go" : "wait"}`}
              onClick={handleTap}
              type="button"
            >
              {phase === "go" ? "TAP" : "WAIT"}
            </button>
            <ScorePopup text={scorePopup} popupKey={scorePopupKey} y="40%" />
          </div>

          {streak >= 2 && phase !== "finished" && (
            <div className="streakWrap">
              <div className="streakBadge">STREAK ×{streak}</div>
            </div>
          )}

          <div className="hud">
            <span>
              Round {Math.min(round, totalRounds)} / {totalRounds}
            </span>
            <span>Best {best > 0 ? `${best} ms` : "-"}</span>
            <span>Avg {average > 0 ? `${average} ms` : "-"}</span>
          </div>

          {phase === "ready" && (
            <div className="settingsBlock">
              <div className="settingGroup">
                <h3>ラウンド数</h3>
                <div className="settingButtons">
                  {ROUND_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`settingBtn${settings.rounds === opt.value ? " active" : ""}`}
                      onClick={() => updateSetting("rounds", opt.value)}
                      type="button"
                    >
                      <span>{opt.label}</span>
                      <small>{opt.desc}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="settingGroup">
                <h3>待機時間の幅</h3>
                <div className="settingButtons">
                  {WAIT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`settingBtn${settings.waitMode === opt.value ? " active" : ""}`}
                      onClick={() => updateSetting("waitMode", opt.value)}
                      type="button"
                    >
                      <span>{opt.label}</span>
                      <small>{opt.desc}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="settingGroup">
                <h3>フライングペナルティ</h3>
                <div className="settingButtons">
                  {PENALTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`settingBtn${settings.penaltyMode === opt.value ? " active" : ""}`}
                      onClick={() => updateSetting("penaltyMode", opt.value)}
                      type="button"
                    >
                      <span>{opt.label}</span>
                      <small>{opt.desc}</small>
                    </button>
                  ))}
                </div>
              </div>
              <button className="action" onClick={startGame} type="button">
                スタート
              </button>
            </div>
          )}

          {phase === "roundResult" && (
            <div className="resultBlock">
              <p>今回の記録 {latestScore} ms</p>
              <button className="action" onClick={nextRound} type="button">
                次のラウンド
              </button>
            </div>
          )}

          {phase === "finished" && (
            <div className="resultBlock">
              {rankLabel && <p className="rankLabel">{rankLabel}</p>}
              <p>ベスト {best} ms</p>
              <p>平均 {average} ms</p>
              <p>フライング {falseStarts} 回</p>
              <button className="action" onClick={retryGame} type="button">
                もう一回
              </button>
            </div>
          )}
        </section>
      </main>
    </GameShell>
  );
}

export default App;
