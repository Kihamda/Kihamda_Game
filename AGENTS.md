# Kihamda.NET制作スタジオ

## 作業開始

正本はこのディレクトリ。天啓.md、本文、STATE.mdの現在欄、business/studio-policy.json、docs/coding-conventions.mdを読む。`python business/ops/context.py`で正本台帳の整合性と未完了工程・最新checkpointを確認する。手順はdocs/autonomous-workflow.md。全台帳や過去の意思決定を毎回表示せず、必要なタスクは`--task <ID>`、実装の経緯はGit履歴と関連証跡から選んで読む。pythonがPATHにない場合はartifacts/venv/Scripts/python.exeを使う。

## 現行方針

- 本人の最新の直接指示を優先する。2026-10-20に判断の裁量拡大、短い定期promptと必要履歴の選択読込、一日一回目安の実デプロイを指示された。既存許可内の設計・改善順序・検査は自律決定し、確認済みの同じ判断を毎回尋ねない。
- WebアプリはWeb技術で制作する。天啓.mdの旧Unity必須より2026-10-12の直接指示が優先する。Unityの自律制作・移植・追加ビルドを再開しない。既存ソース・Assets/.meta/Packages/ProjectSettings・Personal設定と検査履歴を保全する。本人持込Unity完成品は受領後に版・環境・SHA-256・動作・配布条件・復元方法を確認する。ソースと再ビルドを一律必須にしない。
- Windows PCでWIP1、サブエージェント禁止。未完了工程を毎回計画し直さず、利用者に届く改善を一つずつ進める。新作量産を件数目標にしない。
- Atohitoriは本人制作で対象外。原稿編集・実装・移植・タスク化をしない。完成後に配布を明示依頼された場合だけ扱う。

## 実装・検証・配信

コーディング規約はdocs/coding-conventions.mdと対象の設定・既存実装。Webの型・静的・ビルドと変更に対応する実ブラウザ検査を行う。合成イベント、実通信障害、実タッチ、Safari、人間評価を区別し、未確認を成功にしない。生成素材の出所はdocs/generated-assets.mdに記録する。

調査・編集・検査・commit/push・PRと、最新headのCI成功後のhead指定マージは許可済み。差分全体を確認する。PRは日本時間で原則一日一件程度にまとめ、マージ後の追加成果は翌日分へ保存する。記録だけの追送PRを作らない。PR数とデプロイ数は別に扱い、当日PRマージ済みでも配信可能な版の配信工程を止めない。

実デプロイは一日一回を目安に、検証した無料作品の既存許可領域へ進める。CI成果物とマージだけでは配信成功にしない。配信URL・版/ハッシュ・動作・復元元を照合してからreleaseを登録し、未公開のrelease=nullに開始リンクを出さない。サイト全体置換、販売、決済、DNS、有料契約、SNS送信、外部連絡は行わない。既存の全体FTPS workflowを無条件で起動しない。

## 記録と保全

制作の正本台帳はbusiness/unity/ops/ledger.json。共通business/ops/flow.pyだけで更新する。expected revision・run ID・lease・fenceを照合し、手書き・初期化・履歴削除・競合自動merge・force pushをしない。期限切れleaseは成果物・Git・PR・外部結果を照合してrecoverし、未知の外部結果を再送しない。旧business/ops/ledger.jsonと別workerのleaseに介入しない。

定期実行は原則25分まで制作・検証を続け、残り5分でcheckpoint・成果物ハッシュ・検査・未確認事項・次工程を保存する。一つの修正やcheckpoint、当日PRマージ済み、CI待ちだけで早期終了しない。残る受入条件や独立した実装・検査へ続ける。早期終了は許可範囲の独立作業も進められない具体的根拠を残す。実時計で開始・終了・経過時間と終了理由を記録し、待機や無意味な反復で時間を埋めない。詳細はdocs/autonomous-workflow.md。未達は保存段階でyieldする。定期slotを二重取得せず、30分以上遅れた枠をcatch-upしない。01/07/13/19時の役割はstudio-policy.jsonを参照し、07時記事はbusiness/blog/draftsへの下書きだけとする。

STATE.mdには現在の状況と直近結果・詳細参照先を保つ。本文とpolicyへ完了経緯を追記しない。旧記録はdocs/historyに原本のまま保全済み。必要な履歴だけ正本台帳・Git・証跡へ遡る。利益・訪問・開始率・完了率・再訪の未観測値はnull。14/28日の実観測で判断し、検査成功や本数を需要や利益にしない。

天啓.mdは本人の入力欄。指示への取り組みと検証が完了した場合だけSTATE.mdへ結果を保存し、再読して完了指示だけ削除する。未完了・継続指示と本人の追記・変更、ファイルと追記欄を残す。

親フォルダの旧4作品はbusiness/workspace-projects.json、docs/workspace-handoff.md、business/legacy-dispositions.jsonに従って保全し、旧リポジトリへ新しいWebアプリを追加しない。削除・移動前にGit/bundle/zipと未追跡・無視ファイルを別途照合する。_recovery、認証情報、非公開原稿、他事業のprivate state、生のデスクトップ画像・ログを公開しない。
