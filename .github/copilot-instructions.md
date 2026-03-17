# Copilot Instructions

## Project Overview

**このリポジトリはこの1つだけ使用する。** ブラウザゲームプラットフォーム全体を単一の Vite + React SPA で管理する。

`games/*/index.html` は廃止済み。HTML エントリはルートの `index.html` だけを使う。

```
extreme_tik_tok_toe/
  games/
    _template/            # 新作ゲームの雛形（src/App.tsx / main.tsx）
    ntiktaktoe/           # Game #1
    flashreflex/          # Game #2
    ...                   # 計14本以上のゲーム
  src/
    App.tsx               # ルートSPA（/ と /games/:id をルーティング）
    portal/               # ポータルUI
      data/
        games.json         # ゲームメタデータ一元管理
    games/
      metadata.ts          # games.json 読み込みと検索
      registry.ts          # import.meta.glob でゲームコンポーネント登録
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
  public/
    thumbnails/            # ゲームサムネイル SVG
    manifest.webmanifest
    sw.js
  index.html               # SPAエントリ
  vite.config.ts           # 単一 Vite 設定
  .github/
    agents/
    prompts/
    workflows/
```

単一の `npm run build` でSPAを `dist/` に出力し、XServer Static にデプロイする。

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

### SPA ルーティング (`src/App.tsx`)

`src/App.tsx` がブラウザのパスを解釈して画面を切り替える:

- `/` → ポータル (`src/portal/App.tsx`)
- `/games/:id` → 対応するゲームを遅延ロードして表示
- それ以外 → 404 UI

ゲームの実体は `src/games/registry.ts` の `import.meta.glob("../../games/*/src/App.tsx")` で自動登録される。

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
npm run dev          # Vite 開発サーバー起動（SPAをローカル確認）
npm run build        # tsc -b && vite build（SPA全体 → dist/）
npm run preview      # ビルド結果のプレビューサーバー
npm run lint         # ESLint チェック
```

- **開発時**: `npm run dev` → `/` (ポータル) と `/games/[id]` (ゲーム) を同一SPA内で確認
- **ビルド**: ルートの `vite build` でSPAを出力し、`public/` の静的アセットを `dist/` にコピー
- **最終出力**: `dist/` 一つに全部入り
- **URL 構造**: `https://game.kihamda.net/` (ポータル) / `https://game.kihamda.net/games/[id]` (各ゲーム)

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

- **SPA Router**: `src/App.tsx` が `/` と `/games/:id` を振り分ける
- **Game Registry**: `src/games/registry.ts` が `games/*/src/App.tsx` を自動収集して遅延ロード
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
2. `games/[game-id]/src/App.tsx` をゲーム本体として実装（必要なら `App.css` 追加、共通UIは `@shared` を活用）
3. `src/portal/data/games.json` にエントリ追加（`id` と `path: "/games/[game-id]/"` を一致させる）
4. `public/thumbnails/[game-id].svg` にサムネイル追加
5. `/games/[game-id]` で表示できることを `npm run dev` で確認
6. `npm run build` で最終確認

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
