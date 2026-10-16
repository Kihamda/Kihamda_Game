# 2026-10-17 日次統合

既存のアイススライドパズル・MineRush・GravityBallの独立紹介と、人数・ルール等の既存情報による複数語検索を日次PR一件へ集約する。紹介と旧実行URLを分離し、release=nullの開始リンクを出さない。ゲーム本体・保存形式・Unityソースは変更しない。

型・ESLint・Vite9SSG、4旧URLと39チェックサム、導線SSR・案内8条件・4ゲーム回帰・台帳27テスト・既存Core3ルートが成功。Pythonの初回検査は標準一時フォルダ権限で失敗し、許可されたartifacts/test-tempを指定して27件成功。Coreは初回ユーザー領域権限エラー後に作業用CLI領域で成功した。前回checkpoint7ハッシュ、mainの237イベント、親4commit・復元8ハッシュを照合した。

Webとscriptsの実装は前日のブラウザ検査版60eb7d0と同一。390/1280の入力・紹介・一覧復帰・検索URL・再読み込みはdocs/web-combined-search-20261016.mdと各紹介記録を参照する。同じ検査を実タッチや人間評価へ読み替えない。CIで得た配布準備成果物は版とSHA-256を照合し別フォルダへ復元してから実ブラウザで確認する。結果はbusiness/unity/evidence/delivery-web-daily-20261017.jsonへ保存する。

最新headのLinux/Windows CI成功を確認してhead指定でマージする。本番サイト全体置換や配信は実施しない。実タッチ・Safari・人間評価・公開版の動作は未確認、事業指標はnull。
