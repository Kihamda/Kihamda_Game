# MineRushの限定配信と復旧

## 現在の本番

2026-10-21に受入れ済み。公開URLはhttps://game.kihamda.net/games/minerush/ 。ソースは2bc5d74eef7386aecd1fc39fc42d177d817ad916、成功CIは39445834759。候補manifest.jsonのSHA-256は2ad053d3798d2996d3e0d795671c75d1fcbd55e7bcd4733bb9b9b4b7c6c5169f。公開登録のsha256もこのmanifestを指し、ZIPのハッシュとは区別する。

配信run39445984592は、旧本番の照合後、専用JS・CSS・build-version.json・index.htmlを書き込んだ。最終の旧baseline再読込み中に20分のjob制限でcancelledとなった。保持した元journalはwritten4件・pending=null、statusは旧実装のcreating-assets-directoryのままだった。workflowの終了状態とjournalのphaseだけで、本番の成否を判断してはいけない。

同じrunから保持物を取得し、候補・成功CI・元journalを照合した。本番の新4ファイルと末尾スラッシュURLが候補SHA-256に一致し、トップ・privacy-policy・contact・about・sw.jsも配信前と一致した。旧baseline209件から置換対象HTMLだけを除いた208件もHTTPSで一致した。再dispatchや本番復旧書込みは実施していない。この独立照合と実ブラウザ受入れを根拠に、2026-10-21の実デプロイ1件とする。元workflowがsuccessになったとは記録しない。

本番のPC版Chromiumで、開封、矢印・F・Enter・Space、旗モード、再読み込みによる盤面・旗初期化、一覧への往復を確認した。390×844と1280×720で横はみ出しなし。ゲームオーバー表示、終了後セル無効化、リセットも確認した。初回遷移では旧表示が見えたが、意図的な再読み込み後と一覧からの再入場では新専用JSを読み込んだ。全キャッシュ環境での即時切替は保証しない。

受入証跡はbusiness/unity/evidence/scoped-production-accepted-20261021.json。実タッチ、Safari、人間の初見理解・面白さ、別PC復元、本番への復旧書込みは未確認。後続の実ブラウザ検査ではクリア状態（71マス・旗10）とリセットをDOMで確認した。クリア時の画像は空フレームとなり、画像証跡には採用していない。詳細はbusiness/unity/evidence/scoped-recovery-proof-20261021.json。利益・訪問・開始・完了・再訪の指標はnull。

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

## 条件付き復旧

復旧が必要と判断した場合だけ、保持した候補・復元元を明示する。

```powershell
python business/ops/scoped_upload.py recover <展開先>/transaction.json --package <展開先>/scoped-minerush --backup <展開先>/scoped-recovery
```

共通のscoped_transaction.pyで保持物を照合し、旧HTMLはjournal単独から採用せず、ハッシュ確認済みの復元元から取得する。旧版マーカーも書込み前に別のtransaction receiptへ保全し、復旧前にjournalとの一致を要求する。旧形式でreceiptがない場合、oldVersionHex=nullのtransactionだけ互換を保つ。旧版が存在したのに独立した保全証跡がない場合は停止する。

保持した旧依存アセットが本番で変わっていないことと、現在の本番HTML・版が旧バイトまたはそのtransactionの新バイトであることを確認してから戻す。第三者の更新は上書きしない。旧版ファイルが存在した場合はそのバイトも戻す。旧版ファイルがなかった場合、新しい版マーカー、未参照アセット、一時ファイルは残す。版マーカー単独を配信成功の証拠にしない。復旧後もHTTPの旧HTML両URL・旧版・対象外URLと、実ブラウザの操作確認が必要。

## 今回のローカル改善と統合待ち

公開版登録と確認環境、中断後の読取り専用照合workflow、共通の復元証跡照合、recoverの必須引数、配信job制限20→45分は次の日次統合用のローカル変更。今日の追加PR・再デプロイは行わず、本番トップも変更していない。これらのworkflowと新しい復旧照合はまだmainにない。本番の配信版は引き続き2bc5d74。

86のbusinessテストが成功。改変journal・誤った復元元・部分切替・第三者更新・配信と復旧それぞれの通信境界での切断を検査した。実保持artifactの旧209件と候補を使った偽FTPの復旧も確認した。実サーバーの復旧成功とは扱わない。検査数・実時刻・最終ハッシュは今回の証跡と正本checkpointを参照する。過去の部分実装はGit履歴とbusiness/unity/evidence/scoped-delivery-20261021.jsonに保全している。
