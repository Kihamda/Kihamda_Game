# 現在の状態

2026-10-09。移行PR #10はmainへ統合済み（0d3192f）。次の制作ブランチはunity/autonomous-studio。

101作品の採否を記録し、Ice Slide、Gravity Ball、Mine Rush、nTicTacToeの4作品を移植資料として残した。他の実装はGit履歴と全参照bundle、削除前Webのzipを保全して整理した。採用や統合は実装費用とルールから判断しており、人気や利益の実測による判断ではない。

最初の作品Ice Courierは、移動の出発点が凍って障害物になる配送パズル。3ステージ、Undo、保存・再開、解法検証を実装した。ルール単体検査とインストール済みUnity DLLに対するC#コンパイルは成功。Unity Editor起動・実画面・EditMode/PlayMode・Windows/Web配布ビルドは認証待ちで、成功扱いにしない。

通常制作は本人のWindows PC。GitHub Actionsは作品登録からWindows/Webを直列でビルドする。Personalライセンスを使用し、有料契約やローカルself-hosted runnerは不要。CI/CDの障害で独立した制作を止めない。

制作の正本はbusiness/unity/ops/ledger.json。旧クラウドのbusiness/ops/ledger.jsonと運用履歴を保持し、実行中のleaseには介入しない。本人の指示により旧クラウド定期実行を停止してローカルへ切り替える。登録・停止の実際の結果はdocs/studio-verification.mdへ記録する。

天啓.mdは本人専用。本人の最新指示をbusiness/studio-policy.jsonにも記録した。売上・純利益・公開後の指標は未観測。無料公開前に実プレイ、同一版の成果物、復元条件を確認する。
