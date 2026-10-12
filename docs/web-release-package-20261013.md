# Web成果物の配布準備と復元

2026-10-13の07時工程。制作物は配布準備済みで、本番サイトは置換していない。Webポータルの元commitは`1cef2efce3e230d8b5dbcea579c47334f6db581b`。このcommitとorigin/mainのソース内容が一致することを確認し、Gitの追跡ソースだけを別フォルダへ取り出してnpm ciとビルドを実行した。

ローカルZIPは`artifacts/web-release-20261013.zip`。SHA-256は`234a50c1737a6b491f5a4a65f1afcb99d9dd2b2e255d57ecc1a09685cc0027e3`。ZIPに含まれるのはmanifest.jsonとsite/のみ。manifestは元commit、build-version、全37ファイルのSHA-256とサイズ、5画面のtitleとcanonicalを記録する。site/SHA256SUMSはそれ自身を除く36ファイルを記録する。非公開原稿、認証情報、Unity配布バイト列、生のデスクトップ記録、_recoveryは含めない。

## 復元手順

1. ZIPのSHA-256を上の記録と照合する。CIから取得する場合は同じartifactの`web-release.tar.gz.sha256`と照合し、対象PRのheadとCI結果も確認する。manifestや同梱ハッシュだけで取得元の信頼性を証明したことにはしない。
2. 新しい空フォルダへ展開する。WindowsのローカルZIPは`Expand-Archive -LiteralPath artifacts/web-release-20261013.zip -DestinationPath artifacts/web-restored-20261013`。CI版は新しいフォルダで`tar -xzf web-release.tar.gz`を実行する。
3. 正本から`node scripts/web-release-package.mjs verify artifacts/web-restored-20261013`を実行する。CI版は展開先を指定する。全ファイル、サイズ、版、5画面の見出し・メタ情報を照合し、余分なファイルとリンクを拒否する。
4. site/をローカルHTTPサーバーの公開ルートにして5画面を確認する。Viteがある場合はWebディレクトリで`npm run preview -- --outDir <展開先の絶対パス>/site --host 127.0.0.1 --port 4187 --strictPort`を実行する。ファイルを直接開くとルート相対URLを検査できない。

制作ソースを復元する場合は元commitを別checkoutへ取得し、`npm ci --prefix web`、`npm run build`、`GITHUB_SHA`に元commitを設定した上で`node scripts/check-web-build.mjs`を実行する。再ビルドでは生成時刻が変わるためZIPとのバイト一致を前提にしない。保存済みZIPの復元と、元ソースからの再ビルドを区別する。

## 検査結果

ZIPの別フォルダ展開後に全37ファイルと5画面が一致した。改変、欠落、余分なファイル、元commitの不一致、manifestの改変を拒否する回帰検査も成功した。CIにはtar.gzの作成、展開、再検証とアーカイブハッシュの保存を追加した。成果物は30日で失効するため、将来の公開時には取得・保管先を別途決める。

復元版を実ブラウザで390×844と1280×720の5画面で確認した。横はみ出しとiframeはなく、390pxではUnity検索、Enterで詳細へ移動、Enterで操作説明を展開、再読み込み、一覧への検索条件保持、案内3画面の本文フォーカスを確認した。今回はゲーム保存・実タッチ・Safari・人間評価を検査していない。持込Unity完成品は未受領、公開指標と利益はnullのまま。

npm ciは15件の依存関係の監査指摘を報告した。今回の工程では強制更新や修正を行っていない。配布準備の整合性検査を、依存関係の安全性検査の完了とは扱わない。

証跡は[検査記録](../business/unity/evidence/web-package-20261013-0700.json)と[manifest](../business/unity/evidence/web-package-manifest-20261013.json)。本番配置は未実施。

配布準備PR #19はhead`322c212a5a21199fade2ed888276b4a9ef670713`のCI成功後にマージした。CIのビルド版はPRのマージ用ref`6c444ac190c30b042c2a42178d6c825185dc0832`で、PR headとは別の識別子。ダウンロードしたtar.gzのハッシュと展開後の37ファイル・5画面も一致した。[配布準備の反映記録](../business/unity/evidence/delivery-web-package-20261013.json)に識別子を分けて保存した。

続く同日07時の[依存関係工程](web-dependency-quality-20261013.md)では更新後の監査指摘0件を確認した。上記ローカルZIPは更新前の元commitに結び付いた履歴であり、更新後の成果物として配布しない。
