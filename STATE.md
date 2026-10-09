# 現在の工程

2026-10-09。リポジトリ移行を先行。ゲーム制作・選定・移植は未実施。

GitHubの公開版main（4523cc5）と運用版ops/game-business（85cf1eb）をローカルの `unity/curated-migration` へ統合した。元のdev（20eb8d0）とmain、全取得済み参照のbundleを保全した。

既存101ゲームとポータルをweb/へ分離。旧URLとカタログを維持。Unityは空の移行確認プロジェクトを用意した。旧量産指示とSNSワークフローはlegacy/へ退避し、自動制作・自動告知の入口から外した。GitHub側の公開版・スケジュール・販売設定はまだ変更していない。

運用台帳の正本と全イベントはbusiness/ops/ledger.jsonで保持。Windowsの排他とUTF-8へ対応し、tzdataを固定依存に追加した。新方針は天啓.md、AGENTS.md、移行決定記録に記載する。

検査結果はdocs/migration-verification.mdへ記録する。Unity 6000.3.23f1とWindows/Webモジュールは存在するが、Editor起動は有効ライセンスがなく終了コード198で停止した。Unityのコンパイル、EditMode/PlayMode、Windows/Webビルドは未実証。売上・純利益・公開後指標は未観測。

次の工程は移行PRのCI確認と、Unity Hubでのライセンス有効化後の基盤検査。移行が完了するまでゲームコードを制作しない。ブログ/ゲームの既存クラウド定期実行の切替は、その設定を保全してから別工程で行う。

Draft PRは https://github.com/Kihamda/Kihamda_Game/pull/10 。707a1e6のGitHub Linux/Web・Windows台帳CIは成功。ローカルの台帳22検査、actionlint、PowerShell構文、保存commitから展開した構成検査も成功。mainへのmergeと本番デプロイは未実施。Unity runnerとunity-local-ci環境は未登録。
