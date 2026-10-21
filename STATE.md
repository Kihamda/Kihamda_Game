# 現在の状態

更新: 2026-10-22 01時枠。MineRushの遊び方案内・中断入力・終了演出をmainへ統合し、専用4ファイルの限定配信と本番受入れを完了。安全マス進捗表示と保管版の単一作成コマンドは、次の日次統合用にローカル検証済み。

## 公開状態

- 正本はbusiness/unity/ops/ledger.json。lease・未完了工程・最新checkpointは`python business/ops/context.py`で確認する。
- 公開URL: https://game.kihamda.net/games/minerush/ 。配信版5f9a1efab94d06b53a47182d954e3be9996a2889、成功CI39631400999、成功CD39631591189。2026-10-22 01:05:23〜01:06:47JSTに配信し、この日の実デプロイは1件。
- PR32はhead b75d400c82d3cc414219b285269391d3bf231c6eのLinux/Windows CI39631234390成功後にhead指定マージ。PR artifactは一時マージref cf172c20514473181668b0cccefa1ab79217f64c。配信には別途確認したmain版成果物を使用した。
- manifest SHA-256: 563afa3878bcc43b5a110a35c14fb0e5281d656a7d57860d9c9f771b6260fd69。候補全4ファイル・末尾スラッシュURL・対象外5URL・旧依存3件が一致。復元元はscoped-delivery-39631591189/scoped-recovery、ローカルartifacts/daily-20261022-delivery/scoped-recovery。
- 本番Chromiumでルール展開、数字から導いた71マスクリア・旗10、リセット81未開封・旗0・前回表示/粒子なし、F・右クリック・矢印・Space、再読み込み、旧本番一覧への往復を確認。320/390pxで横はみ出しなし。幅変更後の一回のlocatorクリックは盤面をリセットしなかったため採用せず、320pxのEnter開封/リセットは確認。実タッチ/Safariの検証とは区別する。
- 公開証跡はbusiness/unity/evidence/scoped-production-accepted-20261022.json。通常トップ・共有/assets・他作品・service workerは置換していない。他4作品のreleaseはnull。実タッチ、Safari、人間の初回理解/面白さ、別PC復元、本番復旧書込み、事業指標は未観測。

## 検証済みのローカル改善

- 盤面の既存ヘッダー内に「安全マス X / 71」を追加。旗は進捗に数えず、地雷露出後も開いた安全マスだけを表示。実盤面で0→40→71、敗北42の維持、リセット/再読み込み0を確認。390pxで最終テキスト16.42CSSpx、961×360でもヘッダーと盤面が収まり横はみ出しなし。最終390×720画像はローカルに保存。390×844画像の下部重複は画像証跡から除外した。
- TypeScript・ESLint・ビルド・実App回帰、通常44ファイル/9ページ/18拒否ケース、Windows事業検査104件に合格。実配信保持物へ次候補を重ね、旧版へ条件付き復元する偽FTP検査も成功。本番復旧の証明にはしない。詳細はbusiness/unity/evidence/minerush-safe-progress-20261022.json。
- `npm run release:prepare -- artifacts/<新しい出力先>`で通常保管版の検査・ビルド・版/チェックサム生成・作成・復元検証を一度に実行する。未コミット制作ソース、既存出力先、範囲外、引数不足を拒否する。Windows Node24.8.0と隔離Linux Node22.23.3で実44ファイルを作成・検証し、JS/CSS12件が一致。保管版作成は本番配信とは別工程。
- 通常ポータルの公開中フィルター・MineRush検索・詳細・開始・ゲーム再読み込み・戻る・一覧復帰でq/filterとCSSを保持。公開登録は確認済み5f9a1ef版を示し、安全マス進捗のローカル実装を公開済みとは扱わない。

## 次の工程

安全マス進捗と保管版作成コマンド、今回の公開登録・証跡を次の日次ブランチ/PRへまとめる。最新headのLinux/Windows CI・専用成果物・head指定マージ・本番preflight・限定配信・HTTP/実ブラウザ受入れ後にreleaseを更新する。追加の記録専用PRや元CDの重複dispatchは作らない。未完了工程のIDはcontext.pyを正本とする。

## 履歴

過去の詳細はGit・正本台帳とdocs/historyへ保全。配信と復旧の手順はdocs/web-scoped-production-delivery.md、自律作業の手順はdocs/autonomous-workflow.md。天啓.mdの継続指示は未削除。Unity自律制作終了、Atohitori対象外、WIP1、サブエージェント禁止を維持する。
