---
description: "新しいゲームを企画から実装・SEO・portal登録まで全工程を完走する。これ1つで完成まで行ける。"
---

# 新ゲーム全工程実行プロンプト

ゲームの概要を教えてください。あとはすべて自動で完成まで進めます。

## 入力として教えること (これだけでOK)

```
ゲームID: [英数字小文字の連結]
タイトル: [日本語タイトル]
一言説明: [〇〇するゲーム、60文字以内]
ゲームの概要: [どんなゲームか、ルールの概要]
```

---

## AI が自律実行する全工程

### Phase A: コード実装

1. `codebase` で `games/_template/` を読み込んで構造を把握する
2. `games/[game-id]/` を `_template` からコピーして作成する
   (個別の `package.json` / `vite.config.ts` は不要。ルートに集約済み)
3. 以下の順で実装する:

**実装順序 (この順を守る)**:

```
games/[game-id]/src/lib/types.ts       ← ゲーム固有の型定義
games/[game-id]/src/lib/constants.ts   ← 定数 (ボードサイズ、初期値など)
games/[game-id]/src/lib/[game-id].ts   ← ゲームロジック純粋関数
games/[game-id]/src/App.tsx            ← 状態管理・フェーズ制御
games/[game-id]/src/App.css            ← ゲーム固有スタイル
games/[game-id]/src/components/        ← StartScreen, GameView, ResultScreen
games/[game-id]/index.html             ← SEO / OGP / canonical / GA4 メタタグ
```

共通ライブラリを使う場合:

```ts
import { GameShell, useAudio } from "../../../src/shared";
```

4. ルートで `npm run build` を実行 (= `tsc -b && vite build`)
5. エラーがあれば修正して 4 に戻る

### Phase B: SEO / OGP 設定

`games/[game-id]/index.html` の `<head>` に追加:

```html
<meta name="description" content="[一言説明]" />
<meta name="keywords" content="[関連キーワード, ブラウザゲーム, 無料]" />
<meta property="og:title" content="[ゲームタイトル] - 無料ブラウザゲーム" />
<meta property="og:description" content="[一言説明]" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://game.kihamda.net/games/[game-id]/" />
<meta
  property="og:image"
  content="https://game.kihamda.net/thumbnails/[game-id].svg"
/>
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[ゲームタイトル]" />
<meta
  name="twitter:image"
  content="https://game.kihamda.net/thumbnails/[game-id].svg"
/>
<link rel="canonical" href="https://game.kihamda.net/games/[game-id]/" />
```

### Phase C: portal 登録

`src/portal/data/games.json` の `games` 配列に追加:

```json
{
  "id": "[game-id]",
  "title": "[タイトル]",
  "description": "[一言説明]",
  "path": "/games/[game-id]/",
  "thumbnail": "/thumbnails/[game-id].svg",
  "tags": ["タグ1", "タグ2"],
  "publishedAt": "[今日の日付 YYYY-MM-DD]",
  "featured": false
}
```

---

## 完了後の報告フォーマット

```
✅ 実装完了: games/[game-id]/

変更ファイル:
- games/[game-id]/index.html
- games/[game-id]/src/main.tsx
- games/[game-id]/src/App.tsx
- games/[game-id]/src/App.css
- games/[game-id]/src/components/...
- games/[game-id]/src/lib/...
- src/portal/data/games.json
- public/thumbnails/[game-id].svg

動作確認:
  npm run dev
  # ブラウザで http://localhost:5173/games/[game-id]/ にアクセス

デプロイ:
  git add . && git commit -m "feat: add [game-id] game"
  git push origin main
  # → GitHub Actions (build-and-deploy.yml) が自動実行
  # → npm run build で dist/ に一括ビルド
  # → FTPS で XServer Static に自動デプロイ
  # → URL: https://game.kihamda.net/games/[game-id]/

【人間がやること】
1. SNS 投稿: 新作告知を投稿
   URL: https://game.kihamda.net/games/[game-id]/
```
