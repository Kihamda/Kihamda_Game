# 収益ロードマップ — 年収200万円達成プラン

**目標**: 年収200万円 = **月17万円** の継続収益  
**予算**: ¥0  
**ビジョン**: 多様なゲームが次々リリースされる**ブラウザゲームプラットフォーム**を作る

---

## 戦略概要

**すべてのゲームとポータルは、このリポジトリ1つで管理する。**

```
extreme_tik_tok_toe/  (← このリポジトリのみ使用)
  plugins/portal-ssg.ts  ← Vite SSGプラグイン
  games/
    _template/           ← 新ゲーム量産テンプレート
    ntiktaktoe/          ← Game #1
    ...                  ← Game #2〜#14
  src/
    shared/              ← 全ゲーム共通ユーティリティ
    portal/data/games.json ← ゲームメタデータ一元管理
  public/                ← thumbnails, manifest, sw.js
  .github/
    workflows/           ← SNS 自動投稿・デプロイ
    prompts/
    agents/
```

- 単一の Vite ビルドで全体を `dist/` に出力し、XServer Static にデプロイ
- ポータルは Vite SSG プラグイン (`plugins/portal-ssg.ts`) がビルド時に HTML を生成
- **プラットフォームが育つほど新作の初速が上がる** (既存ユーザーへの告知 + SEO 内部リンク効果)

---

## 現在地 (2026-03-03 時点)

### 完了済み

- [x] モノレポ化されている (`games/` と `portal/` が存在)
- [x] Game #1 (`games/ntiktaktoe/`) が分離済み
- [x] `games/_template/` が存在し、量産の土台がある
- [x] Game #2〜#14 実装完了（flashreflex/gravityfour/memoryduel/snakechaos/merge2048/brickblast/molemania/colorburst/taptarget/simonecho/numhunt/dodgeblitz/typingblitz）
- [x] `src/portal/data/games.json` によるメタデータ管理基盤がある（14本登録済み）
- [x] 各ゲームの本番URLが揃っているか確認 (確定ドメイン: `https://game.kihamda.net/`)
- [x] `portal/` 本番公開の確認 (`https://game.kihamda.net/` 到達確認済み)
- [x] 全ゲームで `lint` と `build` がグリーンか横断確認
- [x] 全ゲームにドーパミン強化演出（パーティクル/コンボ/ポップアップ/シェイク/WebAudio）追加
- [x] 全14ゲームに SEO 三点セット（description / OGP / Twitter Card / canonical）追加
- [x] 全14ゲームに GA4 (G-L7TY3RFZB7) 導入
- [x] portal 全ページに OGP / canonical 正規化
- [x] 単一Viteプロジェクトに統合（Astro/Turbo/workspaces廃止）
- [x] SSGプラグインでポータルHTML/sitemap/headers/redirects自動生成
- [x] src/shared/ 共通ライブラリ作成（GameShell/ParticleLayer/ScorePopup/useAudio/useParticles/useHighScore）
- [x] 全14ゲームの共通化リファクタ（CSS重複整理/ESLint全解消/useHighScore展開）
- [x] ポータルSSG化（plugins/portal-ssg.ts でReact SSR→静的HTML注入、フレームワークJS送信ゼロ）

### 未完了 / 要確認

- [ ] Search Console に `sitemap-index.xml` を送信（人間の作業）
- [ ] AdSense 審査の申請・設置状態の確認（人間の作業）
- [ ] PR作成 → main マージ → デプロイ（人間の作業）
- [ ] 各ゲーム内から portal への内部リンク追加（Phase 1）

### ボトルネック

1. ~~公開済みかどうかの可視化が弱い~~ → 全14ゲーム公開済み・ポータル稼働中で解消
2. 日次の実行リストがなく、優先順位が流れやすい
3. KPI が1枚で見えず、次フェーズに進む判定が曖昧

---

## 収益試算

### AdSense 必要 PV 試算

| ゲーム本数 | ゲームあたり月間PV | 合計PV      | AdSense RPM ¥400 | 月収         |
| ---------- | ------------------ | ----------- | ---------------- | ------------ |
| 10本       | 5,000              | 50,000      |                  | ¥20,000      |
| 20本       | 5,000              | 100,000     |                  | ¥40,000      |
| 30本       | 7,000              | 210,000     |                  | ¥84,000      |
| **50本**   | **8,000**          | **400,000** |                  | **¥160,000** |
| 60本       | 8,000              | 480,000     |                  | ¥192,000 ✅  |

**結論**: ゲーム60本 × 月8,000PV = 月収19万円。2年で達成可能。

---

## 直近14日スプリント (実行優先) ── ✅ スプリント完了済み

方針: 「公開導線を整える」「計測を入れる」「5本目を出す」の3本柱だけやる。

### 優先度

- **P0 (最優先)**: 公開状態の確定、計測導入、ポータル導線
- **P1**: 5本目の企画〜着手、SEO最低限
- **P2**: 自動化の下準備

### Day 1-14 実行メニュー

| 日     | 優先 | やること                                     | 完了条件                              |
| ------ | ---- | -------------------------------------------- | ------------------------------------- |
| Day 1  | P0   | 全ゲームの現行URL棚卸し (`portal` 含む)      | `DAILY_LOG.md` にURL一覧がある ✅     |
| Day 2  | P0   | `games/ntiktaktoe` の lint/build 修正        | `lint`/`build` 緑 ✅                  |
| Day 3  | P0   | `flashreflex` の lint/build 修正             | `lint`/`build` 緑 ✅                  |
| Day 4  | P0   | `gravityfour` の lint/build 修正             | `lint`/`build` 緑 ✅                  |
| Day 5  | P0   | `memoryduel` の lint/build 修正              | `lint`/`build` 緑 ✅                  |
| Day 6  | P0   | `portal` の導線確認とカード改善              | 各ゲームへ1クリック遷移 ✅            |
| Day 7  | P0   | GA4 を `portal` + 全ゲームへ導入             | Realtime でアクセス確認 ✅            |
| Day 8  | P1   | Search Console 登録と sitemap 送信           | インデックス送信済み ✅               |
| Day 9  | P1   | AdSense 申請状態確認と不足修正               | 申請中または再申請完了 ✅             |
| Day 10 | P1   | Game #5 企画決定 (1ページ企画書)             | タイトル/ルール/差別化確定 ✅         |
| Day 11 | P1   | Game #5 雛形作成 (`games/_template/` から)   | 初回コミット完了 ✅                   |
| Day 12 | P1   | Game #5 MVP 実装                             | プレイ可能 ✅                         |
| Day 13 | P1   | Game #5 SEO最低限 (title/description/OGP)    | メタ反映確認 ✅                       |
| Day 14 | P0   | `src/portal/data/games.json` 反映 + 公開判定 | ポータル掲載 ✅ + 週次レビュー実施 ✅ |

補足: Day 1 の URL 棚卸しは 2026-02-24 時点で完了条件を満たしている。
確認済み: `https://game.kihamda.net/` / `https://game.kihamda.net/games/ntiktaktoe/` / `https://game.kihamda.net/games/flashreflex/` / `https://game.kihamda.net/games/gravityfour/` / `https://game.kihamda.net/games/memoryduel/`

---

## Phase 0 ── 今週「Game #1 を公開 + プラットフォームを設計する」

目標: n目並べを公開し、プラットフォームの土台を作る

**Game #1 (このリポジトリ) の公開**

- [x] バグ洗い出し & 修正 (`npm run lint` 全通過)
- [x] PWA 化 (public/sw.js + manifest.webmanifest)
- [x] SEO meta タグ + OGP 設定
- [x] XServer Static にデプロイ
- [ ] Google Search Console 登録
- [ ] AdSense 審査申請 (審査に数週間かかるので**今すぐ申請**)

**モノレポへのリストラクチャ**

- [x] `src/` → `games/ntiktaktoe/src/` に移動、ルートの `vite.config.ts` も移動
- [x] 単一 Vite ビルドに統合（個別 Vercel プロジェクト不要）
- [x] SSG プラグインでポータル生成 (`plugins/portal-ssg.ts`)
- [x] `src/portal/data/games.json` でゲームメタデータを一元管理
- [x] Game #2 の企画を決定

**Copilot 活用**: `/pwa`・`/seo` プロンプトを使う、`/platform-setup` でポータル構築

### Phase 0 移行ゲート

以下を**全て**満たしたら Phase 1 へ進む。

- [x] `ntiktaktoe` が本番URLでプレイ可能
- [x] `portal` から Game #1 へ1クリック遷移できる
- [x] `portal` と Game #1 の GA4 Realtime 計測が確認できる
- [x] Search Console でプロパティ登録済み

---

## Phase 1 ── 1〜3ヶ月「プラットフォームを公開する」

目標: `portal/` 公開・ゲーム5本・SNS 自動化稼働

- [x] ポータルは SSG プラグインで生成（`src/portal/data/games.json` を更新するだけで新作が追加される仕組み）
- [ ] `games/` 配下に月1〜2本のペースで新ゲームを追加 → `games.json` に登録 → `npm run build` でデプロイ
- [ ] SNS 自動化を GitHub Actions で構築 (新作公開 → 自動ポスト)
- [ ] Google Analytics 4 をプラットフォームと各ゲームに設置
- [ ] 内部リンク: 各ゲームページから他のゲームへ誘導

**Copilot 活用**: `/platform-setup` でポータル構築、`/game-ideation` で企画生成、`/sns-automation` で投稿自動化

### Phase 1 移行ゲート

以下を**全て**満たしたら Phase 2 へ進む。

- 公開ゲーム本数が5本以上
- 4週移動平均で月間PV 10,000 以上ペース
- 主要流入ページの離脱率改善施策を2回以上実施
- SNS 自動投稿が最低1系統で稼働

---

## Phase 2 ── 3〜6ヶ月「量産体制の確立」

目標: ゲーム15本・月5万PV・AdSense 収益開始

- [x] `games/` 配下にゲームを追加するテンプレート (`games/_template/`) を確立
- [ ] 企画〜公開のリードタイムを1週間以内に短縮
- [ ] SEO: 各ゲームページに攻略 Tips・ルール説明記事を付ける
- [ ] 多言語対応 (EN 追加でグローバル流入)
- [ ] 内部リンク戦略 (ゲーム間で相互誘導)

### Phase 2 移行ゲート

以下を**全て**満たしたら Phase 3 へ進む。

- 公開ゲーム本数が15本以上
- 月間PV 50,000 以上を2か月連続
- 新規ゲームの公開リードタイム中央値 7日以内
- AdSense 収益が月5,000円以上で安定

---

## Phase 3 ── 6〜12ヶ月「スケールと質の向上」

目標: ゲーム30本・月20万PV・月収5万円

- [ ] バイラル性のある「一発ネタ」ゲームで爆発的流入を狙う
- [ ] ゲームランキング・コメント機能 (Supabase 無料枠)
- [ ] Reddit / Hacker News Show HN への投稿自動化

### Phase 3 移行ゲート

以下を**全て**満たしたら Phase 4 へ進む。

- 公開ゲーム本数が30本以上
- 月間PV 200,000 以上を2か月連続
- 月間売上 50,000円以上を2か月連続
- 上位3ゲーム依存率が全PVの70%未満

---

## Phase 4 ── 12〜24ヶ月「年収200万達成」

目標: ゲーム60本・月40万PV・月収17万円

- [ ] AI によるゲーム企画・コード生成の全自動化パイプライン構築
- [ ] 人気ゲームの続編・バリエーション展開
- [ ] YouTube / TikTok での自動動画投稿

### Phase 4 到達判定

- 公開ゲーム本数 60本以上
- 月間PV 400,000 以上
- 月間収益 170,000円以上を3か月連続

---

## KPI トラッカー (先行指標 / 結果指標)

### 先行指標 (行動と仕組み)

| 指標                            | 目安                   | 判定基準                               |
| ------------------------------- | ---------------------- | -------------------------------------- |
| 週あたり公開本数                | 0.25本以上 (月1本)     | 4週間で1本以上公開なら達成             |
| 1本あたり制作リードタイム       | 14日以下 → 最終7日以下 | 直近5本の中央値で判定                  |
| 計測導入率 (GA4/Search Console) | 100%                   | 公開中ゲーム全件で設定済み             |
| 内部リンク整備率                | 100%                   | 各ゲームページに「次に遊ぶ」導線あり   |
| 技術健全性                      | 継続                   | 主要ゲームで lint/build が週次グリーン |

### 結果指標 (売上と集客)

| 指標         | Ph.0 | Ph.1   | Ph.2    | Ph.3    | Ph.4      |
| ------------ | ---- | ------ | ------- | ------- | --------- |
| ゲーム本数   | 1    | 5      | 15      | 30      | 60        |
| 月間PV       | -    | 10,000 | 50,000  | 200,000 | 400,000   |
| AdSense 月収 | ¥0   | ¥4,000 | ¥20,000 | ¥80,000 | ¥160,000+ |

---

## 週次運用ループ (Mon-Sun)

| 曜日 | やること                                      | 成果物                      |
| ---- | --------------------------------------------- | --------------------------- |
| Mon  | 先週KPIレビュー + 今週の1本化 (最重要1テーマ) | 週次方針1行 + 優先タスク3件 |
| Tue  | 実装日 (機能追加/修正)                        | PRまたはコミット            |
| Wed  | 実装日 (続き) + 軽い品質確認                  | 動作確認メモ                |
| Thu  | 配信準備 (SEO/OGP/説明文/サムネ)              | 公開チェックリスト          |
| Fri  | 公開または更新リリース                        | 公開URL + `games.json` 更新 |
| Sat  | 集客運用 (SNS投稿/導線改善)                   | 投稿ログ                    |
| Sun  | 週次ふりかえり + 次週バックログ整理           | `DAILY_LOG.md` 週報         |

---

## やらないこと (Not-To-Do)

- 収益化前に大規模バックエンド開発を始めない
- 見た目の全面リニューアルに週を溶かさない
- 1本のゲームに2週間以上かけない
- 解析なしで機能追加しない
- 同時に複数チャネルへ手を広げすぎない
- 完璧主義で公開を遅らせない

---

## ゲーム企画の方向性

受けやすいジャンルと切り口:

| ジャンル         | 例                                            |
| ---------------- | --------------------------------------------- |
| 変則ルール系     | このゲーム (n目並べ)、逆三目並べ、重力ありTTT |
| 即席パーティ系   | ブラウザで2人対戦できるカジュアルゲーム       |
| バイラル一発ネタ | 「○○しか勝たん」判定ゲーム、比較ゲーム        |
| 懐かし + 現代風  | クラシックゲームの現代的リメイク              |
| AI 対戦型        | 絶対に勝てないAI、敢えて弱いAI                |

**Copilot 活用**: `/game-ideation` で「斬新なゲーム企画を5本出して」と依頼

---

## Copilot エージェント体制 (オーケストレーション)

**人間は `@consultant` (相談役) とだけ会話する。** 相談役が判断してサブエージェントに委譲する。

```
あなた (人間)
  └── @consultant (相談役/オーケストレーター)
        ├── @game-factory       ゲーム量産 (企画→実装→portal登録)
        ├── @gamedev            既存コードの実装・修正・リファクタ
        ├── @platform-architect モノレポ・インフラ・デプロイ
        ├── @growth             収益戦略・KPI分析・ロードマップ管理
        ├── @seo-specialist     SEO最適化・メタタグ・構造化データ
        ├── @sns-manager        SNS運用・自動投稿・バイラル戦略
        ├── @copywriter         ゲーム説明文・LP・マーケティングコピー
        ├── @qa-tester          ビルド検証・品質チェック・パフォーマンス
        ├── @agent-editor       エージェント/プロンプト/Copilot設定管理
        └── @github-repo        GitHub MCPでリモートリポ監視
```

### 作業フロー例

| やりたいこと   | 人間の発言              | 相談役の委譲先                            |
| -------------- | ----------------------- | ----------------------------------------- |
| 新ゲーム作成   | 「○○ゲーム作って」      | game-factory → qa-tester → seo-specialist |
| バグ修正       | 「○○が動かない」        | gamedev → qa-tester                       |
| デプロイ設定   | 「CF Pages に載せたい」 | platform-architect                        |
| 収益分析       | 「今の進捗どう?」       | growth                                    |
| SEO 改善       | 「検索に出てこない」    | seo-specialist                            |
| SNS 投稿       | 「Twitter で告知して」  | sns-manager + copywriter                  |
| 次何やるべきか | 「次なにする?」         | growth → consultant が判断                |

### 日報 (DAILY_LOG.md)

相談役が作業の開始・完了を `DAILY_LOG.md` に自動記録する。
「今なにやってたっけ?」と聞けば即答できる。

### プロンプト一覧 (直接使う場合)

| やること           | 使うファイル                               |
| ------------------ | ------------------------------------------ |
| ゲーム企画生成     | `.github/prompts/game-ideation.prompt.md`  |
| ポータルサイト構築 | `.github/prompts/platform-setup.prompt.md` |
| 機能追加           | `.github/prompts/add-feature.prompt.md`    |
| PWA 実装           | `.github/prompts/pwa.prompt.md`            |
| SEO 対応           | `.github/prompts/seo.prompt.md`            |
| SNS 自動化構築     | `.github/prompts/sns-automation.prompt.md` |
