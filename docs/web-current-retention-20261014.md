# 2026-10-14のWeb成果物保管

日次PR #22はhead71f6f01a5debdb58786504f9d2c074b64923ccb9のLinux39秒・Windows25秒CI成功後、headを指定してd1e10965332b19a3a920eb1067e5b0dd3a1b1b00へマージした。本日はこの1件だけで、前日のローカル成果も含む。本番配置は変更していない。

CI run38429375076の成果物をartifacts/releases/web-20261014-ci-38429375076へ保存した。配布tar.gzのSHA-256、別フォルダ展開、36ファイルと5案内ページ、変更・欠落・追加・版違い・manifest違いの拒否を確認した。CIのsourceCommit2c127178c2f6e91a73a8d29c67f372953ac20710はGitHubのマージ検査用commitで、Webの95blobはPR headとすべて一致する。

ローカルブラウザ検査版とCI版はHTML・配信コード等23ファイルがバイト一致。版・SHA256SUMSの2件と、静的11件の改行だけが異なる。復元CI版の390pxでMineRushのF旗と24.516px、n目並べの44px確認・初期キャンセル・Escape復帰・Enter確定・再読み込みPlayer 2を確認した。

source-web-lf.zipは95件すべてGitのバイト列と一致。Windows既定のsource-web.zipは50件の改行差があったため保管したまま区別する。CI成果物の30日期限とローカル保管は別。旧07時・13時・19時保管版は削除していない。別PCからの災害復元は未確認。

操作改善とCI反映は完了したが、モバイル工程全体は継続する。次はn目並べの大盤面・設定対象と代替操作。実タッチ・Safari・人間評価は未確認。利益等はnull。

ハッシュと取得先は[business/unity/evidence/delivery-web-daily-20261014.json](../business/unity/evidence/delivery-web-daily-20261014.json)。マージ後の結果は本日のローカルcommitに保存し、記録だけの追加PRを作らない。
