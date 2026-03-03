import "./App.css";
import gamesData from "./data/games.json";

interface Game {
  id: string;
  title: string;
  description: string;
  path: string;
  thumbnail: string;
  tags: string[];
  publishedAt: string;
  featured: boolean;
}

const games = gamesData.games as Game[];

const byDateDesc = [...games].sort(
  (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
);

const featuredGames = games.filter((g) => g.featured);
const newestGames = byDateDesc.slice(0, 2);

const recommendedGames = [...games]
  .sort((a, b) => {
    const score = (g: Game) => {
      let t = 0;
      if (g.featured) t += 3;
      if (g.tags.includes("multiplayer")) t += 2;
      if (g.tags.includes("arcade") || g.tags.includes("reflex")) t += 1;
      return t;
    };
    const d = score(b) - score(a);
    return d !== 0 ? d : Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  })
  .slice(0, 3);

const allGames = [...games].sort((a, b) => {
  const d = Number(b.featured) - Number(a.featured);
  return d !== 0 ? d : Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
});

const gamePaths = allGames.map((g) => g.path);
const randomGamePath =
  gamePaths[Math.floor(Math.random() * gamePaths.length)] ?? "/";

function GameCard({ game, badge }: { game: Game; badge?: string }) {
  return (
    <article className="card">
      <a
        href={game.path}
        className="card-cover-link"
        aria-hidden="true"
        tabIndex={-1}
      />
      <a
        href={game.path}
        className="thumb-link"
        aria-label={`${game.title} をプレイする`}
      >
        <img
          src={game.thumbnail}
          alt={`${game.title} thumbnail`}
          loading="lazy"
        />
      </a>
      <div className="content">
        <div className="topline">
          <h2>{game.title}</h2>
          {badge && <span className="badge">{badge}</span>}
        </div>
        <p>{game.description}</p>
        <div className="tags">
          {game.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="actions">
          <a href={game.path} className="play">
            今すぐプレイ
          </a>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  return (
    <main>
      <section className="hero" aria-labelledby="top-title">
        <p className="eyebrow">今日の1本が見つかるゲームポータル</p>
        <h1 id="top-title">遊ぶまで3秒 新着も定番もここで完結</h1>
        <p className="lead">
          反射神経で燃える日も じっくり頭を使いたい日もある
          その気分に合わせてすぐ遊べるようにまとめた
        </p>
        <div className="hero-cta">
          <a href="#new">新着から選ぶ</a>
          <a href="#recommended">おすすめを見る</a>
          <a
            href={randomGamePath}
            data-random-paths={JSON.stringify(gamePaths)}
          >
            ランダムで1本
          </a>
        </div>
        <div className="hero-stats" aria-label="ゲーム数サマリー">
          <p>
            <strong>{games.length}</strong> タイトル公開中
          </p>
          <p>
            <strong>{newestGames.length}</strong> 件の新着
          </p>
          <p>
            <strong>{featuredGames.length}</strong> 件の注目作
          </p>
        </div>
      </section>

      <section id="new" className="section">
        <div className="section-head">
          <h2>新着ゲーム</h2>
          <p>追加されたばかりのゲーム まずはここから触るのが最短ルート</p>
        </div>
        <div className="grid">
          {newestGames.map((g) => (
            <GameCard key={g.id} game={g} badge="NEW" />
          ))}
        </div>
      </section>

      <section id="recommended" className="section">
        <div className="section-head">
          <h2>おすすめピック</h2>
          <p>初見でも遊びやすいものを中心に 厳選して並べた</p>
        </div>
        <div className="grid">
          {recommendedGames.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              badge={g.featured ? "注目" : "PICK"}
            />
          ))}
        </div>
      </section>

      <section id="all" className="section">
        <div className="section-head">
          <h2>全タイトル</h2>
          <p>迷ったら詳細を開いてルール確認 そのままワンタップでプレイへ</p>
        </div>
        <div className="grid">
          {allGames.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </section>
    </main>
  );
}
