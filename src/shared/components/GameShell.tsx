import "../theme.css";
import type { ReactNode } from "react";
import { GameRecommendations } from "./GameRecommendations";

interface Props {
  children: ReactNode;
  /** ゲーム名 (ポータルリンクに使用) */
  title?: string;
  /** ポータルへの戻り先URL */
  portalUrl?: string;
  /** ゲームID (おすすめゲーム表示用) */
  gameId?: string;
}

export function GameShell({
  children,
  title,
  portalUrl = "https://game.kihamda.net/",
  gameId,
}: Props) {
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <a
        href={portalUrl}
        style={{
          position: "fixed",
          top: 10,
          left: 12,
          fontSize: 12,
          color: "var(--text-dim)",
          textDecoration: "none",
          opacity: 0.6,
          zIndex: 100,
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "1")}
        onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "0.6")}
        aria-label="ゲーム一覧へ戻る"
      >
        ← ゲーム一覧
      </a>
      {title && (
        <div style={{ display: "none" }} aria-hidden>
          {title}
        </div>
      )}
      {children}
      {gameId && <GameRecommendations currentGameId={gameId} />}
      <footer
        style={{
          borderTop: "1px solid var(--border, #e2e8f0)",
          padding: "20px 16px",
          marginTop: 32,
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-dim, #94a3b8)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <a
            href="https://kihamda.net/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--text-dim, #64748b)",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            プライバシーポリシー
          </a>
          <a
            href="https://kihamda.net/form"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--text-dim, #64748b)",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            お問い合わせ
          </a>
          <a
            href="https://kihamda.net/about"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--text-dim, #64748b)",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            運営者情報
          </a>
        </div>
        <p style={{ margin: 0 }}>&copy; 2024-2026 Kihamda.NET</p>
      </footer>
    </div>
  );
}
