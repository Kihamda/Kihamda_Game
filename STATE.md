# 現在の状態

更新: 2026-10-20。本人の最新指示により意思決定の裁量を拡大し、必要な履歴を選んで読む定期運用と一日一回目安の実デプロイへ移行する。

## 制作と配信

- 制作正本: business/unity/ops/ledger.json。進行工程・lease・最新checkpointは`python business/ops/context.py`で確認する。ここにタスク状態を複製しない。
- 既存Web入口と4作品の紹介・入力・保存品質を検証済み。PR28はhead e2dcca07c99d2606b9647f2017cc563aebd287eaのLinux/Windows CI成功後、2026-10-20 07:02:51JSTにc4f708dへマージ済み。本日追加PRは作らず、運用改善の成果はローカル保存して翌日分へ統合する。
- 現行CI保全版: business/unity/evidence/delivery-web-dialog-error-final-20261020.json。これは実デプロイではない。作品のreleaseと事業指標はnull。実HTTP障害・実タッチ・Safari・人間評価・別PC復元は未確認。
- MineRush限定配信を実装中。現行CI保全版は作品紹介ページであり、本番の遊べるページへそのまま上書きできないことを確認。既存ゲームを直接起動する4ファイルの専用ビルドと、FTPSルート・本番HTTPS・復元元を照合する読み取り専用検査を実装した。19時の通常ビルド・既存ゲーム検査・ローカル実ブラウザ操作に加え、夜の継続で依存ファイルの再帰保存を実装し49テストが成功。本番HTTPSから静的参照208ファイルを取得したが、実FTPS照合・復元検証ではない。詳細: docs/web-scoped-production-delivery.md、business/unity/evidence/scoped-production-delivery.jsonとscoped-recovery-20261020-2255.json。
- T-web-scoped-production-delivery-20261020を継続。次は新候補のCI統合とmain上の読み取り専用FTPS検査。実FTPSルート、限定アップロード・復旧処理と配信後検証は未完了で、実デプロイ件数へ算入しない。現行全体FTPS workflowは起動せず、release=nullを維持する。当日PRマージ済みという理由で既存検証版の配信を止める運用には戻さない。

## 直近の運用改善

T-context-delivery-20261020の実装・検証完了。promptは3,724→177文字。現行規約と過去記録を分離し、正本台帳の検証付き選択読込を導入した。34テストとリポジトリ検査、設定読戻し、元351イベント・原本アーカイブの保全を確認。詳細はdocs/context-delivery-20261020.md。定期実行IDはunity、01/07/13/19時JSTとモデル・通知設定を維持する。追加指示により定期枠は原則25分の制作・検証と5分の保存に変更。部分成果だけで早期終了せず、実経過時間と終了理由を記録する。次回の実稼働時間は未観測。

## 履歴を調べる場合

旧STATEはdocs/history/state-through-20261020.md、旧AGENTSはdocs/history/agents-through-20261020.mdへバイト一致で保全した。照合値はdocs/history/context-migration-20261020.json。詳細はタスクID・対象パスで正本台帳、Git履歴、docs、business/unity/evidenceを絞って読む。過去記録の「次工程」や当日限定の停止文を最新指示として実行しない。
