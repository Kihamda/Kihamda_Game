import { useState } from "react";
import catalog from "./data/unity-games.json";
import "./App.css";
import UnityPlayer from "./UnityPlayer";

function IceBoard() {
  return <div className="ice-art" role="img" aria-label="氷の盤面に配達員、荷物、到着点を配置したルールのイメージ図">
    <span className="art-label">ICE COURIER / RULE PREVIEW</span>
    <div className="ice-board" aria-hidden="true">{Array.from({ length: 25 }, (_, index) =>
      <span key={index} className={`ice-cell ${[3, 7, 16, 21].includes(index) ? "wall" : ""} ${[10, 11].includes(index) ? "frost" : ""}`}>
        {index === 12 ? <i className="courier" /> : index === 14 ? <i className="parcel" /> : index === 24 ? <i className="destination" /> : null}
      </span>)}</div>
    <div className="art-caption"><span>滑る。運ぶ。道が変わる。</span><span>イメージ図</span></div>
  </div>;
}

function Header({ pathname }: { pathname: string }) {
  return <header className="site-header"><div className="header-inner">
    <a href="/" className="brand" aria-label="Kihamda.NET ホーム"><span className="brand-mark" aria-hidden="true">K</span>Kihamda<span className="brand-dot">.NET</span></a>
    <nav aria-label="メイン"><a href="/#works" aria-current={pathname === "/" ? "page" : undefined}>作品を探す</a><a href="/about/" aria-current={pathname.startsWith("/about") ? "page" : undefined}>このスタジオについて</a></nav>
  </div></header>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-inner"><a href="/" className="brand">Kihamda.NET</a><p>ひとつのルールから、ひとつの遊びへ。</p><nav aria-label="フッター"><a href="/about/">運営者情報</a><a href="/contact/">お問い合わせ</a><a href="/privacy-policy/">プライバシー</a></nav><small>© 2026 Kihamda.NET</small></div></footer>;
}

function Home() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const games = catalog.games.filter(game => `${game.title} ${game.description} ${game.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()) && (filter === "all" || game.release !== null));
  return <>
    <section className="home-hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow">KIHAMDA.NET / INDEPENDENT GAMES</p><h1 id="hero-title">ひとつのルールで、<br />遊びが変わる。</h1><p className="hero-description">考えて、試して、もう一度。<br />小さな発見を楽しむUnityゲームを作っています。</p><a href="#works" className="button primary">作品を見てみる <span aria-hidden="true">↘</span></a><p className="hero-note">ただいま、Ice Courierを制作中。</p></div><IceBoard /></section>
    <section className="works-section" id="works" tabIndex={-1} aria-labelledby="works-title"><div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2 id="works-title">作品を探す</h2></div><p>ルールを知ってから、遊びを選ぶ。</p></div>
      <div className="catalog-tools"><div className="filter-group" role="group" aria-label="公開状態で絞り込み"><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>すべて</button><button type="button" aria-pressed={filter === "released"} onClick={() => setFilter("released")}>公開中</button></div><label className="search-label"><span>作品名・キーワード</span><input type="search" placeholder="作品を検索" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      <p className="result-count" role="status" aria-live="polite">{games.length}作品{filter === "released" ? "が公開中" : "を表示"}</p>
      {games.length ? <div className="work-list">{games.map(game => <article className="work-card" key={game.id}><a href={game.path} className="work-art" aria-label={`${game.title}の詳細`}><IceBoard /></a><div className="work-copy"><span className="status-badge">{game.release ? "公開中" : "制作中"}</span><p className="work-genre">{game.tags.join(" / ")}</p><h3><a href={game.path}>{game.title}</a></h3><p>{game.description}</p><ul className="work-facts"><li>1人用</li><li>3ステージ</li><li>Undo・保存・再開</li></ul><a className="text-link" href={game.path}>ルールと遊び方を見る <span aria-hidden="true">→</span></a></div></article>)}</div> : <div className="empty-state"><h3>{filter === "released" && !query ? "公開中の作品はまだありません" : "条件に合う作品がありません"}</h3><p>{filter === "released" && !query ? "制作中の作品では、ルールや遊び方をご覧いただけます。" : "別のキーワードで探すか、絞り込みを解除してください。"}</p><button className="button secondary" type="button" onClick={() => { setQuery(""); setFilter("all"); }}>すべての作品を表示</button></div>}
    </section><section className="studio-strip"><p className="eyebrow">MADE WITH CURIOSITY</p><h2>たくさんより、ひとつを深く。</h2><p>ルールを磨き、実際に遊んで確かめる。<br />作品ごとの小さな違いを、大切にしています。</p><a className="text-link" href="/about/">このスタジオについて →</a></section>
  </>;
}

function GameDetail() {
  const game = catalog.games[0];
  return <><div className="breadcrumbs"><a href="/#works">作品一覧</a><span aria-hidden="true"> / </span><span>{game.title}</span></div><section className="detail-hero"><div><p className="eyebrow">FROST DELIVERY PUZZLE</p><h1>{game.title}</h1><p className="detail-lead">滑ったあとが、<br />次の障害物になる。</p><p>{game.description}</p><span className="status-badge">制作中</span><p className="release-note">ブラウザ版の公開を準備しています。公開後、この画面から遊べます。</p><dl className="detail-facts"><div><dt>人数</dt><dd>1人</dd></div><div><dt>内容</dt><dd>3ステージ</dd></div><div><dt>操作</dt><dd>方向キー・画面ボタン</dd></div></dl></div><IceBoard /></section><UnityPlayer /><section className="rules-section" aria-labelledby="rules-title"><p className="eyebrow">HOW TO PLAY</p><h2 id="rules-title">届けるまでの、3つのルール。</h2><ol className="rules-grid"><li><span>01</span><h3>壁まで滑る</h3><p>方向を選ぶと、壁や障害物にぶつかるまで進みます。</p></li><li><span>02</span><h3>出発点が凍る</h3><p>動くたびに、出発したマスが障害物になります。次の道も考えて進みましょう。</p></li><li><span>03</span><h3>荷物を届ける</h3><p>荷物を拾って到着点へ。行き詰まったらUndoで一手戻せます。</p></li></ol></section><section className="detail-support"><h2>気軽に試せるように。</h2><p>Undoは荷物と凍ったマスも一緒に戻します。保存した進行は、再開して続きを遊べます。</p><p>スマートフォン向けの表示と操作は調整中です。</p><a href="/contact/" className="text-link">作品について問い合わせる →</a></section></>;
}

function Info({ pathname }: { pathname: string }) {
  const contact = pathname.startsWith("/contact");
  const privacy = pathname.startsWith("/privacy-policy");
  return <section className="info-page"><p className="eyebrow">KIHAMDA.NET</p><h1>{contact ? "お問い合わせ" : privacy ? "プライバシーポリシー" : "このスタジオについて"}</h1>
    {contact ? <><p className="info-lead">作品へのご意見や、不具合のご報告を受け付けています。</p><div className="info-panel"><h2>連絡先</h2><a className="text-link" href="mailto:contact@kihamda.net">contact@kihamda.net</a><p>件名に作品名を、本文にお使いの端末と起きたことをお書きください。著作権に関するご連絡も、こちらで受け付けます。</p></div><h2>対応について</h2><p>内容を確認後、通常3営業日以内に返信します。迷惑行為や法令違反に関わる内容には対応しない場合があります。</p></> : privacy ? <><p>Kihamda.NET（以下「当サイト」）は、利用者のプライバシーを尊重し、個人情報の保護に努めます。</p><h2>1 取得する情報</h2><p>当サイトでは、アクセス解析や広告配信のため、Cookieおよび端末識別情報を取得する場合があります。</p><h2>2 利用目的</h2><p>取得した情報は、サービス改善、不正利用防止、広告の最適化のために利用します。</p><h2>3 広告配信について</h2><p>当サイトは第三者配信の広告サービスを利用する場合があります。その際に広告配信事業者がCookieを利用することがあります。</p><h2>4 免責事項</h2><p>当サイトの情報は可能な限り正確な内容を提供するよう努めますが、正確性や安全性を保証するものではありません。</p><h2>5 お問い合わせ</h2><p>本ポリシーに関するお問い合わせは、<a href="/contact/">お問い合わせページ</a>からお願いします。</p><p className="page-note">方針の最終更新日 2026-03-17</p></> : <><p className="info-lead">ひとつのルールから、<br />何度も試したくなる遊びを。</p><p>Kihamda.NETは、Unityでゲームを制作する個人スタジオです。作品の数より、独自のルールと完成度を大切にしています。</p><h2>一作ずつ、確かめながら。</h2><p>いま制作しているのは、配送パズルのIce Courier。動かすたびに盤面が変わるルールを、少数のステージで楽しめるように磨いています。</p><dl className="info-panel"><dt>運営</dt><dd>Kihamda.NET</dd><dt>サイト</dt><dd><a href="https://game.kihamda.net/">game.kihamda.net</a></dd><dt>活動</dt><dd>ゲームの企画・開発・公開</dd></dl><a className="text-link" href="/#works">制作中の作品を見る →</a></>}
  </section>;
}

export default function PortalApp({ pathname = "/" }: { pathname?: string }) {
  return <div className="portal"><a href="#main" className="skip-link">本文へ移動</a><Header pathname={pathname} /><main id="main" className="portal-main" tabIndex={-1}>{pathname === "/" ? <Home /> : pathname.startsWith("/games/") ? <GameDetail /> : <Info pathname={pathname} />}</main><Footer /></div>;
}
