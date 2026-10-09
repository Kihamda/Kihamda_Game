# 現在の状態

2026-10-10。移行PR #10はmainへ統合済み（0d3192f）。次の制作ブランチはunity/autonomous-studio。

101作品の採否を記録し、Ice Slide、Gravity Ball、Mine Rush、nTicTacToeの4作品を移植資料として残した。他の実装はGit履歴と全参照bundle、削除前Webのzipを保全して整理した。採用や統合は実装費用とルールから判断しており、人気や利益の実測による判断ではない。

最初の作品Ice Courierは、移動の出発点が凍って障害物になる配送パズル。3ステージ、Undo、保存・再開、解法検証を実装した。ルール単体検査とインストール済みUnity DLLに対するC#コンパイルは成功。Unity Editor起動、EditMode 2/2、PlayMode 1/1、Windows実キー操作を確認。GitHub Actions run 37945379221でWindows/Webの両方が成功し、ダウンロード後のチェックサムと版を検査した。Web実画面では移動・勝利・Undo・ページ再読み込み後のResumeが成功。縦画面と実タッチ、面白さは未評価で次工程へ残す。ローカルWebビルドにはUnity内部CLRエラーが残るが、指定されたGitHub Linux環境でWebビルドが成功している。

通常制作は本人のWindows PC。GitHub Actionsは作品登録からWindows/Webを直列でビルドする。Personalライセンスを使用し、有料契約やローカルself-hosted runnerは不要。CI/CDの障害で独立した制作を止めない。

制作の正本はbusiness/unity/ops/ledger.json。旧クラウドのbusiness/ops/ledger.jsonと運用履歴を保持し、実行中のleaseには介入しない。本人の指示により旧クラウド定期実行を停止してローカルへ切り替える。ローカル定期実行unityを01/07/13/19時に有効化済み。旧IDは現在の登録一覧に見つからず、停止成功とは断定しない。検証タスクはrevision 10で完了しleaseを解放、次の縦画面改善タスクを準備した。詳細はdocs/studio-verification.md。

天啓.mdは本人専用。本人の最新指示をbusiness/studio-policy.jsonにも記録した。売上・純利益・公開後の指標は未観測。無料公開前に実プレイ、同一版の成果物、復元条件を確認する。
