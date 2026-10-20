# 選択読込と日次配信の運用変更

2026-10-20の本人指示に基づき実施。定期実行ID unityは維持し、promptを3,724文字から177文字へ短縮した。アプリのautomation_updateで更新し、ローカルの設定を読み戻して01/07/13/19時JST、モデルgpt-6.1-sol、推論low、失敗時のみ通知、自動archive、ローカル実行・対象project・cwdの維持を確認した。設定ファイルを直接編集していない。

## 起動時の動作

現行AGENTS、本人指示、短いSTATE、policyとコーディング規約を確認する。context.pyが正本台帳のイベントチェーンとprojectionを内部検証し、未完了工程・lease・最新checkpointの参照先・未確定外部操作・最新feedbackだけ表示する。必要なタスクはID指定で関連decisionと最後のcheckpointを取得する。実装と設定を確認してから、必要な経緯だけGit履歴・正本台帳・証跡へ遡り、自分で判断する。

AGENTSは12,868文字から2,282文字、STATEは33,960文字から1,201文字へ整理した時点で比較した。今後の直近結果更新により数値は変わる。元AGENTS・STATE・policyはdocs/historyへ原本のバイト列を保存し、manifestにSHA-256を記録した。Gitの改行変換で原本が変わらない属性を設定した。台帳はflow.pyで追記し、元351イベントを保持した。天啓.mdの原文、旧クラウド台帳、作品のreleaseは変更していない。親作業領域のAGENTSも選択読込の入口へ更新した。

## 日次配信

一日一回目安の実配信をpolicyとdocs/autonomous-workflow.mdへ定義した。PRは原則一日一件程度にまとめつつ、PRマージ済みを配信停止の理由にしない。設計・改善順序・必要検査と許可内の配信は自律判断する。CIアーカイブやマージをデプロイと数えず、配信URL・版・動作確認まで記録する。

現行build-and-deploy.ymlは全体ビルドをmainからFTPSへ送る構成で、サイト全体置換禁止に抵触するため起動していない。GitHubで直近の成功run 37882170230とrepository変数一覧が空であることを確認した。これはenvironment変数やsecretの不在を意味しない。次工程T-web-scoped-production-delivery-20261020で既存1作品の実配信先・共有アセット・復元元を照合し、他作品とトップを置換しない配信を検証する。現時点では本番デプロイ未実行。

## 検証

- business/testsの34テスト成功。選択読込による無関係履歴の除外、完了工程の明示参照、leaseと原本の保持、イベント/projection改ざん時のCLI終了、原本アーカイブのSHA-256照合を含む。
- npm run check成功。既存4作品とUnity GUID19件の保全契約を確認。
- 定期設定の読み戻し、351イベントのprefix一致、天啓・旧台帳・releaseの不変を確認。
- Web UIと配信workflowに実装変更はなく、今回の検証は運用コード・規約・設定を対象とした。次回の定期起動そのものと実デプロイはまだ未観測。

設定の確認結果はbusiness/unity/evidence/context-delivery-20261020.json、現行手順はdocs/autonomous-workflow.md、規約はdocs/coding-conventions.md。過去の運用promptを新promptや現行AGENTSへ再び蓄積しない。

## 定期枠の短時間終了への修正

本人から「３０分動かずに５分とかで終わっちゃう」と指摘を受け、正本の19時runを照合した。slotからyieldまで約524秒、22:55継続runはstartからyieldまで約191秒だった。これらは台帳内の記録間隔で、会話全体の所要時間ではない。30分上限と25分checkpointだけでは継続条件が曖昧だったため、現行手順・AGENTS・policyへ原則25分の制作/検証と5分の保存、部分成果後の継続、早期終了の根拠、実時計による経過時間と終了理由の記録を追加した。定期promptは177文字のまま維持した。変更後の定期実行時間はまだ未観測。
