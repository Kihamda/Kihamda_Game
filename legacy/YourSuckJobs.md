# YourSuckJobs.md

> AI に任せられないやつだけここに書いてある。
> ここにないことは全部 Copilot に言えばやってくれる。

---

## 🔴 一度だけやること (初期セットアップ)

### 1. XServer Static FTP セットアップ

1. [XServer Static](https://secure.xserver.ne.jp/xinfo/?action_register_index=true&service=xstatic) でアカウント作成（無料プランあり）
2. XServer アカウント → サーバー設定 → **FTP の利用** → ON にしてパスワードを設定
   - FTPホスト名（`sv***.static.ne.jp`）とユーザー名をメモする
3. GitHub リポジトリ → Settings → Secrets and variables → Actions → "New repository secret"
   以下を3つ登録する:
   ```
   FTP_SERVER    ← FTPホスト名 (sv***.static.ne.jp)
   FTP_USERNAME  ← FTPユーザー名
   FTP_PASSWORD  ← FTPパスワード
   ```
4. （任意）アップロード先をサブディレクトリに変えたい場合は Variables に追加:
   ```
   FTP_SERVER_DIR  ← アップロード先 (未設定時: public_html/)
   ```

> main に push するだけで自動ビルド→FTPS転送→公開まで完了する。
> デプロイは差分同期なので２回目以降は高速。

---

### 2. Google AdSense 審査申請

1. [adsense.google.com](https://adsense.google.com) でアカウント作成
2. サイト URL を登録（XServer Static で設定したドメイン or `sv***.static.ne.jp`）
3. `<script>` タグを HTML に貼り付け → Copilot に「AdSenseタグを設置して」と頑な
4. 審査は **2～4週間**かかる。今すぐ申請しないと収益化が遅れる
5. 審査通過後、パブリッシャーID (`ca-pub-xxxxxxxx`) を portal の環境変数として Copilot に設定依頼する

---

### 3. Google Search Console 登録

1. [search.google.com/search-console](https://search.google.com/search-console) にアクセス
2. "プロパティを追加" → XServer Static の公開 URL を入力
3. 所有権確認: HTML ファイル方式 → Copilot に「Search Console の確認ファイルを portal/public/ に置いて」と頂む
4. `sitemap.xml` を送信 (Copilot が生成済みなら URL を入力するだけ)

---

### 4. Twitter / X API キー取得

SNS 自動投稿を使うなら必要。使わないなら不要。

1. [developer.twitter.com](https://developer.twitter.com) でアプリ作成
2. 以下の4つを取得してコピー:
   ```
   API Key                  → TWITTER_API_KEY
   API Secret               → TWITTER_API_SECRET
   Access Token             → TWITTER_ACCESS_TOKEN
   Access Token Secret      → TWITTER_ACCESS_TOKEN_SECRET
   ```
3. GitHub リポジトリ → Settings → Secrets and variables → Actions → "New repository secret"
   で上記4つを登録する

---

## 🟡 ゲームを追加するたびにやること

| 作業                 | 所要時間 | 方法                                                               |
| -------------------- | -------- | ------------------------------------------------------------------ |
| SNS 投稿をトリガー   | 1分      | GitHub Actions → "Release Pipeline" → Run workflow → 入力して実行  |
| サムネイル画像を置く | 5分      | `portal/public/thumbnails/[id].png` を 640x360 で用意して git push |

それ以外 (コード・SEO・PWA・portal 更新) は全部 Copilot がやる。
**ゲーム追加は `git push` するだけで XServer Static に自動デプロイされる。**

---

## 🟢 Copilot に言えばやってくれること (参考)

| やりたいこと   | 言い方の例                                                       |
| -------------- | ---------------------------------------------------------------- |
| 新ゲームを作る | 「逆三目並べゲームを作って。ルールは〇〇」                       |
| ポータルを作る | 「ポータルサイトを構築して」（`#portal-setup` を使う）           |
| PWA 化         | 「このゲームを PWA にして」（`#pwa` を使う）                     |
| SEO 対応       | 「SEO メタタグを追加して」（`#seo` を使う）                      |
| バグ修正       | 「このエラーを直して」                                           |
| ゲーム企画     | 「斬新なブラウザゲームを5本提案して」（`#game-ideation` を使う） |
| 収益戦略相談   | 「@growth 今どの Phase で何をすべき？」                          |

---

## メモ欄 (自分で埋める)

```
XServer Static URL       : https://________________________________
XServer FTPホスト名       : sv___.static.ne.jp
XServer FTPユーザー名     : ___________________________
AdSense Publisher ID     : ca-pub-_________________
GA4 Measurement ID       : G-_________________
Search Console 登録日  : 20__-__-__
AdSense 申請日        : 20__-__-__
AdSense 审査通過日    : 20__-__-__
```
