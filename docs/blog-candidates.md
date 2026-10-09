# 移行で確認した記事候補

| 読者 / 疑問 | 今回の根拠 | 独自に検証できる内容 |
| --- | --- | --- |
| WindowsへAI開発を移す人 / Linuxの排他処理をそのまま使えるか | business/ops/flow.pyの旧fcntl依存、Windows検査 | 同時実行CASの勝者が1つになること、UTF-8保存、tzdata依存 |
| Webゲーム運用者 / ゲーム数と売上を混同しない運用とは | legacy/ROADMAP-before.mdのPV試算、現在の101ゲームとnull指標 | カタログ数と実績を分け、収益を未観測のまま記録する仕組み |
| Unity導入者 / インストール済みなら自動ビルドできるか | ローカルEditorの起動がライセンス不在で198終了 | Editor/モジュール検出と実行可能性を分ける検証手順 |
| モノレポへ移行する人 / 古い作業branchを正本にしない方法 | refs-before.txtとrefs-current-before-layout.txt | main、dev、opsの照合とbundle復元 |

今回は下書き候補の保存のみ。Unityビルド成功、実プレイ、売上の体験談は書かない。公開原稿では認証・private資料を使用せず、出典URLと確認日を改めて確認する。
