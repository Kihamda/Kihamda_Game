# Web依存関係の品質確認

2026-10-13の07時工程を配布準備の完了後に順次継続した。同じscheduled slotを取得し直さず、元の30分上限内で独立した次工程を実行した。

Web依存関係の監査指摘は全依存関係で15件、本番依存関係に絞ると2件だった。`npm audit fix --prefix web --ignore-scripts --no-fund`でpackage.jsonの許容範囲内の更新を実行し、強制更新とメジャー版の移行は行っていない。変更はpackage-lock.jsonのみ。更新後は全体・本番依存関係とも監査指摘0件だった。これは今回取得したnpm監査情報の結果であり、未知の問題まで不存在とするものではない。

主な版はVite 7.3.1→7.3.7、React RouterとReact Router DOM 7.13.1→7.18.4、PostCSS 8.5.6→8.5.30。詳細な監査原文はローカルartifactsだけに保存した。

TypeScript、ESLint、Vite、5画面SSG、旧4URL、36成果物ハッシュ、検索導線のSSR、8作品案内ケース、配布準備・復元・5種類の不正パッケージ拒否が成功した。更新後のローカル配布準備ツール検査は作業中のソースを用いた一時検査で、build-versionの旧HEAD表記を新しい配布版の根拠にはしない。新commitとの対応はPRのCI成果物で確認する。

実ブラウザ390pxでは検索Unityから詳細へEnterで遷移、案内のEnter展開、再読み込み、一覧への検索条件保持、案内3画面の横はみ出しなしを確認。1280pxでは既存のIceSlide開始、GravityBallのcanvas初期画面、MineRushのセル入力と再読み込み、n目並べの開始を確認した。完走・全解法・ゲーム保存の永続化は今回の回帰検査に含めない。取得したブラウザのエラーログは0件。

本番サイト置換、Unity追加ビルド、記事投稿は行っていない。指標と人間評価は引き続き未観測。検査記録は[証跡](../business/unity/evidence/web-dependency-quality-20261013.json)。
