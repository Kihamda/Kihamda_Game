import { ShareButton } from "@shared/components/ShareButton";

interface Props {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  onRestart: () => void;
}

export function ResultScreen({ score, highScore, isNewHighScore, onRestart }: Props) {
  const getMessage = () => {
    if (score === 300) return "🎉 PERFECT GAME! 🎉";
    if (score >= 250) return "🔥 素晴らしい！";
    if (score >= 200) return "⭐ グレート！";
    if (score >= 150) return "👍 ナイスゲーム！";
    if (score >= 100) return "💪 がんばった！";
    return "🎳 ゲームオーバー";
  };

  return (
    <div
      style={{
        width: "600px",
        height: "700px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: "36px", marginBottom: "20px" }}>
        {getMessage()}
      </h1>

      <div style={{ fontSize: "60px", fontWeight: "bold", color: "#f1c40f", marginBottom: "10px" }}>
        {score}
      </div>
      <p style={{ fontSize: "16px", color: "#888", marginBottom: "20px" }}>
        / 300
      </p>

      {isNewHighScore && (
        <p style={{ fontSize: "24px", color: "#e74c3c", marginBottom: "20px" }}>
          🎊 NEW HIGH SCORE! 🎊
        </p>
      )}

      <p style={{ fontSize: "16px", color: "#27ae60", marginBottom: "30px" }}>
        🏆 ハイスコア: {highScore}
      </p>

      <button
        onClick={onRestart}
        style={{
          padding: "15px 50px",
          fontSize: "20px",
          background: "#3498db",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        もう一度プレイ
      </button>
      <div style={{ marginTop: "16px" }}>
        <ShareButton score={score} gameTitle="ボウリング" gameId="bowling" />
      </div>
    </div>
  );
}
