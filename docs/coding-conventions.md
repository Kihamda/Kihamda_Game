# コーディング規約

作業開始時に本文を読み、編集前に対象ディレクトリのAGENTS.md、実装、設定、既存の検査を確認する。ここにない細部は隣接コードに合わせ、広い整形や無関係な修正を混ぜない。

## Web

- TypeScript、React、ES modulesを使用する。型の正本は`web/tsconfig.app.json`と`web/tsconfig.node.json`。strict、未使用変数・引数検査を維持し、anyや抑制コメントで回避しない。
- 静的規約の正本は`web/eslint.config.js`。React HooksとFast Refreshの規則を守る。新規依存は必要性と既存構成を比較し、強制更新しない。
- `web/src/portal`の入口と`web/games/*/src`の作品実装を区別する。共通化は既存`@shared`を確認し、作品固有の状態を無理に共有しない。
- 公開URL、既存保存形式、検索条件のq/filter、キーボードとフォーカスの契約を維持する。保存は入力値を検証し、失敗を案内し、未知の形式や別タブの新しい値を無条件に上書きしない。
- 制作状態と公開状態を区別する。`web/src/portal/data/works.json`のreleaseは同版の実配信確認後に更新する。検査版画像は公開版画像と区別し、出所・版・SHA-256を残す。
- UI文言は利用者の操作と判断に必要な内容にする。会話のキャラクター口調をコード・コメント・文書へ持ち込まない。

## 運用コードと記録

- Pythonは標準ライブラリと既存依存を優先する。JSONはUTF-8。台帳更新は`business/ops/flow.py`だけを使う。context.pyは検証済みの読取専用ビューで、台帳や履歴を作り直さない。
- 台帳のexpected revision、lease、fence、元イベントを維持する。未知の外部結果を再送せず照合する。認証情報、非公開原稿、生のデスクトップ記録、_recoveryを公開しない。
- Gitは差分全体を確認して対象ファイルを明示する。force push、台帳競合の自動mergeは禁止。変更の理由・検査・未確認事項を事実どおり残す。

## 変更に応じた検証

Web変更は`npm run check`、`npm run build`、`node scripts/check-web-build.mjs`と対象作品・導線の既存検査を実行する。画面・入力・保存に触れた場合は実ブラウザの画面・操作・再読み込みも確認する。実タッチ、Safari、人間評価、合成イベントは区別する。

台帳・運用コードの変更は`python -m unittest discover -s business/tests -v`と正本台帳の検証を行う。WindowsでpythonがPATHにない場合は`artifacts/venv/Scripts/python.exe`を使用する。文書だけの変更で無関係な作品検査を反復しない。最新headのCI成功を確認し、そのheadを指定してマージする。
