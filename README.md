# extreme_tik_tok_toe platform

ブラウザゲームプラットフォーム。全ゲームを単一リポジトリで管理し、XServer Static にデプロイする。

現在は **単一 React アプリ + 単一 HTML エントリ (`index.html`)** 構成。
`/games/:id` ルートで各ゲームコンポーネントを表示する。

**Portal**: https://game.kihamda.net/

## ゲームラインナップ (14本)

| ID            | タイトル     | ジャンル            |
| ------------- | ------------ | ------------------- |
| `ntiktaktoe`  | n目並べ      | ストラテジー/多人数 |
| `flashreflex` | Flash Reflex | 反射神経            |
| `gravityfour` | Gravity Four | ボード/2人対戦      |
| `memoryduel`  | Memory Duel  | 記憶/2人対戦        |
| `snakechaos`  | Snake Chaos  | アーケード          |
| `merge2048`   | Merge 2048   | パズル              |
| `brickblast`  | Brick Blast  | アーケード          |
| `molemania`   | Mole Mania   | アーケード          |
| `colorburst`  | Color Burst  | 反射神経/パズル     |
| `taptarget`   | Tap Target   | 反射神経            |
| `simonecho`   | Simon Echo   | 記憶                |
| `numhunt`     | Num Hunt     | 反射神経            |
| `dodgeblitz`  | Dodge Blitz  | アーケード          |
| `typingblitz` | Typing Blitz | タイピング          |

## 構成

```
extreme_tik_tok_toe/
  games/
    [game-id]/           ← 各ゲーム本体（Appコンポーネント）
  src/
    App.tsx              ← 単一アプリルーター (`/`, `/games/:id`)
    games/
      metadata.ts        ← `src/portal/data/games.json` を型付きで参照
      registry.ts        ← `games/*/src/App.tsx` の遅延ロードレジストリ
    portal/
      data/games.json    ← ゲームメタデータ唯一ソース
    shared/              ← 全ゲーム共通ユーティリティ
  public/                ← 静的アセット(thumbnails, manifest, sw.js)
  dist/                  ← ビルド出力(単一SPA)
```

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run dev
```

## ビルド

プラットフォーム全体を `dist/` に出力

```bash
npm run build
```

## lint

```bash
npm run lint
```

## 新ゲーム追加手順

1. `games/_template` を `games/[your-id]` にコピー
2. `src/` 内をゲームロジックで実装
3. `src/portal/data/games.json` に登録
4. `public/thumbnails/[your-id].svg` にサムネイルを追加
5. `npm run build` で確認

補足: `games/*/index.html` は廃止済み。ゲームはすべてルートの `index.html` + SPAルーティング (`/games/:id`) で配信する。
