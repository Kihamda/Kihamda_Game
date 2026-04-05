import { useState, useCallback, useEffect, useRef } from "react";
import {
  GameShell,
  useParticles,
  useAudio,
  ParticleLayer,
  ScorePopup,
} from "@shared";
import type { Phase, GameState, UpgradeType, Milestone } from "./lib/types";
import { GAME_WIDTH, GAME_HEIGHT, AUTO_CLICK_INTERVAL } from "./lib/constants";
import {
  createInitialState,
  processClick,
  processAutoClick,
  purchaseUpgrade,
  checkMilestones,
  achieveMilestone,
} from "./lib/clickmaster";
import { loadGame, saveGame, clearSave } from "./lib/storage";
import { StartScreen } from "./components/StartScreen";
import { GameView } from "./components/GameView";
import "./App.css";

const App = () => {
  const [phase, setPhase] = useState<Phase>("start");
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const autoSaveRef = useRef<number | null>(null);

  // ドーパミン演出用
  const { particles, sparkle, confetti, explosion } = useParticles();
  const { playClick, playBonus, playLevelUp } = useAudio();
  const [popupText, setPopupText] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);
  const [milestoneFlash, setMilestoneFlash] = useState(false);
  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null);

  // クリック座標を保存（パーティクル用）
  const lastClickPos = useRef({ x: 0, y: 0 });
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  // ゲーム開始
  const handleStart = useCallback((continueGame: boolean) => {
    if (continueGame) {
      setGameState(loadGame());
    } else {
      clearSave();
      setGameState(createInitialState());
    }
    setPhase("playing");
  }, []);

  // クリック処理（ドーパミン演出付き）
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + rect.width / 2;
      const y = e.clientY - rect.top;
      lastClickPos.current = { x, y };
      setPopupPos({ x, y: y - 30 });

      setGameState((prev) => {
        const newState = processClick(prev);
        const earned = Math.floor(prev.clickPower * prev.multiplier);

        // スコアポップアップ
        setPopupText(`+${earned}`);
        setPopupKey((k) => k + 1);

        // パーティクルサイズ = クリックパワーに応じて変化
        const particleCount = Math.min(6 + Math.floor(prev.clickPower / 2), 20);
        sparkle(x, y, particleCount);

        // 効果音
        playClick();

        return newState;
      });
    },
    [sparkle, playClick]
  );

  // アップグレード購入（演出付き）
  const handlePurchase = useCallback(
    (upgradeId: UpgradeType) => {
      setGameState((prev) => {
        const newState = purchaseUpgrade(prev, upgradeId);
        if (newState !== prev) {
          // 購入成功時
          confetti(30);
          playBonus();
        }
        return newState;
      });
    },
    [confetti, playBonus]
  );

  // リセット
  const handleReset = useCallback(() => {
    clearSave();
    setGameState(createInitialState());
    setPhase("start");
  }, []);

  // マイルストーンチェック
  useEffect(() => {
    if (phase !== "playing") return;

    const milestone: Milestone | null = checkMilestones(gameState);
    if (milestone) {
      // マイルストーン達成 - setTimeout(0)でlintルール回避
      const timerId = setTimeout(() => {
        setGameState((prev) => achieveMilestone(prev, milestone.id));
        setMilestoneMessage(milestone.label);
        setMilestoneFlash(true);
      }, 0);
      explosion(GAME_WIDTH / 2, GAME_HEIGHT / 2, 32);
      playLevelUp();

      // フラッシュとメッセージをリセット
      const flashTimer = setTimeout(() => setMilestoneFlash(false), 300);
      const msgTimer = setTimeout(() => setMilestoneMessage(null), 2500);
      
      return () => {
        clearTimeout(timerId);
        clearTimeout(flashTimer);
        clearTimeout(msgTimer);
      };
    }
  }, [gameState, phase, explosion, playLevelUp]);

  // 自動クリック処理
  useEffect(() => {
    if (phase !== "playing") return;

    const intervalId = setInterval(() => {
      setGameState((prev) => processAutoClick(prev));
    }, AUTO_CLICK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [phase]);

  // 自動セーブ (5秒ごと)
  useEffect(() => {
    if (phase !== "playing") return;

    autoSaveRef.current = window.setInterval(() => {
      saveGame(gameState);
    }, 5000);

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [phase, gameState]);

  // 閉じる前にセーブ
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (phase === "playing") {
        saveGame(gameState);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase, gameState]);

  return (
    <GameShell gameId="clickmaster" layout="default">
      <div
        className={`clickmaster-container ${milestoneFlash ? "milestone-flash" : ""}`}
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT, position: "relative" }}
      >
        {phase === "start" && <StartScreen onStart={handleStart} />}
        {phase === "playing" && (
          <>
            <GameView
              gameState={gameState}
              onClick={handleClick}
              onPurchase={handlePurchase}
              onReset={handleReset}
            />
            <ParticleLayer particles={particles} />
            <ScorePopup
              text={popupText}
              popupKey={popupKey}
              x={`${popupPos.x}px`}
              y={`${popupPos.y}px`}
              variant="bonus"
              size="lg"
            />
            {milestoneMessage && (
              <div className="clickmaster-milestone-banner">
                🎉 {milestoneMessage}
              </div>
            )}
          </>
        )}
      </div>
    </GameShell>
  );
};

export default App;
