# 親フォルダ全体の引き継ぎ

対象はC:\Work\Kihamda Game。制作の正本はKihamda_Gameのみ。2026-10-09の本人の追加指示により、次の4プロジェクトも引き継ぎ対象へ追加した。

| 元フォルダ | 採否 | 次の扱い |
| --- | --- | --- |
| extreme_tik_tok_toe | 統合資料として保持 | 最新のn目並べ設定・盤面・保存の設計をvariable-table候補に利用。他の重複ゲームと旧自動制作指示は再稼働しない |
| iloveyou | 制作対象から廃止、履歴保全 | 単発の逃げるボタン作品を主力にしない。既存公開サイトをこの判断だけで消さない |
| Inf-minesweeper | survey-at-nightの参考概念へ統合 | リポジトリに追跡されるのは配信HTMLとホスティング設定。保守可能な元ソースがないため、そのままUnityへ変換しない |
| pachinko-calculator | 演出と計算の設計資料として保持 | 実金銭を扱わない計算演出。Unity候補number-theatreを保留し、Ice Courierと並列制作しない |

採否はルールと重複・保守費用からの判断。人気、利用者数、売上の実測による判断ではない。Unity版への実装済みを意味しない。

全プロジェクトのgit status --porcelain=v1 --untracked-files=allは空だった。追跡ソースは現在のHEADのzip、全Git参照はbundleとして、親フォルダの_recovery/projects-20261009へ保存した。bundle verifyは4件すべて成功。元フォルダ、無視されたnode_modules・dist・ローカル設定も現在は残している。これら無視ファイルを保存済みとみなして削除しない。

各元commitとSHA-256はbusiness/workspace-projects.jsonにある。bundleから復元先を別フォルダへcloneして、元commitをcheckoutする。zipは現在の追跡ファイルのみ、bundleは履歴復元用。_recoveryはホスティング設定を含むため、GitHubに公開しない。

親フォルダのAGENTS.mdから正本へ誘導する。定期実行は親フォルダを対象プロジェクトとして使い、正本とこの引き継ぎ定義を読む。旧リポジトリのSNS・量産・配信入口を新しい運用として再利用しない。

2026-10-10の再確認でAtohitori/ReferenceのMarkdown資料7件も引き継いだ。GitとUnity実装はなく、シナリオ・制作設計のみ。原稿と設計は本人の制作資料として保全する。原稿本文は公開リポジトリにコピーせず、_recovery/Atohitori-reference-20261010.zipへ保存し、7件すべての原本と復元バイト列が一致した。SHA-256はbusiness/workspace-projects.jsonに記録。自律開発の対象にしない。

本人の2026-10-10追加指示により、Atohitoriの制作は本人が別途担当する。自律的な実装・原稿編集・Unity移植・優先タスク化は行わない。既存の保全記録は残し、完成後に配布を明示依頼された場合のみ成果物を扱う。
