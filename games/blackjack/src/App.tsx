import { useState, useCallback, useRef, useEffect } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ScreenShake } from "@shared/components/ScreenShake";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import type { PopupVariant } from "@shared/components/ScorePopup";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import type { Card, Phase, RoundResult } from "./lib/types";
import {
  INITIAL_CHIPS,
  BET_OPTIONS,
  BLACKJACK_PAYOUT,
  WIN_PAYOUT,
  GAME_WIDTH,
  GAME_HEIGHT,
} from "./lib/constants";
import {
  createDeck,
  shuffle,
  calculateHandValue,
  isBlackjack,
  isBust,
  shouldDealerHit,
  determineResult,
  getSuitColor,
} from "./lib/blackjack";
import "./App.css";

/** ScorePopupのエントリ */
interface PopupEntry {
  id: number;
  text: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  x: string;
  y: string;
}

/** ストリーク・マイルストーン定数 */
const STREAK_MILESTONES = [3, 5, 10];
const BALANCE_MILESTONES = [200, 500, 1000, 2000, 5000];

export default function App() {
  const [phase, setPhase] = useState<Phase>("betting");
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [bet, setBet] = useState(0);
  const [result, setResult] = useState<RoundResult>(null);

  // アニメーション用の状態
  const [animatingCards, setAnimatingCards] = useState<{ hand: "player" | "dealer"; index: number }[]>([]);
  const [bustFlash, setBustFlash] = useState(false);
  const [goldFlash, setGoldFlash] = useState(false);
  const [chipAnimation, setChipAnimation] = useState<{ amount: number; show: boolean }>({ amount: 0, show: false });
  const [popups, setPopups] = useState<PopupEntry[]>([]);
  const [winStreak, setWinStreak] = useState(0);
  const [reachedBalanceMilestones, setReachedBalanceMilestones] = useState<number[]>([]);

  // フック
  const { particles, confetti, sparkle } = useParticles();
  const audio = useAudio();
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const popupIdRef = useRef(0);

  // ScorePopup表示関数
  const showPopup = useCallback((
    text: string,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md",
    x = "50%",
    y = "40%"
  ) => {
    const id = ++popupIdRef.current;
    setPopups((prev) => [...prev, { id, text, variant, size, x, y }]);
    // 自動削除
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1500);
  }, []);

  // refを使用してコールバック間で状態を共有
  const betRef = useRef(bet);
  useEffect(() => {
    betRef.current = bet;
  }, [bet]);

  // 新しいデッキで初期化
  const initDeck = useCallback(() => {
    return shuffle(createDeck());
  }, []);

  // カードを引く(純粋関数)
  const drawCardFromDeck = useCallback(
    (currentDeck: Card[]): [Card, Card[]] => {
      let deckToUse = currentDeck;
      if (deckToUse.length < 10) {
        deckToUse = initDeck();
      }
      const card = deckToUse[0];
      return [card, deckToUse.slice(1)];
    },
    [initDeck]
  );

  // カード配布アニメーション追加関数
  const addCardAnimation = useCallback((hand: "player" | "dealer", index: number) => {
    const key = { hand, index };
    setAnimatingCards(prev => [...prev, key]);
    // ディール音
    audio.playClick();
    setTimeout(() => {
      setAnimatingCards(prev => prev.filter(c => !(c.hand === hand && c.index === index)));
    }, 600);
  }, [audio]);

  // ラウンド終了処理
  const finishRound = useCallback(
    (pHand: Card[], dHand: Card[], finalDeck: Card[]) => {
      const roundResult = determineResult(pHand, dHand);
      setResult(roundResult);
      setDeck(finalDeck);

      // チップ計算
      const currentBet = betRef.current;
      let payout = 0;
      const isWin = roundResult === "blackjack" || roundResult === "win";
      
      if (roundResult === "blackjack") {
        payout = Math.floor(currentBet * BLACKJACK_PAYOUT);
        // ブラックジャック演出
        setGoldFlash(true);
        confetti(60);
        audio.playCelebrate();
        setTimeout(() => setGoldFlash(false), 800);
        // ScorePopup: Blackjack!
        showPopup("🃏 BLACKJACK!", "critical", "xl", "50%", "35%");
        setTimeout(() => {
          showPopup(`+$${payout}`, "bonus", "lg", "50%", "50%");
        }, 400);
      } else if (roundResult === "win") {
        payout = currentBet * WIN_PAYOUT;
        // 勝利演出
        sparkle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 12);
        audio.playFanfare();
        // ScorePopup: Win
        showPopup("🏆 WIN!", "default", "lg", "50%", "35%");
        setTimeout(() => {
          showPopup(`+$${payout}`, "bonus", "md", "50%", "50%");
        }, 300);
      } else if (roundResult === "push") {
        payout = currentBet;
        audio.playClick();
        // ScorePopup: Push
        showPopup("🤝 PUSH", "default", "md", "50%", "40%");
      } else if (roundResult === "lose") {
        audio.playMiss();
        // ScorePopup: Lose
        showPopup("😢 LOSE", "combo", "md", "50%", "40%");
      }
      // bustはhit時に処理済み

      // ストリーク処理
      if (isWin) {
        setWinStreak((prevStreak) => {
          const newStreak = prevStreak + 1;
          // ストリークマイルストーンチェック
          if (STREAK_MILESTONES.includes(newStreak)) {
            setTimeout(() => {
              showPopup(`🔥 ${newStreak}連勝!`, "combo", "lg", "50%", "25%");
              sparkle(GAME_WIDTH / 2, GAME_HEIGHT * 0.25, 8);
            }, 800);
          }
          return newStreak;
        });
      } else if (roundResult === "lose" || roundResult === "bust") {
        setWinStreak(0);
      }

      // チップ更新と残高マイルストーンチェック
      if (payout > 0) {
        setChips((currentChips) => {
          const newBalance = currentChips + payout;
          
          // 残高マイルストーンチェック
          setReachedBalanceMilestones((reached) => {
            const newMilestones = BALANCE_MILESTONES.filter(
              (m) => newBalance >= m && !reached.includes(m)
            );
            if (newMilestones.length > 0) {
              const highestMilestone = Math.max(...newMilestones);
              setTimeout(() => {
                showPopup(`💰 $${highestMilestone}達成!`, "level", "xl", "50%", "20%");
                confetti(40);
                audio.playCelebrate();
              }, 1000);
            }
            return [...reached, ...newMilestones];
          });
          
          return newBalance;
        });
        // コイン増加アニメーション
        setChipAnimation({ amount: payout, show: true });
        setTimeout(() => setChipAnimation({ amount: 0, show: false }), 1500);
      }

      setPhase("result");
    },
    [audio, confetti, sparkle, showPopup]
  );

  // ディーラーのターン処理(useEffect経由で実行)
  const [dealerTurnData, setDealerTurnData] = useState<{
    hand: Card[];
    deckState: Card[];
    playerCards: Card[];
  } | null>(null);

  useEffect(() => {
    if (phase !== "dealerTurn" || !dealerTurnData) return;

    const { hand, deckState, playerCards } = dealerTurnData;

    if (shouldDealerHit(hand)) {
      const timer = setTimeout(() => {
        const [card, newDeck] = drawCardFromDeck(deckState);
        const newHand = [...hand, card];
        setDealerHand(newHand);
        setDeck(newDeck);
        // ディーラーカード追加アニメーション
        addCardAnimation("dealer", newHand.length - 1);
        setDealerTurnData({ hand: newHand, deckState: newDeck, playerCards });
      }, 600);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        finishRound(playerCards, hand, deckState);
        setDealerTurnData(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [phase, dealerTurnData, drawCardFromDeck, finishRound, addCardAnimation]);

  // ベット確定してゲーム開始
  const placeBet = useCallback(
    (amount: number) => {
      if (amount > chips) return;

      let newDeck = deck.length < 10 ? initDeck() : [...deck];

      // プレイヤーに2枚、ディーラーに2枚配る
      const pHand: Card[] = [];
      const dHand: Card[] = [];

      let card: Card;
      [card, newDeck] = drawCardFromDeck(newDeck);
      pHand.push(card);
      [card, newDeck] = drawCardFromDeck(newDeck);
      dHand.push(card);
      [card, newDeck] = drawCardFromDeck(newDeck);
      pHand.push(card);
      [card, newDeck] = drawCardFromDeck(newDeck);
      dHand.push(card);

      setDeck(newDeck);
      setPlayerHand(pHand);
      setDealerHand(dHand);
      setBet(amount);
      setChips((c) => c - amount);
      setResult(null);

      // カード配布アニメーション（順次発火）
      setTimeout(() => addCardAnimation("player", 0), 100);
      setTimeout(() => addCardAnimation("dealer", 0), 250);
      setTimeout(() => addCardAnimation("player", 1), 400);
      setTimeout(() => addCardAnimation("dealer", 1), 550);

      // プレイヤーブラックジャックチェック
      if (isBlackjack(pHand)) {
        setPhase("dealerTurn");
        setDealerTurnData({ hand: dHand, deckState: newDeck, playerCards: pHand });
      } else {
        setPhase("playing");
      }
    },
    [chips, deck, drawCardFromDeck, initDeck, addCardAnimation]
  );

  // ヒット
  const hit = useCallback(() => {
    if (phase !== "playing") return;

    const [card, newDeck] = drawCardFromDeck(deck);
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(newDeck);

    // ヒットアニメーション
    addCardAnimation("player", newHand.length - 1);

    if (isBust(newHand)) {
      // バースト演出
      setBustFlash(true);
      shakeRef.current?.shake("heavy", 400);
      audio.playExplosion();
      setTimeout(() => setBustFlash(false), 500);
      // ScorePopup: Bust
      showPopup("💥 BUST!", "combo", "xl", "50%", "40%");
      setResult("bust");
      setPhase("result");
      // ストリークリセット
      setWinStreak(0);
    }
  }, [phase, deck, playerHand, drawCardFromDeck, addCardAnimation, audio, showPopup]);

  // スタンド
  const stand = useCallback(() => {
    if (phase !== "playing") return;
    audio.playClick();
    setPhase("dealerTurn");
    setDealerTurnData({ hand: dealerHand, deckState: deck, playerCards: playerHand });
  }, [phase, dealerHand, deck, playerHand, audio]);

  // 次のラウンド
  const nextRound = useCallback(() => {
    if (chips <= 0) {
      // ゲームオーバー、リセット
      setChips(INITIAL_CHIPS);
    }
    setPlayerHand([]);
    setDealerHand([]);
    setBet(0);
    setResult(null);
    setPhase("betting");
  }, [chips]);

  // カード描画用ヘルパー - アニメーションクラス判定
  const isCardAnimating = (hand: "player" | "dealer", index: number): boolean => {
    return animatingCards.some(c => c.hand === hand && c.index === index);
  };

  // カードを描画
  const renderCard = (card: Card, hidden: boolean = false, animating: boolean = false) => {
    const cardClass = `bj-card ${animating ? "bj-card--deal" : ""}`;
    if (hidden) {
      return (
        <div className={`${cardClass} bj-card--back`}>
          <span className="bj-card-back-pattern">🂠</span>
        </div>
      );
    }
    return (
      <div className={cardClass} style={{ color: getSuitColor(card.suit) }}>
        <span className="bj-card-rank">{card.rank}</span>
        <span className="bj-card-suit">{card.suit}</span>
      </div>
    );
  };

  // 結果メッセージ
  const getResultMessage = (): string => {
    switch (result) {
      case "blackjack":
        return "🎉 BLACKJACK!";
      case "win":
        return "🏆 WIN!";
      case "lose":
        return "😢 LOSE";
      case "push":
        return "🤝 PUSH";
      case "bust":
        return "💥 BUST!";
      default:
        return "";
    }
  };

  const playerValue = calculateHandValue(playerHand);
  const dealerValue = calculateHandValue(dealerHand);
  const showDealerHand = phase === "dealerTurn" || phase === "result";

  // フラッシュオーバーレイのクラス
  const flashClass = bustFlash ? "bj-flash--bust" : goldFlash ? "bj-flash--gold" : "";

  return (
    <GameShell gameId="blackjack" layout="default">
      <ScreenShake ref={shakeRef}>
        <div
          className={`bj-root ${flashClass}`}
          style={{ width: `${GAME_WIDTH}px`, height: `${GAME_HEIGHT}px` }}
        >
          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />

          {/* ScorePopupレイヤー */}
          {popups.map((p) => (
            <ScorePopup
              key={p.id}
              popupKey={p.id}
              text={p.text}
              variant={p.variant}
              size={p.size}
              x={p.x}
              y={p.y}
            />
          ))}

          {/* チップ表示 */}
          <div className="bj-chips-display">
            <span className="bj-chip-icon">🪙</span>
            <span className="bj-chip-count">{chips}</span>
            {/* コイン増加アニメーション */}
            {chipAnimation.show && (
              <span className="bj-chip-gain">+{chipAnimation.amount}</span>
            )}
          </div>

          {/* 連勝表示 */}
          {winStreak >= 2 && (
            <div className="bj-streak-display">
              🔥 {winStreak}連勝
            </div>
          )}

          {/* マイルストーン達成バッジ */}
          {reachedBalanceMilestones.length > 0 && (
            <div className="bj-milestone-badges">
              {reachedBalanceMilestones.slice(-3).map((m) => (
                <span key={m} className="bj-milestone-badge">💰${m}</span>
              ))}
            </div>
          )}

          {/* ベット画面 */}
          {phase === "betting" && (
            <div className="bj-betting">
              <h1 className="bj-title">🃏 Blackjack</h1>
              <p className="bj-subtitle">ベット額を選択</p>
              <div className="bj-bet-options">
                {BET_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    className="bj-bet-btn"
                    onClick={() => placeBet(amount)}
                    disabled={amount > chips}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              {chips <= 0 && (
                <p className="bj-gameover">チップがありません！リセットします</p>
              )}
            </div>
          )}

          {/* ゲーム画面 */}
          {(phase === "playing" ||
            phase === "dealerTurn" ||
            phase === "result") && (
            <div className="bj-game">
              {/* ディーラー */}
              <div className="bj-hand-area">
                <div className="bj-hand-label">
                  ディーラー
                  {showDealerHand && (
                    <span className="bj-hand-value">({dealerValue})</span>
                  )}
                </div>
                <div className="bj-hand">
                  {dealerHand.map((card, i) =>
                    i === 1 && !showDealerHand ? (
                      <div key={i}>{renderCard(card, true, isCardAnimating("dealer", i))}</div>
                    ) : (
                      <div key={i}>{renderCard(card, false, isCardAnimating("dealer", i))}</div>
                    )
                  )}
                </div>
              </div>

              {/* 結果表示 */}
              {phase === "result" && result && (
                <div className={`bj-result bj-result--${result}`}>
                  {getResultMessage()}
                </div>
              )}

              {/* プレイヤー */}
              <div className="bj-hand-area">
                <div className="bj-hand-label">
                  あなた
                  <span className="bj-hand-value">({playerValue})</span>
                </div>
                <div className="bj-hand">
                  {playerHand.map((card, i) => (
                    <div key={i}>{renderCard(card, false, isCardAnimating("player", i))}</div>
                  ))}
                </div>
              </div>

              {/* ベット表示 */}
              <div className="bj-current-bet">BET: {bet}</div>

              {/* アクションボタン */}
              {phase === "playing" && (
                <div className="bj-actions">
                  <button className="bj-action-btn bj-action-btn--hit" onClick={hit}>
                    HIT
                  </button>
                  <button
                    className="bj-action-btn bj-action-btn--stand"
                    onClick={stand}
                  >
                    STAND
                  </button>
                </div>
              )}

              {phase === "result" && (
                <div className="bj-actions">
                  <button className="bj-action-btn bj-action-btn--next" onClick={nextRound}>
                    次のラウンド
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}