# extreme_tik_tok_toe platform

ブラウザゲームプラットフォーム。全ゲームを単一リポジトリで管理し、XServer Static にデプロイする。

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
  plugins/               ← Vite SSGプラグイン
  games/
    _template/           ← 新ゲーム量産テンプレート
    ntiktaktoe/          ← Game #1
    ...                  ← Game #2〜#14
  src/
    shared/              ← 全ゲーム共通ユーティリティ
    portal/data/         ← ゲームメタデータ
  public/                ← 静的アセット(thumbnails, manifest, sw.js)
  dist/                  ← ビルド出力(ポータル + 全ゲーム)
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
3. `index.html` の title/meta/OGP/canonical/GA4 を設定
4. `src/portal/data/games.json` に登録
5. `public/thumbnails/[your-id].svg` にサムネイルを追加
6. `npm run build` で確認
