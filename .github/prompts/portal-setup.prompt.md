---
description: "Vite SSG プラグイン (plugins/portal-ssg.ts) でゲームポータルを生成する。ビルド時に src/portal/App.tsx を SSR して dist/index.html に静的 HTML を注入する。"
---

# ポータルサイト構築タスク

`plugins/portal-ssg.ts` の Vite プラグインでゲームポータルサイトを生成します。
Astro は廃止済。ポータルはビルド時に SSG プラグインが `src/portal/App.tsx` を SSR して `dist/index.html` に注入する。

---

## 現在のアーキテクチャ

- ポータル生成: `plugins/portal-ssg.ts` (Vite プラグイン)
- データソース: `src/portal/data/games.json`
- 出力先: `dist/index.html` (ビルド時自動生成)
- デプロイ: XServer Static (GitHub Actions から FTPS でデプロイ)
- PWA: `public/manifest.webmanifest` + `public/sw.js` (手書き・静的配信)

---

## SSG プラグインが行うこと

`npm run build` (= `node scripts/prebuild.mjs && tsc -b && vite build`) 実行時:

### `plugins/portal-ssg.ts` (`closeBundle` フック)

1. `src/portal/App.tsx` を SSR ビルド
2. `renderToStaticMarkup` で静的 HTML に変換
3. `dist/index.html` の `<div id="root">` に注入
4. portal 用の React JS バンドルを除去（CSS のみ残存）
5. ランダムゲームリンク用のインラインスクリプトを追加

### 静的ファイル生成

- `scripts/prebuild.mjs` — `sitemap.xml` と `_redirects` を `public/` に生成（prebuild ステップ）
- `public/_headers` — キャッシュヘッダー（静的配置）

## プラグインの構成

`plugins/portal-ssg.ts`:

```ts
import type { Plugin } from "vite";

export function portalSSG(): Plugin {
  return {
    name: "portal-ssg",
    closeBundle() {
      // 1. src/portal/App.tsx を SSR ビルド
      // 2. renderToStaticMarkup で静的 HTML に変換
      // 3. dist/index.html の <div id="root"> に注入
      // 4. portal 用 React JS バンドルを除去
      // 5. ランダムゲームリンク用インラインスクリプト追加
    },
  };
}
```

## ゲームメタデータ

`src/portal/data/games.json`:

```json
{
  "games": [
    {
      "id": "ntiktaktoe",
      "title": "n目並べ",
      "description": "盤面サイズやプレイヤー人数を自由に調整できるエクストリームな n目並べ",
      "path": "/games/ntiktaktoe/",
      "thumbnail": "/thumbnails/ntiktaktoe.svg",
      "tags": ["strategy", "multiplayer"],
      "publishedAt": "2026-02-21",
      "featured": true
    }
  ]
}
```

## URL 構造

- `https://game.kihamda.net/` → ポータル (SSG 生成)
- `https://game.kihamda.net/games/[id]/` → 各ゲーム SPA

## PWA 構成

- `public/manifest.webmanifest` — プラットフォーム全体 PWA マニフェスト (scope: `/`)
- `public/sw.js` — Service Worker (手書き、静的配信)
- 各ゲームに `vite-plugin-pwa` は **不要**

## キャッシュ設定

`public/_headers` に静的配置:

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/games/*/assets/*
  Cache-Control: public, max-age=31536000, immutable
/*.html
  Cache-Control: public, max-age=0, must-revalidate
/sw.js
  Cache-Control: no-store
/manifest.webmanifest
  Cache-Control: public, max-age=3600
```

## ゲーム追加時の更新手順

`src/portal/data/games.json` の `games` 配列に追記するだけ。
git push → GitHub Actions が `npm run build` → FTPS で XServer Static に自動デプロイ。

## ポータル HTML を変更する場合

ポータルのメタタグは `index.html` の `<head>` で直接設定済み。

`plugins/portal-ssg.ts` を編集すると SSG 生成内容を変更できる。

---

## 完了後の報告

```
✅ ポータル更新完了

確認:
  npm run build && npm run preview
  # ブラウザで http://localhost:4173/ にアクセス
```
