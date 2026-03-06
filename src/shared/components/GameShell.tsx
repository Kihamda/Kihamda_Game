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
    </div>
  );
}
