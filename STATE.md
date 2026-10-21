# 現在の状態

更新: 2026-10-21。本人のCD原因調査・デプロイ続行依頼により、統合待ちを解除して修正をmainへ反映し、MineRush限定CDを完走した。

## 制作と配信

- 制作正本: business/unity/ops/ledger.json。lease・進行工程・最新checkpointは`python business/ops/context.py`で確認する。
- 公開URL: https://game.kihamda.net/games/minerush/ 。現在の配信ソースはe378aaaa8c9c90a3d9c61e1abf420f0783e0ce07、成功CI39532880849、成功CD39533122745。CDは2026-10-21 11:27:36〜11:28:40JSTの64秒で完走。manifest SHA-256: 67d7787990f94dd9b50a80d37e4873f436af842ce56bc922d3e7419bc34d5329。
- 元CD39445984592の原因はGitHub annotationで確認した20分job上限超過。4件書込み後、旧209件の最終照合中に打ち切られた。PR31で45分枠・段階別journal/進捗と復旧検証を統合。PR headのLinux44秒/Windows49秒CI後、head指定でマージした。
- mainの読取り専用照合39532883070が成功し、旧208依存の不変と209件のオフライン復旧を確認してから、新候補の配信を実行した。元CDの再実行はしていない。
- 新CDはMineRush内の既存と一致するJS/CSSを再利用し、版マーカーとHTMLを更新。公開4ファイル・末尾スラッシュURLと対象外5URLが一致。独立した本番再照合も成功。JS/CSS/HTMLのバイト列は初回受入れ版と同じで、更新した版マーカーは修正済みmainを指す。
- 本番ブラウザで中央セルの開封51マス、Fキーの旗、再読み込みで81マス未開封・旗0へ初期化、旧本番一覧への往復を確認。実タッチ/Safari/人間評価/別PC復元/本番復旧書込みは未確認。事業指標はnull。
- 最新受入証跡: business/unity/evidence/cd-delivery-accepted-20261021.jsonとscoped-production-accepted-20261021.json。初回証跡はscoped-production-initial-accepted-20261021.jsonに原本保全。復元元はscoped-delivery-39533122745/scoped-recovery、ローカルartifacts/cd-repair-20261021/new-delivery/scoped-recovery。
- 本番トップ・共有/assets・他作品・service workerは置換していない。通常ポータルの全体配信はしていない。他4作品のreleaseはnull。

## 保存と次の工程

CD修正と公開登録・復旧検証はmain統合済み。今回の新配信受入れ・最新公開版登録・完了記録は次の日次統合用にローカル保存する。通常Webの型・静的・ビルド・43ハッシュ・4旧URL・案内8ケースと検索/往復検査が成功。制作方針と必要な履歴の選択読込を維持し、次は最新配信記録の統合と利用者に届く改善を一つ選ぶ。重複デプロイや記録だけの追加PRを作らない。

## 履歴

旧STATE/AGENTS/policyはdocs/historyと正本台帳・Gitに保全。詳細はdocs/web-scoped-production-delivery.md、運用手順はdocs/autonomous-workflow.mdを参照する。過去の「次回まで待つ」を最新直接指示より優先しない。
