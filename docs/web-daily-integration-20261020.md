# 画像失敗案内の日次CI統合

2026-10-20の01時枠。前日の拡大画像失敗案内と検査・記事下書き・配布条件調査を日次PR一件へまとめる。型・静的・9ページSSG・43チェックサム・案内8条件・検索回帰・台帳27件・親4元commitを確認した。PR最新headのLinux/Windows CIと、その成果物を別フォルダへ復元した390/1280の実ブラウザ受入を確認してからhead指定マージする。

本番サイト全体の置換は行わない。releaseと事業指標はnull。実タッチ・Safari・人間評価・別PC復元・実通信障害は未確認。既存の合成error検査は実HTTP障害検査と区別する。Unity・本人原文・旧クラウド台帳・親原本・復元保管庫は変更しない。

## 今回の保存結果

PR28 https://github.com/Kihamda/Kihamda_Game/pull/28 を作成。最新headはe2dcca07c99d2606b9647f2017cc563aebd287ea、CI実行39282780335のLinux/Windowsジョブは実行開始待ち。GitHub公式障害 https://www.githubstatus.com/incidents/8tzbpcnl75jp は2026-10-20 00:49JSTにActions・Pages・Webhooksの性能低下を報告し、00:56JSTにワークフロー処理遅延を明示した。これと今回のキュー待ちの直接因果は断定しない。

今回のソースでもMineRushの390/1280通常画像932px・横はみ出しなしと、隔離fixtureの合成error案内を確認。Tab/Shift+Tab・Enter/Escape・起点復帰と検索語Webの一覧復帰、390再読み込み後の失敗状態初期化を確認した。これはローカルソース版であり、CI復元版の受入ではない。

最新headのCI・CI成果物のハッシュ照合・復元390/1280受入・head指定マージは未完了。同じタスクをyieldし、既存PR28を再利用する。新PRやCIの重複再送を行わず、ローカル完了記録は次回同じ日次PRへまとめる。既存CI保全索引は変更しない。独立したready工程はなく、新作や再検査を追加して時間を使わない。


2026-10-20の07時枠でT-web-daily-ci-integration-20261020を完了。PR28のhead e2dcca07c99d2606b9647f2017cc563aebd287eaはLinux42秒・Windows24秒のCI39282780335に成功。CI元9dcc7fbea5347c876c9a6186824ad8a37246cd4aの両親、アーカイブSHA-256、44ファイル・9ページと画像4件を照合し、正常と5拒否検査に合格。復元390/1280のMineRush通常画像932px、合成error時の本文案内・サムネイル保持、Tab/ShiftTab/Enter/Escape・起点復帰、検索Webの一覧復帰と再読込、公開中0件・横はみ出しなし・iframe0を確認した。390再読込で失敗状態も初期化。合成イベントは実HTTP障害と区別し、画面撮影は15秒でタイムアウトしたため画像を確認済みにしない。受入保存後に最新head CIを再照合し、07:02:51JSTにhead指定マージc4f708d3331d317844be0dea22943ab9f3d3df86を確認。復元索引はbusiness/unity/evidence/delivery-web-dialog-error-final-20261020.json。本番配置・Unity追加ビルド・投稿なし、releaseと事業指標null、実タッチ/Safari/人間評価/別PC復元は未確認。天啓の継続指示を保持。本日追加PRなし。

PR28の日次統合は完了。現行CI保全版を保持し、既存Web入口の実測で具体的な品質問題が見つかった場合に同じWIP1で改善する。本日追加PR・記録だけのpushは行わない。実HTTP障害・実タッチ・Safari・人間評価は未確認。
