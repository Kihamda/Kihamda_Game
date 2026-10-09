# リポジトリ移行の決定

2026-10-09の本人指示「まず先にリポジトリ移行をやれ。ゲーム制作はそのあとだ」に従う。今回の対象はKihamda/Kihamda_Gameの開発・運用構成。先にUnity移植を実装しかけたコードは削除し、ゲーム選定も次工程へ戻した。

## 正本と履歴

- 公開ソースはGitHub main（4523cc58ea2824ea99d29d724b51685a3946189e）。公開中の配信内容との完全一致は未確認。
- 運用台帳はops/game-business（85cf1ebefebd330811f5d975bb641ddae3913718）。revision 99、leaseなしの状態を取得した。
- ローカルdevは20eb8d0で古かった。最新dev（71e3331）はmainへ取り込み済み。mainとopsを作業ブランチunity/curated-migrationへ統合した。
- 運用ブランチを自動で書き換えず、移行版は別ブランチでレビューする。切替前にopsの最新headとledger revisionを再照合する。

## 構成の変更

従来のゲーム、ポータル、npm依存関係、静的ファイル、Vite設定をweb/へgit mvした。ソースと旧URLを維持し、ルートのnpmはwebへ委譲する。Unityはunity/<Project>/に独立したプロジェクトを置く。今回は移行検査用の空シーンのみ。

旧量産エージェント・プロンプト・SNSワークフローはlegacy/に保存した。移行版では実行入口から外してある。GitHub mainへの反映前なので、リモートの既存workflow設定は変わっていない。SNSの送信は行っていない。

このリポジトリはpublic。Sell-Something-Wellはprivateであることのみ確認し、private本文、台帳、商品、認証情報はコピーしていない。兄弟フォルダのextreme_tik_tok_toe、iloveyou、Inf-minesweeper、pachinko-calculatorは原本として残してある。今回の移行で別事業のソースや履歴を削除・統合していない。

## CI/CD

ホスト型GitHub runnerで構成・GUID・旧URL・Webビルド、Linux/Windowsで台帳の21検査を実行する。PRの成果物は30日、本番成果物は90日保存し、commitとSHA256SUMSを対応させる。

既存ポータルCDはmain限定。進行中デプロイを取り消さず、検査成功後に元のFTPS配信先へ送る。Unity配信ディレクトリを除外し、成功表示は実際のjob結果で出す。配信後はbuild-version.jsonとcommitを確認する。これは既存サイトの維持用CDであり、Unityの自動公開はまだ有効ではない。

Unity CIはworkflow_dispatchかつmain、UNITY_LOCAL_CI_ENABLED=true、unity-local-ci環境、専用unity-trusted runnerのすべてを必要とする。外部PRからPCを起動しない。environmentの保護ルールとrunnerの専用アカウントは管理者が設定し、ライセンス有効化後に実行する。公開リポジトリのself-hosted runnerへ日常使用アカウントの認証情報を渡さない。

Unity Webは非圧縮・単一スレッドの検査ビルドにして、未知のホスト圧縮設定とCOOP/COEP依存を避ける。将来の配信は既存SPAと別の許可済み領域に限定する。wasmのapplication/wasm、dataのapplication/octet-stream、jsのJavaScript MIME、404、キャッシュ、HTTPSを実ホストで検証してから有効化する。XServerで_headersが実際に適用されるかは未確認。

## 復旧と未完了

元の全参照はローカルbundleへ保存し、復元用cloneで検証する。旧ファイル・設定はdocs/legacy-recoveryとlegacyへ保全。復元手順はdocs/legacy-recovery/README.md。FTP/DNS/GA4の値や秘密情報、Unityライセンスは保存していない。ホスト上のファイル・DNS・解析権限が未確認なので、外部サービスまでの完全復元を保証しない。

Unityライセンス、Editorの実コンパイル、パッケージの解決とlock生成、Windows/Webビルド、実ホストでのステージングと復旧は未完了。これらが終わるまで移行完了扱いにもゲーム制作開始にも進めない。

GitHub APIでrunner一覧は0件、environmentはgithub-pagesとproductionのみと確認した。unity-trusted runnerとunity-local-ci環境は未登録。productionの保護ルール自体は未確認。登録済みとは報告しない。

ブログとゲームの定期処理は元設定の保全と実行環境の照合を済ませてから切り替える。今回はゲームのリポジトリ移行を先行し、新しい定期タスクを重複登録しない。
