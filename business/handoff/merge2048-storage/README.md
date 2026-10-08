# merge2048：保存拒否でも遊べる修正

対象：Kihamda/Kihamda_Game commit `dcae2496c4e872a0127ab2f61bd79cdc5dd74a9d`。
公開サイトには101ゲームがあるが、デプロイ済bundleとこのcommitの厳密な一致は未確認。

起動時のgetItem例外、得点時のsetItem例外、不正な保存値を変更前コードで再現した。新しいstorage.tsは保存を任意の機能として扱い、読込み拒否/無効値は0へ戻す。書込み拒否時はgame state内の最高点を維持する。公開/デプロイは未実施。

変更はgame.tsの読書き委譲とstorage.ts追加だけ。既存キー `merge2048-best` を維持。ゲームの増設、広告設定変更はない。このゲーム独自ソースの再配布ライセンスは未確認のため、BOOTH教材には含めない。

再現にはGit、Node（今回24.19.0）、対象repoのlockfileから導入したTypeScriptが必要。依存導入は `npm ci --ignore-scripts --no-audit --no-fund`。有料APIなし。

1. 対象commitの元コードを `SOURCE_ROOT` に取得する。
2. 別の検査用フォルダ `PATCHED_ROOT` に元の `games/merge2048/src/lib/game.ts` を同じ相対位置でコピーする。元repoをそのまま編集しない。
3. PATCHED_ROOT内で下記のgit applyを実行する。PATCH_PATHはincome内fix.patchの絶対パス。

```sh
git apply --check "$PATCH_PATH"
git apply "$PATCH_PATH"
```

4. incomeプロジェクトから検査する。置換変数は自分の検査フォルダへ設定する。

```sh
node game/merge2048-storage/check.mjs --source-root "$SOURCE_ROOT" --patched-root "$PATCHED_ROOT"
node "$SOURCE_ROOT/node_modules/typescript/bin/tsc" --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM "$PATCHED_ROOT/games/merge2048/src/lib/game.ts" "$PATCHED_ROOT/games/merge2048/src/lib/storage.ts"
```

10項目合格、patch適用確認、修正対象のstrict TypeScript検査合格。サイト全体build、スマホ実操作、本番公開、アクセス/再訪/利益への効果は未検証。保存不能でもプレイできるという改善の検査に限定する。次はgame shell上のモバイル操作を検査し、本人許可後に公開と実データ比較を行う。
