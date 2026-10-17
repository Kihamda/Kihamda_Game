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
  inspectionPreview?: BuildEvidence & { url: string; alt: string; imageSha256: string; sourceCommit: string; width: number; height: number };
  guide?: WorkGuide;
};
export type BuildEvidence = { version: string; artifactSha256: string; verification: string };
export type WorkGuide = {
  controls?: { input: string; action: string }[];
  symbols?: { symbol: string; meaning: string }[];
  saving?: { status: "verified" | "unverified" | "none"; description: string; evidence?: BuildEvidence };
  environments?: (BuildEvidence & { name: string; input: string })[];
  screenshots?: (BuildEvidence & { url: string; alt: string; imageSha256: string })[];
};

// Reject incomplete publication receipts rather than infer release from technology.
export function parseCatalog(data: unknown): Work[] {
  if (!data || typeof data !== "object" || !("games" in data) || !Array.isArray(data.games)) throw new Error("Invalid work catalog");
  const ids = new Set<string>();
  return data.games.map((game: Work) => {
    const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
    if (!game || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id) || ids.has(game.id) || ![`/games/${game.id}/`, `/works/${game.id}/`].includes(game.path) || !text(game.title) || !text(game.description)
      || !Array.isArray(game.tags) || !game.tags.every(text) || !Array.isArray(game.facts) || !game.facts.every(text)
      || !["web", "unity"].includes(game.technology) || !["development", "paused", "verification"].includes(game.status)
      || !(game.technology === "web" ? game.origin === "studio-web" : ["owner-finished", "preserved-prototype"].includes(game.origin))) throw new Error("Invalid work metadata");
    ids.add(game.id);
    if (game.inspectionPreview !== undefined) {
      const preview = game.inspectionPreview;
      if (!preview || !/^\/media\/inspection\/[a-z0-9-]+\.jpg$/.test(preview.url)
        || ![preview.alt, preview.version, preview.verification].every(text)
        || ![preview.imageSha256, preview.artifactSha256].every(value => /^[a-f0-9]{64}$/.test(value))
        || !/^[a-f0-9]{40}$/.test(preview.sourceCommit)
        || ![preview.width, preview.height].every(value => Number.isSafeInteger(value) && value > 0 && value <= 4096)
        || game.origin === "preserved-prototype") throw new Error("Invalid inspection preview");
    }
    if (game.release !== null) {
      const release = game.release;
      if (!release || !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9]+)?\/?$/.test(release.url) || release.url === game.path
        || !/^[a-f0-9]{64}$/.test(release.sha256) || ![release.version, release.platform, release.verification, release.distributionPermission, release.recovery].every(text)
        || game.status !== "verification" || game.origin === "preserved-prototype") throw new Error("Unverified work release");
    }
    if (game.guide !== undefined) {
      const guide = game.guide;
      const list = <T>(value: unknown, check: (item: T) => boolean) => value === undefined || (Array.isArray(value) && value.every(item => check(item as T)));
      const evidence = (item: BuildEvidence | undefined) => !!item && text(item.version) && /^[a-f0-9]{64}$/.test(item.artifactSha256) && text(item.verification)
        && (!game.release || (item.version === game.release.version && item.artifactSha256 === game.release.sha256));
      if (!guide || typeof guide !== "object" || Array.isArray(guide)
        || !list(guide.controls, (item: { input: string; action: string }) => !!item && text(item.input) && text(item.action))
        || !list(guide.symbols, (item: { symbol: string; meaning: string }) => !!item && text(item.symbol) && text(item.meaning))
        || (guide.saving !== undefined && (!guide.saving || !["verified", "unverified", "none"].includes(guide.saving.status) || !text(guide.saving.description)
          || (guide.saving.status === "verified" && !evidence(guide.saving.evidence))))
        || !list(guide.environments, (item: BuildEvidence & { name: string; input: string }) => !!item && text(item.name) && text(item.input) && evidence(item))
        || !list(guide.screenshots, (item: BuildEvidence & { url: string; alt: string; imageSha256: string }) => !!item && /^\/media\/[a-zA-Z0-9_/-]+\.(?:png|jpg|webp)$/.test(item.url)
          && !item.url.includes("//") && text(item.alt) && /^[a-f0-9]{64}$/.test(item.imageSha256) && evidence(item))) throw new Error("Invalid work guide evidence");
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
