# Kihamda.NET Unityモノレポ

新作・移植はUnityで制作します。まずリポジトリ移行を完了し、その後で既存ゲームを厳選します。本人の意思表明はルートの `天啓.md`、現在の工程は `STATE.md`、事業の履歴は `business/ops/ledger.json` にあります。

| 領域 | 用途 |
| --- | --- |
| `unity/KihamdaArcade/` | Unity 6000.3.23f1の移行確認用プロジェクト。ゲーム未制作 |
| `web/` | 従来のReact/Vite版とポータル。既存URLを保持 |
| `business/` | 継続運用の台帳・検査・既存の証拠 |
| `scripts/` | モノレポの検査とUnity実行 |
| `docs/legacy-recovery/` | 移行前の参照・設定・復元手順 |
| `legacy/` | 旧方針と旧エージェント定義。実行対象外 |

## 既存サイトの開発と検査

```powershell
npm ci --prefix web
npm run check
npm run build
npm run dev
python -m unittest discover -s business/tests -v
```

`web/dist/` が従来サイトの配信成果物です。ルートのnpmコマンドはwebへ委譲します。Unityの成果物をweb/distへ混ぜません。

WindowsではPython 3.12以上の仮想環境を用意し、先に `python -m pip install -r business/requirements.txt` を実行します。tzdataはWindowsでの時刻検証に必要です。

## Unity基盤

Unity HubでUnity 6000.3.23f1とWindows/Web Build Supportを用意し、有効なEditorライセンスでサインインします。

```powershell
pwsh -File scripts/Invoke-Unity.ps1 -Operation Validate
pwsh -File scripts/Invoke-Unity.ps1 -Operation EditMode
pwsh -File scripts/Invoke-Unity.ps1 -Operation PlayMode
pwsh -File scripts/Invoke-Unity.ps1 -Operation Windows
pwsh -File scripts/Invoke-Unity.ps1 -Operation Web
```

これは空の移行確認用シーンを使う基盤検査です。Unity移植やゲーム完成を意味しません。将来の作品は `unity/<Project>/` に独立したプロジェクトとして追加し、同じ検査規約を適用します。

このリポジトリはGitHubでpublicです。未公開有料作品と有償アセットはprivateの管理領域が必要です。ライセンス・生成物・個人情報・認証情報をコミットしないでください。

CI/CDと復元の制約は `docs/migration.md`、`docs/legacy-recovery/README.md` を参照してください。
