import { useRef, useState } from "react";
import type { Work } from "./catalog";

export default function InspectionPreview({ work, expandable = false }: { work: Work; expandable?: boolean }) {
  const preview = work.inspectionPreview;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [enlargedFailedUrl, setEnlargedFailedUrl] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const imageScroll = useRef<HTMLDivElement>(null);
  const resetImagePosition = () => {
    if (!dialog.current?.open || !imageScroll.current) return;
    dialog.current.scrollTop = 0;
    imageScroll.current.scrollLeft = (imageScroll.current.scrollWidth - imageScroll.current.clientWidth) / 2;
    imageScroll.current.scrollTop = 0;
  };
  if (!preview || work.release) return null;
  return <figure className="inspection-preview">
    {failedUrl === preview.url ? <p className="preview-fallback" role="status">実画面を読み込めませんでした。ルールと操作方法は本文で確認できます。</p>
      : <img src={preview.url} alt={preview.alt} width={preview.width} height={preview.height} loading="lazy" onError={() => setFailedUrl(preview.url)} />}
    <figcaption>公開前検査版の実画面<span>{preview.version}。公開版の動作確認は未完了です。</span></figcaption>
    {expandable && failedUrl !== preview.url && <>
      <button ref={trigger} type="button" className="preview-expand" onClick={() => {
        dialog.current?.showModal();
        resetImagePosition();
      }}>{work.title}の実画面を拡大</button>
      <dialog ref={dialog} className="preview-dialog" aria-label={`${work.title}の公開前検査版の実画面`} onClose={() => trigger.current?.focus()} onKeyDown={event => {
        if (event.key === "Tab") {
          event.preventDefault();
          (event.target === closeButton.current ? imageScroll.current : closeButton.current)?.focus();
        }
      }}>
        <div className="preview-dialog-header"><p>公開前検査版の実画面</p><button ref={closeButton} type="button" autoFocus onClick={() => dialog.current?.close()}>閉じる</button></div>
        <p>{preview.version}。公開版の動作確認は未完了です。</p>
        <p>{enlargedFailedUrl === preview.url ? "拡大画像を読み込めませんでした。閉じて本文のルールと操作方法を確認してください。" : "画像をスクロールして全体を確認できます。"}</p>
        <div ref={imageScroll} className="preview-image-scroll" tabIndex={0} role="region" aria-label={enlargedFailedUrl === preview.url ? "拡大画像の読み込み状況" : "拡大画像。矢印キーでスクロール"}>
          {enlargedFailedUrl === preview.url ? <p className="preview-fallback" role="status">拡大画像を表示できません。</p> : <img src={preview.url} alt={preview.alt} width={preview.width} height={preview.height} onLoad={resetImagePosition} onError={() => setEnlargedFailedUrl(preview.url)} />}
        </div>
      </dialog>
    </>}
  </figure>;
}
