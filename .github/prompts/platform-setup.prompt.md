---
description: "単一 Vite プロジェクトでゲームプラットフォーム全体をビルド・配信する現在のアーキテクチャ。"
---

# ゲームプラットフォーム構築タスク

**このリポジトリは単一の Vite プロジェクト**として統合済み。Astro・Turborepo・個別 package.json は廃止された。

## 現在のアーキテクチャ

```
games/
  _template/           # 新作ゲームの雛形 (index.html + src/App.tsx + main.tsx)
  [game-id]/           # 14本のReactゲーム (index.html + src/*)
src/
  shared/              # 全ゲーム共通 (GameShell, ParticleLayer, ScorePopup, useAudio, useParticles)
  portal/data/games.json  # ゲームメタデータ一元管理
plugins/
  portal-ssg.ts        # Viteプラグイン: ポータルHTML SSG注入
public/                # 静的アセット (thumbnails, manifest.webmanifest, sw.js)
index.html             # ポータルエントリ（ビルド時は SSG でHTML注入済みの静的ページに変換）
vite.config.ts         # マルチエントリ (games/*) + SSGプラグイン
package.json           # 単一 (ルートのみ)
```

---

## ビルド

```bash
npm run build   # = tsc -b && vite build
```

- 出力: `dist/` (ポータル + 全ゲーム + sitemap.xml + \_headers + \_redirects)
- 所要時間: 約600ms
- 個別ゲームのビルドコマンドは不要
- prebuild: `scripts/prebuild.mjs` が `sitemap.xml` と `_redirects` を `public/` に生成

## URL 構造

- `https://game.kihamda.net/` → ポータル (SSG生成)
- `https://game.kihamda.net/games/[id]/` → 各ゲームSPA

## デプロイ

- XServer Static (無料・静的ホスティング)
- GitHub Actions → `npm run build` → `dist/` → FTPS で XServer Static へデプロイ

## ポータル

`plugins/portal-ssg.ts` がビルド時に静的 HTML を生成:

- ゲーム一覧ポータル (`dist/index.html`) — SSG プラグインが `src/portal/App.tsx` を SSR して注入
- サイトマップ (`public/sitemap.xml`) — `scripts/prebuild.mjs` が生成
- キャッシュヘッダー (`public/_headers`) — 静的配置
- リダイレクト (`public/_redirects`) — `scripts/prebuild.mjs` が生成

データソース: `src/portal/data/games.json`

## PWA

- `public/manifest.webmanifest` — プラットフォーム全体 PWA マニフェスト (scope: `/`)
- `public/sw.js` — Service Worker (手書き・静的配信)
- 各ゲームに `vite-plugin-pwa` は不要

## 新ゲーム追加手順

1. `games/_template/` を `games/[game-id]/` にコピー
2. `src/` 内を実装 (共通ライブラリ: `import { GameShell, useAudio } from "../../../src/shared"`)
3. `index.html` に title/meta/OGP/canonical/GA4 を設定
4. `src/portal/data/games.json` にエントリ追加
5. `public/thumbnails/[game-id].svg` にサムネイル追加
6. `npm run build` で確認
