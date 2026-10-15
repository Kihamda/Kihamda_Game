# ブラウザ配布での最高記録と画面の受入条件

調査日2026-10-15、13時枠。需要や利用者数の測定ではなく、無料Webゲームの配布方式と保存制約を一次資料で確認した。

itch.ioの公式HTML5配布案内はHTML/JavaScript/CSS作品をiframe内で実行する構成を示す。外部配布面でもブラウザ依存の保存制約を受けるため、Unityへの再移植や新作追加より、既存Web作品の保存の説明と復旧を優先する。
https://itch.io/docs/creators/html5

MDNのlocalStorage仕様案内ではオリジンごとの保存とSecurityErrorを説明する。Web Storage利用案内もAPIの存在だけで利用可能とは判断できないとしている。これらから、保存0点と読込不能を区別し、元履歴を保持して再試行する受入条件が必要と判断した。市場での需要や売上効果を示す根拠には使わない。
https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API

既存T-web-gravity-score-read-noticeの条件を維持し、実hookの読込拒否/不正値、未知の高得点の上書き防止、390/1280の復旧を今回検証した。新しい並列タスクに置き換えていない。

実画面では保存案内が表示されると390pxの盤面が約159×191pxになる。次の独立タスクT-web-gravity-mobile-notice-layoutは同じ作品に限定する。受入条件は390×844の通常時/読込失敗時/書込失敗時でcanvas幅300px以上、説明・警告・44px以上の再試行操作にスクロールで到達可能、横はみ出しなし、1280×720では500×600盤面を維持、Enter/矢印入力と復旧後フォーカスを維持すること。物理タッチと人間評価は別に未確認として残す。

月間純利益・訪問・開始率・完了率・再訪はnull。14/28日の公開観測は未開始のため事業判断unobserved。技術的な保存と配置の改善を需要の証明にしない。
