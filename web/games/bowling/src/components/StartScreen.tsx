interface Props {
  onStart: () => void;
  highScore: number;
}

export function StartScreen({ onStart, highScore }: Props) {
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
      <h1 style={{ fontSize: "48px", marginBottom: "20px", color: "#f1c40f" }}>
        🎳 Bowling
      </h1>
      <p style={{ fontSize: "18px", marginBottom: "10px", color: "#bbb" }}>
        10フレームのボウリング
      </p>
      <p style={{ fontSize: "14px", marginBottom: "30px", color: "#888" }}>
        マウス/タッチでドラッグして方向と強さを決定
      </p>

      {highScore > 0 && (
        <p style={{ fontSize: "16px", marginBottom: "20px", color: "#27ae60" }}>
          🏆 ハイスコア: {highScore}
        </p>
      )}

      <button
        onClick={onStart}
        style={{
          padding: "15px 50px",
          fontSize: "20px",
          background: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        スタート
      </button>

      <div style={{ marginTop: "40px", fontSize: "12px", color: "#666" }}>
        <p>⚡ ストライク: 10本すべて倒す = 次2投のボーナス</p>
        <p>✨ スペア: 2投で全部倒す = 次1投のボーナス</p>
      </div>
    </div>
  );
}
