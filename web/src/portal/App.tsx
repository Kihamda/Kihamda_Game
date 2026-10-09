import "./App.css";
import { useMemo } from "react";
import gamesData from "./data/games.json";

interface GameData {
  id: string;
  title: string;
  description: string;
  path: string;
  thumbnail: string;
  tags: string[];
  publishedAt: string;
  featured: boolean;
}

interface GameCardProps {
  game: GameData;
}

function GameCard({ game }: GameCardProps) {
  return (
    <a href={game.path} className="game-card">
      <div className="card-thumbnail">
        <img
          src={game.thumbnail}
          alt={game.title}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80'%3E%3Crect fill='%231a1a1a' width='120' height='80'/%3E%3Ctext x='60' y='45' fill='%2300ff88' font-size='12' text-anchor='middle'%3E🎮%3C/text%3E%3C/svg%3E";
          }}
        />
        {game.featured && <span className="featured-badge">⭐ おすすめ</span>}
      </div>
      <div className="card-content">
        <h3 className="card-title">{game.title}</h3>
        <p className="card-description">{game.description}</p>
      </div>
    </a>
  );
}

interface GameSectionProps {
  title: string;
  games: GameData[];
  id?: string;
}

function GameSection({ title, games, id }: GameSectionProps) {
  if (games.length === 0) return null;
  return (
    <section className="game-section" id={id}>
      <h2 className="section-title">{title}</h2>
      <div className="game-grid">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}

export default function PortalApp() {
  const games: GameData[] = gamesData.games;

  const newGames = useMemo(() => {
    return [...games]
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, 5);
  }, [games]);

  const featuredGames = useMemo(() => {
    return games.filter((g) => g.featured);
  }, [games]);

  const stats = {
    totalGames: games.length,
    totalPlays: "12,450+",
  };

  return (
    <div className="portal">
      <header className="portal-header">
        <div className="header-inner">
          <a href="/" className="logo">
            <span className="logo-icon">🎮</span>
            <span className="logo-text">Kihamda Games</span>
          </a>
          <nav className="header-nav">
            <a href="#all-games">すべてのゲーム</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">今日の気分で遊べるブラウザゲーム</h1>
          <p className="hero-subtitle">
            登録不要・インストール不要。すぐに遊べるミニゲームコレクション
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{stats.totalGames}</span>
              <span className="stat-label">ゲーム</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">{stats.totalPlays}</span>
              <span className="stat-label">累計プレイ</span>
            </div>
          </div>
        </div>
      </section>

      <main className="portal-main">
        <GameSection title="🆕 新着" games={newGames} />
        <GameSection title="⭐ おすすめ" games={featuredGames} />
        <GameSection title="🎮 すべてのゲーム" games={games} id="all-games" />
      </main>

      <footer className="portal-footer">
        <div className="footer-inner">
          <div className="footer-links">
            <a href="/privacy">プライバシーポリシー</a>
          </div>
          <p className="footer-copyright">
            © 2025 Kihamda Games. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
