import { useCallback, useEffect, useState, useRef } from "react";
import "./App.css";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScreenShake } from "@shared/components/ScreenShake";
import { ComboCounter } from "@shared/components/ComboCounter";
import { ScorePopup } from "@shared/components/ScorePopup";
import { ShareButton } from "@shared/components/ShareButton";
import { GameRecommendations } from "@shared/components/GameRecommendations";
import type { PopupVariant } from "@shared/components/ScorePopup";
import { useAudio } from "@shared/hooks/useAudio";
import { useParticles } from "@shared/hooks/useParticles";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import type { Phase, Question, GameState } from "./lib/types";
import { TOTAL_QUESTIONS } from "./lib/constants";
import {
  selectQuestions,
  createInitialState,
  processAnswer,
  nextQuestion,
  isGameOver,
  getResultMessage,
} from "./lib/triviaquiz";
import { loadHighScore, saveHighScore } from "./lib/storage";

interface PopupData {
  text: string;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  y: string;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [highScore, setHighScore] = useState(() => loadHighScore());
  const [isNewRecord, setIsNewRecord] = useState(false);

  // ドーパミン演出用
  const [flashType, setFlashType] = useState<"correct" | "wrong" | null>(null);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const { particles, sparkle, confetti } = useParticles();
  const { playSuccess, playMiss, playCombo, playPerfect } = useAudio();

  // ScorePopup用
  const [popups, setPopups] = useState<PopupData[]>([]);
  const popupKeyRef = useRef(0);

  // ポップアップ追加ヘルパー
  const addPopup = useCallback(
    (
      text: string,
      variant: PopupVariant = "default",
      size: "sm" | "md" | "lg" | "xl" = "md",
      y: string = "35%"
    ) => {
      const key = popupKeyRef.current++;
      setPopups((prev) => [...prev, { text, key, variant, size, y }]);
      // 自動削除
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.key !== key));
      }, 1500);
    },
    []
  );

  const currentQuestion = questions[gameState.currentIndex];

  // ゲーム開始
  const startGame = useCallback(() => {
    setQuestions(selectQuestions(TOTAL_QUESTIONS));
    setGameState(createInitialState());
    setIsNewRecord(false);
    setFlashType(null);
    setPhase("playing");
  }, []);

  // 選択肢クリック
  const handleSelect = useCallback(
    (index: number) => {
      if (gameState.answered || !currentQuestion) return;

      const isCorrect = index === currentQuestion.correctIndex;
      const newCombo = isCorrect ? gameState.combo + 1 : 0;

      // 回答処理
      setGameState((prev) =>
        processAnswer(prev, index, currentQuestion.correctIndex)
      );

      // ドーパミン演出 + ScorePopup
      if (isCorrect) {
        // 正解: 緑フラッシュ + sparkle + 音
        setFlashType("correct");
        sparkle(350, 300, 12); // 画面中央付近

        // 基本ポイントポップアップ
        addPopup("⭕ 正解！", "default", "lg", "30%");

        // コンボボーナス
        if (newCombo >= 5) {
          // 5連続以上: クリティカル演出
          setTimeout(() => {
            addPopup(`🔥 ${newCombo}連続正解！`, "critical", "xl", "38%");
          }, 200);
          playCombo(newCombo);
        } else if (newCombo >= 3) {
          // 3連続以上: ボーナス演出
          setTimeout(() => {
            addPopup(`🎯 ${newCombo}連続！`, "bonus", "lg", "38%");
          }, 200);
          playCombo(newCombo);
        } else if (newCombo >= 2) {
          // 2連続: コンボ演出
          setTimeout(() => {
            addPopup(`✨ ${newCombo}連続！`, "combo", "md", "38%");
          }, 200);
          playCombo(newCombo);
        } else {
          playSuccess();
        }
      } else {
        // 不正解: 赤フラッシュ + シェイク + 音
        setFlashType("wrong");
        shakeRef.current?.shake("light", 250);
        playMiss();

        // 不正解ポップアップ
        addPopup("❌ 不正解...", "default", "md", "30%");

        // コンボが途切れた場合のフィードバック
        if (gameState.combo >= 2) {
          setTimeout(() => {
            addPopup(`${gameState.combo}連続が途切れた！`, "combo", "sm", "38%");
          }, 200);
        }
      }

      // フラッシュをリセット
      setTimeout(() => setFlashType(null), 300);
    },
    [
      gameState.answered,
      gameState.combo,
      currentQuestion,
      sparkle,
      playSuccess,
      playMiss,
      playCombo,
      addPopup,
    ]
  );

  // 次の問題へ
  const handleNext = useCallback(() => {
    const nextState = nextQuestion(gameState);

    if (isGameOver(nextState)) {
      setPhase("result");
      // 全問正解時のconfetti爆発 + パーフェクトポップアップ
      if (gameState.score === TOTAL_QUESTIONS) {
        confetti(80);
        playPerfect();
        addPopup("🎊 パーフェクト！", "critical", "xl", "25%");
        if (gameState.maxCombo >= 5) {
          setTimeout(() => {
            addPopup(`🔥 最大${gameState.maxCombo}連続！`, "bonus", "lg", "35%");
          }, 400);
        }
      } else if (gameState.score >= 8) {
        // 高得点時のポップアップ
        addPopup("🎉 すばらしい！", "bonus", "lg", "25%");
      } else if (gameState.score >= 5) {
        addPopup("👍 よくできました！", "default", "lg", "25%");
      }
    } else {
      setGameState(nextState);
    }
  }, [gameState, confetti, playPerfect, addPopup]);

  // 結果画面でハイスコア判定
  useEffect(() => {
    if (phase === "result") {
      const currentHighScore = loadHighScore();
      if (gameState.score > currentHighScore) {
        saveHighScore(gameState.score);
        queueMicrotask(() => {
          setHighScore(gameState.score);
          setIsNewRecord(true);
        });
        // 新記録ポップアップ（パーフェクト以外の場合）
        if (gameState.score < TOTAL_QUESTIONS) {
          setTimeout(() => {
            addPopup("🏆 新記録！", "level", "xl", "20%");
          }, 600);
        }
      }
    }
  }, [phase, gameState.score, addPopup]);

  // タイトルに戻る
  const backToStart = useCallback(() => {
    setPhase("start");
  }, []);

  const resultInfo = getResultMessage(gameState.score);

  // 選択肢のスタイル決定
  const getChoiceClass = (index: number): string => {
    if (!gameState.answered) return "";
    if (currentQuestion && index === currentQuestion.correctIndex)
      return "correct";
    if (index === gameState.selectedIndex) return "wrong";
    return "disabled";
  };

  return (
    <GameShell gameId="triviaquiz" layout="default">
      <ScreenShake ref={shakeRef}>
        <div
          className={`triviaquiz-root ${flashType ? `flash-${flashType}` : ""}`}
        >
          <ParticleLayer particles={particles} />
          <ComboCounter
            combo={gameState.combo}
            position="top-right"
            threshold={2}
          />

          {/* ScorePopup レイヤー */}
          {popups.map((popup) => (
            <ScorePopup
              key={popup.key}
              text={popup.text}
              popupKey={popup.key}
              variant={popup.variant}
              size={popup.size}
              y={popup.y}
            />
          ))}

          <h1 className="triviaquiz-title">❓ トリビアクイズ</h1>

          {phase === "start" && (
            <div className="triviaquiz-panel">
              <p className="triviaquiz-description">
                一般常識4択クイズ！
                <br />
                10問中何問正解できるかな？
              </p>

              {highScore > 0 && (
                <p className="triviaquiz-highscore">
                  🏆 ハイスコア: {highScore}/{TOTAL_QUESTIONS}問正解
                </p>
              )}

              <button
                type="button"
                className="triviaquiz-button primary"
                onClick={startGame}
              >
                スタート！
              </button>
            </div>
          )}

          {phase === "playing" && currentQuestion && (
            <div className="triviaquiz-game">
              <div className="triviaquiz-progress">
                <span className="triviaquiz-progress-text">
                  問題 {gameState.currentIndex + 1} / {TOTAL_QUESTIONS}
                </span>
                <div className="triviaquiz-progress-bar">
                  <div
                    className="triviaquiz-progress-fill"
                    style={{
                      width: `${((gameState.currentIndex + 1) / TOTAL_QUESTIONS) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="triviaquiz-score-display">
                正解: {gameState.score}問
              </div>

              <div className="triviaquiz-question-box">
                <p className="triviaquiz-question">{currentQuestion.question}</p>
              </div>

              <div className="triviaquiz-choices">
                {currentQuestion.choices.map((choice, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`triviaquiz-choice ${getChoiceClass(index)}`}
                    onClick={() => handleSelect(index)}
                    disabled={gameState.answered}
                  >
                    <span className="triviaquiz-choice-label">
                      {["A", "B", "C", "D"][index]}
                    </span>
                    <span className="triviaquiz-choice-text">{choice}</span>
                  </button>
                ))}
              </div>

              {gameState.answered && (
                <div className="triviaquiz-feedback">
                  {gameState.selectedIndex === currentQuestion.correctIndex ? (
                    <p className="triviaquiz-feedback-correct">⭕ 正解！</p>
                  ) : (
                    <p className="triviaquiz-feedback-wrong">
                      ❌ 不正解… 正解は「
                      {currentQuestion.choices[currentQuestion.correctIndex]}」
                    </p>
                  )}
                  <button
                    type="button"
                    className="triviaquiz-button next"
                    onClick={handleNext}
                  >
                    {gameState.currentIndex + 1 < TOTAL_QUESTIONS
                      ? "次の問題へ"
                      : "結果を見る"}
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === "result" && (
            <div
              className={`triviaquiz-panel result ${gameState.score === TOTAL_QUESTIONS ? "perfect" : ""}`}
            >
              <p className="triviaquiz-result-title">
                {gameState.score === TOTAL_QUESTIONS
                  ? "🎊 パーフェクト！"
                  : isNewRecord
                    ? "🎊 新記録！"
                    : "📊 結果発表"}
              </p>

              <div className="triviaquiz-result-score">
                <span className="triviaquiz-result-emoji">{resultInfo.emoji}</span>
                <span className="triviaquiz-result-value">
                  {gameState.score}/{TOTAL_QUESTIONS}
                </span>
                <span className="triviaquiz-result-label">問正解</span>
              </div>

              <p className="triviaquiz-result-message">{resultInfo.message}</p>

              {gameState.maxCombo >= 2 && (
                <p className="triviaquiz-max-combo">
                  🔥 最大コンボ: {gameState.maxCombo}
                </p>
              )}

              <div className="triviaquiz-result-answers">
                {gameState.answers.map((correct, index) => (
                  <span
                    key={index}
                    className={`triviaquiz-result-dot ${correct ? "correct" : "wrong"}`}
                    title={`問題${index + 1}: ${correct ? "正解" : "不正解"}`}
                  >
                    {correct ? "⭕" : "❌"}
                  </span>
                ))}
              </div>

              {highScore > 0 && (
                <p className="triviaquiz-highscore">
                  🏆 ハイスコア: {highScore}/{TOTAL_QUESTIONS}問正解
                </p>
              )}

              <div className="triviaquiz-result-buttons">
                <button
                  type="button"
                  className="triviaquiz-button primary"
                  onClick={startGame}
                >
                  もう一度
                </button>
                <button
                  type="button"
                  className="triviaquiz-button secondary"
                  onClick={backToStart}
                >
                  タイトルへ
                </button>
                <div style={{ marginTop: 12 }}>
                  <ShareButton score={gameState.score} gameTitle="Trivia Quiz" gameId="triviaquiz" />
                  <GameRecommendations currentGameId="triviaquiz" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}