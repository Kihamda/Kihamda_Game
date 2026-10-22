# MineRushの限定配信と復旧

## 初回配信の受入れ

2026-10-21に受入れ済み。公開URLはhttps://game.kihamda.net/games/minerush/ 。ソースは2bc5d74eef7386aecd1fc39fc42d177d817ad916、成功CIは39445834759。候補manifest.jsonのSHA-256は2ad053d3798d2996d3e0d795671c75d1fcbd55e7bcd4733bb9b9b4b7c6c5169f。公開登録のsha256もこのmanifestを指し、ZIPのハッシュとは区別する。

配信run39445984592は、旧本番の照合後、専用JS・CSS・build-version.json・index.htmlを書き込んだ。最終の旧baseline再読込み中に20分のjob制限でcancelledとなった。保持した元journalはwritten4件・pending=null、statusは旧実装のcreating-assets-directoryのままだった。workflowの終了状態とjournalのphaseだけで、本番の成否を判断してはいけない。

同じrunから保持物を取得し、候補・成功CI・元journalを照合した。本番の新4ファイルと末尾スラッシュURLが候補SHA-256に一致し、トップ・privacy-policy・contact・about・sw.jsも配信前と一致した。旧baseline209件から置換対象HTMLだけを除いた208件もHTTPSで一致した。再dispatchや本番復旧書込みは実施していない。この独立照合と実ブラウザ受入れを根拠に、2026-10-21の実デプロイ1件とする。元workflowがsuccessになったとは記録しない。

本番のPC版Chromiumで、開封、矢印・F・Enter・Space、旗モード、再読み込みによる盤面・旗初期化、一覧への往復を確認した。390×844と1280×720で横はみ出しなし。ゲームオーバー表示、終了後セル無効化、リセットも確認した。初回遷移では旧表示が見えたが、意図的な再読み込み後と一覧からの再入場では新専用JSを読み込んだ。全キャッシュ環境での即時切替は保証しない。

初回の受入証跡はbusiness/unity/evidence/scoped-production-initial-accepted-20261021.json。実タッチ、Safari、人間の初見理解・面白さ、別PC復元、本番への復旧書込みは未確認。後続の実ブラウザ検査ではクリア状態（71マス・旗10）とリセットをDOMで確認した。クリア時の画像は空フレームとなり、画像証跡には採用していない。詳細はbusiness/unity/evidence/scoped-recovery-proof-20261021.json。利益・訪問・開始・完了・再訪の指標はnull。

## 配信の範囲と前提

配信対象はgames/minerush/内のHTML、専用JS、専用CSS、build-version.jsonの4ファイルだけ。既存の共有/assets/、トップ、他作品、service workerを置換・削除しない。通常ポータルのHTMLをゲームURLへ配信すると紹介ページへ変わるため、既存MineRushとGameShellを起動するweb/src/standalone/minerush.tsxを別入口にする。

```powershell
node scripts/build-scoped-minerush.mjs <新しい出力先>
python business/ops/scoped_delivery.py <出力先> --verify-only
```

未コミットの制作ソース、出力先の再利用、不正なパス、symlink、在庫・SHA-256・版・HTML参照の不一致を拒否する。単独HTMLは既存と同じGA4設定と共有画像のOG/Twitterメタデータを維持する。新しい計測先やイベント、service workerの変更・再登録は追加しない。途中盤面・旗を保存しない契約を維持する。

scoped-production-upload.ymlはmain限定。成功した同一リポジトリ・同一head・Monorepo CIのrun IDを照合し、そのrunの専用artifactだけを使用する。既存の全体FTPS workflowは使用しない。PR29・PR30は最新headのLinux/Windows CI成功後にhead指定でマージ済み。

## 復元元と書込み手順

FTPS preflightは証明書とデータ接続のTLSを検証し、既存production secretsを環境変数で使用する。認証値は出力しない。FTPルートのトップと対象HTMLをHTTPSとバイト照合する。旧ゲームから静的に到達できる共有アセットとgames/minerush/assets/内の専用アセットを、JS import・Vite preload一覧・CSS URLから保存する。循環を重複取得せず、256件・64MiBを上限とする。動的に組み立てるURLや外部依存の完全解析ではない。

旧209ファイル・1,514,538バイトを実FTPSとHTTPSで照合し、ダウンロード後にも全ハッシュを確認した。復元元はGitHub保持物scoped-delivery-39445984592内のscoped-recovery、ローカルはartifacts/scoped-reconcile-20261021-0100/scoped-recovery。保存・復元の検査は同じPCで実施した。別PCや本番復旧書込みの証明とは区別する。

配信はbaselineを再照合し、MLSDが成功した場合だけ不存在を判定する。RETRの550は「不存在またはアクセス不可」であり、単独では不存在の証明にならない。同名アセットが異なる場合は停止する。専用アセット、版、入口HTMLの順で、同じ場所の一時ファイルへ転送・読戻し・rename・再読戻しを行う。既存HTMLの削除でrename拒否を回避しない。各書込み前にjournalを永続化する。

FTPは比較付き原子的更新を提供しないため、直前照合とrenameの間の別クライアント更新を完全には防げない。配信・復旧・照合workflowは同じdeploy-production concurrency groupを使い、手動配信と同時に動かさない。

## 中断後の読取り照合

保持した同一配信artifactを新しいディレクトリへ展開する。まず本番を書き換えずに結果を調べる。

```powershell
python business/ops/scoped_acceptance.py reconcile <展開先>/protected-before.json --package <展開先>/scoped-minerush --backup <展開先>/scoped-recovery --journal <展開先>/transaction.json
```

package・preflight・journalのcommit、manifest hash、新旧HTML、復元前ファイルのハッシュ、危険・重複パス、symlink、件数・バイト上限、静的依存の欠落を検査する。その後に本番の新ファイル・対象外URL・旧共有baselineを読む。元journalは変更せず、アップロード・復旧・再送も行わない。結果はHTTP照合済み・ブラウザ未受入れとし、実ブラウザの別証跡で受入れを判断する。

scoped-production-reconcile.ymlも同じ処理を実行する。同一リポジトリの完了したmain配信runとjournalのcommitを照合し、production secretsを使わない。

照合・復旧workflowでは、実通信の前に保持物のオフライン模擬検査を行う。手元でも同じコマンドを使用できる。

```powershell
python business/tests/rehearse_scoped_artifact.py <配信artifactの展開先>
```

候補・復元元・journalの照合後、隔離した一時領域とメモリ上の偽FTPで候補全ファイル、対象外baseline、旧HTMLと既存版マーカーの復元、次回preflightを確認する。元の保持物は変更せず、HTTP・FTPSへ接続しない。出力のdeployedとproductionWritesはfalseであり、実FTPのrename・実復旧・ブラウザ受入れの代替にはしない。

次の日次配信用パッケージを、保持したアップロード版へ重ねる検査には次の形式を使う。

```powershell
python business/tests/rehearse_scoped_artifact.py <配信artifactの展開先> --candidate <次候補のパッケージ>
```

元のjournalがアップロード完了・pendingなし・HTMLと版マーカーの書込み記録ありであることを要求する。保持物からアップロード後のバイトをメモリ上に再構成し、新候補用preflight、全候補ファイル、対象外の不変、元のアップロード版への条件付き復元を検査する。入力保持物を書き換えず、別候補のjournalと復元元は一時領域内に作る。元のjournalが本番HTTP・ブラウザ受入れを証明するとは扱わず、`liveAcceptanceVerified=false`を出力する。日次配信前の実サーバー照合とCIは別途必要。

## 条件付き復旧

復旧が必要と判断した場合だけ、保持した候補・復元元を明示する。

```powershell
python business/ops/scoped_upload.py recover <展開先>/transaction.json --package <展開先>/scoped-minerush --backup <展開先>/scoped-recovery
```

共通のscoped_transaction.pyで保持物を照合し、旧HTMLはjournal単独から採用せず、ハッシュ確認済みの復元元から取得する。旧版マーカーも書込み前に別のtransaction receiptへ保全し、復旧前にjournalとの一致を要求する。旧形式でreceiptがない場合、oldVersionHex=nullのtransactionだけ互換を保つ。旧版が存在したのに独立した保全証跡がない場合は停止する。

保持した旧依存アセットが本番で変わっていないことと、現在の本番HTML・版が旧バイトまたはそのtransactionの新バイトであることを確認してから戻す。第三者の更新は上書きしない。旧版ファイルが存在した場合はそのバイトも戻す。旧版ファイルがなかった場合、新しい版マーカー、未参照アセット、一時ファイルは残す。版マーカー単独を配信成功の証拠にしない。復旧後もHTTPの旧HTML両URL・旧版・対象外URLと、実ブラウザの操作確認が必要。

## 修正の統合経緯

公開版登録と確認環境、中断後の読取り専用照合workflow、共通の復元証跡照合、recoverの必須引数、配信job制限20→45分は、本人の追加依頼に従ってPR31でmainへ統合した。本番トップは変更していない。統合と新配信の結果は末尾を参照する。

アップロード前にも共通checked_preflightで復元元の版・ハッシュ・件数・サイズ・重複・symlink・静的依存の欠落を検査し、不正な場合は認証接続前に止める。復元対象の.mjsも依存をたどり、HTTPS・FTPSの読込み中に1応答64MiBを超えた場合は停止する。HTML2件だけでも合計上限を検査する。

通常ポータルの保管パッケージはbuild-version.jsonに公開登録を含め、その詳細ページに限り登録URLへの開始リンク1件を要求する。未登録・異なる宛先・重複・iframeは拒否する。登録のない過去パッケージは開始リンクなしの条件で検証できる。これは通常ポータルの保全・統合準備であり、本番全体を置換する許可ではない。

制作ソースのコミット後、`npm run release:prepare -- artifacts/<新しい出力先>`で通常ポータルの保管版を作れる。未コミットのWeb・検査スクリプト・package設定、既存出力先、artifacts外の出力先はビルド前に拒否する。現在のHEADを子プロセスのGITHUB_SHAへ設定し、リポジトリ検査、ビルド、版とSHA256SUMSの生成、パッケージ作成、復元検証を順に実行する。実行前後のHEADと制作ソースも照合する。既存手順でGITHUB_SHAの指定やcheck-web-build.mjsを省くと、版不一致やSHA256SUMS欠落で停止するため、このコマンドを使う。専用MineRush候補の作成、GitHub CI、本番配信は別工程である。

出力先は既存の親ディレクトリの実パスまで解決し、ジャンクションやシンボリックリンクを通してartifacts外へ出る指定も拒否する。ビルド後、パッケージ作成の直前にも確認する。`node scripts/check-release-preparation.mjs`は隔離したGitリポジトリで工程失敗、未コミット変更、途中のHEAD変更、出力先のリンク変更を検査する。子ツールはfixtureのため、実ビルドと成果物の復元検証を代替しない。CIではこの検査をLinux・Windowsで実行し、Linuxの実保管版作成もrelease:prepareを使う。ローカル変更の検査成功と、GitHub上でのCI成功は区別する。

パッケージは実行ごとの一時ディレクトリで作成・検証し、最終のソースとHEADの照合後に指定先へ移す。検証失敗時は指定先へ完成品を出さず、その実行の一時ディレクトリだけを削除する。確定直前にも出力先の実パスと不存在を確認し、途中で別の出力が作られていた場合は上書きせず停止する。プロセスの強制終了や電源断で残った一時ディレクトリは、指定先の完成品とは区別する。

通常Web版のゲームHTML生成では、入口JSとともに共通CSSも引き継ぐ。従来はゲームURLを再読み込みすると共通CSSがなくなり、同一ページ内の遷移で作品一覧・紹介へ戻った際に表示が崩れた。9826105で修正し、4作品からの一覧復帰と、MineRushの390px・1280pxでの再読み込み・検索条件保持を確認した。専用配信版MineRushと本番トップのファイルは変更していない。

改変journal・誤った復元元・部分切替・第三者更新・通信境界での切断を含む検査と、実保持artifactの旧209件を使った偽FTPの復旧を確認した。今回の検査数・実時刻・最終ハッシュはbusiness/unity/evidence/scoped-hardening-integration.jsonと正本checkpointを参照する。実サーバーの復旧成功とは扱わない。過去の部分実装はGit履歴とbusiness/unity/evidence/scoped-delivery-20261021.jsonに保全している。

## 2026-10-21 CD継続の調査

本人の原因調査・デプロイ続行依頼で、翌日統合待ちを解除した。run39445984592のGitHub check annotationは「The job has exceeded the maximum execution time of 20m0s」。job開始00:12:15JST、終了00:32:31JST、初回復元元照合は8分32秒だった。全4ファイルの書込み後に旧209件を再照合する実装に対して20分枠が不足した。ローカルの45分制限、段階別journal更新と進捗出力、オフライン保持物検査・読取り専用reconcileがmainに未統合だった。元runを再実行せず、修正のexact-head CI・main統合と現状照合を先に行い、新しいCI候補による限定配信を継続する。98テストと元209件のオフライン復旧検査が成功。GitHubでの新しい照合・配信結果は別証跡へ保存する。

## 修正版CDの完了

PR31のhead285d709はCI39532711918のLinux44秒・Windows49秒成功後、e378aaaaへhead指定でマージ。main CI39532880849と読取り専用照合39532883070も成功し、旧208依存の一致と209件のオフライン復旧を再確認した。

新しい限定CD39533122745は2026-10-21 11:27:36〜11:28:40JSTの64秒でsuccess。今回は旧ゲームが既に独立バンドルへ切り替わっており、復元対象は旧209件から4件になった。45分枠への変更だけで高速化したという意味ではない。候補JS/CSS/HTMLは初回版と同一のためJS/CSSは再利用し、版マーカーとHTMLを更新した。mainの版e378aaaa、候補全4ファイル・末尾スラッシュURL、対象外5URLと新復元元の照合が成功した。元CDの再実行や本番の復旧書込みは行っていない。

本番ブラウザで中央の通常開封51マス、Fキーで旗1、再読込みで未開封81・旗0、旧本番一覧からの再入場を確認。最新証跡はbusiness/unity/evidence/cd-delivery-accepted-20261021.jsonとscoped-production-accepted-20261021.json、初回の元証跡はscoped-production-initial-accepted-20261021.jsonへバイト一致で保全した。復元元はscoped-delivery-39533122745/scoped-recovery。公開登録と最新記録は次の日次統合用にローカル保存し、通常ポータル全体は本番へ配信しない。

## 2026-10-22の限定配信

PR32のhead b75d400c82d3cc414219b285269391d3bf231c6eはLinux・Windows CI39631234390の成功後にhead指定でマージした。PRのartifact版は一時マージref cf172c20514473181668b0cccefa1ab79217f64cであり、headの名前では取得できない。配信にはmain 5f9a1efab94d06b53a47182d954e3be9996a2889の成功CI39631400999から取得した専用成果物を使用した。

限定CD39631591189は01:05:23〜01:06:47JSTに成功した。遊び方の説明、長押し中断・複数タッチ・終了演出・リセットの改善を専用4ファイルで配信した。全4ファイル・末尾スラッシュURL・対象外5URLと旧依存3件のHTTP一致、実ブラウザの71マスクリア・旗10・リセット・キーボード・再読み込み・旧本番一覧への往復を確認した。manifest SHA-256は563afa3878bcc43b5a110a35c14fb0e5281d656a7d57860d9c9f771b6260fd69。復元元はscoped-delivery-39631591189/scoped-recovery。公開受入れはbusiness/unity/evidence/scoped-production-accepted-20261022.json、実配信件数はこの日1件。追加の安全マス進捗表示は別のローカル候補であり、この配信版には含まれない。実タッチ・Safari・人間評価と事業指標は未観測。
