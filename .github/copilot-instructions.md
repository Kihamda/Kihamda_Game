# Copilot Instructions

## Project Overview

**このリポジトリはこの1つだけ使用する。** ブラウザゲームプラットフォーム全体を単一の Vite プロジェクトで管理する。

```
extreme_tik_tok_toe/
  plugins/
    portal-ssg.ts        # ポータル SSG プラグイン（ビルド時に portal HTML 生成）
  games/
    _template/            # 新作ゲームの雛形
    ntiktaktoe/           # Game #1 「n目並べ」
    flashreflex/          # Game #2
    ...                   # 計14本以上のゲーム
  src/
    shared/               # 全ゲーム共通ユーティリティ
      index.ts
      theme.css
      components/
        GameShell.tsx      # 共通レイアウトシェル
        ParticleLayer.tsx  # パーティクル演出
        ScorePopup.tsx     # スコアポップアップ
      hooks/
        useAudio.ts        # オーディオ管理
        useParticles.ts    # パーティクル管理
    portal/
      data/
        games.json         # ゲームメタデータ一元管理
  public/
    thumbnails/            # ゲームサムネイル SVG
    manifest.webmanifest
    sw.js
  index.html               # ポータルエントリ（ビルド時は SSG でHTML注入済みの静的ページに変換）
  vite.config.ts           # 単一 Vite 設定（マルチエントリ + SSG プラグイン）
  .github/
    agents/
    prompts/
    workflows/
```

単一の `npm run build` で全ゲーム + ポータルを `dist/` に出力し、XServer Static にデプロイする。

## Architecture

### ntiktaktoe の設計パターン（全ゲームの参考設計）

```
games/ntiktaktoe/src/
  App.tsx              # アプリ全体の状態管理。ゲームフェーズ制御の唯一の場所
  components/          # 表示専用コンポーネント（StartScreen, GameView, ResultScreen）
  lib/
    types.ts           # 型定義のみ。ロジック・副作用なし
    constants.ts       # DEFAULT_COLORS, DEFAULT_MARKS など定数
    settings.ts        # GameSettings の生成・クローン関数
    players.ts         # プレイヤー設定の純粋関数 (add/remove/update)
    board.ts           # ボード操作・勝利判定の純粋関数
    storage.ts         # localStorage への読み書き（副作用はここだけ）
    audio.ts           # ゲーム固有のオーディオ設定
```

### 共通ユーティリティ (`src/shared/`)

全ゲームが `@shared` パスエイリアス経由でインポートできる共通モジュール:

- `GameShell` — 共通レイアウトシェル
- `ParticleLayer` / `useParticles` — パーティクル演出
- `ScorePopup` — スコアポップアップ
- `useAudio` — オーディオ管理
- `theme.css` — 共通テーマ変数

### Portal SSG (`plugins/portal-ssg.ts`)

Vite プラグインとしてビルド時にポータルページを SSG:

- `closeBundle` フックで `src/portal/App.tsx` を SSR ビルド
- `renderToStaticMarkup` で静的 HTML に変換して `dist/index.html` に注入
- portal 用の React JS バンドルを除去（CSS のみ残存）
- ランダムゲームリンク用のインラインスクリプトを追加

静的ファイル生成:

- `scripts/prebuild.mjs` — `sitemap.xml` と `_redirects` を `public/` に生成
- `public/_headers` — キャッシュヘッダー（静的配置）

データソースは `src/portal/data/games.json`。

**設計方針**:

- `lib/` の関数はすべて純粋関数。状態・副作用を持たない
- 全ゲーム状態は `App.tsx` の useState が一元管理
- `GameSettings` は必ず `cloneGameSettings()` でディープコピーしてから渡す
- プレイヤー設定変更は関数型アップデータで行う: `setNewGameSettings(prev => updatePlayerName(prev, index, name))`

## Game Phase Flow

`"before"` → (ゲーム開始) → `"in_progress"` → (勝者決定) → `"after"` → (リセット) → `"before"`

型: `AppPhase = "before" | "in_progress" | "after"`

## Build & Dev Commands

プロジェクトルートで全て実行する（個別ゲームディレクトリでの実行は不要）:

```bash
npm run dev          # Vite 開発サーバー起動（ルート index.html がランチャー）
npm run build        # tsc -b && vite build（全ゲーム + portal SSG → dist/）
npm run preview      # ビルド結果のプレビューサーバー
npm run lint         # ESLint チェック
```

- **開発時**: `npm run dev` → ブラウザで `/` を開くと開発ランチャー（各ゲームへのリンク一覧）。各ゲームは `/games/[id]/index.html` でアクセス
- **ビルド**: Vite マルチエントリで `games/*/index.html` を全処理 → `plugins/portal-ssg.ts` が portal HTML を SSG 注入 → `public/` の内容が `dist/` にコピー
- **最終出力**: `dist/` 一つに全部入り
- **URL 構造**: `https://game.kihamda.net/` (ポータル) / `https://game.kihamda.net/games/[id]/` (各ゲーム)

## Code Style

- **型インポートは必ず `import type`**: `verbatimModuleSyntax: true` のため必須
- **strict モード全有効**: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` など
- CSS は各ゲームの `src/App.css` + 共通の `src/shared/theme.css`。BEM ライクなクラス名（例: `.start-card`, `.player-config-item`）
- コンポーネントは props を明示的な interface で型定義する
- 不要なコメントは書かない

## Key Types ([games/ntiktaktoe/src/lib/types.ts](../games/ntiktaktoe/src/lib/types.ts))

```ts
Board = CellValue[][]          // CellValue = string | null
GameSettings { board: { width, height }, players: Player[], winLength }
Player { name, mark, color }
PersistedState                 // localStorage 保存用スナップショット
DevicePreferences              // デバイス固有設定（確認モード等）
```

## Integration Points

- **Portal SSG**: `plugins/portal-ssg.ts` がビルド時に `src/portal/App.tsx` を SSR して `dist/index.html` に静的 HTML を注入
- **共通ユーティリティ**: `src/shared/` から `@shared` エイリアスでインポート（`GameShell`, `useAudio`, `useParticles` 等）
- **localStorage**: `saveGameState` / `loadGameState` / `clearSavedGame` (`lib/storage.ts`)
- **public/**: `thumbnails/`, `manifest.webmanifest`, `sw.js` がビルド時に `dist/` へコピー
- 外部 API・認証・テストフレームワークは未使用

## Platform Strategy

収益化ロードマップは [ROADMAP.md](../ROADMAP.md) を参照。

**ビジョン**: 多様なゲームが次々リリースされるプラットフォーム。すべてのゲームとポータルはこのリポジトリ内で開発する。

**ホスティング戦略**:

- XServer Static (無料・静的ホスティング)
- 単一の `npm run build` で全ゲーム + ポータルを `dist/` に一括ビルド
- GitHub Actions (`build-and-deploy.yml`) が main push 時に FTPS で XServer Static へ自動デプロイ
- Service Worker キャッシュ
- PWA: `public/sw.js` + `public/manifest.webmanifest` が scope `/` で全ゲームをカバー

**優先順位**:

1. `games/` 配下に新作を継続追加、`games.json` + SNS 自動投稿
2. AdSense 審査・収益化の推進
3. 共通ユーティリティ (`src/shared/`) の拡充

**拠りにすべきパターン**: `games/ntiktaktoe/src/lib/` の純粋関数設計。新ゲーム作成時もこの設計を踏襲する。

## 新ゲーム追加手順

1. `games/_template/` を `games/[game-id]/` にコピー
2. `src/` 内をゲームロジックで実装（共通ユーティリティは `@shared` からインポート）
3. `index.html` の title / meta / OGP / GA4 を設定
4. `src/portal/data/games.json` にエントリ追加
5. `public/thumbnails/[game-id].svg` にサムネイル追加
6. `npm run build` で確認

## Copilot Agents & Prompts

### Agents (@エージェント名 で呼ぶ)

| ファイル                                     | 用途                                                      |
| -------------------------------------------- | --------------------------------------------------------- |
| `.github/agents/gamedev.agent.md`            | 機能実装・バグ修正・lint/build まで自律実行               |
| `.github/agents/growth.agent.md`             | 収益化・SEO・SNS戦略をコードレベルで実行                  |
| `.github/agents/platform-architect.agent.md` | モノレポ移行・ポータル構築・XServer Static設定            |
| `.github/agents/game-factory.agent.md`       | 「〇〇ゲームを作って」の一言で完成まで全工程実行          |
| `.github/agents/seo-specialist.agent.md`     | SEO最適化・メタタグ・構造化データ・内部リンク             |
| `.github/agents/sns-manager.agent.md`        | SNS運用・コンテンツカレンダー・GitHub Actions自動化       |
| `.github/agents/copywriter.agent.md`         | ゲーム説明文・LP・マーケティングコピー執筆                |
| `.github/agents/qa-tester.agent.md`          | ビルド検証・型チェック・パフォーマンス監査                |
| `.github/agents/agent-editor.agent.md`       | エージェント/プロンプト/Copilot設定の管理・整合性チェック |
| `.github/agents/github-repo.agent.md`        | GitHub MCP でリモートリポの状態確認・Issue/PR/CI監視      |
| `.github/agents/svg-artist.agent.md`         | ゲームのSVGサムネイル生成・更新 (640x360)                 |

### Prompts (`#プロンプト名` で呼ぶ)

| ファイル                                   | 用途                                   |
| ------------------------------------------ | -------------------------------------- |
| `.github/prompts/new-game-full.prompt.md`  | ゲーム全工程 (実装→PWA→SEO→portal登録) |
| `.github/prompts/portal-setup.prompt.md`   | Vite SSG ポータルサイト構築            |
| `.github/prompts/game-ideation.prompt.md`  | 新作ゲーム企画を5本生成                |
| `.github/prompts/pwa.prompt.md`            | PWA 実装 (vite-plugin-pwa)             |
| `.github/prompts/seo.prompt.md`            | SEO / OGP / sitemap 対応               |
| `.github/prompts/platform-setup.prompt.md` | プラットフォーム基盤セットアップ       |
| `.github/prompts/add-feature.prompt.md`    | 機能追加 (AI対戦・テーマ・統計等)      |
| `.github/prompts/sns-automation.prompt.md` | SNS 自動投稿スクリプト実装             |

### Workflows (Actions タブから手動実行)

| ファイル                                 | 用途                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `.github/workflows/build-and-deploy.yml` | **メイン**: main push 時に全体ビルド + XServer Static FTPS 自動デプロイ |
| `.github/workflows/ci.yml`               | PR 時の自動 lint + build チェック                                       |
| `.github/workflows/release-pipeline.yml` | リリース時 Twitter 自動投稿                                             |

### 人間がやること

→ [`YourSuckJobs.md`](../YourSuckJobs.md) を参照
