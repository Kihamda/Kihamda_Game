import type { Work } from "./catalog";

export default function WorkGuide({ work }: { work: Work }) {
  const guide = work.guide;
  return <section className="game-guide" aria-labelledby="guide-title">
    <h2 id="guide-title">操作と対応環境</h2>
    {work.origin === "preserved-prototype" && <p>保全している旧試作品の説明です。公開版の案内ではありません。</p>}
    {guide?.symbols?.length ? <dl className="symbol-guide" aria-label="盤面の記号">{guide.symbols.map((item, index) => <div key={index}><dt>{item.symbol}</dt><dd>{item.meaning}</dd></div>)}</dl> : null}
    {guide?.controls?.length ? <details className="control-help"><summary>操作方法を見る</summary><dl className="control-guide" aria-label="作品の操作">{guide.controls.map((item, index) => <div key={index}><dt>{item.input}</dt><dd>{item.action}</dd></div>)}</dl></details> : <p>操作方法は確認中です。</p>}
    <h3>保存と再開</h3>
    <p className="save-guide">{guide?.saving ? <>{guide.saving.status === "unverified" && "未確認。"}{guide.saving.description}</> : "保存・再開の対応は未確認です。"}</p>
    <h3>確認済みの環境</h3>
    {guide?.environments?.length ? <ul className="verified-environments">{guide.environments.map((item, index) => <li key={index}>{item.name} / {item.input}<span>確認した版 {item.version}</span></li>)}</ul> : <p>公開版のブラウザ・端末・入力方式は未確認です。</p>}
    {guide?.screenshots?.length ? <div className="work-screenshots">{guide.screenshots.map((item, index) => <figure key={index}><img src={item.url} alt={item.alt} loading="lazy" /><figcaption>実画面 · {item.version}</figcaption></figure>)}</div> : null}
  </section>;
}
