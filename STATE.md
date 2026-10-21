# 現在の状態

更新: 2026-10-21 13時枠。MineRushの遊び方案内と終了演出の修正をローカルで受入れ、次の日次統合用に保存。本番は同日11:28の受入れ済み版を維持している。

## 制作と配信

- 制作正本: business/unity/ops/ledger.json。lease・進行工程・最新checkpointは`python business/ops/context.py`で確認する。
- 公開URL: https://game.kihamda.net/games/minerush/ 。現在の配信ソースはe378aaaa8c9c90a3d9c61e1abf420f0783e0ce07、成功CI39532880849、成功CD39533122745。CDは2026-10-21 11:27:36〜11:28:40JSTの64秒で完走。manifest SHA-256: 67d7787990f94dd9b50a80d37e4873f436af842ce56bc922d3e7419bc34d5329。
- 元CD39445984592の原因はGitHub annotationで確認した20分job上限超過。4件書込み後、旧209件の最終照合中に打ち切られた。PR31で45分枠・段階別journal/進捗と復旧検証を統合。PR headのLinux44秒/Windows49秒CI後、head指定でマージした。
- mainの読取り専用照合39532883070が成功し、旧208依存の不変と209件のオフライン復旧を確認してから、新候補の配信を実行した。元CDの再実行はしていない。
- 新CDはMineRush内の既存と一致するJS/CSSを再利用し、版マーカーとHTMLを更新。公開4ファイル・末尾スラッシュURLと対象外5URLが一致。独立した本番再照合も成功。JS/CSS/HTMLのバイト列は初回受入れ版と同じで、更新した版マーカーは修正済みmainを指す。
- 本番ブラウザで中央セルの開封51マス、Fキーの旗、再読み込みで81マス未開封・旗0へ初期化、旧本番一覧への往復を確認。実タッチ/Safari/人間評価/別PC復元/本番復旧書込みは未確認。事業指標はnull。
- 最新受入証跡: business/unity/evidence/cd-delivery-accepted-20261021.jsonとscoped-production-accepted-20261021.json。初回証跡はscoped-production-initial-accepted-20261021.jsonに原本保全。復元元はscoped-delivery-39533122745/scoped-recovery、ローカルartifacts/cd-repair-20261021/new-delivery/scoped-recovery。
- 本番トップ・共有/assets・他作品・service workerは置換していない。通常ポータルの全体配信はしていない。他4作品のreleaseはnull。

## 今回のローカル改善

- 数字が周囲8マスの地雷数であること、旗の役割、安全な71マスを開くクリア条件を追加。詳細はキーボードで開閉でき、狭幅では縦スクロール、低いPC画面では案内パネル内をスクロールできる。
- 終了後の開封済みマスを押すと音・爆発・祝福が繰り返される処理を再現し修正。実Appの勝敗遷移と再操作の回帰検査、実ブラウザのクリア・敗北後の再操作を確認した。
- 型・静的・ビルド・9ページ生成・43ハッシュ・既存入力検査に合格。1,620盤面で説明とルールを照合し、Windows/Linuxの事業検査は各104件成功。320/390/1280px幅と低いPC画面で表示・到達性を確認。実タッチ・Safari・人間の初回理解・事業効果は未観測。
- 最終Web候補は98e2012a4e54b7141b54c1d8f1f39330747cac9f、限定4ファイルのmanifest SHA-256はb343486e291a6670684c24b8ca0840fc00274419e342ef301a64a17d4c182511。artifacts/scoped-minerush-first-play-final-20261021へ保持。通常ポータルと旧一覧のローカル往復も確認した。
- 既存のオフライン検査utilityに`--candidate`を追加。保持したアップロード版へ次候補を重ね、元版への条件付き復元を検査する。元保持物は変更せず、通信もしない。実保持物によるWindows/Linuxの結果が一致した。本番復旧や新候補のGitHub CI・実配信の証明にはしない。
- 本枠の読取り専用HTTP照合で、本番の候補4ファイル・末尾スラッシュURLと対象外5URLが受入れ済み版に一致。新しいdispatch・本番書込み・追加PRは行っていない。技術合格を初回理解や需要の実績にはしない。
- 詳細はbusiness/unity/evidence/minerush-first-play-20261021.json、minerush-terminal-effects-20261021.json、scoped-candidate-rehearsal-20261021.json。最終版の検査画像はartifacts/minerush-first-play-20261021/final-*.jpgにローカル保持。

## 保存と次の工程

2026-10-22の日次統合で、最新公開登録・受入れ記録と今回の改善をまとめる。最新headのGitHub Linux/Windows CIと限定成果物を確認し、head指定マージ、実サーバーpreflight、限定配信、HTTP・実ブラウザ受入れまで進める。新候補を実配信確認するまではreleaseの版を更新しない。記録だけの追加PRや元CDの重複dispatchを作らない。

## 履歴

旧STATE/AGENTS/policyはdocs/historyと正本台帳・Gitに保全。詳細はdocs/web-scoped-production-delivery.md、運用手順はdocs/autonomous-workflow.mdを参照する。過去の「次回まで待つ」を最新直接指示より優先しない。
