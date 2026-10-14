# ブラウザゲームの保存範囲と失敗時の案内

2026-10-14の13時枠。新作の追加やUnity制作の再開はせず、既存n目並べの保存品質工程へ調査結果を適用する。

## 一次資料

- [Portable Puzzle CollectionのWeb版の案内](https://puzzles.twistymaze.com/help/features)。自動保存と再訪時の再開を説明し、新しいゲーム・種類・難易度を選んだ場合のリセット条件を区別している。ゲーム状態の保存先を端末のブラウザと説明している。
- [PuzzleMeの提供者による保存設定の案内](https://amuselabs.com/docs/managing-puzzles/series-settings/security-privacy/)。保存が無効な場合、再読み込みで進行が戻らないことを説明している。サービスの導入や有料契約は行っていない。
- [WHATWGのStorage仕様](https://html.spec.whatwg.org/multipage/webstorage.html#the-storage-interface)。setItemが容量・保存ポリシーにより失敗する場合と、キーごとの削除を確認した。
- [MozillaのlocalStorage資料](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)。originとブラウザ設定による利用可否の条件を確認した。

これは提供者の機能・説明の比較であり、利用者数、保存機能の需要、売上改善を示す実測ではない。主指標と14/28日の観測はunobserved、数値はnull。

## 今回の適用

既存T-web-ntik-storage-resilienceの受入条件に従い、形式検査、旧形式の維持、失敗時の画面案内を実装した。成功したAPI呼び出しと、通常入力後の再読み込みによる保存確認を分ける。ブラウザ確認への応答模擬とプログラムによるクリックイベントは、ポインタ・キーボード入力とは分けて記録する。

次の独立工程T-web-ntik-save-scope-guidanceは、保存先と削除範囲の説明を既存作品の開始画面へ加える。受入条件は、同じorigin・ブラウザの保存であること、新ゲームが進行を置き換えること、進行削除が端末設定と連勝履歴を削除しないことを、実装どおりに示すこと。設定・進行・連勝のキーを照合し、390/1280pxで設定操作を妨げず、正常保存と再読み込みを回帰検査する。未検証の標準確認dialog、物理タッチ、Safari、人間評価は成功扱いにしない。
