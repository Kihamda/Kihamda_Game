# Kihamda.NET制作スタジオ

毎回、天啓.md、STATE.md、business/studio-policy.json、business/unity/ops/ledger.json、最新checkpointとGit状態を読む。本人の最新の直接指示を優先する。天啓.mdは本人の指示入力用で、未完了の指示と作業中の追記・変更は消さない。取り組みと必要な検証が完了した指示だけ、STATE.mdへ結果を記録してから削除する。継続方針はこのファイルとbusiness/studio-policy.jsonへ保存する。天啓.md自体と追記欄は残す。

2026-10-12の本人の直接指示により、WebアプリはWeb技術で制作する。Unity必須による制作・検査負荷を避けるための方針転換で、天啓.mdに残る旧「すべてUnity製」方針より優先する。本人の意思表明本文をAIが書き換えて整合させない。Webのトップ・作品詳細・案内ページ全体の刷新は引き続き優先する。新作量産や毎回の計画の作り直しは行わない。

本人が他で開発したUnityアプリは、完成品のデプロイを受け入れる余地を残す。Webポータルから検証済み完成品を配布できる構成にする。Unityへの統一、未完成作品の自律制作、ソースの自動移植や再ビルドを再開しない。受領前に完成品があるものと扱わない。受領後は対象環境、版、ファイルハッシュ、実画面・入力・保存・再開、配布条件と復元方法を確認し、未実行を成功扱いにしない。

既存のunity/IceCourier、Assets/.meta/Packages/ProjectSettings、ビルドと検査履歴は保全する。旧Unity検査の成功はWeb技術で制作した版の検証にはならない。Unity Personalと既存CIは保全するが、通常のWeb制作にUnity認証やUnity配布ビルドを前提としない。有料契約はしない。

WIP1、サブエージェント禁止。通常制作・Web検査・コンサルティングは本人のWindows PC。01時は実装、07時は実装・品質検査と開発記事の下書き、13時は一次資料の市場調査から受入条件付きタスク、19時は実測・人間の反応・技術検査から戦略を調整する。07時の記事はbusiness/blog/draftsへの下書き保存だけで、自動投稿しない。CI/CDや認証の障害は依存工程だけ保留し、独立した内部作業を続ける。

次の一工程は既存Webポータルの作品データと表示を、Web製アプリと本人持込Unity完成品の両方に対応させること。公開未確認の作品に開始リンクを出さない。release=nullを維持し、制作技術と公開状態を別に扱う。Webはビルド・型・静的検査、実ブラウザの画面・入力・保存・再読み込みを変更範囲に応じて確認する。実タッチと人間評価は別記録にする。本番サイト全体の置換は行わない。

制作台帳は既存のbusiness/unity/ops/ledger.jsonを継続使用する。パス名は履歴保全のため残し、現在のWeb制作をUnity必須にする意味ではない。business/ops/ledger.jsonは旧クラウド履歴で、別のleaseに介入しない。共通business/ops/flow.pyを使い、expected revision、run ID、lease、fenceを確認する。手書き・初期化・履歴削除・競合自動merge・force pushは禁止。期限切れleaseは成果物・commit・PR・外部結果を照合してrecoverし、未知の外部操作を再送しない。

25分でcheckpoint、30分以内に成果物ハッシュ・検査・未確認事項と次の一工程を保存する。未完了はflow.pyのyieldで同じタスクをreadyへ戻し、完了条件未達をcompleteにしない。今回のように本人が方針を変更した場合は、成果を保存してから旧工程を根拠付きでcancelし、新方針の工程へ引き継ぐ。消費済みslotは取り直さない。

親フォルダ全体も引き継ぐ。business/workspace-projects.json、docs/workspace-handoff.md、business/legacy-dispositions.jsonを参照する。旧4プロジェクトは設計資料として保持し、旧フォルダへ新しいWebアプリを追加しない。Unity候補名は過去の保全記録であり、今後の実装技術を拘束しない。削除・移動前にGit履歴、bundle、zip、未追跡・無視ファイルの保全を照合する。_recoveryは認証・ホスティング設定を含むローカル保管庫で、GitHubへコピーしない。

Atohitoriは本人が別途制作するため自律開発の対象外。原稿編集・実装・移植・優先タスク化やそのフォルダでの作業は行わない。既存保全記録を残し、本人が完成後の配布を明示依頼した場合だけ成果物を扱う。

編集・内部検査・別ブランチ保存・PR作成は許可済み。検証した無料作品だけ既存許可領域へ配信する。サイト全体置換、販売、決済、DNS、有料契約、SNS送信、外部連絡は行わない。認証情報、非公開原稿、他事業のprivate state、生のデスクトップ画像・ログをGitへ含めない。生成素材の出所はdocs/generated-assets.mdに残す。mainへ未検証の作品をmergeしない。

利益・訪問・開始率・完了率・再訪の未観測値はnull。14/28日の実観測でcontinue/improve/stop/unobservedを判断する。ゲーム数やビルド成功を需要・面白さ・事業成果の証明にしない。通知は新しい完成物、重大障害、本人に必要な具体操作だけにし、同じ認証待ちを反復通知しない。

方針転換前に検証した保存警告の成果はdocs/ice-courier-save-notice-20261012.mdへ保全した。例外注入・保存API成功・ブラウザ永続化は別々に扱う。過去の縦画面・導入・保存の検査仕様と証跡は履歴として保持し、自律Unity制作の再開指示には使わない。

作品データはweb/src/portal/data/works.json。制作技術・制作元・制作状態とreleaseを区別する。本人持込Unityは受領後に実物と配布根拠を照合して登録する。次の一工程は一覧・詳細の往復で検索語と公開状態を保持し、戻る導線を検査すること。既存Web入口内で継続し、新作やUnity再開へ置き換えない。検査記録はdocs/web-catalog-20261012.md。

2026-10-12の本人の追加許可により、リポジトリ内の調査・編集・検査・commit/push・PR作成と、検証済み変更のCI成功後のマージは自律的に進める。一般公開承認待ちの旧記録だけを理由に停止しない。差分全体を確認し、認証情報・非公開原稿・生のデスクトップ記録・_recoveryを公開しない。最新PR headのCI成功を確認してそのheadだけをマージする。本番サイト全体置換など既存の対象外は維持する。短い調査や現状報告だけで終了せず、時間内に既存工程の実装・実ブラウザ検証・PR反映を進める。25分checkpointと30分保存を守り、必要のない検査の反復や時間稼ぎはしない。

検索条件はURLのqとfilterで保持する。次の一工程はT-web-portal-release-presentation。UnityのCI設定は保全し、Web方針に従ってpushからの自律追加ビルドは止める。Unity workflow_dispatchは残す。

作品ごとのguideはWorkGuideで案内する。証跡は版・成果物SHA-256・検査記録と実画像SHA-256を持ち、公開版と一致する必要がある。空の項目を確認済みにせず、他作品の案内を流用しない。次の一工程はT-web-portal-renovation-acceptanceで5画面の横断受入検査を行う。

5画面の刷新はdocs/web-acceptance-20261013.mdの横断検査まで完了。次はT-web-portal-release-packageで検証済みWeb成果物の版・SHA-256・復元手順を配布準備へまとめる。本番サイト全体の置換は行わない。ポータル遷移では本文、#worksでは一覧へフォーカスし、検索編集では入力を維持する。

Web配布準備はdocs/web-release-package-20261013.md。manifestとsiteのみを圧縮し、元commit・ファイルハッシュ・別フォルダ復元を照合する。CI成果物は30日保持で本番配置ではない。次はWeb依存関係の監査と互換性確認を行う。監査指摘の詳細はローカルで扱い、強制更新しない。

2026-10-13のWeb依存関係更新後は全体/本番の監査指摘0件。結果はdocs/web-dependency-quality-20261013.md。次はT-web-release-retentionで現行CI成果物の版と復元元を保持し、更新前ZIPと区別する。本番サイト全体置換は行わない。

現行Web配布準備版はartifacts/releases/web-20261013-qualityに保存し、索引はbusiness/unity/evidence/web-current-retention-20261013.json。通常の検査整理でartifacts/releasesを削除せず、別保存先と照合してから扱う。次はT-web-legacy-browser-acceptanceで既存4ルートのルール・入力・保存を一作ずつ検査する。


2026-10-13の本人の最新指示によりPRは日本時間で原則1日1件程度とし、同じ日次ブランチ/既存PRへ実装・依存更新・検査・台帳・完了記録をまとめる。当日のPRがマージ済みならローカルcommitで保存し翌日分へまとめる。記録だけの追送PRを作らない。2026-10-13は追加PRを作らない。
現在の次工程は同じT-web-legacy-browser-acceptanceのGravityBallの全ステージ・失敗再開・最高スコア保存。Ice Slide/MineRush/n目並べの検査範囲と未確認事項はdocs/web-legacy-acceptance-20261013.md。全体完了後にT-web-legacy-mobile-input-acceptanceを行い、枠内配置と物理タッチの操作性を区別する。

2026-10-13の19時枠でGravityBallの基本検査を追加しT-web-legacy-browser-acceptanceを完了。検査範囲と注入の区別はdocs/web-gravityball-acceptance-20261013.md。次はT-web-legacy-mobile-input-acceptanceでIce Slideから操作部を実測する。実タッチ・Safari・傾き・人間評価を完了扱いにしない。

Ice Slideのモバイル操作部はdocs/web-ice-mobile-20261013.mdで24px以上と盤面/操作部の枠内配置を確認した。現在の次工程は同じT-web-legacy-mobile-input-acceptanceのMineRush盤面・旗操作・キーボード代替。実タッチ・Safari・人間評価は別に未確認として残す。
