import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { useAudio, GameShell } from "../../../src/shared";

// Pre-generated confetti data (deterministic spread)
const CONFETTI_PIECES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  left: (i * 1.6807) % 100,
  color: ["#facc15", "#38bdf8", "#f87171", "#4ade80", "#c084fc", "#fb923c"][
    i % 6
  ],
  animDelay: (i * 0.033) % 2,
  animDuration: 1.5 + ((i * 0.027) % 1.5),
}));

type Player = "p1" | "p2";
type Phase = "intro" | "playing";

type CardState = "down" | "up" | "matched";

type Card = {
  id: number;
  symbol: string;
  state: CardState;
  owner: Player | null;
};

type ScoreState = Record<Player, number>;

const SYMBOLS = ["🍙", "🍜", "🍣", "🍛", "🍤", "🍡", "🍓", "🍫", "🍩", "🍪", "🍰", "🎂"];

type CardCount = 12 | 16 | 20 | 24;
type FlipTime = 350 | 700 | 1200;
type ShuffleMode = "static" | "shuffle";

type Settings = {
  cardCount: CardCount;
  flipTime: FlipTime;
  playerNames: Record<Player, string>;
  shuffleMode: ShuffleMode;
};

const STORAGE_KEY = "memoryduel_settings";

const DEFAULT_SETTINGS: Settings = {
  cardCount: 16,
  flipTime: 700,
  playerNames: { p1: "Player 1", p2: "Player 2" },
  shuffleMode: "static",
};

const COLS_MAP: Record<CardCount, number> = { 12: 4, 16: 4, 20: 5, 24: 6 };

const CARD_COUNT_OPTIONS: { value: CardCount; label: string; desc: string }[] = [
  { value: 12, label: "12枚", desc: "6ペア" },
  { value: 16, label: "16枚", desc: "8ペア" },
  { value: 20, label: "20枚", desc: "10ペア" },
  { value: 24, label: "24枚", desc: "12ペア" },
];

const FLIP_TIME_OPTIONS: { value: FlipTime; label: string; desc: string }[] = [
  { value: 1200, label: "LONG", desc: "1200ms" },
  { value: 700, label: "NORMAL", desc: "700ms" },
  { value: 350, label: "SHORT", desc: "350ms" },
];

const SHUFFLE_OPTIONS: { value: ShuffleMode; label: string; desc: string }[] = [
  { value: "static", label: "STATIC", desc: "固定" },
  { value: "shuffle", label: "SHUFFLE", desc: "激ムズ" },
];

const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = (s: Settings) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

const nextPlayer = (player: Player): Player => (player === "p1" ? "p2" : "p1");

const shuffle = <T,>(values: T[]): T[] => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const createDeck = (pairCount: number): Card[] => {
  const selected = SYMBOLS.slice(0, pairCount);
  const symbols = shuffle([...selected, ...selected]);
  return symbols.map((symbol, index) => ({
    id: index,
    symbol,
    state: "down",
    owner: null,
  }));
};

const shuffleUnmatched = (prev: Card[]): Card[] => {
  const result = [...prev];
  const indices = result.reduce<number[]>((acc, c, i) => {
    if (c.state !== "matched") acc.push(i);
    return acc;
  }, []);
  const shuffled = shuffle(indices.map((i) => result[i]));
  indices.forEach((pos, i) => {
    result[pos] = shuffled[i];
  });
  return result;
};

const App = () => {
  const { playSweep, playArpeggio } = useAudio();

  const timerRef = useRef<number | null>(null);
  const comboTimerRef = useRef<number | null>(null);
  const comboCountRef = useRef(0);
  const lastMatchPlayerRef = useRef<Player | null>(null);

  const [settings, setSettings] = useState<Settings>(loadSettings);
  const updateSettings = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  };

  const [phase, setPhase] = useState<Phase>("intro");
  const [cards, setCards] = useState<Card[]>(() => createDeck(8));
  const [turn, setTurn] = useState<Player>("p1");
  const [scores, setScores] = useState<ScoreState>({ p1: 0, p2: 0 });
  const [opened, setOpened] = useState<number[]>([]);
  const lockBoard = opened.length === 2;
  const isFinished =
    phase === "playing" && cards.every((card) => card.state === "matched");

  // ── エフェクト状態 ─────────────────────────────────────────────────────────
  const [matchAnim, setMatchAnim] = useState<ReadonlySet<number>>(new Set());
  const [mismatchShake, setMismatchShake] = useState(false);
  const [clearShake, setClearShake] = useState(false);
  const [comboDisplay, setComboDisplay] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [matchPopupPlayer, setMatchPopupPlayer] = useState<Player | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      if (comboTimerRef.current !== null) {
        window.clearTimeout(comboTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (opened.length !== 2) {
      return;
    }

    const [firstIndex, secondIndex] = opened;
    const first = cards[firstIndex];
    const second = cards[secondIndex];

    if (!first || !second) {
      return;
    }

    const isMatch = first.symbol === second.symbol;

    timerRef.current = window.setTimeout(() => {
      if (isMatch) {
        setCards((prev) =>
          prev.map((card, index) => {
            if (index !== firstIndex && index !== secondIndex) {
              return card;
            }

            return {
              ...card,
              state: "matched",
              owner: turn,
            };
          }),
        );

        setScores((prev) => ({
          ...prev,
          [turn]: prev[turn] + 1,
        }));

        // ── マッチエフェクト ──────────────────────────────────────────────
        playArpeggio([600, 900], 0.15, "triangle", 0.2, 0.1);
        setMatchAnim(new Set([firstIndex, secondIndex]));
        window.setTimeout(() => setMatchAnim(new Set()), 700);
        setMatchPopupPlayer(turn);
        window.setTimeout(() => setMatchPopupPlayer(null), 1200);

        // コンボ更新
        if (lastMatchPlayerRef.current === turn) {
          comboCountRef.current += 1;
        } else {
          comboCountRef.current = 1;
        }
        lastMatchPlayerRef.current = turn;

        if (comboCountRef.current >= 2) {
          setComboDisplay(comboCountRef.current);
          setShowCombo(true);
          if (comboTimerRef.current !== null) {
            window.clearTimeout(comboTimerRef.current);
          }
          comboTimerRef.current = window.setTimeout(() => {
            setShowCombo(false);
            comboTimerRef.current = null;
          }, 1500);
        }
      } else {
      setCards((prev) => {
          const next = prev.map((card, index) => {
            if (index !== firstIndex && index !== secondIndex) {
              return card;
            }
            return { ...card, state: "down" as CardState };
          });
          return settings.shuffleMode === "shuffle"
            ? shuffleUnmatched(next)
            : next;
        });

        setTurn((prev) => nextPlayer(prev));

        // ── ミスマッチエフェクト ──────────────────────────────────────────
        playSweep(200, 100, 0.2, "sawtooth", 0.12);
        setMismatchShake(true);
        window.setTimeout(() => setMismatchShake(false), 500);

        // ミスでコンボリセット
        comboCountRef.current = 0;
        lastMatchPlayerRef.current = null;
      }

      setOpened([]);
      timerRef.current = null;
    }, settings.flipTime);
  }, [cards, opened, turn, playArpeggio, playSweep, settings]);

  // ── ゲームクリア演出 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFinished) {
      return;
    }
    const t0 = window.setTimeout(() => {
      playArpeggio([523, 659, 784, 1047], 0.25, "triangle", 0.2, 0.12);
      setShowConfetti(true);
      setShowWinnerPopup(true);
      setClearShake(true);
    }, 0);
    const t1 = window.setTimeout(() => setClearShake(false), 600);
    const t2 = window.setTimeout(() => setShowConfetti(false), 4000);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isFinished, playArpeggio]);

  const startGame = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (comboTimerRef.current !== null) {
      window.clearTimeout(comboTimerRef.current);
      comboTimerRef.current = null;
    }

    // エフェクト状態リセット
    setMatchAnim(new Set());
    setMismatchShake(false);
    setClearShake(false);
    setComboDisplay(0);
    setShowCombo(false);
    setMatchPopupPlayer(null);
    setShowConfetti(false);
    setShowWinnerPopup(false);
    comboCountRef.current = 0;
    lastMatchPlayerRef.current = null;

    setCards(createDeck(settings.cardCount / 2));
    setTurn("p1");
    setScores({ p1: 0, p2: 0 });
    setOpened([]);
    setPhase("playing");
  };

  const handleCardClick = (index: number) => {
    if (phase !== "playing" || isFinished || lockBoard) {
      return;
    }

    if (opened.length >= 2 || opened.includes(index)) {
      return;
    }

    const target = cards[index];
    if (!target || target.state !== "down") {
      return;
    }

    setCards((prev) =>
      prev.map((card, cardIndex) =>
        cardIndex === index
          ? {
              ...card,
              state: "up",
            }
          : card,
      ),
    );

    playSweep(1200, 800, 0.1, "sine", 0.12);
    setOpened((prev) => [...prev, index]);
  };

  const winnerText = useMemo(() => {
    if (scores.p1 === scores.p2) {
      return "引き分け";
    }

    return scores.p1 > scores.p2
      ? `勝者 ${settings.playerNames.p1}`
      : `勝者 ${settings.playerNames.p2}`;
  }, [scores.p1, scores.p2, settings.playerNames]);

  return (
    <GameShell title="Memory Duel" gameId="memoryduel">
      <main
        className={`app${mismatchShake ? " shake" : ""}${clearShake ? " clearShake" : ""}`}
      >
        {/* コンフェッティオーバーレイ */}
        {showConfetti && (
          <div className="confettiOverlay" aria-hidden="true">
            {CONFETTI_PIECES.map((p) => (
              <span
                key={p.id}
                className="confettiPiece"
                style={{
                  left: `${p.left}%`,
                  backgroundColor: p.color,
                  animationDelay: `${p.animDelay}s`,
                  animationDuration: `${p.animDuration}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* 勝者ポップアップ */}
        {showWinnerPopup && (
          <div
            className="winnerPopup"
            role="status"
            onClick={() => setShowWinnerPopup(false)}
          >
            <span className="winnerIcon">🏆</span>
            <span className="winnerText">{winnerText}</span>
            <span className="winnerSub">クリックで閉じる</span>
          </div>
        )}

        <section className="panel">
          <h1>Memory Duel</h1>
          <p className="subtitle">ローカル2人の神経衰弱バトル</p>

          <div className="ruleBox">
            <h2>ルール</h2>
            <ul>
              <li>1ターンで2枚をめくる</li>
              <li>同じ絵柄なら獲得して連続ターン</li>
              <li>そろわなければ相手のターンへ交代</li>
              <li>最終的に獲得ペア数の多い方が勝ち</li>
            </ul>
          </div>

          {phase === "intro" && (
            <div className="settingsBlock">
              <div className="settingGroup">
                <span className="settingLabel">カード枚数</span>
                <div className="btnGroup">
                  {CARD_COUNT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btnOption${settings.cardCount === opt.value ? " selected" : ""}`}
                      onClick={() => updateSettings("cardCount", opt.value)}
                    >
                      <strong>{opt.label}</strong>
                      <span className="optDesc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settingGroup">
                <span className="settingLabel">めくり確認時間</span>
                <div className="btnGroup">
                  {FLIP_TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btnOption${settings.flipTime === opt.value ? " selected" : ""}`}
                      onClick={() => updateSettings("flipTime", opt.value)}
                    >
                      <strong>{opt.label}</strong>
                      <span className="optDesc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settingGroup">
                <span className="settingLabel">シャッフルモード</span>
                <div className="btnGroup">
                  {SHUFFLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btnOption${settings.shuffleMode === opt.value ? " selected" : ""}`}
                      onClick={() => updateSettings("shuffleMode", opt.value)}
                    >
                      <strong>{opt.label}</strong>
                      <span className="optDesc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settingGroup">
                <span className="settingLabel">プレイヤー名</span>
                <div className="nameInputs">
                  <input
                    type="text"
                    className="nameInput"
                    value={settings.playerNames.p1}
                    onChange={(e) =>
                      updateSettings("playerNames", {
                        ...settings.playerNames,
                        p1: e.target.value,
                      })
                    }
                    placeholder="Player 1"
                    maxLength={12}
                  />
                  <input
                    type="text"
                    className="nameInput"
                    value={settings.playerNames.p2}
                    onChange={(e) =>
                      updateSettings("playerNames", {
                        ...settings.playerNames,
                        p2: e.target.value,
                      })
                    }
                    placeholder="Player 2"
                    maxLength={12}
                  />
                </div>
              </div>

              <button className="action startBtn" type="button" onClick={startGame}>
                対戦開始
              </button>
            </div>
          )}

          {phase !== "intro" && (
            <>
              <p className="statusText">
                {!isFinished && <>手番 {settings.playerNames[turn]}</>}
                {isFinished && <>{winnerText}</>}
              </p>

              {/* コンボ表示 */}
              {showCombo && (
                <div
                  className={`comboDisplay${comboDisplay >= 3 ? " onFire" : ""}`}
                  aria-live="polite"
                >
                  {comboDisplay >= 3 && (
                    <span className="fireLabel">🔥 ON FIRE! </span>
                  )}
                  <span>COMBO ×{comboDisplay}</span>
                </div>
              )}

              <div className="scoreRow">
                {(["p1", "p2"] as const).map((player) => (
                  <div
                    key={player}
                    className={`scoreCard${turn === player && !isFinished ? " active" : ""}`}
                  >
                    <span>{settings.playerNames[player]}</span>
                    <strong>{scores[player]}</strong>
                    {/* MATCH ポップアップ */}
                    {matchPopupPlayer === player && (
                      <span className="matchPopup" aria-hidden="true">
                        ✨ MATCH!
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="board"
                role="grid"
                aria-label="memory duel board"
                style={{
                  gridTemplateColumns: `repeat(${COLS_MAP[settings.cardCount]}, minmax(0, 1fr))`,
                }}
              >
                {cards.map((card, index) => {
                  const faceUp =
                    card.state === "up" || card.state === "matched";
                  const ownerClass = card.owner ? `owner-${card.owner}` : "";
                  const hasParticle = matchAnim.has(index);

                  return (
                    <button
                      key={card.id}
                      className={`card ${faceUp ? "open" : ""} ${card.state === "matched" ? "matched" : ""} ${ownerClass}`}
                      type="button"
                      onClick={() => handleCardClick(index)}
                      disabled={
                        phase !== "playing" ||
                        isFinished ||
                        lockBoard ||
                        card.state !== "down"
                      }
                    >
                      <span>{faceUp ? card.symbol : "?"}</span>
                      {hasParticle && (
                        <span className="particleBurst" aria-hidden="true">
                          {Array.from({ length: 8 }, (_, i) => (
                            <span key={i} className={`particle p${i}`} />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="actionRow">
                <button className="action" type="button" onClick={startGame}>
                  もう一戦
                </button>
                <button
                  className="action secondary"
                  type="button"
                  onClick={() => setPhase("intro")}
                >
                  タイトルへ
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </GameShell>
  );
};

export default App;
