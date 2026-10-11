# Kihamda.NET Unityスタジオ

毎回、天啓.md、STATE.md、business/studio-policy.json、business/unity/ops/ledger.jsonを読む。天啓.mdは本人の指示入力用。本人の最新の直接指示を優先する。意味を変更せず、取り組みと必要な検証が完了した指示だけ、STATE.mdに実施内容・結果・未確認事項を記録してから削除する。継続方針はこのファイルやbusiness/studio-policy.jsonにも保存する。未完了の指示と作業中の本人の追記・変更は消さない。天啓.md自体と追記欄は残す。

親フォルダの全プロジェクトも引き継ぐ。business/workspace-projects.jsonとdocs/workspace-handoff.mdを参照し、旧フォルダの量産指示を再稼働しない。復元保管庫_recoveryはローカル専用でGitHubへ公開しない。Atohitoriは本人が別途制作するため自律開発の対象外。完成後に配布を明示依頼された時だけ扱う。

リポジトリ移行はPR #10でmainへ統合済み。通常の制作・検査・コンサルティングは本人のWindows PCで行い、UnityのWindows/Web配布ビルドはGitHub Actionsで行う。Unity Personalを使用する。CI/CDの障害だけで独立した制作を止めない。認証や実プレイが未確認なら、その検証を済んだことにしない。

新作・移植はすべてUnity。unity-projects.jsonに登録し、unity/<Project>/へ分離する。Assetsと.meta、Packages、ProjectSettingsを保存し、Library、Temp、ビルド、ライセンス、認証情報はGitへ追加しない。公開リポジトリに有料作品の非公開ソースや有償素材を置かない。生成素材の出所はdocs/generated-assets.mdへ残す。

WIP1、サブエージェント禁止。現在はIce Courierを継続する。01/07時は実装と品質、13時は一次資料の市場調査を具体的な優先タスクへ変換、19時は実測と検査から戦略を調整する。毎回新しいゲームを量産しない。売上・純利益・訪問・再訪など未観測値はnull。ビルド成功を面白さや事業成果の証明にしない。

2026-10-10の本人指示により、当面はUnity作品のWeb入口の刷新を優先する。ゲームのWIPはIce Courierのみを維持する。トップ・作品詳細・案内ページは共通のReact画面から静的生成し、Unityカタログと旧URL保全カタログを区別する。配信未確認の作品に開始リンクを出さない。旧検証済みWeb成果物のローカル接続と読み込み・戻る・失敗時の検査は完了。新UIは2026-10-11にUnity Editorの390×844で全3ルート、取り消し、Play停止・再起動後の再開を確認した。次は同一ソースの新responsive-v1 Actions成果物を照合してローカルWebへ接続し、最終CSS寸法とWeb操作を検査する。実タッチと人間の反応は未観測として残す。本番全体置換は行わない。

制作の正本はbusiness/unity/ops/ledger.json。business/ops/ledger.jsonは旧クラウド履歴で、別のleaseを持つため上書きしない。共通business/ops/flow.pyを使い、expected revision、run ID、lease、fenceを確認する。台帳を手書き・初期化・競合自動merge・force pushしない。期限切れleaseは成果物と外部結果を照合してrecoverする。未知の外部操作を再送しない。25分でcheckpoint、30分以内に保存し、次の一工程を残す。

未完了の工程は期限内に成果物・検査・次工程を保存し、flow.pyのyieldで同じタスクをreadyへ戻す。完了条件を満たしていないタスクをcompleteしない。未知の外部結果、変更済み成果物、期限切れleaseはyieldできない。長いアプリ承認待ちや応答待ちが起きたら追加検査を続けず、部分結果を先に保存する。期限切れなら照合後にrecoverする。2026-10-11の縦画面UIと検査制限はdocs/ice-courier-responsive-ui.md。新responsive-v1のActions成果物を検査してから新枠へ接続し、旧版を新UIの検査へ流用しない。

既存T-ice-courier-touch-polishの検査仕様はbusiness/unity/research/2026-10-10-portrait-entry-acceptance.mdを参照する。Unity内部とWeb枠の二重縮小を一緒に改善し、最終CSS寸法で押せる大きさを確認する。実タッチ、人間の導入理解、ブラウザ別の保存・再開を別々に記録し、未実行を合格にしない。調査のたびに元の実装タスクを置き換えない。

2026-10-10の実測はbusiness/unity/research/2026-10-10-measured-portrait-strategy.md。390pxの現在の枠は335px幅、canvasは334.4px幅。操作寸法は実測canvasとUnity座標の換算で、画像や物理タッチ検査ではない。技術上のimproveと、公開主指標が未観測のunobservedを分ける。次の実装枠では既存T-ice-courier-touch-polishを優先する。ツール待ちでleaseが切れた場合は部分結果と外部操作を照合してrecoverし、本人から再開指示がある場合は手動runとして記録する。消費済みslotは取り直さない。

既存Web資産の採否はbusiness/legacy-dispositions.json。削除前にGit履歴・bundle・復元先を確認する。4作品はUnity移植の資料として残し、検証済みUnity版へ順次置き換える。新規Reactゲームを作らない。

編集・内部検査・別ブランチ保存・PR作成・GitHub Actionsビルドは許可済み。検証した無料作品だけ既存の許可済み領域へ配信する。ポータル全体の置換、販売、決済、DNS、有料契約、外部連絡、SNS送信は行わない。Web本番配信は手動で、同一版の検査と復元条件を揃える。外部PRから認証付きUnityビルドを起動しない。本人のPCをGitHub runnerとして公開しない。

Unity検査はscripts/Invoke-Unity.ps1のRunIdごとの証跡へ保存する。同じRunId・operationの再実行は拒否するため、再検査は新しいRunIdを使う。標準待機300秒を超える設定でもcheckpoint期限を守る。Editorの実画面・入力・保存の確認を、Web配布版や実端末タッチの確認へ読み替えない。2026-10-11の検査範囲はdocs/ice-courier-editor-quality-20261011.md。生の画面・ログ・XMLはローカルartifactsに保管する。

ブログは下書き保存に限定し、別事業のprivate stateや認証をコピーしない。BOOTH向け量産を再開しない。定期実行の元設定を保全し、登録した事実と実行した事実を区別する。通知は新しい完成物、重大な障害、本人操作が必要な事項に限定する。

初回説明と保存案内はbusiness/unity/research/2026-10-11-first-play-and-save-acceptance.mdのF1〜F6を既存T-ice-courier-touch-polish内で検査する。出発1マスの凍結、実画面記号と日本語案内、再開後のUndo履歴初期化を明示し、Editor成功だけでWeb保存を保証しない。前回の寸法・実端末・人間評価条件を保持する。新Actions成果物が保留なら同じ工程の説明整備を継続し、新作や別計画へ置き換えない。

2026-10-11の19時にWebの日本語記号案内・展開できる英語ボタン説明・保存の確認範囲を反映した。business/unity/research/2026-10-11-guidance-strategy.mdを参照する。.NETの盤面検査とWeb案内の390/1280px実測を、新Unity配布版・実タッチ・人間評価へ読み替えない。次は同一ソースのresponsive-v1 Actions成果物を照合してローカルへ接続する。保留時は同じタスク内でF3の保存不可案内と配送完了noticeの競合を再現・修正する。Web刷新全体と既存タスクは未完了のまま保持する。
