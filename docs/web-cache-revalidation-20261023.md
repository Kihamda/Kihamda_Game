# HTML再訪時の再検証設定

## 現在の判断

2026-10-23の07時実行で、ポータルとMineRushの対象22URLを読取専用で検査した。ディレクトリ形式とindex.html形式の本文は一致し、ETag付きの条件付きGETは304を返した。HTMLに明示的なCache-Controlはなく、版マーカーにはmax-age=604800があった。ETagを返すことだけでは、通常再訪時に必ずサーバーへ問い合わせることを保証しない。

`business/ops/cache_audit.py`は本文ハッシュ、限定した応答ヘッダー、条件付き応答、別名URLの一致を保存する。`--require-revalidation`指定時は現行設定を不合格として終了する。これは予定どおりの検出で、配信障害や検査コードの例外ではない。HTTPキャッシュ指定の検査であり、ブラウザ受入れや過去の旧表示の原因確定とは区別する。

## 確認した反映経路

[XServer Staticの公式仕様](https://static.xserver.ne.jp/support/manual/man_server_spec.php)はApache 2.4.xとnginx、.htaccessの利用を記載している。[公式のURL変更手順](https://static.xserver.ne.jp/support/manual/man_setting_change_url.php)にもFTP領域の.htaccessが登場する。一般のXServerレンタルサーバー向け設定画面を、この契約で使えると推測していない。

[ApacheのHeader仕様](https://httpd.apache.org/docs/2.4/mod/mod_headers.html#header)では、mod_headersとFileInfoの許可があれば.htaccessから応答ヘッダーを設定できる。ただし、XServer Staticの本番でmod_headersが有効か、nginxが追加・上書きするヘッダーを制御できるか、既存設定との組合せがどうなるかは未確認。

現行のportal_publish.pyとscoped_delivery.pyは.htaccessを配信対象に含めない。この制限は維持した。web/public/_headersも送信していない。DNS、管理画面、契約、全体のキャッシュ削除は変更していない。

## 作成した候補

候補は`business/config/cache-revalidation.htaccess`にあり、web/publicの外へ置いた。本番ファイル全体の置換用ではなく、保全した既存設定へ追加するブロックである。

- 対象はホーム、about、contact、privacy-policy、4作品紹介、Ice Courierの案内、MineRush本体のHTML。ディレクトリ形式とindex.html形式を含む。
- ルートとMineRushのbuild-version.jsonも対象とする。計22URL。
- 対象だけにCache-Control: no-cacheを設定し、既存のExpiresを除去する。本文、ETag、Last-Modifiedは書き換えない。
- 他の3ゲーム本体、JS/CSS、画像、service worker、対象外のページには適用しない。
- mod_headersが利用できない場合、ブロックを無視する。HTTP検査で不合格を検出し、反映成功とは扱わない。

`business/ops/cache_config_preflight.py`は、既存のFTP環境変数を使用する読取専用の事前検査である。ホームとMineRushのFTP/HTTPSバイトを照合し、対象の親階層の.htaccessを再読して変更を検出する。元バイトと追加候補は新規のartifacts配下だけに保存する。公開用receiptにはハッシュと存在状態だけを残し、設定本文や認証値は出力しない。550は不存在とみなさない。実FTPSではまだ実行していない。

## 検証結果

Ubuntu公式パッケージを隔離領域へ展開し、システムへインストールせずApache 2.4.58で検査した。`business/tests/rehearse_cache_policy.py`は一時ディレクトリとloopbackだけを使用し、終了時に自分のサーバーを停止する。

- 構文検査、対象22URLの200/304で単一のno-cache、Expiresの除去を確認した。
- 対象外11URLは従来のmax-age=604800を維持した。
- mod_expires有効、既存の別ヘッダーとリダイレクトがある構成でも、対象外の設定と全33本文を保全した。
- クエリ付きのMineRush入口にも適用した。
- 一時ポートとサーバー識別ヘッダーを照合し、別プロセスへの誤接続を拒否する。

追加検査の初回は固定ポートで旧fixtureが稼働しており、新プロセスとの同一性が証明できなかった。`cache-policy-apache-expires-20261023.json`は不採用として残した。受入れの根拠は識別確認後の`cache-policy-apache-verified-20261023.json`と`cache-policy-apache-preservation-20261023.json`である。

識別済みApacheで、実ブラウザの通常リンク往復も比較した。Aを読んでからサーバーをBへ更新すると、no-cacheのMineRush入口はB、変更しない7日キャッシュの比較ページはAだった。比較ページの通常リロードはBだった。CDPでも比較ページの再訪だけfromDiskCache=trueを確認した。キャッシュ無効化、履歴の戻る操作は使っていない。詳細は`business/unity/evidence/cache-policy-browser-20261023.json`。

これは設定を受信した後の再訪を検証した結果である。設定追加前からブラウザに保存されている有効な旧応答を、新しいサーバー設定だけで即座に消すことはできない。過去の本番表示の原因、履歴復元、Safari、実端末は未確認。[RFC9111](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.2)の有効期間・再検証と区別する。

## 既存許可内の版付き開始リンク

ポータルの開始リンクを`release.url?v=release.sha256`へ変更した。確認済み公開版のハッシュを使い、同じ版なら同じURLを維持する。無印URLに保存されたHTMLとは異なるキャッシュキーになる。正式な公開URL、公開版登録、ゲームの保存形式は変更しない。これは版を固定する配信機構ではなく、同じパスの現在の内容を取得する入口である。古いポータルそのものが再利用される問題は別に残る。

通常のa要素を維持し、ホームの3リンクと紹介ページの2リンクで同じ版を使う。PCで81マスの起動、Enterで43安全マス、戻った際の検索条件とカードのフォーカスを確認した。320pxでも横あふれなし、紹介からの開始、再読み込み81未開封、紹介への戻るフォーカスを確認した。実タッチとは区別する。本番の版付きURLも読取専用で取得し、無印URLと本文ハッシュが一致した。

保管パッケージは任意のクエリを許可しない。新しいbuild-version.jsonのlaunchUrlは登録URLとハッシュから得られる値との完全一致を要求する。過去のlaunchUrlなしパッケージは従来の登録URLで検証できるよう維持する。

別の隔離ブラウザでは、7日キャッシュのAを保存した後でBとno-cacheを追加しても通常再訪はA、リロードはB、その後Cへの通常再訪はCだった。詳細はcache-policy-legacy-transition-20261023.json。新設定が既存の有効キャッシュを即時失効させると説明しない。

## 応答設定の本番反映条件

本番ルートの.htaccessへの追記は現在の配信許可リスト外であるため、対象22URLに限定した応答設定の追加を新たに許可範囲へ含める必要がある。既存ゲームや素材の置換を許可するものにはしない。

1. 読取専用の事前検査で本番の既存設定と継承元を保全し、非公開で内容を確認する。
2. 実際の既存設定に追記した候補を検査し、変更直前にも元ハッシュを照合する。現行配信ツールの許可リストを広げて汎用設定送信に使わない。
3. 許可された日次配信で限定した設定を反映し、22URLの200/304と対象外ゲーム・素材の本文と設定を照合する。不一致なら保全した旧設定に戻して検証する。
4. 実ブラウザの新規取得後の通常再訪と再読み込みを確認する。既存の有効キャッシュと履歴復元を別に記録する。
5. 前回受入れ後に保存した公開版登録の同期も次の日次統合へ含める。今回は追加PR、push、デプロイを実施していない。

再現コマンド:

```text
artifacts/venv/Scripts/python.exe business/ops/cache_audit.py artifacts/cache-audit.json --require-revalidation
artifacts/venv/Scripts/python.exe business/ops/cache_config_preflight.py artifacts/cache-config-preflight
python3 business/tests/rehearse_cache_policy.py <unpacked-apache-prefix> <new-receipt.json>
```

2番目のコマンドは既存のFTPS環境変数が設定された環境だけで使用する。値を表示・転記しない。設定の書込み処理は実装していない。
