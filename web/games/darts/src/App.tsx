import { useCallback, useState, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { ShareButton } from "@shared/components/ShareButton";
import { GameRecommendations } from "@shared/components/GameRecommendations";
import type { PopupVariant } from "@shared/components/ScorePopup";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import { DartBoard } from "./components/DartBoard";
import { ScorePanel } from "./components/ScorePanel";
import type { GameState, ThrowResult } from "./lib/types";
import {
  createInitialState,
  processThrow,
  nextRound,
  isRoundComplete,
  calculateScore,
} from "./lib/darts";
import { BOARD_RADIUS } from "./lib/constants";
import "./App.css";

export default function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [lastThrow, setLastThrow] = useState<ThrowResult | null>(null);
  const [dartPositions, setDartPositions] = useState<{ x: number; y: number }[]>([]);
  
  // パーティクル & オーディオ
  const { particles, burst, confetti, sparkle, explosion } = useParticles();
  const { playTone, playSweep, playArpeggio, playNoise, playCelebrate, playMiss } = useAudio();
  
  // スコアポップアップ用
  const [popup, setPopup] = useState<{ text: string; variant: PopupVariant; x: string; y: string; key: number } | null>(null);
  const popupKeyRef = useRef(0);
  
  // 画面フラッシュ
  const [flash, setFlash] = useState(false);
  
  // ダーツ飛行中トレイル
  const [flyingDart, setFlyingDart] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);

  // 効果音関数
  const playThrowSound = useCallback(() => {
    playSweep(400, 800, 0.15, "sine", 0.15);
  }, [playSweep]);

  const playHitSound = useCallback(() => {
    playTone(600, 0.1, "triangle", 0.25);
    playNoise(0.05, 0.15, 1500);
  }, [playTone, playNoise]);

  const playBullseyeSound = useCallback(() => {
    playArpeggio([880, 1100, 1320, 1760], 0.15, "sine", 0.25, 0.08);
    playTone(440, 0.3, "triangle", 0.15, 0.4);
  }, [playArpeggio, playTone]);

  const playTripleSound = useCallback(() => {
    playTone(880, 0.1, "sine", 0.2);
    playTone(1100, 0.12, "triangle", 0.22, 0.08);
    playTone(1320, 0.08, "sine", 0.18, 0.16);
  }, [playTone]);

  const playDoubleSound = useCallback(() => {
    playTone(660, 0.1, "sine", 0.2);
    playTone(880, 0.12, "triangle", 0.2, 0.06);
  }, [playTone]);

  const handleStart = useCallback(() => {
    setGameState(() => ({
      ...createInitialState(),
      phase: "playing",
    }));
    setLastThrow(null);
    setDartPositions([]);
    setPopup(null);
  }, []);

  const handleBoardClick = useCallback(
    (clientX: number, clientY: number, boardRect: DOMRect) => {
      if (gameState.phase !== "playing") return;
      if (isRoundComplete(gameState)) return;

      const centerX = boardRect.width / 2;
      const centerY = boardRect.height / 2;
      const clickX = clientX - boardRect.left;
      const clickY = clientY - boardRect.top;

      // 投げる音
      playThrowSound();

      // ダーツ飛行トレイルアニメーション
      const targetX = clickX - centerX + BOARD_RADIUS;
      const targetY = clickY - centerY + BOARD_RADIUS;
      setFlyingDart({
        from: { x: BOARD_RADIUS, y: BOARD_RADIUS + 150 },
        to: { x: targetX, y: targetY },
      });

      // 少し遅延してからダーツ着弾
      setTimeout(() => {
        setFlyingDart(null);
        
        const result = calculateScore(clickX, clickY, centerX, centerY);
        setLastThrow(result);
        setDartPositions((prev) => [...prev, { x: result.position.x + BOARD_RADIUS, y: result.position.y + BOARD_RADIUS }]);
        setGameState((state) => processThrow(state, result));

        // 着弾位置（ボード上のスクリーン座標に近似）
        const hitX = boardRect.left + targetX;
        const hitY = boardRect.top + targetY;
        
        // ポップアップ位置
        const popupX = `${((targetX + 20) / (BOARD_RADIUS * 2 + 40)) * 100}%`;
        const popupY = `${((targetY + 20) / (BOARD_RADIUS * 2 + 40)) * 100 - 10}%`;

        // 演出分岐
        if (result.section === 25 && result.multiplier === 2) {
          // ダブルブル（50点）
          playBullseyeSound();
          explosion(hitX, hitY, 30);
          confetti(60);
          setFlash(true);
          setTimeout(() => setFlash(false), 150);
          popupKeyRef.current++;
          setPopup({ text: "🎯 BULLSEYE! +50", variant: "critical", x: popupX, y: popupY, key: popupKeyRef.current });
        } else if (result.section === 25) {
          // シングルブル（25点）
          playDoubleSound();
          sparkle(hitX, hitY, 12);
          popupKeyRef.current++;
          setPopup({ text: "BULL! +25", variant: "bonus", x: popupX, y: popupY, key: popupKeyRef.current });
        } else if (result.multiplier === 3) {
          // トリプル
          playTripleSound();
          sparkle(hitX, hitY, 16);
          burst(hitX, hitY, 15);
          popupKeyRef.current++;
          setPopup({ text: `T${result.section}! +${result.score}`, variant: "combo", x: popupX, y: popupY, key: popupKeyRef.current });
        } else if (result.multiplier === 2) {
          // ダブル
          playDoubleSound();
          sparkle(hitX, hitY, 10);
          popupKeyRef.current++;
          setPopup({ text: `D${result.section}! +${result.score}`, variant: "bonus", x: popupX, y: popupY, key: popupKeyRef.current });
        } else if (result.score > 0) {
          // シングル
          playHitSound();
          burst(hitX, hitY, 8);
          popupKeyRef.current++;
          setPopup({ text: `+${result.score}`, variant: "default", x: popupX, y: popupY, key: popupKeyRef.current });
        } else {
          // ミス
          playMiss();
          popupKeyRef.current++;
          setPopup({ text: "MISS", variant: "default", x: popupX, y: popupY, key: popupKeyRef.current });
        }

        // ゲーム終了時の演出
        const newState = processThrow(gameState, result);
        if (newState.phase === "finished") {
          playCelebrate();
          confetti(100);
        }
      }, 120);
    },
    [gameState, playThrowSound, playBullseyeSound, playTripleSound, playDoubleSound, playHitSound, playMiss, playCelebrate, burst, confetti, sparkle, explosion]
  );

  const handleNextRound = useCallback(() => {
    setGameState((state) => nextRound(state));
    setLastThrow(null);
    setDartPositions([]);
    setPopup(null);
  }, []);

  const roundComplete = isRoundComplete(gameState);

  return (
    <GameShell gameId="darts" layout="default">
      <div className={"darts-container" + (flash ? " darts-flash" : "")}>
        {/* パーティクルレイヤー */}
        <ParticleLayer particles={particles} />
        
        {/* ヘッダー */}
        <div className="darts-header">
          <div className="darts-score-display">
            <span className="darts-score-label">SCORE</span>
            <span className="darts-score-value">{gameState.score}</span>
          </div>
          <div className="darts-round-display">
            <span className="darts-round-label">ROUND</span>
            <span className="darts-round-value">{gameState.round.roundNumber}</span>
          </div>
          <div className="darts-throws-display">
            <span className="darts-throws-label">DARTS</span>
            <span className="darts-throws-value">
              {3 - gameState.round.throwsInRound} / 3
            </span>
          </div>
        </div>

        {/* メインエリア */}
        <div className="darts-main">
          {/* ダーツボード */}
          <div className="darts-board-wrapper">
            <DartBoard
              onThrow={handleBoardClick}
              dartPositions={dartPositions}
              disabled={gameState.phase !== "playing" || roundComplete}
              flyingDart={flyingDart}
            />
            {/* ボード上のスコアポップアップ */}
            {popup && (
              <ScorePopup
                text={popup.text}
                popupKey={popup.key}
                x={popup.x}
                y={popup.y}
                variant={popup.variant}
                size="lg"
              />
            )}
          </div>

          {/* サイドパネル */}
          <ScorePanel
            throwResults={gameState.round.throwResults}
            lastThrow={lastThrow}
            busted={gameState.busted}
          />
        </div>

        {/* オーバーレイ */}
        {gameState.phase === "ready" && (
          <div className="darts-overlay">
            <h1 className="darts-title">DARTS 301</h1>
            <p className="darts-desc">
              ダーツボードをクリック/タップして投げよう！<br />
              301点からちょうど0を目指せ
            </p>
            <button className="darts-btn" onClick={handleStart}>
              START
            </button>
          </div>
        )}

        {gameState.phase === "finished" && (
          <div className="darts-overlay">
            <h2 className="darts-result-title">🎯 FINISH!</h2>
            <div className="darts-result-stats">
              <div>ラウンド数: {gameState.round.roundNumber}</div>
              <div>総投擲数: {gameState.history.length}</div>
            </div>
            <ShareButton score={gameState.score} gameTitle="Darts" gameId="darts" />
            <GameRecommendations currentGameId="darts" />
            <button className="darts-btn" onClick={handleStart}>
              PLAY AGAIN
            </button>
          </div>
        )}

        {roundComplete && gameState.phase === "playing" && (
          <div className="darts-round-overlay">
            {gameState.busted ? (
              <>
                <h2 className="darts-bust-title">💥 BUST!</h2>
                <p className="darts-bust-desc">スコアがリセットされます</p>
              </>
            ) : (
              <h2 className="darts-round-end-title">ラウンド終了</h2>
            )}
            <button className="darts-btn" onClick={handleNextRound}>
              NEXT ROUND
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
