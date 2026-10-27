# 現状

2026-10-27 初回刷新は未公開。新規サイトは `site/` に作成中。旧アプリのコードや画像は使っていない。

## 初回4本

- ひかりのスイッチ、ペアをさがせ、数字のかけっこ、ほしよけステップ：実装済み。Nodeの簡易DOMで生成、基本操作、再開始を確認。実ブラウザ確認は必要。
- トップページ：実装済み。公開確認は未実施。

## 公開とCD

- 公開先：https://game.kihamda.net/
- GitHub：Kihamda/Kihamda_Game、main。
- `dev` から `main` へのPR #38で新サイトとCDを導入中。作業正本は `site/`。
- PRのCIは4ゲームの基本動作とPC・スマートフォン幅のChromium操作を検査する。`main`へのpushで `.github/workflows/deploy.yml` がFTPS配信する。
- CDは旧トップをActions成果物へ保存し、版別ディレクトリに依存ファイルを配置・HTTPS照合した後、トップを切り替える。設定名は秘密の `FTP_SERVER`、`FTP_USERNAME`、`FTP_PASSWORD` と変数 `FTP_SERVER_DIR`。値は記録しない。
- `gh` はサンドボックス外で認証済み。GitHub Actionsの結果と本番の実際の表示は未確認。

## 次回最初の行動

`python ops/run-lock.py` を標準入力が開いたセッションで実行し、実行終了まで保持する。競合時は変更しない。取得後は前回の記録と実行中のActionsを確認する。プロセス終了時にOSがロックを解放するため、残った `run.lock` だけでは再開を妨げない。終了時はセッションへ改行を送り解放する。

PR #38のCIを確認し、成功後にmainへマージする。CDと本番URLを確認し、問題があれば修正する。
