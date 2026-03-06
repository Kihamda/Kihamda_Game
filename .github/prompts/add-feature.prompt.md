---
description: "ゲームに新しい機能を追加する。AI対戦・テーマ・統計など収益・リテンション向上に直結する機能向け。"
---

# 機能追加タスク

追加する機能を選択して実装してください。既存のアーキテクチャ規則を必ず守ること。

## 実装ルール (必読)

- `lib/` に追加するロジックは**純粋関数**のみ。副作用・状態を持たない
- 新しい型は `lib/types.ts` に追記
- 新しい定数は `lib/constants.ts` に追記
- 状態追加は `App.tsx` の `useState` に集約
- `import type` を型インポートで必ず使う
- CSS クラス名は既存の BEM ライクな命名に揃える (`.feature-card`, `.feature-item` 等)

---

## 機能リスト (必要なものを選んで実装)

### A. AI 対戦モード (CPU プレイヤー)

`src/lib/ai.ts` を新規作成:

- `getBestMove(board, settings, playerMark): {row, col}` — Minimax + α/β 枝刈り
- 深さ制限: ボードサイズに応じて動的に変更 (大きいボードは浅く)
- 難易度: `"easy"` (ランダム) / `"normal"` (Minimax 深さ4) / `"hard"` (深さ8)

`GameSettings` に `players` の `isBot: boolean` と `difficulty` を追加。
`App.tsx` の `handleCellClick` で isBot プレイヤーのターンを自動処理。

### B. テーマ / ダークモード

`src/lib/theme.ts` を新規作成:

- `ThemeId = "default" | "dark" | "forest" | "ocean"` 型を定義
- CSS カスタムプロパティ (`--color-primary` 等) でテーマを切り替え
- `DevicePreferences` に `themeId: ThemeId` を追加して localStorage 永続化

### C. 統計・実績機能

`src/lib/stats.ts` を新規作成:

- 勝利回数・対戦回数・連勝数をプレイヤー名ごとに集計
- `loadStats()` / `saveStats()` で localStorage に永続化
- ResultScreen に「あなたの戦績」セクションを追加

### D. プリセットルール

`src/lib/constants.ts` に `PRESETS` 配列を追加:

```ts
{ name: "三目並べ", board: {width:3,height:3}, winLength: 3, ... }
{ name: "五目並べ", board: {width:15,height:15}, winLength: 5, ... }
{ name: "拡張版", board: {width:21,height:21}, winLength: 5, ... }
```

StartScreen にプリセット選択ボタンを追加。

---

## 完了確認

- `npm run build` が通ること (ルートから実行)
- `npm run lint` がエラーなしで通ること (ルートから実行)
