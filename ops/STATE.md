# 現状

2026-10-27 初回刷新は未公開。新規サイトは `site/` に作成中。旧アプリのコードや画像は使っていない。

## 初回4本

- ひかりのスイッチ、ペアをさがせ、数字のかけっこ、ほしよけステップ：実装済み。Nodeの簡易DOMで生成、基本操作、再開始を確認。実ブラウザ確認は必要。
- トップページ：実装済み。公開確認は未実施。

## 公開とCD

- 公開先：https://game.kihamda.net/
- GitHub：Kihamda/Kihamda_Game、main。
- 新サイトは `rebuild/initial-20261027` の `new-site/` に保存済み。作業正本はWorkingの `site/`。公開前に両方の差分を照合する。
- ブランチの `new-site/check-games.cjs` は旧パスを参照する。修正済みのローカル `ops/check-games.cjs` と同期する。
- 既存CDは `.github/workflows/build-and-deploy.yml` の手動実行。mainと同じSHAの成功済みMonorepo CIの成果物を検証し、FTPで配置する。設定名は秘密の `FTP_SERVER`、`FTP_USERNAME`、`FTP_PASSWORD` と変数 `FTP_SERVER_DIR`。値は記録しない。
- 旧CDは旧Webビルド専用のファイル一覧を検証する。`site/` はそのままでは公開されない。新サイトを公開するため、ビルド・検証・配置を新成果物に合わせる必要がある。
- ローカルの `gh auth status` は認証失敗。GitHub接続アプリはブランチへの書き込みに成功したが、workflow_dispatch機能を提供していない。ローカル認証の復旧または安全なCD実行経路の確保が必要。

## 次回最初の行動

`python ops/run-lock.py` を標準入力が開いたセッションで実行し、実行終了まで保持する。競合時は変更しない。取得後は前回の記録と実行中のActionsを確認する。プロセス終了時にOSがロックを解放するため、残った `run.lock` だけでは再開を妨げない。終了時はセッションへ改行を送り解放する。

初回4本のブラウザ操作を検証する。その後、新サイトを既存CDに接続し、mainへの反映とCD実行、本番の4本の動作確認まで進める。
