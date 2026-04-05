import { useState, useCallback, useEffect, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import type { PopupVariant } from "@shared/components/ScorePopup";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles } from "@shared/hooks/useParticles";
import { StartScreen } from "./components/StartScreen";
import { GameView } from "./components/GameView";
import { ResultScreen } from "./components/ResultScreen";
import {
  createInitialState,
  dropPiece,
  canDropInColumn,
  getDropRow,
  getCpuMove,
} from "./lib/connect4";
import type { GameState, DroppingPiece, Phase, GameMode, Player } from "./lib/types";
import { DROP_ANIMATION_MS, CPU_DELAY_MS } from "./lib/constants";
import "./App.css";

interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [state, setState] = useState<GameState | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [dropping, setDropping] = useState<DroppingPiece | null>(null);
  const [turnFlash, setTurnFlash] = useState(false);
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    variant: "default",
    size: "md",
  });

  const { particles, confetti } = useParticles();
  const { playTone, playSweep, playCelebrate, playMiss } = useAudio();

  // ポップアップ表示用ヘルパー
  const showPopup = useCallback(
    (text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md") => {
      setPopup((prev) => ({ text, key: prev.key + 1, variant, size }));
    },
    []
  );

  const isCpuTurn =
    state?.gameMode === "cpu" && state.currentPlayer === 2 && !state.winner && !state.isDraw;

  // フラッシュタイマー用ref
  const flashTimerRef = useRef<number | null>(null);

  // フラッシュを開始する関数
  const triggerTurnFlash = useCallback(() => {
    setTurnFlash(true);
    if (flashTimerRef.current !== null) {
      clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setTurnFlash(false);
      flashTimerRef.current = null;
    }, 200);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) {
        clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  // コイン落下音
  const playDropSound = useCallback(() => {
    // 下降音 + 着地インパクト
    playSweep(600, 300, 0.15, "sine", 0.15);
    playTone(150, 0.1, "triangle", 0.25, 0.12);
  }, [playSweep, playTone]);

  // 勝利音
  const playWinSound = useCallback(() => {
    playCelebrate();
  }, [playCelebrate]);

  // 引き分け音
  const playDrawSound = useCallback(() => {
    playMiss();
  }, [playMiss]);

  const handleStart = useCallback((mode: GameMode) => {
    setState(createInitialState(mode));
    setPhase("playing");
    setDropping(null);
    setHoveredCol(null);
  }, []);

  const handleColumnClick = useCallback(
    (col: number) => {
      if (!state || state.winner || state.isDraw || dropping) return;
      if (isCpuTurn) return;
      if (!canDropInColumn(state.board, col)) return;

      const targetRow = getDropRow(state.board, col);
      if (targetRow === -1) return;

      setDropping({
        col,
        targetRow,
        player: state.currentPlayer,
      });
    },
    [state, dropping, isCpuTurn]
  );

  // 落下アニメーション完了後に状態を更新
  useEffect(() => {
    if (!dropping || !state) return;

    const timer = setTimeout(() => {
      const newState = dropPiece(state, dropping.col);
      setState(newState);
      setDropping(null);
      playDropSound();

      // ターン切替フラッシュ（勝敗が決まっていない場合のみ）
      if (!newState.winner && !newState.isDraw) {
        triggerTurnFlash();
        // ターンインジケーターポップアップ
        if (newState.gameMode === "cpu") {
          const turnText = newState.currentPlayer === 1 ? "あなたの番" : "CPU思考中...";
          showPopup(turnText, "default", "sm");
        } else {
          const turnText = newState.currentPlayer === 1 ? "🔴 赤の番" : "🟡 黄の番";
          showPopup(turnText, "default", "sm");
        }
      }

      // 勝敗判定後のSE & ポップアップ
      if (newState.winner) {
        setTimeout(() => {
          playWinSound();
          confetti(60);
          // 勝利ポップアップ
          if (newState.gameMode === "cpu") {
            const winText = newState.winner === 1 ? "🎉 WIN!" : "🤖 LOSE...";
            showPopup(winText, newState.winner === 1 ? "critical" : "default", "xl");
          } else {
            const winText = newState.winner === 1 ? "🔴 赤の勝利!" : "🟡 黄の勝利!";
            showPopup(winText, "critical", "xl");
          }
        }, 100);
      } else if (newState.isDraw) {
        setTimeout(() => {
          playDrawSound();
          // 引き分けポップアップ
          showPopup("🤝 DRAW", "bonus", "lg");
        }, 100);
      }
    }, DROP_ANIMATION_MS);

    return () => clearTimeout(timer);
  }, [dropping, state, playDropSound, playWinSound, playDrawSound, confetti, triggerTurnFlash, showPopup]);

  // CPUの手番処理
  useEffect(() => {
    if (!state || dropping) return;
    if (!isCpuTurn) return;

    const timer = setTimeout(() => {
      const cpuCol = getCpuMove(state.board, 2 as Player);
      if (cpuCol === -1) return;

      const targetRow = getDropRow(state.board, cpuCol);
      if (targetRow === -1) return;

      setDropping({
        col: cpuCol,
        targetRow,
        player: 2,
      });
    }, CPU_DELAY_MS);

    return () => clearTimeout(timer);
  }, [state, dropping, isCpuTurn]);

  // 勝敗確定後に結果画面へ
  useEffect(() => {
    if (!state) return;
    if (state.winner || state.isDraw) {
      const timer = setTimeout(() => {
        setPhase("result");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state?.winner, state?.isDraw, state]);

  const handleRestart = useCallback(() => {
    if (!state) return;
    setState(createInitialState(state.gameMode));
    setPhase("playing");
    setDropping(null);
    setHoveredCol(null);
  }, [state]);

  const handleBackToStart = useCallback(() => {
    setPhase("start");
    setState(null);
    setDropping(null);
    setHoveredCol(null);
  }, []);

  const handleColumnHover = useCallback(
    (col: number) => {
      if (!state || state.winner || state.isDraw || dropping || isCpuTurn) return;
      setHoveredCol(col);
    },
    [state, dropping, isCpuTurn]
  );

  const handleBoardLeave = useCallback(() => {
    setHoveredCol(null);
  }, []);

  const renderStatus = () => {
    if (!state) return null;

    if (state.winner) {
      if (state.gameMode === "cpu") {
        return (
          <p className="connect4-status connect4-status--winner">
            {state.winner === 1 ? "🎉 あなたの勝利！" : "🤖 CPUの勝利..."}
          </p>
        );
      }
      return (
        <p className={`connect4-status connect4-status--player${state.winner} connect4-status--winner`}>
          🎉 {state.winner === 1 ? "赤" : "黄"}の勝利！
        </p>
      );
    }
    if (state.isDraw) {
      return <p className="connect4-status connect4-status--draw">引き分けです</p>;
    }
    if (state.gameMode === "cpu") {
      return (
        <p className={`connect4-status connect4-status--player${state.currentPlayer}`}>
          {state.currentPlayer === 1 ? "あなたの番" : "CPU思考中..."}
        </p>
      );
    }
    return (
      <p className={`connect4-status connect4-status--player${state.currentPlayer}`}>
        {state.currentPlayer === 1 ? "🔴 赤" : "🟡 黄"}の番
      </p>
    );
  };

  return (
    <GameShell gameId="connect4" layout="default">
      <div className={`connect4-root ${turnFlash ? "connect4-root--flash" : ""}`}>
        <ParticleLayer particles={particles} />
        <ScorePopup
          text={popup.text}
          popupKey={popup.key}
          variant={popup.variant}
          size={popup.size}
          y="30%"
        />
        {phase === "start" && <StartScreen onStart={handleStart} />}

        {phase === "playing" && state && (
          <>
            <header className="connect4-header">
              <h1 className="connect4-title">Connect 4</h1>
              {renderStatus()}
            </header>
            <GameView
              board={state.board}
              currentPlayer={state.currentPlayer}
              winner={state.winner}
              winLine={state.winLine}
              dropping={dropping}
              hoveredCol={hoveredCol}
              isCpuTurn={isCpuTurn}
              onColumnClick={handleColumnClick}
              onColumnHover={handleColumnHover}
              onBoardLeave={handleBoardLeave}
            />
            <footer className="connect4-footer">
              <button
                type="button"
                className="connect4-reset-btn"
                onClick={handleBackToStart}
              >
                モード選択へ
              </button>
            </footer>
          </>
        )}

        {phase === "result" && state && (
          <ResultScreen
            winner={state.winner}
            isDraw={state.isDraw}
            gameMode={state.gameMode}
            onRestart={handleRestart}
            onBackToStart={handleBackToStart}
          />
        )}
      </div>
    </GameShell>
  );
}
