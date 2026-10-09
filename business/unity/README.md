# ローカルUnityスタジオの正本

`ops/ledger.json` がUnity制作・コンサルティングの正本です。古いクラウド運用のbusiness/ops/ledger.jsonは履歴として保持し、同じleaseや成果物保存領域を共有しません。更新は共通のflow.pyを使い、元のイベントを消しません。

CLIはUnity台帳があるcheckoutではそれを既定に使います。各更新で--ledger business/unity/ops/ledger.jsonを明示してください。旧履歴を検査するときだけ--ledger business/ops/ledger.jsonを指定します。

```powershell
python business/ops/flow.py status --ledger business/unity/ops/ledger.json
python business/ops/flow.py next --ledger business/unity/ops/ledger.json
pwsh -File scripts/Invoke-Unity.ps1 -Operation Validate
dotnet run --project tests/CourierCore/CourierCore.csproj
```

通常制作はWindowsローカル。CIビルドはGitHubホスト型runner。Unity Personalを使い、有料ライセンスや新規課金を契約しません。CIやCDの障害だけを理由にコード制作と独立したルール検査を止めません。Unityライセンスがない場合はGUI検証・Unityビルドを未確認として残し、実行できる作業を進めます。

天啓.mdを毎回読み、最新の直接指示を優先します。1作ずつ継続し、01/07時は実装、13時は一次資料の市場調査から具体的なタスク化、19時は実測・人間の反応と技術検査による方針調整を行います。新しい企画を毎回作り直しません。

runは一意ID、予定時刻と実際の開始時刻、WIP1、30分のleaseで管理します。25分でcheckpoint、終了前に成果物ハッシュと次の一工程を保存します。同じ予定slotを二重実行せず、期限切れleaseは外部結果・保存commitの照合後にrecoverします。台帳を手書き・初期化・自動競合mergeしません。

事業成果は純利益、開始率、完了率、再訪で判断し、取得できない値はnull。ビルド成功と面白さを分け、実プレイと公開後の匿名集計で評価します。BOOTH販売、決済、DNS、有料契約、SNS送信は自動化しません。
