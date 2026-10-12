# Kihamda.NET制作モノレポ

WebアプリをWeb技術で一作ずつ制作するリポジトリです。2026-10-12に本人が制作負荷を理由に方針を変更しました。他で本人が完成させたUnityアプリのデプロイも受け入れる構成を残します。本人の意思表明は天啓.md、最新の継続方針はAGENTS.mdとbusiness/studio-policy.jsonに保存します。通常制作と検査はWindows PCです。

| 場所 | 用途 |
| --- | --- |
| unity/IceCourier/ | 自律制作を終了して保全するUnity試作品、3ステージ |
| unity-projects.json | 既存Unity作品とビルド対象の保全記録 |
| web/ | WebポータルとWebアプリの制作場所、旧4作品の保全資料 |
| business/unity/ops/ledger.json | 制作とコンサルティングの正本 |
| business/legacy-dispositions.json | 101作品の採否と統合先 |
| docs/legacy-recovery/ | 復元記録と移行前の定義 |

## ローカル検査

通常のWeb制作はUnity認証を必要としません。

```powershell
npm ci --prefix web
npm run check
npm run build
```

既存Unityソースの検査スクリプトとPersonal設定は保全します。通常制作の前提にはせず、自律的なUnity制作・配布ビルドは継続しません。本人から完成品を受け取った際は、その版と対象環境に応じた配布検査を行います。

## GitHub Actions

既存Unityビルドのworkflowと履歴は保全します。今回の方針転換で追加起動はしていません。本人持込のUnity完成品には、ソースや再ビルドを必須条件として一律に求めず、渡された成果物の版・SHA-256・動作と配布条件を確認します。認証情報の値はコードやログへ出しません。

通常のPR検査は台帳のWindows/Linux検査、ゲームルール、WebとGUIDを確認します。公開サイト全体への自動デプロイは停止し、既存Webの配信は手動操作に限定します。Unityの成果物は旧Webのdistへ混ぜません。

現在の検証結果と未確認事項はSTATE.md、制作ルールはAGENTS.mdを参照してください。
