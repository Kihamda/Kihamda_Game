import data from "./data/works.json";
import { parseCatalog, releaseNote } from "./catalog";

export const portalPages: Record<string, { title: string; description: string }> = {
  "/": { title: "小さな発見を楽しむゲーム", description: "独自のルールを楽しむゲーム。作品のルールと公開状態をご紹介します。" },
  "/about/": { title: "このスタジオについて", description: "Kihamda.NETは、独自のルールと完成度を大切にする個人ゲームスタジオです。" },
  "/contact/": { title: "お問い合わせ", description: "Kihamda.NETへのご意見、不具合報告、著作権に関するお問い合わせ窓口です。" },
  "/privacy-policy/": { title: "プライバシーポリシー", description: "Cookie、アクセス解析、広告配信に関するKihamda.NETの方針。" },
};
for (const game of parseCatalog(data)) {
  portalPages[game.path] = { title: game.title, description: `${game.description}${releaseNote(game)}` };
}
export const portalPaths = Object.keys(portalPages);
export function canonicalPath(path: string) {
  return path === "/" ? path : `${path.replace(/\/$/, "")}/`;
}
export function isPortalPath(path: string) {
  return portalPaths.includes(canonicalPath(path));
}
