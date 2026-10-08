# game.kihamda.net 改善事業

正本はこのリポジトリの `business/ops/ledger.json`。`business/README.md` と直近checkpointを読み、最新mainと作業branchを照合する。Sell-Something-Wellは参照元であり、BOOTH商品・自動タスク・private state・認証情報を変更／全コピーしない。

成功指標は実訪問者、意図的なプレイ開始率、7日再訪、検索流入、継続的な月間純利益。表示カウンタ、GAタグ、検査件数、ゲーム数は実績でない。匿名集計の期間・定義・sourceが揃わない値はnull。全費用と同期間収益がない純利益もnull。

本人の最新指示: 今回は具体的ゲーム改善を行わず基盤を構築し、改善はBOOTHと同時刻の定期処理で進める。ゲーム専用の日本時間01/07/13/19時処理の新規登録は明示許可済み。BOOTH既存タスクは変更しない。一作ずつ大きく作り込み、ゲーム数・掲載作品の構成も再検討する。毎回薄い新作を増やさない。

正本管理branchはops/game-business。内部修正と検査、通常の別branch保存は許可済み。**mainへのpush・PRのmergeはCDが走る公開操作**。定期処理は別branch保存・PR作成まで。main push、merge、自動merge、デプロイdispatch、release tagは実行しない。公開、広告契約、課金、外部連絡は対象版への本人許可が必要。AI検査合格は承認でない。追加先払い0円。

実行は `python3 business/ops/flow.py`。WIP1。全状態更新はexpected revision、worker更新はrun_id/fence/有効leaseを照合する。25分でcheckpoint、30分以内に保存。期限切れleaseは自動claimしない。外部結果不明は照合証拠まで停止。過去event、task、decisionと未完了を削除しない。ledgerを手書きしない。別マシン間ではbranch headのCASも必須。競合したledgerを自動mergeせず保全・照合する。

taskは目的・受入条件・成果物・検査・次作業を必須とし、仮説→変更→テスト→公開後観測→判断を結ぶ。移管taskは元IDと出典を保持する。報告は技術品質、集客、実利益を分け、修正・検査・保存commit・未観測・次の一工程を示す。
