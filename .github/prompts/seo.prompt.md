---
description: "SEO 対策・OGP タグを追加してWeb検索からの流入を増やす。sitemap は SSG プラグインが自動生成。"
---

# SEO / OGP 対応タスク

このゲームが Google / Twitter / LINE などで発見・シェアされやすくなるよう対応してください。

## Step 1: `games/[game-id]/index.html` メタタグ追加

以下を `<head>` 内に追加:

```html
<!-- 基本 SEO -->
<meta name="description" content="[ゲーム説明 120文字以内]" />
<meta name="keywords" content="[キーワード], ブラウザゲーム, 無料" />
<link rel="canonical" href="https://game.kihamda.net/games/[game-id]/" />

<!-- OGP (Facebook / LINE) -->
<meta property="og:title" content="[ゲーム名] - 無料ブラウザゲーム" />
<meta property="og:description" content="[ゲーム説明]" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://game.kihamda.net/games/[game-id]/" />
<meta
  property="og:image"
  content="https://game.kihamda.net/thumbnails/[game-id].svg"
/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[ゲーム名] - 無料ブラウザゲーム" />
<meta
  name="twitter:image"
  content="https://game.kihamda.net/thumbnails/[game-id].svg"
/>
```

## Step 2: sitemap.xml (自動生成)

`plugins/portal-ssg.ts` がビルド時に `dist/sitemap.xml` を自動生成するのではなく、`scripts/prebuild.mjs` が `public/sitemap.xml` を生成する。
`src/portal/data/games.json` の全ゲームの URL が含まれる。
手動での sitemap 作成は不要。

## Step 3: robots.txt

`public/robots.txt` に配置 (既にあればそのまま):

```
User-agent: *
Allow: /
Sitemap: https://game.kihamda.net/sitemap.xml
```

## Step 4: OGP 画像

`public/thumbnails/[game-id].svg` を作成する。

## ポータル側の SEO

ポータルの meta/OGP/canonical は `plugins/portal-ssg.ts` が `src/portal/App.tsx` を SSR して生成。ポータルのメタタグは `index.html` の `<head>` で直接設定済み。
変更する場合は `index.html` の `<head>` またはプラグインを編集する。

## 実際のドメイン

- ポータル: `https://game.kihamda.net/`
- 各ゲーム: `https://game.kihamda.net/games/[game-id]/`
