import { useMemo } from "react";
import gamesData from "../../portal/data/games.json";

interface Props {
  currentGameId: string;
}

const RECOMMEND_COUNT = 3;
const PORTAL_URL = "https://game.kihamda.net/";

const cssText = `
.gr-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 640px) {
  .gr-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
.gr-card {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  text-decoration: none;
  color: var(--text);
  transition: border-color var(--transition), transform var(--transition);
  display: block;
}
.gr-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}
.gr-card-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--text);
}
.gr-card-desc {
  font-size: 13px;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.5;
}
`;

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function GameRecommendations({ currentGameId }: Props) {
  const picks = useMemo(() => {
    const others = gamesData.games.filter((g) => g.id !== currentGameId);
    return pickRandom(others, RECOMMEND_COUNT);
  }, [currentGameId]);

  if (picks.length === 0) return null;

  return (
    <>
      <style>{cssText}</style>
      <section
        style={{
          padding: "32px 16px",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 16px",
          }}
        >
          🎮 他のゲームで遊ぶ
        </h2>

        <div className="gr-grid">
          {picks.map((game) => (
            <a
              key={game.id}
              className="gr-card"
              href={`${PORTAL_URL}games/${game.id}/`}
            >
              <p className="gr-card-title">{game.title}</p>
              <p className="gr-card-desc">
                {game.description.length > 50
                  ? `${game.description.slice(0, 50)}…`
                  : game.description}
              </p>
            </a>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a
            href={PORTAL_URL}
            style={{
              color: "var(--accent)",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            すべてのゲーム →
          </a>
        </div>
      </section>
    </>
  );
}
