# Ice Courierの新UIをEditorで検査した結果

確認日2026-10-11、07時枠。既存T-ice-courier-touch-polishを継続し、commit 6449812ca0788e35b9812e0882ae3ba1b0120e0dのUnity実装を本人のWindows PCで検査した。ゲーム本体とWeb枠のソースは変更していない。

## 実画面と入力

Unity 6000.3.23f1のGame Viewを固定解像度・Scale 1xで表示し、Computer Useのマウス・キー入力を送った。これはEditorの実画面検査であり、配布済みWindowsプレイヤー、Webブラウザ、物理タッチの検査ではない。

| 検査範囲 | 結果 |
| --- | --- |
| 390×844、全3ルート | 説明・盤面・凡例・方向ボタン・Undo・Restart・Resume・表示時のNextが収まり、ラベルの切れや盤面との重なりを認めなかった |
| 全3ルートの実入力 | 配送完了を確認。手数は順に2、10、9。キー操作と1番目のルートの右・下ボタンを使用 |
| 荷物・霜・Undo | 1番目のルートで右ボタンを1回押すとC 1/1、MOVES 1。Undoを1回押すとC 0/1、MOVES 0で荷物と霜が戻った |
| 保存と再開 | 1番目のルートを完了後、Playを終了して再起動。ResumeでC 1/1、MOVES 2、2個の霜、到着位置と完了状態が戻った。Editor内PlayerPrefsでの往復 |
| 盤面外へのマウスドラッグ | 3番目のルートの初期状態から盤面外へ離すとMOVES 0のまま |
| 盤面内のマウスドラッグ | 同じ初期状態から盤面内で右へ離すとMOVES 1。移動終了後の位置と霜も記録した |
| 335×820、3番目のルート | 説明・盤面・操作ラベルが収まる。390×844から切り替えても荷物0/2、手数1、位置と霜を維持 |
| 1280×720、3番目のルート | 横配置が収まり、同じ盤面状態を維持。Undoで手数0へ戻り、無効なUpを1回押しても手数0のまま |

入力直後の一部画像は移動アニメーション中。手数と荷物の表示、移動終了後の追加画像を併用した。生のウィンドウ画像は周辺のデスクトップ表示も含むため、ローカルのartifacts/quality-20261011-0700だけに保存する。ログ、画像、XMLを公開物へコピーしていない。公開用証跡には相対パスとSHA-256だけを記録する。

## 自動検査と証跡の保存

Unity Validate、EditMode 10/10、PlayMode 1/1が成功した。WebのTypeScript・ESLint・Vite・静的5ページ、リポジトリの旧4作品とUnity GUID 19件、Web成果物36ファイルのチェックサムとローカルUnityバイト列の除外も成功。親4プロジェクトのHEADと復元zip/bundleの8ハッシュが引き継ぎ台帳と一致した。

前回は再検査準備で元XMLを削除してしまったため、scripts/Invoke-Unity.ps1を変更した。既定では実行ごとの一意なRunIdを発行し、artifacts/unity/IceCourier/<RunId>/へ保存する。同じRunIdでもEditModeとPlayModeは別ファイルだが、同じoperationの証跡があれば起動前に拒否する。標準の待機は300秒、TimeoutSecondsで1～1200秒を指定できる。タイムアウト分岐の強制終了は今回の実検査では発生していない。

変更後のスクリプトでもEditMode 10/10とPlayMode 1/1が成功。EditModeの重複実行を拒否し、保存済みXMLのハッシュが変わらないことを確認した。初回XMLも別名で保持した。

証跡は[business/unity/evidence/quality-20261011-0700.json](../business/unity/evidence/quality-20261011-0700.json)。記事は[business/blog/drafts/2026-10-11-unity-portrait-editor-check.md](../business/blog/drafts/2026-10-11-unity-portrait-editor-check.md)へ下書き保存のみ。

## 未確認事項と次の一工程

新responsive-v1のGitHub Actions Windows/Web成果物、ブラウザの最終CSS寸法、フォーカス・終了・失敗・再試行、ブラウザ再読み込み後の保存、実タッチ、Safari、人間の初回理解は未確認。古いWebGL成果物を新UIの合格証拠に流用していない。利益・訪問・開始率・完了率・再訪はnull、14/28日観測は未開始。

同じタスクの次の一工程は、同一Unityソースの新responsive-v1成果物をActionsで取得し、commitとチェックサムを照合してローカルWeb枠へ接続すること。成果物が取得できない間は、このEditor検査を再計画で置き換えず、独立したルール・操作・資料工程を進める。実タッチと人間評価が残るため、タスク全体をcompleteしない。外部push・PR・merge・配信は今回実施していない。天啓.mdの全体刷新は未完了として保持し、Atohitoriは対象外。
