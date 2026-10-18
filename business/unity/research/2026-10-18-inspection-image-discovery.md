# 検査版画像による作品理解と拡大操作

2026-10-18の13時枠で、既存4作品の画像紹介と拡大工程を調査した。新作や外部出稿は行わない。

itch.ioの[品質指針](https://itch.io/docs/creators/quality-guidelines#provide-screenshots-for-your-project-if-applicable)は、作品の内容を判断するための実画面を推奨している。同指針の誤認防止の項目は、実在しない機能や誤解を招く画像を避けるよう求める。[ページ設計](https://itch.io/docs/creators/design#what-to-put-in-the-description)では操作方法、対応入力、開発中の状態を案内する。これらは市場側の掲載方針であり、Kihamda.NETの需要や開始率が上がる証拠ではない。

[W3Cのmodal dialogパターン](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)から、初期フォーカス、TabとShift+Tabの内部循環、Escape、閉じるボタン、起点へのフォーカス復帰を受入条件へ対応付けた。

既存T-web-catalog-preview-enlargementへ反映した。390×844と1280×720で4作品を通常入力で開閉し、画像、ラベル、検索語Web付き一覧復帰を確認する。小画面では元画像を矢印で縦横に動かして内容を確認でき、ページ自体は横へはみ出さないことを条件とする。画像を右端まで動かした後の再表示で盤面が見えにくくなる実測結果を受け、開くたびに横中央・上端へ戻す。画像読込が開く操作より遅い場合にも読込完了時に位置を合わせる。

次の受入タスクはT-web-daily-ci-integration-20261019。今日のPR26はマージ済みなので、画像拡大・修正・検査・復元記録を翌日の日次PR一件へまとめる。最新headのLinux/Windows CI成功、検査版表示とrelease=nullの維持、元版と画像ハッシュが結び付いた成果物の復元、復元版の拡大と検索復帰を受入条件とする。本番サイト全体の置換はしない。

月間純利益、訪問、開始率、完了率、再訪は取得できずnull。14/28日の事業判断はunobservedのまま。人間評価、実タッチ、Safariと別PC復元は未確認で、技術検査と区別する。
