# Ice Courierの縦画面UI

2026-10-11の01時枠で、既存T-ice-courier-touch-polishを継続した。Unityは画面の実ピクセル座標で説明・盤面・操作を配置する。720px未満の幅では縦配置にし、Web枠は高さ820pxを確保する。本文と操作ラベルは16px、方向・Undo・Restart・Resume・Nextの高さは48px、隣接間隔は8px。盤面のC、G、+、@で荷物・到着点・霜・プレイヤーを区別する。

単指スワイプは盤面内で始まり、盤面内で終わる場合だけ受け付ける。途中で盤面を出る、取消、複数指、フォーカス喪失は取り消す。マウスとタッチの重複移動を抑え、Resume時には旧アニメーションの待機を解除する。Webのキーボード取得はcanvasのフォーカスに限定する。

新しいビルドのbuild-version.jsonにuiLayout=responsive-v1を記録する。ローカルプレイヤーはこの印を持つ検証済み版だけ、CSS寸法に同期するcanvasとDPR 1を使用する。これは[Unityのcanvas寸法設定](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-canvas-size.html)に基づく。旧run 37945379221はfixed-v0として元の縮小表示を保つ。新UIの成功として流用しない。

新成果物を検査してbusiness/unity/evidence/run-<run ID>-final.jsonとartifacts/github/<run ID>/WebGLへ保存した後、KIHAMDA_LOCAL_PLAYER=1とKIHAMDA_LOCAL_PLAYER_RUN=<run ID>を指定する。commitと全チェックサムを照合し、未知のlayout印は拒否する。配布成果物にローカルプレイヤーのバイト列を追加しない。

## 検査と未確認事項

初回のUnity実Validate、EditMode 10件、PlayMode 1件は成功した。EditModeでは3ルートを335×820、350×820、390×844、719×820、720×660、960×660、1152×720で検査し、操作寸法・間隔・盤面との重なり・枠内収容とスワイプ取消を確認した。これは座標の検査であり、最終CSS寸法の実測や実画面の読みやすさを確認した結果ではない。

ルール単体の3ルート、Undo、保存・再開、壊れた保存の拒否も成功。WebのTypeScript・ESLint・Vite、静的5ページ、旧4URL、Unity GUID 19件、36ファイルの配布チェックサムとローカル成果物の除外を確認した。親4件の元commitと復元8ハッシュは一致した。

実画面取得はComputer Useのアプリ承認待ちが時間切れになった。旧版HTTP検査もサンドボックスのsocket拒否後、通常環境からの要求が応答待ちで失敗した。後続のUnityテスト起動はライセンス初期化で失敗し、追加検査は未実行。後から加えた未検証のUnity変更を除き、初回検査が通った実装へ戻した。初回PlayMode XMLは再実行の準備で削除されたため、初回成功の証拠は実行結果記録であり、現存XMLによる再照合ではない。秘密を含み得るEditorログはローカルartifacts内に留める。

承認・要求待ちで30分を超過した。25分checkpoint・30分以内の完了を達成したとは扱わない。証跡のハッシュ、元HEAD、外部操作なしを照合して期限切れleaseをrecoverし、同じタスクをreadyへ戻した。共通flow.pyには検査済み部分成果をyieldで引き継ぐ処理を追加し、台帳の27テストで履歴保持・古いfenceの拒否・変更済み成果物の拒否を確認した。今回の枠では既に期限が切れていたためyieldではなくrecoverを使用した。

次は同じタスクで新UIの実画面・入力・保存とページへの戻りを確認する。その後、同一sourceCommitのGitHub Actions Windows/Web版と、物理端末・Safari・人間の初回反応をそれぞれ検査する。新配布ビルド、実タッチ、人間評価は未実行。利益・訪問・開始率・完了率・再訪はnull、事業はunobserved。Web刷新全体は未完了なので天啓.mdを保持する。Atohitoriにはアクセスしていない。

証跡はbusiness/unity/evidence/portrait-20261011-0100.json。公開push、PR、merge、本番配信は行っていない。
