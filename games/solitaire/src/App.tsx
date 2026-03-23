import { useState, useCallback, useRef } from "react";
import "./App.css";
import { GameBoard } from "./components/GameBoard";
import {
  createInitialGameState,
  drawFromStock,
  moveToTableau,
  moveToFoundation,
  checkWin,
  autoMoveToFoundation,
} from "./lib/solitaire";
import type { GameState, Suit, DragSource, Card, Phase } from "./lib/types";
import { useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";

const App = () => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [phase, setPhase] = useState<Phase>("start");
  
  // Dopamine effects
  const { playClick, playSuccess, playCelebrate, playFanfare } = useAudio();
  const { particles, sparkle, confetti } = useParticles();
  const [popup, setPopup] = useState<{ text: string; key: number } | null>(null);
  const popupKeyRef = useRef(0);
  
  const showPopup = useCallback((text: string) => {
    popupKeyRef.current += 1;
    setPopup({ text, key: popupKeyRef.current });
    setTimeout(() => setPopup(null), 1000);
  }, []);

  const handleNewGame = useCallback(() => {
    playFanfare();
    setGameState(createInitialGameState());
    setPhase("playing");
  }, [playFanfare]);

  const handleDraw = useCallback(() => {
    playClick();
    setGameState((prev) => drawFromStock(prev));
  }, [playClick]);

  const handleDrop = useCallback(
    (source: DragSource, targetType: "tableau" | "foundation", targetIndex: number | Suit) => {
      setGameState((prev) => {
        let newState: GameState | null = null;

        if (targetType === "tableau" && typeof targetIndex === "number") {
          newState = moveToTableau(prev, source, targetIndex);
          if (newState) {
            playClick();
            showPopup(`${source.cards.length}枚移動`);
          }
        } else if (targetType === "foundation" && typeof targetIndex === "string") {
          newState = moveToFoundation(prev, source, targetIndex as Suit);
          if (newState) {
            playSuccess();
            // Get approximate position for sparkle (center-right area for foundations)
            const foundationX = window.innerWidth * 0.75;
            const foundationY = 150;
            sparkle(foundationX, foundationY);
            showPopup("+10 ファウンデーション");
          }
        }

        if (newState) {
          if (checkWin(newState)) {
            setPhase("won");
            playCelebrate();
            confetti(80);
            // Multiple confetti bursts for celebration
            setTimeout(() => confetti(60), 500);
            setTimeout(() => confetti(40), 1000);
          }
          return newState;
        }
        return prev;
      });
    },
    [playClick, playSuccess, playCelebrate, sparkle, confetti, showPopup]
  );

  const handleAutoMove = useCallback((card: Card, source: DragSource) => {
    setGameState((prev) => {
      const newState = autoMoveToFoundation(prev, card, source);
      if (newState) {
        playSuccess();
        // Sparkle effect for auto-move to foundation
        const foundationX = window.innerWidth * 0.75;
        const foundationY = 150;
        sparkle(foundationX, foundationY);
        showPopup("+10 オートムーブ");
        
        if (checkWin(newState)) {
          setPhase("won");
          playCelebrate();
          confetti(80);
          setTimeout(() => confetti(60), 500);
          setTimeout(() => confetti(40), 1000);
        }
        return newState;
      }
      return prev;
    });
  }, [playSuccess, playCelebrate, sparkle, confetti, showPopup]);

  return (
    <div className="sol-container">
      <ParticleLayer particles={particles} />
      <ScorePopup
        text={popup?.text ?? null}
        popupKey={popup?.key}
        variant="bonus"
        y="30%"
      />
      <h1 className="sol-title">ソリティア</h1>

      {phase === "start" && (
        <div className="sol-start-screen">
          <p>クロンダイク・ソリティア</p>
          <button className="sol-btn" onClick={handleNewGame}>
            ゲームを始める
          </button>
        </div>
      )}

      {phase === "playing" && (
        <>
          <div className="sol-controls">
            <button className="sol-btn" onClick={handleNewGame}>
              新しいゲーム
            </button>
          </div>
          <GameBoard
            state={gameState}
            onDraw={handleDraw}
            onDrop={handleDrop}
            onAutoMove={handleAutoMove}
          />
        </>
      )}

      {phase === "won" && (
        <div className="sol-win-screen">
          <h2>おめでとうございます！</h2>
          <p>{gameState.moves}手でクリアしました！</p>
          <button className="sol-btn" onClick={handleNewGame}>
            もう一度遊ぶ
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
