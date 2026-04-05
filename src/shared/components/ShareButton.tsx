import { useState, useCallback } from "react";

export interface ShareButtonProps {
  score: number;
  gameTitle: string;
  gameId: string;
}

/**
 * SNSシェアボタンコンポーネント
 * モバイルではnavigator.share() APIを使用、非対応ブラウザでは個別ボタンを表示
 */
export function ShareButton({ score, gameTitle, gameId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const shareUrl = `${window.location.origin}/games/${gameId}/`;
  const shareText = `${gameTitle}で ${score.toLocaleString()} 点を獲得しました！🎮`;
  const fullShareText = `${shareText}\n${shareUrl}`;

  const canUseNativeShare =
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) {
      setShowFallback(true);
      return;
    }

    try {
      await navigator.share({
        title: gameTitle,
        text: shareText,
        url: shareUrl,
      });
    } catch (err) {
      // ユーザーがキャンセルした場合は何もしない
      if ((err as Error).name !== "AbortError") {
        setShowFallback(true);
      }
    }
  }, [gameTitle, shareText, shareUrl]);

  const handleTwitterShare = useCallback(() => {
    const twitterUrl = new URL("https://twitter.com/intent/tweet");
    twitterUrl.searchParams.set("text", shareText);
    twitterUrl.searchParams.set("url", shareUrl);
    window.open(twitterUrl.toString(), "_blank", "noopener,noreferrer");
  }, [shareText, shareUrl]);

  const handleLineShare = useCallback(() => {
    const lineUrl = new URL("https://social-plugins.line.me/lineit/share");
    lineUrl.searchParams.set("url", shareUrl);
    lineUrl.searchParams.set("text", shareText);
    window.open(lineUrl.toString(), "_blank", "noopener,noreferrer");
  }, [shareText, shareUrl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullShareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック: execCommand
      const textArea = document.createElement("textarea");
      textArea.value = fullShareText;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [fullShareText]);

  // モバイルでネイティブシェア対応 & フォールバック未要求時
  if (canUseNativeShare && !showFallback) {
    return (
      <div className="share-buttons">
        <button
          type="button"
          className="share-btn share-btn--native"
          onClick={handleNativeShare}
          aria-label="スコアをシェア"
        >
          <span className="share-btn-icon">📤</span>
          <span className="share-btn-label">シェア</span>
        </button>
      </div>
    );
  }

  // デスクトップ or フォールバック時: 個別ボタン表示
  return (
    <div className="share-buttons">
      <button
        type="button"
        className="share-btn share-btn--twitter"
        onClick={handleTwitterShare}
        aria-label="Xでシェア"
      >
        <span className="share-btn-icon">𝕏</span>
        <span className="share-btn-label">Post</span>
      </button>

      <button
        type="button"
        className="share-btn share-btn--line"
        onClick={handleLineShare}
        aria-label="LINEでシェア"
      >
        <span className="share-btn-icon">💬</span>
        <span className="share-btn-label">LINE</span>
      </button>

      <button
        type="button"
        className="share-btn share-btn--copy"
        onClick={handleCopy}
        aria-label="クリップボードにコピー"
      >
        <span className="share-btn-icon">{copied ? "✓" : "📋"}</span>
        <span className="share-btn-label">{copied ? "コピー完了" : "コピー"}</span>
      </button>
    </div>
  );
}
