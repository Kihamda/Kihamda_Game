# Kihamda.NET Unityモノレポ

Unity作品を一作ずつ制作するリポジトリです。本人の意思表明はルートの天啓.mdに記入します。通常の制作はWindows PC、配布ビルドはGitHub Actionsです。

| 場所 | 用途 |
| --- | --- |
| unity/IceCourier/ | 滑走後に出発点が凍る配送パズル、3ステージ |
| unity-projects.json | Unity作品とビルド対象の登録 |
| web/ | 移植資料として残す4作品と旧ポータル |
| business/unity/ops/ledger.json | 制作とコンサルティングの正本 |
| business/legacy-dispositions.json | 101作品の採否と統合先 |
| docs/legacy-recovery/ | 復元記録と移行前の定義 |

## ローカル検査

Unity Hubで6000.3.23f1のPersonalライセンスを有効化します。

```powershell
npm ci --prefix web
npm run check
npm run build
dotnet run --project tests/CourierCore/CourierCore.csproj
pwsh -File scripts/Invoke-Unity.ps1 -Operation Validate
pwsh -File scripts/Invoke-Unity.ps1 -Operation EditMode
pwsh -File scripts/Invoke-Unity.ps1 -Operation PlayMode
```

Windows/Webの制作中ビルドもInvoke-Unity.ps1のWindows/Webで実行できます。認証のないルール単体検査はUnity Editorの代わりにはなりません。

## GitHub Actions

Unity GitHub buildsを信頼済みブランチで手動起動します。mainのUnity変更も対象です。Personal認証用のUNITY_LICENSE、UNITY_EMAIL、UNITY_PASSWORDはActions Secretsへ登録し、値をコードやログへ出しません。Windows/Webは直列でテスト・ビルドし、同じcommitの版情報とSHA-256を確認してartifactへ保存します。

通常のPR検査は台帳のWindows/Linux検査、ゲームルール、WebとGUIDを確認します。公開サイト全体への自動デプロイは停止し、既存Webの配信は手動操作に限定します。Unityの成果物は旧Webのdistへ混ぜません。

現在の検証結果と未確認事項はSTATE.md、制作ルールはAGENTS.mdを参照してください。
