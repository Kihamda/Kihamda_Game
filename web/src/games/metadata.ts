import gamesData from "../portal/data/games.json";

export interface GameMetadata {
  id: string;
  title: string;
  description: string;
  path: string;
  thumbnail: string;
  tags: string[];
  publishedAt: string;
  featured: boolean;
}

export const games = gamesData.games as GameMetadata[];

const gameMap = new Map(games.map((game) => [game.id, game]));

export function getGameById(id: string): GameMetadata | undefined {
  return gameMap.get(id);
}
