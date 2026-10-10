# 現在の状態

2026-10-10 13時枠では、一次資料の市場調査と現行UIの読み取りから、既存T-ice-courier-touch-polishへ具体的な検査仕様を補った。Cosmic ExpressとA Good Snowmanの販売者説明、Unity 6.3のcanvas・入力・ブラウザ互換性、W3Cの操作対象寸法を確認した。結論は作品数の追加ではなく、縦画面の説明・盤面・押せる操作部を先に整えること。調査成果はbusiness/unity/research/2026-10-10-portrait-entry-acceptance.mdへ保存した。

960×760のUnity画面を960×600へ収め、Web枠でも縮小する現行ソースから、390px幅でも方向ボタンの高さは約17.32CSS px以下と計算した。ブラウザ実測ではない。次の一工程はUnity縦画面UIと、その寸法を保てるローカルWeb枠の改善。最終寸法44×44CSS px以上の操作部、本文16px以上、盤面内だけのスワイプ、既存の終了・再試行・一覧への戻りの回帰検査を仕様化した。Safariのiframe内IndexedDB制限も資料で確認し、保存・再開をブラウザごとに検査する条件を追加した。人間の導入理解と実タッチは未実行のまま残した。

台帳の履歴と最新checkpointのハッシュ、親4プロジェクトのHEADと復元8ハッシュを照合した。今回の調査タスクのみを完了し、既存の実装タスクは維持する。ゲーム実装・Unity再コンパイル・EditMode/PlayMode・新配布ビルド・実タッチ・人間評価は今回未実行。利益・訪問・開始率・完了率・再訪はnull、14/28日の観測は公開前で未開始。別ブランチresearch/ice-courier-portrait-20261010-1300へローカル保存し、既知の外部承認待ちは再送せず、公開や全体置換は行わない。Web刷新全体は未完了のため天啓.mdを保持した。Atohitoriでは作業していない。

2026-10-10 07時枠では、T-unity-portal-player-integrationのローカル接続を完了した。詳細画面の開始・読み込み・操作可能・失敗・再試行・終了・一覧へ戻るを実装し、GitHub Actions run 37945379221のWebGL版と18ファイルのSHA256を照合した。Unity本体はそのsourceCommitから変更していない。成果物をdistへコピーせず、loopback限定の検査サーバーから検証済みバイト列を配信する。revision 24でcheckpoint・完了を保存してleaseを解放し、記録画像の切り出し修正とGit上の証跡照合は追加記録で保存した。

実ブラウザで方向キーによる荷物回収と配送完了、ZのUndo、終了・再起動後のResume、Down画面ボタンを確認した。Tabでページの終了ボタンへ戻れ、Enter終了後は開始ボタンへフォーカスが戻り、iframeは0になる。ローダー通信遮断で失敗案内を確認し、解除後の再試行も成功。一覧へ戻ると/#worksに移動し、worksへフォーカスが戻る。1280×720と390×844で枠を検査し、横のはみ出しはない。通常フラグなしの画面には開始ボタン・iframeがない。

TypeScript・ESLint・Vite、静的5ページ、旧4URL、Unity GUID、生成リンク、Web成果物のハッシュ、git diff --checkが成功。親4プロジェクトのHEADと復元zip/bundleも一致。Unity再コンパイル・EditMode・PlayMode・新Windows/Web配布ビルドは今回未実行。実タッチ、人間の反応、利益と公開指標は未観測。390pxではUnity内部の文字と操作部が小さいため、次の一工程は既存T-ice-courier-touch-polishで縦画面UIを改善すること。

証跡はbusiness/unity/evidence/player-20261010-0700.json、説明はdocs/portal-player-integration.md。開発記事をbusiness/blog/drafts/2026-10-10-unity-player-shell.mdへ未投稿の下書きとして保存。別ブランチweb/unity-player-20261010-0700にローカル保存し、外部pushの既知の承認待ちは再送していない。PR・mainへのmerge・本番配信は実施していない。Web刷新全体は未完了なので天啓.mdを保持し、Atohitoriでは作業していない。

2026-10-10。移行PR #10とスタジオPR #12はmainへ統合済み（6b673b86155271de12c22c5f0460ece2b2c2f2fd）。通常制作はこのmainから別ブランチを作って続ける。

101作品の採否を記録し、Ice Slide、Gravity Ball、Mine Rush、nTicTacToeの4作品を移植資料として残した。他の実装はGit履歴と全参照bundle、削除前Webのzipを保全して整理した。採用や統合は実装費用とルールから判断しており、人気や利益の実測による判断ではない。

最初の作品Ice Courierは、移動の出発点が凍って障害物になる配送パズル。3ステージ、Undo、保存・再開、解法検証を実装した。ルール単体検査とインストール済みUnity DLLに対するC#コンパイルは成功。Unity Editor起動、EditMode 2/2、PlayMode 1/1、Windows実キー操作を確認。GitHub Actions run 37945379221でWindows/Webの両方が成功し、ダウンロード後のチェックサムと版を検査した。Web実画面では移動・勝利・Undo・ページ再読み込み後のResumeが成功。縦画面と実タッチ、面白さは未評価で次工程へ残す。ローカルWebビルドにはUnity内部CLRエラーが残るが、指定されたGitHub Linux環境でWebビルドが成功している。

通常制作は本人のWindows PC。GitHub Actionsは作品登録からWindows/Webを直列でビルドする。Personalライセンスを使用し、有料契約やローカルself-hosted runnerは不要。CI/CDの障害で独立した制作を止めない。

制作の正本はbusiness/unity/ops/ledger.json。旧クラウドのbusiness/ops/ledger.jsonと運用履歴を保持し、実行中のleaseには介入しない。本人の指示により旧クラウド定期実行を停止してローカルへ切り替える。ローカル定期実行unityを01/07/13/19時に有効化済み。旧IDは現在の登録一覧に見つからず、停止成功とは断定しない。検証タスクはrevision 10で完了しleaseを解放、次の縦画面改善タスクを準備した。詳細はdocs/studio-verification.md。

天啓.mdは本人専用。本人の最新指示をbusiness/studio-policy.jsonにも記録した。売上・純利益・公開後の指標は未観測。無料公開前に実プレイ、同一版の成果物、復元条件を確認する。

親フォルダは既存Gitプロジェクト4件に加え、Atohitori/Referenceの原稿・設計7件も保全した。GitやUnity実装がない資料を実装済みと扱わない。本人の2026-10-10指示により、Atohitoriは本人が別途制作するため自律開発の対象外。原稿と保全記録は保持し、完成後に本人から配布の依頼があった場合だけ扱う。参照順と復元ハッシュはbusiness/workspace-projects.json。

2026-10-10 01時枠では、天啓.mdのWeb刷新指示を優先し、トップ・Ice Courier詳細・運営者情報・問い合わせ・プライバシーの5画面を実装した。作品一覧を一つにし、検索と公開状態の絞り込み、空結果、ルール説明、共通の戻り先を整えた。架空の累計プレイ数と廃止作品を含む古いメタデータを除いた。案内ページも同じ画面から静的生成するため、個別HTMLとの二重更新は不要になった。旧4作品のURLとソースは保全している。

npm run build（TypeScript・ESLintを含む）、npm run check、生成HTMLの内部リンクとチェックサム検査に成功。ブラウザで検索の一致・空結果・リセット、公開中0件、キーボードによる絞り込みと詳細への移動、問い合わせ・プライバシー・運営者情報、再読み込み、ページ名の更新を確認した。デスクトップと390×844の画面を確認し、縦画面5ページで横のはみ出しがないことを確認した。台帳の24テストは、サンドボックスの標準一時ディレクトリの権限エラー後、許可済みartifacts/test-tempを使って成功。親4リポジトリのHEADと復元zip/bundleのハッシュは引き継ぎ台帳に一致した。Atohitoriでは作業していない。

今回はWebの入口の工程のみ完了。Unityの再コンパイル・新しい配布ビルド・実タッチ・人間の反応・公開後の指標は今回未検証。Ice Courierの公開状態は準備中で、未配信の開始リンクは出していない。Web刷新全体は未完了なので、天啓.mdの指示は消していない。次の一工程は、既存の検証済みWebGL成果物をローカルで詳細画面へ接続し、読み込み・終了して戻る・失敗時の案内を検査する。別ブランチweb/unity-portal-20261010-0100でレビューへ進め、本番全体置換とmainへの自動mergeは行わない。検査証跡はdocs/portal-renovation.md。

この枠のローカルcommitは保存済み。公開リポジトリへのpushは自動承認レビューに拒否され、PRは未作成。初回は送信先の信頼性を指摘されたため、既存のKihamda/Kihamda_Gameが公開リポジトリで、本人に管理権限があり、直前のPR #14も本人所有であることを読み取り専用で確認した。再審査では、未公開ソースと運用記録の一般公開について具体的な追加承認が必要とされた。別経路では送信しない。本人の承認を待ち、依存しないローカル制作は継続する。チェックサム付き証跡の改行変換を防ぐため、.gitattributesで証跡のバイト列を保持し、GitのLF正規化後のソースとの一致もbusiness/unity/evidence/portal-20261010-provenance.jsonへ保存した。制作台帳はrevision 20、leaseなし、次工程はT-unity-portal-player-integration。
