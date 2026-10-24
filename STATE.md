# 現在の状態

更新: 2026-10-23。検索条件と履歴フォーカス、安全マス進捗は本番受入れ済み。版付き開始リンクとキャッシュ検査はローカル検証済み・未配信。

- 正本台帳はbusiness/unity/ops/ledger.json。lease・未完了工程はcontext.pyで確認する。Web技術、WIP1・サブエージェント禁止、Unity自律制作終了、Atohitori対象外を維持する。
- 本番ポータルは4作品の棚。公開中はMineRush、他3作品は準備中。原本・既存ゲームURL・旧共有アセットを保全し、削除していない。
- PR36 head5675995のLinux/Windows CI39810169627成功後、head指定でmain3416ea4e1f4db34db12debc63947f0689b2b6c18へマージ。同じmainのCI39810473015も成功。
- ポータルCD39810676603成功。検索条件を案内・問い合わせ・方針ページと再読み込みで保持し、詳細・実ゲームから戻ると元のリンクへフォーカスを復元する。35ファイルのHTTPS一致、ゲーム5件・service workerの不変、1280/320pxの実操作を確認。証跡business/unity/evidence/portal-context-production-20261023.json。
- MineRushは読取専用preflight39811295068後、限定CD39811894781で同じmain版を配信。専用4ファイル・末尾スラッシュURL・保護5URLと旧依存が一致。旗0/1時は安全マス0、実キーボードで71マスクリア・リセット0・再読み込み81未開封、敗北62とDOM安全マス62の一致、320/390pxの操作・往復を確認。証跡business/unity/evidence/scoped-production-accepted-20261023.json。
- 配信直後、既訪問ブラウザの最初の再入場では旧JSを表示した。通常再読み込みで新版JSと進捗表示を確認し、旧表示の結果は新版受入れから除外した。service workerにはfetchハンドラがなく、原因を断定していない。
- 復元元はportal-delivery-39810676603/portal-recoveryとscoped-delivery-39811894781/scoped-recovery。両方を戻す場合はMineRush旧版5f9a1ef、次にポータル旧版1b37307の順。実保持物と偽FTPで逆順拒否・正順42ファイル一致、元journal不変を確認。本番復旧・別PC復元とは区別する。
- 新しい公開版登録は実受入れ後にweb/src/portal/data/works.jsonへ保存した。今回配信した紹介ページの確認版表示は前日登録のままで、次の日次統合で同期する。記録だけの追送PR・追加デプロイを行わない。
- 今日は同じ日次改善をポータルとゲームの2トランザクションで配信した。再送なし。台帳・受入れ・版登録は今回のローカルcommitへ保存し、次の日次変更とまとめる。
- 実タッチ、Safari、人間評価、別PC復元、本番復旧は未確認。利益・訪問・開始・完了・再訪はnull。詳細docs/daily-delivery-20261023.mdと正本checkpointを参照する。

- 本番22URLの本文別名一致とETag/304を読取専用で確認。HTMLはCache-Controlなし、版マーカーはmax-age604800。XServer Static公式の.htaccess対応を確認したが、本番mod_headersとnginxへの反映は未確認。対象22URLだけの候補を隔離Apacheで検証し、対象外11URL・既存リダイレクト・33本文を維持した。ルート設定変更の限定許可を確認中で、書込みは行っていない。
- 開始リンクへ受入れ済み公開版のハッシュを付加した。PC/320pxの起動・Enter入力・再読み込み81未開封・検索条件と戻るフォーカス、44ファイル保管版・20不正ケース、従来形式の本番保管版検証を確認。既存許可内の変更として次の日次統合へ保存。追加PR/push/デプロイなし。
- 設定追加前の有効キャッシュはサーバー変更だけでは即座に消えないことも隔離ブラウザで確認した。A保存後のB+no-cache追加でも通常再訪A、リロードB、その後Cへの通常再訪C。本番の過去原因と履歴復元は断定しない。詳細docs/web-cache-revalidation-20261023.mdと正本checkpoint。
