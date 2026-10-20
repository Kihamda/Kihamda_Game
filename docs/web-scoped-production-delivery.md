# MineRushの限定配信工程

2026-10-20 19時の工程は部分完了。実デプロイは未実施。正本タスクT-web-scoped-production-delivery-20261020を継続する。

## 本番との差分と判断

本番のトップと`/games/minerush/`はHTTP 200。トップは従来の多数のゲームを掲載し、MineRushは`/assets/index-BFkVebrj.js`を起動する。現行CI保全版は紹介ページを表示する構成で、App.tsxは同じ作品パスをportalルートとして先に解決する。そのHTMLをそのまま配信すると、既存の遊べるページを紹介ページへ置換する。全体FTPS workflowを起動する方法も対象外ページを巻き込むため採用しない。

既存のMineRush実装とGameShellを直接起動する別入口を追加した。通常のポータルやゲームルール、保存形式は変更していない。`node scripts/build-scoped-minerush.mjs <新しい出力先>`は、`site/games/minerush/`内にHTML、専用JS、専用CSS、build-version.jsonの4ファイルを作る。共有の`/assets/`、トップ、他作品、service workerには配信対象を作らない。ソース未コミット時と出力先の再利用は拒否する。

単独版は現行GameShellの操作・保存説明を含む。途中盤面を保存せず再読み込みで初期化する契約を維持する。旧HTMLのGoogle Analyticsとservice worker登録は単独入口に複製していない。実測値は引き続きnullであり、この候補の公開前に計測方針も確認する。本番sw.jsには現在fetchハンドラがなく、キャッシュを解除する変更は加えていない。

## 配信前検査の実装

`business/ops/scoped_delivery.py <package> --verify-only`はパス制限、全ファイルのSHA-256、版、一致しない在庫、symlink、HTMLの専用アセット参照を検査する。ネットワークへ接続しない。

`business/ops/scoped_delivery.py <package> <新しい復元先>`はGitHubの既存production secretsを環境変数から使用する読み取り専用FTPS検査。証明書を検証し、データ接続もTLSで暗号化する。FTP_SERVER_DIRまたはログインルートにあるトップと対象HTMLを本番HTTPSとバイト照合し、配信先を推測で確定しない。旧HTMLと直接参照された旧JS/CSSを保存し、同名アセット衝突と検査中の本番変更を検出する。550応答は「不存在またはアクセス不可」として区別する。アップロード、削除、rename、remote mkdirは実装していない。

新しい`.github/workflows/scoped-production-preflight.yml`はmain限定で、この読み取り専用検査と候補・復元証跡の保全を行う。既存の全体配信workflowは変更していない。通常CIには単独版ビルド・在庫検証・専用artifact保全を追加した。これらの新しいworkflowは今回ローカル保存のみで、GitHub上ではまだ実行していない。

## 検証と保全

- リポジトリ検査、TypeScript、ESLint、通常ビルド、9ページSSG、43ファイルの既存Web検査が成功。MineRushの既存入力回帰検査も成功。
- businessの42テストが成功。配信追加分8テストで、誤ったFTPルート、同名アセット衝突、検査中の変更、パス逸脱、在庫外ファイル、改ざん、版不一致、復元先再利用を検査した。FTPはRETRだけを受け付ける偽物を使用しており、実FTPS接続成功を意味しない。
- 初回の未コミット試作とソースcommit a965fe68a26584207bb64445af9089c6fd8ce5ccに固定した最終候補は、HTML・JS・CSSのSHA-256が一致。版ファイルだけが異なる。最終候補の在庫検証とブラウザ起動も成功。
- ローカル実ブラウザで、開封、旗モード、矢印キー移動、Fキーで未開封セルへの旗、再読み込みによる盤面・旗初期化を確認。デスクトップ画面を目視確認した。携帯幅・実タッチ・Safari・本番配信後の操作検査は今回未実施。
- 最終候補は`artifacts/scoped-minerush-20261020-1900-verified/`。本番HTTPSの初期値は同ディレクトリのhttp-before.jsonとhttp-before/へローカル保全。公開する証跡はbusiness/unity/evidence/scoped-production-delivery.jsonにハッシュと要約だけを保存する。

## 次の一工程

同じタスクで、単独版と新しい配信前検査を次の日次統合に含め、最新headのLinux/Windows CIと対応する専用artifactを照合する。mainの読み取り専用workflowを実行し、本番FTPSルートと復元証跡を取得する。FTPSの550はディレクトリ照合等で解消し、旧ゲームの動的依存は既存共有アセットを維持する前提を確認する。この保存物だけで旧全サイトを復元できるとは扱わない。

この実測結果を使って、専用アセットを先に置きHTMLを最後に切り替える限定アップロードと復旧を実装・検査する。直前のbaseline再照合、対象外パス不変、候補の版・ハッシュ、実URLでの操作・再読み込み・一覧へ戻る導線を確認してからreleaseを登録する。実FTPS照合、新候補のremote CI、アップロード処理、実配信後検証は未完了。追加の本人確認待ちにはしない。
