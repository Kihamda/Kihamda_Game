import { useEffect, useRef } from "react";

export default function SaveDeletionConfirmation({ onConfirm, onCancel }: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    cancelButton.current?.focus();
    return () => {
      element?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return <dialog ref={dialog} className="move-confirm-dialog" aria-labelledby="save-delete-title"
    aria-describedby="save-delete-description"
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    }}
    onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <h2 id="save-delete-title">進行データを削除しますか？</h2>
    <p id="save-delete-description">保存した盤面と手番を削除します。設定と連勝履歴は残ります。この操作は元に戻せません。</p>
    <div className="move-confirm-actions">
      <button ref={cancelButton} onClick={onCancel}>キャンセル</button>
      <button onClick={onConfirm}>進行を削除</button>
    </div>
  </dialog>;
}
