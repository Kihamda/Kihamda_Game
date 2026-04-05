import { useState, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { ShareButton } from "@shared/components/ShareButton";
import { GameRecommendations } from "@shared/components/GameRecommendations";
import { ScreenShake } from "@shared/components/ScreenShake";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import type { GamePhase, Symbol, SpinResult } from "./lib/types";
import {
  INITIAL_COINS,
  DEFAULT_BET,
  MIN_BET,
  MAX_BET,
  BET_STEP,
  SPIN_DURATION,
  REEL_STOP_DELAY,
  SYMBOLS_PER_REEL,
  GAME_WIDTH,
  GAME_HEIGHT,
} from "./lib/constants";
import { generateReelSymbols, evaluateSpinResult, calculateWinnings } from "./lib/slot";
import "./App.css";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [coins, setCoins] = useState(INITIAL_COINS);
  const [bet, setBet] = useState(DEFAULT_BET);
  const [reels, setReels] = useState<Symbol[][]>(() => [
    generateReelSymbols(SYMBOLS_PER_REEL),
    generateReelSymbols(SYMBOLS_PER_REEL),
    generateReelSymbols(SYMBOLS_PER_REEL),
  ]);
  const [reelPositions, setReelPositions] = useState([0, 0, 0]);
  const [stoppedReels, setStoppedReels] = useState([false, false, false]);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);

  const shakeRef = useRef<ScreenShakeHandle>(null);
  const { particles, confetti, explosion, sparkle } = useParticles();
  const { playTone, playSweep, playArpeggio, playCelebrate, playMiss, playBonus, playPerfect } = useAudio();

  // 効果音
  const playSpin = useCallback(() => {
    playSweep(200, 800, 0.3, "sawtooth", 0.15);
  }, [playSweep]);

  const playStop = useCallback(() => {
    playTone(300, 0.1, "square", 0.2);
  }, [playTone]);

  const playWin = useCallback(() => {
    playBonus();
  }, [playBonus]);

  const playJackpot = useCallback(() => {
    playCelebrate();
    setTimeout(() => playPerfect(), 300);
  }, [playCelebrate, playPerfect]);

  const playLose = useCallback(() => {
    playMiss();
  }, [playMiss]);

  // スピン処理
  const spin = useCallback(() => {
    if (phase !== "idle" || coins < bet) return;

    setCoins((c) => c - bet);
    setPhase("spinning");
    setStoppedReels([false, false, false]);
    setLastResult(null);

    // 新しいリールを生成
    const newReels = [
      generateReelSymbols(SYMBOLS_PER_REEL),
      generateReelSymbols(SYMBOLS_PER_REEL),
      generateReelSymbols(SYMBOLS_PER_REEL),
    ];
    setReels(newReels);

    // スピン音
    playSpin();

    // 最終停止位置を先に決定しておく
    const finalPositions = [
      Math.floor(Math.random() * (SYMBOLS_PER_REEL - 3)),
      Math.floor(Math.random() * (SYMBOLS_PER_REEL - 3)),
      Math.floor(Math.random() * (SYMBOLS_PER_REEL - 3)),
    ];

    // 各リールを順次停止（事前決定した位置を使用）
    const stopReel = (index: number) => {
      playStop();
      setStoppedReels((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
      setReelPositions((prev) => {
        const next = [...prev];
        next[index] = finalPositions[index];
        return next;
      });
    };

    setTimeout(() => stopReel(0), SPIN_DURATION);
    setTimeout(() => stopReel(1), SPIN_DURATION + REEL_STOP_DELAY);
    setTimeout(() => {
      stopReel(2);
      setPhase("stopping");
    }, SPIN_DURATION + REEL_STOP_DELAY * 2);

    // 結果判定（事前決定した位置を使用）
    setTimeout(() => {
      const resultSymbols: [Symbol, Symbol, Symbol] = [
        newReels[0][finalPositions[0] + 1],
        newReels[1][finalPositions[1] + 1],
        newReels[2][finalPositions[2] + 1],
      ];

      const result = evaluateSpinResult(resultSymbols);
      setLastResult(result);

      // 演出
      if (result.isJackpot) {
        // ジャックポット演出
        playJackpot();
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 500);
        confetti(100);
        setTimeout(() => confetti(80), 300);
        setTimeout(() => confetti(60), 600);
        shakeRef.current?.shake("extreme", 600);
        const winnings = calculateWinnings(bet, result.multiplier);
        setCoins((c) => c + winnings);
        setPopupText("+" + winnings + " 🎰 JACKPOT!");
        setPopupKey((k) => k + 1);
      } else if (result.matchType === "triple") {
        // 3つ揃い
        playWin();
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 200);
        confetti(50);
        explosion(GAME_WIDTH / 2, GAME_HEIGHT / 2, 20);
        shakeRef.current?.shake("medium", 300);
        const winnings = calculateWinnings(bet, result.multiplier);
        setCoins((c) => c + winnings);
        setPopupText("+" + winnings);
        setPopupKey((k) => k + 1);
      } else if (result.matchType === "pair") {
        // 2つ揃い
        playArpeggio([440, 550, 660], 0.1, "sine", 0.2, 0.08);
        sparkle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 12);
        const winnings = calculateWinnings(bet, result.multiplier);
        setCoins((c) => c + winnings);
        if (winnings > 0) {
          setPopupText("+" + winnings);
          setPopupKey((k) => k + 1);
        }
      } else {
        // ハズレ
        playLose();
      }

      setPhase("result");
      setTimeout(() => setPhase("idle"), 1500);
    }, SPIN_DURATION + REEL_STOP_DELAY * 2 + 100);
  }, [phase, coins, bet, playSpin, playStop, playJackpot, playWin, playLose, playArpeggio, confetti, explosion, sparkle]);

  // ベット調整
  const adjustBet = useCallback((delta: number) => {
    setBet((prev) => Math.max(MIN_BET, Math.min(MAX_BET, prev + delta)));
  }, []);

  // リセット
  const reset = useCallback(() => {
    setCoins(INITIAL_COINS);
    setBet(DEFAULT_BET);
    setPhase("idle");
    setLastResult(null);
  }, []);

  // 現在のリール表示シンボル
  const getVisibleSymbols = (reelIndex: number): Symbol[] => {
    const pos = reelPositions[reelIndex];
    const reel = reels[reelIndex];
    return [reel[pos], reel[pos + 1], reel[pos + 2]];
  };

  const isSpinning = phase === "spinning" || phase === "stopping";

  return (
    <GameShell gameId="slotmachine" layout="default">
      <ScreenShake ref={shakeRef} style={{ width: "100%", height: "100%" }}>
        <div
          className="slot-root"
          style={{ width: GAME_WIDTH + "px", height: GAME_HEIGHT + "px" }}
        >
          <ParticleLayer particles={particles} />

          {/* フラッシュ効果 */}
          {showFlash && <div className="slot-flash" />}

          {/* タイトル */}
          <div className="slot-header">
            <h1 className="slot-title">🎰 SLOT MACHINE</h1>
            <div className="slot-coins">
              <span className="slot-coin-icon">🪙</span>
              <span className="slot-coin-count">{coins}</span>
            </div>
          </div>

          {/* スロットマシン本体 */}
          <div className="slot-machine">
            <div className="slot-frame">
              <div className="slot-reels-container">
                {[0, 1, 2].map((reelIndex) => (
                  <div
                    key={reelIndex}
                    className={
                      "slot-reel" +
                      (isSpinning && !stoppedReels[reelIndex] ? " slot-reel--spinning" : "") +
                      (stoppedReels[reelIndex] ? " slot-reel--stopped" : "")
                    }
                  >
                    {getVisibleSymbols(reelIndex).map((symbol, i) => (
                      <div
                        key={i}
                        className={
                          "slot-symbol" +
                          (i === 1 && lastResult?.isWin ? " slot-symbol--win" : "")
                        }
                      >
                        {symbol}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {/* 中央ライン */}
              <div className="slot-payline" />
            </div>
          </div>

          {/* スコアポップアップ */}
          <ScorePopup
            text={popupText}
            popupKey={popupKey}
            y="35%"
            variant={lastResult?.isJackpot ? "critical" : lastResult?.matchType === "triple" ? "bonus" : "default"}
            size={lastResult?.isJackpot ? "xl" : lastResult?.matchType === "triple" ? "lg" : "md"}
          />

          {/* 結果表示 */}
          {phase === "result" && lastResult && (
            <div className={"slot-result slot-result--" + lastResult.matchType}>
              {lastResult.isJackpot && "🎊 JACKPOT! 🎊"}
              {lastResult.matchType === "triple" && !lastResult.isJackpot && "🎉 BIG WIN!"}
              {lastResult.matchType === "pair" && "✨ WIN!"}
              {lastResult.matchType === "none" && "😢 TRY AGAIN"}
            </div>
          )}

          {/* コントロール */}
          <div className="slot-controls">
            <div className="slot-bet-controls">
              <button
                className="slot-bet-btn"
                onClick={() => adjustBet(-BET_STEP)}
                disabled={bet <= MIN_BET || isSpinning}
              >
                -
              </button>
              <div className="slot-bet-display">
                <span className="slot-bet-label">BET</span>
                <span className="slot-bet-value">{bet}</span>
              </div>
              <button
                className="slot-bet-btn"
                onClick={() => adjustBet(BET_STEP)}
                disabled={bet >= MAX_BET || isSpinning}
              >
                +
              </button>
            </div>

            <button
              className={"slot-spin-btn" + (isSpinning ? " slot-spin-btn--spinning" : "")}
              onClick={spin}
              disabled={isSpinning || coins < bet}
            >
              {isSpinning ? "🌀" : "SPIN"}
            </button>
          </div>

          {/* ゲームオーバー */}
          {coins < MIN_BET && phase === "idle" && (
            <div className="slot-gameover">
              <p>コインがなくなりました！</p>
              <button className="slot-reset-btn" onClick={reset}>
                リスタート
              </button>
              <ShareButton score={coins} gameTitle="スロットマシン" gameId="slotmachine" />
              <GameRecommendations currentGameId="slotmachine" />
            </div>
          )}

          {/* 配当表 */}
          <div className="slot-paytable">
            <div className="slot-paytable-row">
              <span>7️⃣7️⃣7️⃣</span>
              <span>×100</span>
            </div>
            <div className="slot-paytable-row">
              <span>⭐⭐⭐</span>
              <span>×50</span>
            </div>
            <div className="slot-paytable-row">
              <span>🔔🔔🔔</span>
              <span>×25</span>
            </div>
          </div>
        </div>
      </ScreenShake>
    </GameShell>
  );
}
