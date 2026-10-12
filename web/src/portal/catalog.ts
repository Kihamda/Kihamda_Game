export type Release = {
  url: string;
  version: string;
  platform: string;
  sha256: string;
  verification: string;
  distributionPermission: string;
  recovery: string;
};
export type Work = {
  id: string; title: string; path: string; description: string;
  tags: string[]; facts: string[];
  technology: "web" | "unity";
  origin: "studio-web" | "owner-finished" | "preserved-prototype";
  status: "development" | "paused" | "verification";
  release: Release | null;
};

// Reject incomplete publication receipts rather than infer release from technology.
export function parseCatalog(data: unknown): Work[] {
  if (!data || typeof data !== "object" || !("games" in data) || !Array.isArray(data.games)) throw new Error("Invalid work catalog");
  const ids = new Set<string>();
  return data.games.map((game: Work) => {
    const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
    if (!game || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id) || ids.has(game.id) || game.path !== `/games/${game.id}/` || !text(game.title) || !text(game.description)
      || !Array.isArray(game.tags) || !game.tags.every(text) || !Array.isArray(game.facts) || !game.facts.every(text)
      || !["web", "unity"].includes(game.technology) || !["development", "paused", "verification"].includes(game.status)
      || !(game.technology === "web" ? game.origin === "studio-web" : ["owner-finished", "preserved-prototype"].includes(game.origin))) throw new Error("Invalid work metadata");
    ids.add(game.id);
    if (game.release !== null) {
      const release = game.release;
      if (!release || !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9]+)?\/?$/.test(release.url) || release.url === game.path
        || !/^[a-f0-9]{64}$/.test(release.sha256) || ![release.version, release.platform, release.verification, release.distributionPermission, release.recovery].every(text)
        || game.status !== "verification" || game.origin === "preserved-prototype") throw new Error("Unverified work release");
    }
    return game;
  });
}
export function technologyLabel(game: Work) { return game.technology === "web" ? "Web" : "Unity"; }
export function statusLabel(game: Work) {
  return game.release ? "公開中" : game.status === "paused" ? "制作停止・保全中" : game.status === "verification" ? "公開前の確認中" : "制作中";
}
export function releaseNote(game: Work) {
  if (game.release) return `${game.release.platform}向けの公開版です。`;
  if (game.origin === "preserved-prototype") return "既存のUnity試作品を保全しています。制作は停止しており、一般公開していません。";
  if (game.origin === "owner-finished") return "本人が制作した完成品です。動作と配布条件を確認するまで、開始リンクは表示しません。";
  return "Webアプリを制作しています。動作と公開条件の確認後に、開始リンクをご案内します。";
}
