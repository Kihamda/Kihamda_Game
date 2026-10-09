# Unityスタジオの検証記録

2026-10-10。通常制作はWindowsローカル、配布ビルドはGitHub Actions。PR #10による移行とPR #12によるスタジオ整備をmainへ統合済み。

| 検査 | 現在の結果 |
| --- | --- |
| 101作品の採否と元カタログ | 全件記録、4作品を参考実装として保持 |
| 削除前の全参照bundle | verify成功、完全履歴 |
| 親フォルダ4プロジェクト | 全参照bundleと追跡ソースzip保存、bundle verify成功。別フォルダへのclone・元commit checkout・fsckも4件成功 |
| 親フォルダAtohitori | 非Gitの原稿・設計7件をローカルzipへ保存。原本と保存した7件のバイト列一致。本文を公開ソースへコピーせずUnity候補として保持 |
| Windows台帳検査 | 24件成功。CAS競合、lease/fence、復旧、履歴改ざん、ASCII環境のCLI、Unity事業台帳の成果物ルートを含む |
| ゲームルール単体 | 3盤面の解法、荷物、フロスト、境界、Undo、保存・再開、壊れた保存、勝利が成功 |
| 実Unity Validate | 6000.3.23f1で成功 |
| 実Unity EditMode/PlayMode | 成功。シーン起動・移動・保存・再開を検査 |
| Windows制作中ビルド | 成功、EXE・版情報・SHA-256を検査 |
| Windows実画面・キー | 実方向キーで回収・フロスト・2手の勝利を確認。盤面、説明、次ルートボタンを表示 |
| Web制作中ビルド | 未成功。Shader compiler通信切断の後、内部CLRエラー。ゲームソースのC#エラーではなく、GitHub Linux環境ではWindows/Webとも成功 |
| actionlint | 成功 |
| Unity Actions Secrets | 3項目の存在確認。本人の明示承認でLICENSEを登録、EMAIL/PASSWORDは本人が登録 |
| GitHub Unity配布ビルド | 最初のrun 37944786802でEditMode 2/2、PlayMode 1/1が成功。チェック登録権限不足を修正し、run 37945379221でWindows/Webとも成功。各成果物をダウンロードしSHA-256と版を再検査 |
| GitHub成果物のWeb実操作 | デスクトップ表示、方向キーで2手の勝利、ZでUndo、ページ再読み込み後にResume、方向ボタンで再勝利を確認。ブラウザーerrorログなし。縦画面は固定canvasが欠けるため次タスクへ残す |
| 新ローカル定期実行 | ID unity、ACTIVE、01/07/13/19時、localプロジェクト設定を保存先TOMLでも確認 |
| 旧クラウド定期実行 | 停止を本人が承認。旧IDの更新は登録不存在で失敗。ブラウザーの全状態検索でも「ゲーム事業」の登録が見つからない。停止成功とは断定しない |
| 売上・純利益・開始/再訪 | 未観測、null |

ライセンスや認証の値はコード・ログ・記事へ掲載しない。初回のEditor内部DLL解析はこのPCのICU初期化でクラッシュしたため、呼び出すプロセスだけDOTNET_SYSTEM_GLOBALIZATION_USENLS=1とした。Windowsビルドはその条件で成功した。OS全体の設定は変更していない。NLS切替は[Microsoftの公式設定](https://learn.microsoft.com/en-us/dotnet/core/extensions/globalization-icu)に基づく。ローカルEditorはDirectX 11で起動する。CIのLinuxビルドにはこのWindows用設定を適用しない。

旧Web本番配信は手動に変更し、今回の整理だけでサイト全体を自動置換しない。Unity成果物の自動公開はまだ行っていない。

検証完了の正本はbusiness/unity/evidence/run-37945379221-final.json。制作台帳revision 10で検証タスクを完了し、leaseを解放した。次はT-ice-courier-touch-polish。定期実行を登録した事実と、今後のスケジュール実行結果を区別する。PCとCodexが稼働している必要がある。
