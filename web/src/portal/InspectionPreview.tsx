import { useState } from "react";
import type { Work } from "./catalog";

export default function InspectionPreview({ work }: { work: Work }) {
  const preview = work.inspectionPreview;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!preview || work.release) return null;
  return <figure className="inspection-preview">
    {failedUrl === preview.url ? <p className="preview-fallback" role="status">実画面を読み込めませんでした。ルールと操作方法は本文で確認できます。</p>
      : <img src={preview.url} alt={preview.alt} width={preview.width} height={preview.height} loading="lazy" onError={() => setFailedUrl(preview.url)} />}
    <figcaption>公開前検査版の実画面<span>{preview.version}。公開版の動作確認は未完了です。</span></figcaption>
  </figure>;
}
