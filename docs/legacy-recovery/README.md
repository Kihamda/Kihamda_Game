# 移行前の復元

ローカル取得前と取得後のGit履歴を別々に保存した。main、dev、ops、修正branchはrefs-current-before-layout.txtを参照。

| 保存物 | 内容 |
| --- | --- |
| `C:/Work/Kihamda Game/kihamda-before-unity-20261009.bundle` | 初回のローカル6参照・全履歴 |
| `C:/Work/Kihamda Game/kihamda-all-refs-20261009.bundle` | 最新リモート取得後の9参照・全履歴 |
| workflows-before/ | 古いローカルworkflow |
| workflows-current/ | リモート統合前の最新main workflow |
| ledger-before.json | 最新opsのrevision 99のイベントとprojection |
| automation-before.json | クラウド定期実行IDと旧スケジュールの記録 |
| games-before.json / games-current-before.json | 古いローカル / 最新mainのゲームカタログ |
| AGENTS-before.md / copilot-before.md | 旧運用指示 |

取得後bundleのSHA-256は `75e5b992830a1f68786269425e4f801e5e6c25d766df131f229524909ac381a2`。bundleはGitに追加していない。別ディスクへのコピーは未実施。Git保存されていないFTP/DNS/解析設定まで復元する資料ではない。

## ソースの復元

移行先を上書きせず、空の別フォルダへ復元する。

```powershell
git bundle verify 'C:/Work/Kihamda Game/kihamda-all-refs-20261009.bundle'
git clone 'C:/Work/Kihamda Game/kihamda-all-refs-20261009.bundle' 'C:/Work/Kihamda Game/recovery-check'
git -C 'C:/Work/Kihamda Game/recovery-check' switch --detach 4523cc58ea2824ea99d29d724b51685a3946189e
git -C 'C:/Work/Kihamda Game/recovery-check' fsck --full
```

元公開版は上記main commit、最新運用状態は85cf1ebのbusiness/。移行前ファイルの場所はroot、移行後はweb/。履歴のartifacts pathとチェックサムは当時のcommitに照合し、過去イベントのpathを手書きで書き換えない。新しいWeb証拠はweb/を使用する。

## 配信版の復元

1. 直前に検証済みのplatform-dist-<commit> artifactをGitHubから取得する。
2. SHA256SUMSを検証し、build-version.jsonと対象commitを照合する。
3. 元のproduction環境と元のFTP_SERVER_DIRに限定して、既存のFTPS方式で戻す。Unity領域は除外する。
4. ルートと代表ゲームのHTTP応答・画面、build-version.jsonを確認する。

GitHub artifactは90日で期限切れになる。長期保存は別途必要。移行前の旧CDは保存1日だったため、前版artifactが残っていない可能性がある。既存ホストへの復元操作と画面検査は未実施。障害時に盲目的な再デプロイをしない。

## 環境と認証

| 名称 | 用途 / 復元方法 |
| --- | --- |
| FTP_SERVER / FTP_USERNAME / FTP_PASSWORD | GitHub Actions secretsで再設定。平文は未取得 |
| FTP_SERVER_DIR | 既存配信先を管理画面で照合しGitHub variableへ再設定 |
| UNITY_EDITOR_PATH | ローカルのUnity.exe。通常は固定版を自動検出 |
| UNITY_LOCAL_CI_ENABLED | ライセンス・専用runner・環境保護の検証後のみtrue |
| Unity Editorライセンス | Unity Hubで本人アカウントの利用資格を確認して有効化。ファイルをGitに保存しない |
| DNS / XServer設定 | 管理画面の権限と現設定が未確認。変更していない |
| GA4 / Search Console / 売上 | 権限・実測値は未観測。タグを実績にしない |

ローカルはWindows、Unity Hubあり、Unity 6000.0.25f1/6000.3.23f1/6000.6.0f1あり。選定版は6000.3.23f1、Windows/Webモジュールあり。台帳はPython 3.12以上とbusiness/requirements.txt、Webはweb/package-lock.jsonが正本。

クラウドのゲーム定期タスクIDはautomation-before.json。ブログ/BOOTHタスクの実際のスケジューラ設定は今回未取得。ローカルCodexのAI記事タスクは別事業でPAUSEDのため変更していない。保存済みJSONのregistered表示だけで現在の稼働を断定しない。
