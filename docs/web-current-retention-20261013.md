# 現行Web成果物と復元元の保管

依存関係更新PR #20はhead`4a0e1783ef22e147601799dcb698a116175628cc`のLinux38秒・Windows18秒のCI成功を確認し、headを指定してマージした。本番サイトは置換していない。

現行の配布準備版は`artifacts/releases/web-20261013-quality/`へ保存した。ここにはCIから取得したweb-release.tar.gz、そのSHA-256記録、展開したrestored/、同じWebソースのsource.zipを置く。元ソースcommitとCIのビルド用マージref`6b8ca36b409cdc81a7288d267f66352be5253329`は区別し、Webソースの差分なしを確認した。

アーカイブのハッシュ、展開後37ファイルと5画面、元ソースZIPの展開後lockfileを照合した。CI版のHTML・assetsも、今回実ブラウザで検査したローカル版と一致している。全体・本番依存関係の監査指摘はともに0件。

各ファイルのハッシュと元commitは[保管索引](../business/unity/evidence/web-current-retention-20261013.json)、PR結果は[反映記録](../business/unity/evidence/delivery-web-quality-20261013.json)にある。CI成果物は30日で失効するが、ローカル保管分にActionsの期限は適用されない。別PCへのバックアップとディスク故障からの復元は未確認。通常の検査用フォルダ整理でartifacts/releases/を削除せず、削除前に保管索引と別保存先を照合する。

復元するときは保管索引のアーカイブハッシュを先に照合し、新しい空フォルダへ展開して`node scripts/web-release-package.mjs verify <展開先>`を実行する。ソース復元用ZIPにはWebの追跡ソース、必要な検査スクリプトとpackage.jsonのみを含め、Unityソースやローカル原稿・復元保管庫は含めていない。ZIPを展開して`npm ci --prefix web`、`npm run build`を実行できる。生成時刻を含むため再ビルドのハッシュが保存アーカイブと一致するとは限らない。

`artifacts/web-release-20261013.zip`は依存関係更新前の歴史資料として保持する。現行版の配布には使わない。過去へ戻す場合も、監査指摘が解消済みと扱わず、対象の版と公開条件を改めて確認する。

次は既存Web4ルートのルール・入力・保存・再読み込みの回帰検査を一作ずつ進める。今回の初期表示と一部入力を全作品の品質受入れに広げない。新作、Unity追加ビルド、本番置換は行わない。
