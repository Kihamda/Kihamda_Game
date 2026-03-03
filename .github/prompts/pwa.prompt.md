---
description: "PWA はプラットフォーム全体で単一化済み。public/sw.js + public/manifest.webmanifest で運用中。"
---

# PWA 対応リファレンス

PWA はプラットフォーム全体で単一化済み。
各ゲームに `vite-plugin-pwa` や `@vite-pwa/astro` を入れる必要はない。

---

## 現在の PWA 構成

| ファイル                      | 役割                                               |
| ----------------------------- | -------------------------------------------------- |
| `public/manifest.webmanifest` | プラットフォーム全体 PWA マニフェスト (scope: `/`) |
| `public/sw.js`                | Service Worker (手書き・静的配信)                  |

- `public/` のファイルは `npm run build` 時に `dist/` にそのままコピーされる
- XServer Static が `dist/` を配信するため、追加設定不要

## manifest.webmanifest

```json
{
  "name": "ブラウザゲームポータル",
  "short_name": "GamePortal",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e"
}
```

## Service Worker (sw.js)

`public/sw.js` に手書きで配置。
キャッシュ戦略:

- ゲームアセット (`/games/*/assets/*`) → CacheFirst
- HTML → NetworkFirst
- SW 自体 → `Cache-Control: no-store` (`plugins/portal-ssg.ts` が `_headers` で設定)

## 個別ゲームで PWA 対応を追加する場合

通常不要。プラットフォーム全体の SW が scope `/` でカバーしている。

## 完了確認

- `npm run build` が通ること
- `npm run preview` で Lighthouse PWA スコアが 90+ になること
