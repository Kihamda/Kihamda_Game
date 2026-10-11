export const portalPages: Record<string, { title: string; description: string }> = {
  "/": { title: "小さな発見を楽しむUnityゲーム", description: "独自のルールを楽しむUnityゲーム。制作中のIce Courierのルールと遊び方をご紹介します。" },
  "/games/ice-courier/": { title: "Ice Courier | 配送パズル", description: "氷の上を滑って荷物を届けるIce Courier。出発した1マスだけが凍る配送パズルのルールと遊び方。ブラウザ版は公開準備中です。" },
  "/about/": { title: "このスタジオについて", description: "Kihamda.NETは、独自のルールと完成度を大切にする個人ゲームスタジオです。" },
  "/contact/": { title: "お問い合わせ", description: "Kihamda.NETへのご意見、不具合報告、著作権に関するお問い合わせ窓口です。" },
  "/privacy-policy/": { title: "プライバシーポリシー", description: "Cookie、アクセス解析、広告配信に関するKihamda.NETの方針。" },
};
export const portalPaths = Object.keys(portalPages);
export function canonicalPath(path: string) {
  return path === "/" ? path : `${path.replace(/\/$/, "")}/`;
}
export function isPortalPath(path: string) {
  return portalPaths.includes(canonicalPath(path));
}
