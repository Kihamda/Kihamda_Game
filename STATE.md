# 現在の状態

更新: 2026-10-21。必要な履歴を選択し、検証済み無料作品の限定配信を進める。

## 制作と配信

- 制作正本: business/unity/ops/ledger.json。進行工程・lease・最新checkpointは`python business/ops/context.py`で確認する。ここにタスク状態を複製しない。
- 既存Web入口と4作品の紹介・入力・保存品質を検証済み。PR28はhead e2dcca07c99d2606b9647f2017cc563aebd287eaのLinux/Windows CI成功後、2026-10-20 07:02:51JSTにc4f708dへマージ済み。本日追加PRは作らず、運用改善の成果はローカル保存して翌日分へ統合する。
- 現行CI保全版: business/unity/evidence/delivery-web-dialog-error-final-20261020.json。これは実デプロイではない。作品のreleaseと事業指標はnull。実HTTP障害・実タッチ・Safari・人間評価・別PC復元は未確認。
- MineRush限定配信・条件付き復旧・HTTP照合を実装。PR29と実配信前の復旧入口・既存計測維持を補う訂正PR30を、それぞれ最新headのLinux/Windows CI成功後にマージした。最新mainは2bc5d74eef7386aecd1fc39fc42d177d817ad916、同版CI39445834759も成功。71のbusinessテスト、通常ビルド・既存入力回帰に成功し、同版専用artifactをローカルで操作検査した。390px幅で横はみ出しなし。実タッチ・Safariは未確認。
- 実FTPS読み取り検査39444847103が成功し、旧本番209ファイル・1,514,538バイトをHTTPSと照合して保持。ダウンロード後の全ハッシュ、同じPCで旧MineRushの起動・開封・再読み込みを確認した。対象専用アセットの550は依然「不存在またはアクセス不可」。アップロード時にMLSD成功を必要とする。別PC復元・実サーバーrenameは未確認。
- 最新mainの限定配信run39445984592を一度だけ起動。現在は配信前の再照合中で、完了・本番操作は未確認。次回は同じrunの結果とjournalを先に照合し、重複dispatchしない。実デプロイ件数へまだ算入せず、release=nullを維持する。詳細: docs/web-scoped-production-delivery.md、business/unity/evidence/scoped-delivery-20261021.json。全体FTPS workflowは起動していない。

## 直近の運用改善

T-context-delivery-20261020の実装・検証完了。promptは3,724→177文字。現行規約と過去記録を分離し、正本台帳の検証付き選択読込を導入した。34テストとリポジトリ検査、設定読戻し、元351イベント・原本アーカイブの保全を確認。詳細はdocs/context-delivery-20261020.md。定期実行IDはunity、01/07/13/19時JSTとモデル・通知設定を維持する。追加指示により定期枠は原則25分の制作・検証と5分の保存に変更。部分成果だけで早期終了せず、実経過時間と終了理由を記録する。次回の実稼働時間は未観測。

## 履歴を調べる場合

旧STATEはdocs/history/state-through-20261020.md、旧AGENTSはdocs/history/agents-through-20261020.mdへバイト一致で保全した。照合値はdocs/history/context-migration-20261020.json。詳細はタスクID・対象パスで正本台帳、Git履歴、docs、business/unity/evidenceを絞って読む。過去記録の「次工程」や当日限定の停止文を最新指示として実行しない。
