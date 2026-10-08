# ゲーム改善事業の定期実行

事業の正本は Kihamda/Kihamda_Game の **ops/game-business branch**。mainは公開ソースであり、push・mergeがCDを起動する。管理branchへの通常保存と改善用branchのPR作成までがAIの作業範囲。mainへのpush、PRのmerge、自動merge、workflow_dispatch、release tagのpushを実行しない。

本人の最新指示により、今回はゲーム修正の実施を停止し、この基盤を構築した。2048の途中差分はreview/merge2048-candidate.patchへ保全し、ゲームソースを元に戻した。保存patchの10検査は内部検査、モバイル差分は未完了候補。公開も集客・収益改善の実績もない。

## 最初に再開場所を確定する

GitHub connectorでops/game-businessのhead、AGENTS.md、business/ops/ledger.jsonを読む。最新main、lockfile、workflowも照合する。正本branchとmainを混同しない。作業treeに差分があれば保全する。リモートを取得できなければclaimせず、既存成果物の独立検査だけを進める。

ledgerはこの事業専用の状態であり、BOOTHのprivate stateはコピーしない。引継ぎは指定されたgame資産とB専用decision／claimの必要項目だけ。source-manifest.jsonに元ID・blob SHA・出典を保持し、元履歴を削除しない。

## PDCAは同じ実験を複数runで育てる

taskは目的・受入条件・成果物・検査・次工程、decision、hypothesis、experiment_id、PDCA段階を必須にする。experimentはplan→do→check→act→planの順。調査や計画だけのrunを重ねず、同じ選択の調査は2run以内に採用／改善／停止を決める。未測定のCheckもunobservedとして残し、独立した内部検査を続ける。

07時は実績／前回checkpoint／本人課題から優先順位を確認。13時は既存実験の受入条件と設計を詰める。19時は一作の内部制作と検査。01時は実結果／予測／失敗を照合し次工程を残す。時刻は重点であり、未完了の工程を捨てて毎日企画を初期化しない。今ある成果を再制作しない。

日本時間01:00・07:00・13:00・19:00、各run30分以内、25分時点でcheckpoint、最後3分は保存。定期slotは実際の予定時刻を含む一意キー。遅延30分以上は追いかけて実行しない。manual startは定期slotを消費しない。重複slotは元runを確認して再開する。

## 実行コマンドと通常保存

Python 3.12、POSIX flock、標準ライブラリだけを使う。各変更JSONを一時ファイルに置く。秘密／個人データは禁止。

```sh
python3 business/ops/flow.py status
python3 business/ops/flow.py next
python3 business/ops/flow.py slot --expected REV --data /tmp/game-slot.json
python3 business/ops/flow.py claim --expected REV --data /tmp/game-claim.json
python3 business/ops/flow.py checkpoint --expected REV --data /tmp/game-checkpoint.json
python3 business/ops/flow.py complete --expected REV --data /tmp/game-complete.json
python3 -m unittest discover -s business/tests -v
```

slot入力: scheduled_at=timezone付きISO8601、run_id=一意ID。claim入力: run_id、task_id、ttl_seconds（最大1800）。claimが返すfenceを以後のworker更新に使う。checkpoint／completeはrun_id、fence、artifacts（path・sha256）、checks、next_step、completeはpassed=trueを要求する。

**claimをGitHubへ保存・再取得して一致を確認するまでは実制作を開始しない。**ローカルflockは同じホストだけを排他する。別環境間の排他はリモートbranch headのexpected_shaによるCASで行う。二つのworkerが同じheadからclaimした場合、先にCAS保存できた一方だけが作業する。

GitHub connectorではhead取得→base treeに必要ファイルのみ追加→親headでcommit作成→update_ref(expected_sha=head, force=false)→branch・ledger・変更blobを再取得し一致確認。拒否されたら最新headを読み、未保存成果を別場所へ保全する。失敗した保存の成否が不明ならbranchとblobを読むまで再送しない。ledgerのGit競合を機械的merge／forceで解消しない。

workerはfenceごとの隔離worktree／ops/.runtime/FENCEで制作する。publishは有効run_id・fence・期限をロック中に確認し、staged fileのsha256が合う場合だけimmutable artifacts/SHAへ保存する。古いworkerは正本の成果物やゲームソースへ直接書かない。ゲーム修正は隔離branchへ通常保存しPRでレビュー。共有treeへの任意shell書込みまでOS権限で防ぐ製品ではないため、共通treeを複数workerに書かせない。リモート公開はCASで古いworkerを拒否する。

受入済み検査証拠は同じpathへ上書きせず新しい版のファイルにする。過去hashは対応する保存commitとimmutable artifactで照合する。今回system-checks.jsonが完了時の証拠、system-checks-final.jsonは後続CI確認の別版。

## 失敗復旧と承認

ledgerはevent chainとprojection digestを一つのJSONへ原子的置換し、fsyncする。破損は初期化せず停止、Git保存済snapshot／ハッシュ照合で復旧する。event、decision、完了taskは削除しない。

期限切れleaseをclaimで奪わない。成果物・リモートcommit・PR・外部結果を確認し、recoverにsource、reconciliation、artifacts、next_stepを残す。有効leaseの代理回収は禁止。不明な外部結果がある間はrecoverを拒否し、reconcile-externalで公式の結果証拠を記録する。外部操作の自動再試行はない。

block／unblock／cancelは根拠をcheckpointへ残す。承認待ちのtaskだけblockedにし、独立した内部taskは進める。approvalは実際の本人発言source・quote・action・artifact_sha256に束縛する。CLIは発言を認証せず記録するため、AIがuser sourceを捏造しない。prepare-externalは同一版承認なしでは拒否するが、それ自体は外部操作を実行しない。自動処理は承認があってもmain push／mergeを実行せず本人へPRを渡す。

## 計測と品質

measurement-contract.jsonに定義、kpis.jsonに未観測値と次の測定を保持する。GA4タグ、固定12,450+、おすすめflagを実測にしない。QAは技術品質の証拠だけ。公開後同一版について事前固定14／28日比較を行う。期間・timezone・人口・分母・sourceが揃わなければ比較を止める。月間純利益は完全な同月収益・手数料・返金・直接費・固定費・振込費の照合までnull。

catalog-policy.mdの掲載基準を使い、一作ずつ深く改善する。実測なしに人気順位や削除対象を作らない。公開構成変更もPRにして本人判断へ渡す。追加先払い0円。通知は新しい完成物、重大障害、本人に必要な具体操作だけ。同じ承認待ち／データ待ちを毎回通知しない。

automation.jsonが登録結果の記録。登録成功は将来runの成功ではない。future runで環境／Python／GitHubの必須機能がないときは新規claimをせず、その具体的な障害を報告する。別サービスやBOOTHへ自動的に仕事を移さない。
