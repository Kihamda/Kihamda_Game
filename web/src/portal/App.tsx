import { catalogHref, catalogSearch, type CatalogState } from "./navigation";
import data from "./data/works.json";
import { parseCatalog, technologyLabel, statusLabel, releaseNote } from "./catalog";
const catalog = { games: parseCatalog(data) };
import "./App.css";
import UnityPlayer from "./UnityPlayer";
import WorkGuide from "./WorkGuide";

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

function Header({ pathname, state }: { pathname: string; state: CatalogState }) {
  return <header className="site-header"><div className="header-inner">
    <a href="/" className="brand" aria-label="Kihamda.NET ホーム"><span className="brand-mark" aria-hidden="true">K</span>Kihamda<span className="brand-dot">.NET</span></a>
    <nav aria-label="メイン"><a href={catalogHref(state)} aria-current={pathname === "/" ? "page" : undefined}>作品を探す</a><a href="/about/" aria-current={pathname.startsWith("/about") ? "page" : undefined}>このスタジオについて</a></nav>
  </div></header>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-inner"><a href="/" className="brand">Kihamda.NET</a><p>ひとつのルールから、ひとつの遊びへ。</p><nav aria-label="フッター"><a href="/about/">運営者情報</a><a href="/contact/">お問い合わせ</a><a href="/privacy-policy/">プライバシー</a></nav><small>© 2026 Kihamda.NET</small></div></footer>;
}

function Home({ state, onChange }: { state: CatalogState; onChange: (state: CatalogState) => void }) {
  const { query, filter } = state;
  const games = catalog.games.filter(game => `${game.title} ${game.description} ${game.tags.join(" ")} ${game.facts.join(" ")} ${technologyLabel(game)}`.toLowerCase().includes(query.trim().toLowerCase()) && (filter === "all" || game.release !== null));
  return <>
    <section className="home-hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow">KIHAMDA.NET / INDEPENDENT GAMES</p><h1 id="hero-title">ひとつのルールで、<br />遊びが変わる。</h1><p className="hero-description">考えて、試して、もう一度。<br />小さな発見を楽しむゲームを作っています。</p><a href="#works" className="button primary">作品を見てみる <span aria-hidden="true">↘</span></a><p className="hero-note">作品のルールと、現在の公開状態をご案内します。</p></div><IceBoard /></section>
    <section className="works-section" id="works" tabIndex={-1} aria-labelledby="works-title"><div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2 id="works-title">作品を探す</h2></div><p>ルールを知ってから、遊びを選ぶ。</p></div>
      <div className="catalog-tools"><div className="filter-group" role="group" aria-label="公開状態で絞り込み"><button type="button" aria-pressed={filter === "all"} onClick={() => onChange({ ...state, filter: "all" })}>すべて</button><button type="button" aria-pressed={filter === "released"} onClick={() => onChange({ ...state, filter: "released" })}>公開中</button></div><label className="search-label"><span>作品名・キーワード</span><input type="search" placeholder="作品名・人数・ルールなど" value={query} onChange={event => onChange({ ...state, query: event.target.value })} /></label></div>
      <p className="result-count" role="status" aria-live="polite">{games.length}作品{filter === "released" ? "が公開中" : "を表示"}</p>
      {games.length ? <div className="work-list">{games.map(game => <article className="work-card" key={game.id}><a href={`${game.path}${catalogSearch(state)}`} className="work-art" aria-label={`${game.title}の詳細`}>{game.id === "ice-courier" ? <IceBoard /> : <span>{game.title}</span>}</a><div className="work-copy"><span className="status-badge">{statusLabel(game)}</span><p className="work-genre">{[...game.tags, technologyLabel(game)].join(" / ")}</p><h3><a href={`${game.path}${catalogSearch(state)}`}>{game.title}</a></h3><p>{game.description}</p><ul className="work-facts">{game.facts.map(fact => <li key={fact}>{fact}</li>)}</ul><a className="text-link" href={`${game.path}${catalogSearch(state)}`}>ルールと遊び方を見る <span aria-hidden="true">→</span></a></div></article>)}</div> : <div className="empty-state"><h3>{filter === "released" && !query ? "公開中の作品はまだありません" : "条件に合う作品がありません"}</h3><p>{filter === "released" && !query ? "未公開の作品でも、ルールや現在の状態をご覧いただけます。" : "別のキーワードで探すか、絞り込みを解除してください。"}</p><button className="button secondary" type="button" onClick={() => onChange({ query: "", filter: "all" })}>すべての作品を表示</button></div>}
    </section><section className="studio-strip"><p className="eyebrow">MADE WITH CURIOSITY</p><h2>たくさんより、ひとつを深く。</h2><p>ルールを磨き、実際に遊んで確かめる。<br />作品ごとの小さな違いを、大切にしています。</p><a className="text-link" href="/about/">このスタジオについて →</a></section>
  </>;
}

function GameDetail({ pathname, state }: { pathname: string; state: CatalogState }) {
  const game = catalog.games.find(work => work.path === `${pathname.replace(/\/$/, "")}/`);
  if (!game) return <section className="info-page"><h1>作品が見つかりません</h1><a href={catalogHref(state)}>作品一覧へ戻る</a></section>;
  if (game.id !== "ice-courier") return <section className="info-page"><a href={catalogHref(state)}>作品一覧へ戻る</a><h1>{game.title}</h1><p>{game.description}</p><p>{technologyLabel(game)} / {statusLabel(game)}</p><ul className="work-facts">{game.facts.map(fact => <li key={fact}>{fact}</li>)}</ul><p>{releaseNote(game)}</p>{game.release && <a className="button primary" href={game.release.url}>作品を開始</a>}<WorkGuide work={game} /></section>;
  return <><div className="breadcrumbs"><a href={catalogHref(state)}>作品一覧</a><span aria-hidden="true"> / </span><span>{game.title}</span></div><section className="detail-hero"><div><p className="eyebrow">FROST DELIVERY PUZZLE</p><h1>{game.title}</h1><p className="detail-lead">出発した1マスが、<br />次の障害物になる。</p><p>{game.description}</p><span className="status-badge">{statusLabel(game)}</span><p className="work-genre">{technologyLabel(game)}</p><p className="release-note">{releaseNote(game)}</p>{game.release && <a className="button primary" href={game.release.url}>作品を開始</a>}<dl className="detail-facts"><div><dt>人数</dt><dd>1人</dd></div><div><dt>内容</dt><dd>3ステージ</dd></div><div><dt>操作</dt><dd>方向キー・画面ボタン</dd></div></dl></div><IceBoard /></section><WorkGuide work={game} />{game.technology === "unity" && game.origin === "preserved-prototype" && <UnityPlayer />}<section className="rules-section" aria-labelledby="rules-title"><p className="eyebrow">HOW TO PLAY</p><h2 id="rules-title">届けるまでの、3つのルール。</h2><ol className="rules-grid"><li><span>01</span><h3>壁まで滑る</h3><p>方向を選ぶと、壁や障害物にぶつかるまで進みます。</p></li><li><span>02</span><h3>出発点が凍る</h3><p>移動できたとき、出発した1マスだけが凍って障害物になります。次の道も考えて進みましょう。</p></li><li><span>03</span><h3>荷物を届ける</h3><p>荷物をすべて拾って到着点へ。行き詰まったらUNDOで一手戻せます。</p></li></ol></section><section className="detail-support"><h2>気軽に試せるように。</h2><p>方向キー・WASD・画面ボタンで操作できます。Zは一手戻す、Rはこのルートを最初からやり直す操作です。</p><p>旧試作品の操作説明です。実端末のタッチ操作と公開版は未確認です。</p><a href="/contact/" className="text-link">作品について問い合わせる →</a></section></>;
}

function Info({ pathname, state }: { pathname: string; state: CatalogState }) {
  const contact = pathname.startsWith("/contact");
  const privacy = pathname.startsWith("/privacy-policy");
  return <section className="info-page"><p className="eyebrow">KIHAMDA.NET</p><h1>{contact ? "お問い合わせ" : privacy ? "プライバシーポリシー" : "このスタジオについて"}</h1>
    {contact ? <><p className="info-lead">作品へのご意見や、不具合のご報告を受け付けています。</p><div className="info-panel"><h2>連絡先</h2><a className="text-link" href="mailto:contact@kihamda.net">contact@kihamda.net</a><p>件名に作品名を、本文にお使いの端末と起きたことをお書きください。著作権に関するご連絡も、こちらで受け付けます。</p></div><h2>対応について</h2><p>内容を確認後、通常3営業日以内に返信します。迷惑行為や法令違反に関わる内容には対応しない場合があります。</p></> : privacy ? <><p>Kihamda.NET（以下「当サイト」）は、利用者のプライバシーを尊重し、個人情報の保護に努めます。</p><h2>1 取得する情報</h2><p>当サイトでは、アクセス解析や広告配信のため、Cookieおよび端末識別情報を取得する場合があります。</p><h2>2 利用目的</h2><p>取得した情報は、サービス改善、不正利用防止、広告の最適化のために利用します。</p><h2>3 広告配信について</h2><p>当サイトは第三者配信の広告サービスを利用する場合があります。その際に広告配信事業者がCookieを利用することがあります。</p><h2>4 免責事項</h2><p>当サイトの情報は可能な限り正確な内容を提供するよう努めますが、正確性や安全性を保証するものではありません。</p><h2>5 お問い合わせ</h2><p>本ポリシーに関するお問い合わせは、<a href="/contact/">お問い合わせページ</a>からお願いします。</p><p className="page-note">方針の最終更新日 2026-03-17</p></> : <><p className="info-lead">ひとつのルールから、<br />何度も試したくなる遊びを。</p><p>Kihamda.NETは、Web技術でゲームを制作する個人スタジオです。本人が別途制作したUnityアプリも、完成品の動作と配布条件を確認したうえで受け入れます。作品の数より、独自のルールと完成度を大切にしています。</p><h2>一作ずつ、確かめながら。</h2><p>Ice Courierは、既存のUnity試作品として保全しています。制作は停止しており、一般公開はしていません。現在は作品を見つけやすいWeb画面を整えています。</p><dl className="info-panel"><dt>運営</dt><dd>Kihamda.NET</dd><dt>サイト</dt><dd><a href="https://game.kihamda.net/">game.kihamda.net</a></dd><dt>活動</dt><dd>ゲームの企画・開発・公開</dd></dl><a className="text-link" href={catalogHref(state)}>作品一覧を見る →</a></>}
  </section>;
}

export default function PortalApp({ pathname = "/", catalogState = { query: "", filter: "all" }, onCatalogChange = () => {} }: { pathname?: string; catalogState?: CatalogState; onCatalogChange?: (state: CatalogState) => void }) {
  return <div className="portal"><a href="#main" className="skip-link">本文へ移動</a><Header pathname={pathname} state={catalogState} /><main id="main" className="portal-main" tabIndex={-1}>{pathname === "/" ? <Home state={catalogState} onChange={onCatalogChange} /> : (pathname.startsWith("/games/") || pathname.startsWith("/works/")) ? <GameDetail pathname={pathname} state={catalogState} /> : <Info pathname={pathname} state={catalogState} />}</main><Footer /></div>;
}
