# 移行検査

2026-10-09、Windowsローカル。対象はunity/curated-migration。

| 検査 | 結果 |
| --- | --- |
| 最新リモートmain/dev/opsの取得と統合 | 成功。公開版の2048修正と運用版の最新履歴を保持 |
| 全参照bundle verify | 成功。9参照、全履歴 |
| bundleから別フォルダへclone、元mainをcheckout、git fsck --full | 成功。artifacts/recovery-testで隔離検査 |
| web/への移動後のTypeScript・ESLint・Vite build | 成功。101ゲームページ生成 |
| 旧カタログ、URL、.meta/GUIDの構成検査 | 成功。カタログ101件を維持。元から3件のゲームソース欠落あり |
| 配信成果物のHTML、参照asset、SHA-256 | 成功。101旧URL、402ファイル |
| Windows台帳unit test | 21件成功。2プロセスCAS競合、lease/fence、失敗復旧、履歴改ざん、外部結果未確定を含む |
| 元台帳のevent chainとprojection検証 | 成功。revision 99で検証後、CLIで移行決定を追加してrevision 100 |
| Unity Editor起動 | 実行したがライセンス不在で198終了 |
| Unity実コンパイル・test・Windows/Web build | 未実証。ライセンスを有効化して再実行する |
| GitHub Actions | PR作成後に確認する |
| 実サイトのステージング・HTTPヘッダー・ロールバック | 未実施 |
| ゲーム制作・移植・実プレイ | 未実施。今回の作業範囲から外した |

最初のWindowsテストではtzdata不在が判明した。固定依存をローカル仮想環境へ導入し、全21検査が成功した。OS全体のPython環境は変更していない。

Unityのpackage lockと自動生成ProjectSettingsはEditorの初回成功後にレビューして保存する。現時点で再現可能なUnityビルドが完成したとは報告しない。

カタログにはsimonecho、minesweeper、slidepuzzleがあるが、元mainにも同名App.tsxが存在しない。101件のHTML生成は101ゲームが遊べる証明ではない。今回の構成検査は元のソース有無と一致することを確認し、新たな欠落を拒否する。ゲームの修正・厳選は移行後の工程に残す。
