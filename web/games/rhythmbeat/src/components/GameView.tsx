import { useEffect, useCallback, useRef, useState } from "react";
import type { GameState, DifficultyConfig, Judgment } from "../lib/types";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LANE_COUNT,
  LANE_WIDTH,
  NOTE_SIZE,
  JUDGE_LINE_Y,
  LANE_KEYS,
  LANE_COLORS,
} from "../lib/constants";
import {
  calculateNoteY,
  isNoteVisible,
  processLaneTap,
  processMissedNotes,
  checkGameFinished,
} from "../lib/rhythmbeat";
import {
  useParticles,
  useAudio,
  ParticleLayer,
  ScreenShake,
  ComboCounter,
  ScorePopup,
} from "@shared";
import type { ScreenShakeHandle, Particle, PopupVariant } from "@shared";

interface Props {
  state: GameState;
  config: DifficultyConfig;
  onStateChange: (state: GameState) => void;
  onFinish: () => void;
}

interface JudgmentDisplay {
  id: number;
  lane: number;
  judgment: Judgment;
  time: number;
}

/** 虹色スパークル（Perfect用） */
const RAINBOW_COLORS = [
  "#ff0000",
  "#ff7700",
  "#ffff00",
  "#00ff00",
  "#00aaff",
  "#0000ff",
  "#aa00ff",
];

function createRainbowSparkle(
  x: number,
  y: number,
  idRef: React.MutableRefObject<number>,
  count = 12,
): Particle[] {
  const now = idRef.current;
  const particles: Particle[] = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const dist = Math.random() * 80 + 40;
    return {
      id: now + i,
      x,
      y,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      color: RAINBOW_COLORS[i % RAINBOW_COLORS.length],
      size: Math.random() * 6 + 4,
      dur: Math.random() * 400 + 500,
      type: "sparkle" as const,
      scale: Math.random() * 0.5 + 0.8,
    };
  });
  idRef.current += count;
  return particles;
}

/** 炎エフェクト（高コンボ用） */
function createFlameParticles(
  x: number,
  y: number,
  idRef: React.MutableRefObject<number>,
  intensity: number,
): Particle[] {
  const count = Math.min(intensity, 10);
  const now = idRef.current;
  const flameColors = ["#ff4500", "#ff6b00", "#ff8c00", "#ffa500", "#ffcc00"];
  const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
    id: now + i,
    x: x + (Math.random() - 0.5) * 60,
    y,
    tx: (Math.random() - 0.5) * 40,
    ty: -(Math.random() * 60 + 40),
    color: flameColors[Math.floor(Math.random() * flameColors.length)],
    size: Math.random() * 8 + 6,
    dur: Math.random() * 300 + 400,
    type: "circle" as const,
  }));
  idRef.current += count;
  return particles;
}

/** 各レーンの音階周波数 (ドレミファ) */
const LANE_FREQUENCIES = [262, 330, 392, 523]; // C4, E4, G4, C5

/** 判定に対応するScorePopup設定 */
const JUDGMENT_POPUP_CONFIG: Record<
  Judgment,
  { text: string; variant: PopupVariant; size: "sm" | "md" | "lg" | "xl" }
> = {
  perfect: { text: "✨ PERFECT! ✨", variant: "critical", size: "lg" },
  good: { text: "GREAT!", variant: "bonus", size: "md" },
  miss: { text: "MISS", variant: "default", size: "sm" },
};

export function GameView({ state, config, onStateChange, onFinish }: Props) {
  const [currentTime, setCurrentTime] = useState(0);
  const [judgmentDisplays, setJudgmentDisplays] = useState<JudgmentDisplay[]>([]);
  const animationRef = useRef<number>(0);
  const displayIdRef = useRef(0);
  const particleIdRef = useRef(0);

  // Dopamine演出用
  const { particles, sparkle, burst } = useParticles();
  const audio = useAudio();
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const prevComboRef = useRef(state.combo);
  const prevMissRef = useRef(state.missCount);

  // ScorePopup用の状態
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);
  const [popupVariant, setPopupVariant] = useState<PopupVariant>("default");
  const [popupSize, setPopupSize] = useState<"sm" | "md" | "lg" | "xl">("md");

  // カスタムパーティクル管理
  const [customParticles, setCustomParticles] = useState<Particle[]>([]);

  // パーティクルを追加する関数
  const addParticles = useCallback((newParticles: Particle[]) => {
    setCustomParticles((prev) => [...prev, ...newParticles]);
    const maxDur = Math.max(...newParticles.map((p) => p.dur));
    setTimeout(() => {
      setCustomParticles((prev) =>
        prev.filter((p) => !newParticles.some((n) => n.id === p.id)),
      );
    }, maxDur + 100);
  }, []);

  // ScorePopupを表示する関数
  const showPopup = useCallback(
    (judgment: Judgment) => {
      const config = JUDGMENT_POPUP_CONFIG[judgment];
      setPopupText(config.text);
      setPopupVariant(config.variant);
      setPopupSize(config.size);
      setPopupKey((k) => k + 1);
    },
    [],
  );

  // ゲームループ
  useEffect(() => {
    const loop = () => {
      const elapsed = performance.now() - state.startTime;
      setCurrentTime(elapsed);

      // ミス判定
      const newState = processMissedNotes(state, elapsed);
      if (newState !== state) {
        // ミスが発生した場合の演出
        if (newState.missCount > prevMissRef.current) {
          audio.playMiss();
          shakeRef.current?.shake("medium", 200);
          showPopup("miss");
          prevMissRef.current = newState.missCount;
        }
        onStateChange(newState);
      }

      // 終了判定
      if (checkGameFinished(newState)) {
        onFinish();
        return;
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [state, onStateChange, onFinish, audio, showPopup]);

  // 判定エフェクトを追加
  const addJudgmentDisplay = useCallback((lane: number, judgment: Judgment) => {
    const id = displayIdRef.current++;
    setJudgmentDisplays((prev) => [
      ...prev,
      { id, lane, judgment, time: Date.now() },
    ]);

    // 500ms後に削除
    setTimeout(() => {
      setJudgmentDisplays((prev) => prev.filter((d) => d.id !== id));
    }, 500);
  }, []);

  // レーンタップ処理
  const handleLaneTap = useCallback(
    (lane: number) => {
      const elapsed = performance.now() - state.startTime;
      const newState = processLaneTap(state, lane, elapsed);

      if (newState !== state) {
        // 判定されたノートを探す
        const judgedNote = newState.notes.find(
          (n) =>
            n.lane === lane &&
            n.judged &&
            !state.notes.find((on) => on.id === n.id)?.judged,
        );

        if (judgedNote?.judgment) {
          addJudgmentDisplay(lane, judgedNote.judgment);
          
          // ScorePopup表示
          showPopup(judgedNote.judgment);

          // パーティクル発生位置
          const px = lane * LANE_WIDTH + LANE_WIDTH / 2;
          const py = JUDGE_LINE_Y;

          // 判定に応じた演出
          if (judgedNote.judgment === "perfect") {
            // Perfect: 虹色sparkle + 効果音 + レーン音階
            audio.playPerfect();
            audio.playTone(LANE_FREQUENCIES[lane], 0.15, "sine", 0.2);
            const rainbowParticles = createRainbowSparkle(px, py, particleIdRef, 12);
            addParticles(rainbowParticles);
            // Perfectはburst追加
            burst(px, py, 6);
          } else if (judgedNote.judgment === "good") {
            // Good: 通常sparkle + 効果音 + レーン音階
            audio.playSuccess();
            audio.playTone(LANE_FREQUENCIES[lane], 0.12, "triangle", 0.15);
            sparkle(px, py, 8);
          }

          // コンボ演出
          if (newState.combo > prevComboRef.current && newState.combo >= 5) {
            audio.playCombo(newState.combo);

            // 高コンボ時（10以上）は炎エフェクト
            if (newState.combo >= 10) {
              const flameIntensity = Math.floor((newState.combo - 10) / 5) + 3;
              const flameParticles = createFlameParticles(
                GAME_WIDTH / 2,
                JUDGE_LINE_Y - 30,
                particleIdRef,
                flameIntensity,
              );
              addParticles(flameParticles);
            }
          }
          prevComboRef.current = newState.combo;
        }
        onStateChange(newState);
      }
    },
    [state, onStateChange, addJudgmentDisplay, audio, sparkle, burst, addParticles, showPopup],
  );

  // キーボード入力
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const laneIndex = LANE_KEYS.indexOf(key);
      if (laneIndex >= 0) {
        e.preventDefault();
        handleLaneTap(laneIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleLaneTap]);

  // 全パーティクルを結合
  const allParticles = [...particles, ...customParticles];

  return (
    <ScreenShake ref={shakeRef}>
      <div
        className="rhythmbeat-game"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {/* レーン */}
        {Array.from({ length: LANE_COUNT }).map((_, i) => (
          <div
            key={i}
            className="rhythmbeat-lane"
            style={{
              left: i * LANE_WIDTH,
              width: LANE_WIDTH,
              borderColor: LANE_COLORS[i],
            }}
            onClick={() => handleLaneTap(i)}
            onTouchStart={(e) => {
              e.preventDefault();
              handleLaneTap(i);
            }}
          >
            {/* レーン下部のキー表示 */}
            <div
              className="rhythmbeat-lane-key"
              style={{ backgroundColor: LANE_COLORS[i] }}
            >
              {LANE_KEYS[i].toUpperCase()}
            </div>
          </div>
        ))}

        {/* 判定ライン */}
        <div
          className="rhythmbeat-judge-line"
          style={{ top: JUDGE_LINE_Y }}
        />

        {/* ノート */}
        {state.notes.map((note) => {
          if (note.judged) return null;
          const y = calculateNoteY(note, currentTime, config.speed);
          if (!isNoteVisible(y)) return null;

          return (
            <div
              key={note.id}
              className="rhythmbeat-note"
              style={{
                left: note.lane * LANE_WIDTH + (LANE_WIDTH - NOTE_SIZE) / 2,
                top: y - NOTE_SIZE / 2,
                width: NOTE_SIZE,
                height: NOTE_SIZE,
                backgroundColor: LANE_COLORS[note.lane],
              }}
            />
          );
        })}

        {/* 判定表示 */}
        {judgmentDisplays.map((display) => (
          <div
            key={display.id}
            className={`rhythmbeat-judgment rhythmbeat-judgment-${display.judgment}`}
            style={{
              left: display.lane * LANE_WIDTH + LANE_WIDTH / 2,
              top: JUDGE_LINE_Y - 50,
            }}
          >
            {display.judgment.toUpperCase()}
          </div>
        ))}

        {/* パーティクルレイヤー */}
        <ParticleLayer particles={allParticles} />

        {/* ScorePopup - 中央上部に表示 */}
        <ScorePopup
          text={popupText}
          popupKey={popupKey}
          x="50%"
          y="15%"
          variant={popupVariant}
          size={popupSize}
        />

        {/* コンボカウンター */}
        <ComboCounter
          combo={state.combo}
          position="top-right"
          threshold={3}
          style={{ top: 60, right: 16 }}
        />

        {/* スコア表示 */}
        <div className="rhythmbeat-hud">
          <div className="rhythmbeat-hud-score">{state.score}</div>
        </div>
      </div>
    </ScreenShake>
  );
}