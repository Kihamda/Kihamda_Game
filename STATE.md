# 現在の状態

更新: 2026-10-21。必要な履歴を選択し、検証済み無料作品の限定配信を進める。

## 制作と配信

- 制作正本: business/unity/ops/ledger.json。進行工程・lease・最新checkpointは`python business/ops/context.py`で確認する。ここにタスク状態を複製しない。
- 既存Web入口と4作品の紹介・入力・保存品質を検証済み。通常ポータルを本番全体へ置換せず、MineRush専用4ファイルの配信に限定する。
- 通常ポータルのCI保全版: business/unity/evidence/delivery-web-dialog-error-final-20261020.json。これ自体は本番全体へ配信していない。
- MineRushは2026-10-21に限定配信受入れ完了。URL: https://game.kihamda.net/games/minerush/ 。ソース2bc5d74eef7386aecd1fc39fc42d177d817ad916、成功CI39445834759、候補manifest SHA-256: 2ad053d3798d2996d3e0d795671c75d1fcbd55e7bcd4733bb9b9b4b7c6c5169f。配信run39445984592は最終照合途中にcancelledとなったが、元journalの4件書込記録と実HTTP全4ファイル・対象外5URL・旧baseline208件の一致、本番ブラウザ操作を別途照合した。重複dispatch・復旧書込みは行っていない。
- 本番で開封、矢印・F・Enter・Space、旗モード、再読み込みで盤面・旗初期化、一覧への往復を確認。390px・1280pxで横はみ出しなし。ゲームオーバー表示・終了後セル無効化・リセットに加え、公開版のクリア状態（71マス・旗10）と再開始もDOMで確認した。実タッチ、Safari、人間評価、別PC復元、本番復旧書込みは未確認。利用・利益指標はnull。
- 本日の実デプロイは1件。MineRushの公開登録・確認環境と中断後の読み取り専用照合workflow、配信job制限の修正は次回統合用のローカル変更。本番トップや対象外作品は置換していない。他4作品のreleaseはnullを維持。
- 復元元: scoped-delivery-39445984592内scoped-recovery、ローカルartifacts/scoped-reconcile-20261021-0100/scoped-recovery。旧209件を保持。元journalのstatusは旧実装のcreating-assets-directoryのままなので成否判断に使わない。詳細: business/unity/evidence/scoped-production-accepted-20261021.json、docs/web-scoped-production-delivery.md。

## 直近の運用改善

現行規約と過去記録を分離し、正本台帳を検証して必要工程だけ読む手順を運用中。詳細はdocs/context-delivery-20261020.md。公開登録を含む保管パッケージの検査と、アップロード前の復元元検査を修正。保持物のオフライン模擬検査を再利用できるコマンドとworkflowへ追加した。ゲーム再読み込み後に一覧・紹介画面のCSSが失われる問題も修正し、4作品からの一覧復帰、390px・1280px、検索条件の保持を実ブラウザで確認。Windows・WSL Linux各98テスト、Linux Node.js22のクリーンビルド、保管・展開と18種類の不正ケース拒否が成功した。最新Webソース9826105。本人のCD原因調査・デプロイ続行依頼により翌日待ちを解除し、fix/scoped-cd-timeout-20261021で最新headのGitHub CI・main反映・中断runの読取り専用照合と限定再配信を進める。20分timeoutのannotationを確認済み。実サーバーへの復旧は未実施。今回の実時刻・ハッシュ・未確認事項はbusiness/unity/evidence/scoped-hardening-integration.jsonと正本checkpointへ保存する。

## 履歴を調べる場合

旧STATEはdocs/history/state-through-20261020.md、旧AGENTSはdocs/history/agents-through-20261020.mdへバイト一致で保全した。照合値はdocs/history/context-migration-20261020.json。詳細はタスクID・対象パスで正本台帳、Git履歴、docs、business/unity/evidenceを絞って読む。過去記録の「次工程」や当日限定の停止文を最新指示として実行しない。
