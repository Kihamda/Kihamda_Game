# Kihamda.NET Unityスタジオ

毎回、天啓.md、STATE.md、business/studio-policy.json、business/unity/ops/ledger.jsonを読む。天啓.mdは本人の指示入力用。本人の最新の直接指示を優先する。意味を変更せず、取り組みと必要な検証が完了した指示だけ、STATE.mdに実施内容・結果・未確認事項を記録してから削除する。継続方針はこのファイルやbusiness/studio-policy.jsonにも保存する。未完了の指示と作業中の本人の追記・変更は消さない。天啓.md自体と追記欄は残す。

親フォルダの全プロジェクトも引き継ぐ。business/workspace-projects.jsonとdocs/workspace-handoff.mdを参照し、旧フォルダの量産指示を再稼働しない。復元保管庫_recoveryはローカル専用でGitHubへ公開しない。Atohitoriは本人が別途制作するため自律開発の対象外。完成後に配布を明示依頼された時だけ扱う。

リポジトリ移行はPR #10でmainへ統合済み。通常の制作・検査・コンサルティングは本人のWindows PCで行い、UnityのWindows/Web配布ビルドはGitHub Actionsで行う。Unity Personalを使用する。CI/CDの障害だけで独立した制作を止めない。認証や実プレイが未確認なら、その検証を済んだことにしない。

新作・移植はすべてUnity。unity-projects.jsonに登録し、unity/<Project>/へ分離する。Assetsと.meta、Packages、ProjectSettingsを保存し、Library、Temp、ビルド、ライセンス、認証情報はGitへ追加しない。公開リポジトリに有料作品の非公開ソースや有償素材を置かない。生成素材の出所はdocs/generated-assets.mdへ残す。

WIP1、サブエージェント禁止。現在はIce Courierを継続する。01/07時は実装と品質、13時は一次資料の市場調査を具体的な優先タスクへ変換、19時は実測と検査から戦略を調整する。毎回新しいゲームを量産しない。売上・純利益・訪問・再訪など未観測値はnull。ビルド成功を面白さや事業成果の証明にしない。

2026-10-10の本人指示により、当面はUnity作品のWeb入口の刷新を優先する。ゲームのWIPはIce Courierのみを維持する。トップ・作品詳細・案内ページは共通のReact画面から静的生成し、Unityカタログと旧URL保全カタログを区別する。配信未確認の作品に開始リンクを出さない。検証済みWeb成果物のローカル接続と読み込み・戻る・失敗時の検査は完了。次は既存のIce Courier縦画面改善工程で、Unity内部の説明・盤面・操作部を整える。実タッチと人間の反応は未観測として残す。本番全体置換は行わない。

制作の正本はbusiness/unity/ops/ledger.json。business/ops/ledger.jsonは旧クラウド履歴で、別のleaseを持つため上書きしない。共通business/ops/flow.pyを使い、expected revision、run ID、lease、fenceを確認する。台帳を手書き・初期化・競合自動merge・force pushしない。期限切れleaseは成果物と外部結果を照合してrecoverする。未知の外部操作を再送しない。25分でcheckpoint、30分以内に保存し、次の一工程を残す。

既存Web資産の採否はbusiness/legacy-dispositions.json。削除前にGit履歴・bundle・復元先を確認する。4作品はUnity移植の資料として残し、検証済みUnity版へ順次置き換える。新規Reactゲームを作らない。

編集・内部検査・別ブランチ保存・PR作成・GitHub Actionsビルドは許可済み。検証した無料作品だけ既存の許可済み領域へ配信する。ポータル全体の置換、販売、決済、DNS、有料契約、外部連絡、SNS送信は行わない。Web本番配信は手動で、同一版の検査と復元条件を揃える。外部PRから認証付きUnityビルドを起動しない。本人のPCをGitHub runnerとして公開しない。

ブログは下書き保存に限定し、別事業のprivate stateや認証をコピーしない。BOOTH向け量産を再開しない。定期実行の元設定を保全し、登録した事実と実行した事実を区別する。通知は新しい完成物、重大な障害、本人操作が必要な事項に限定する。
