"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Modal({ title, children, onClose, confirmOnClose = true, size = "default" }: { title: string; children: ReactNode; onClose: () => void; confirmOnClose?: boolean; size?: "default" | "large" }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [dirty, setDirty] = useState(false);

  function requestClose() {
    if (dialogRef.current?.querySelector('[aria-busy="true"]')) return;
    if (!confirmOnClose || !dirty || window.confirm("Fermer ce formulaire ? Les modifications non enregistrées seront perdues.")) onClose();
  }

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstField = dialogRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button");
    (firstField ?? closeRef.current)?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [dirty, onClose, confirmOnClose]);

  return <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--carri-ink)]/60 p-2 sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}><section aria-labelledby="modal-title" aria-modal="true" className={`flex max-h-[calc(100vh-1rem)] max-h-[calc(100dvh-1rem)] w-full flex-col rounded-lg bg-white p-4 shadow-xl sm:max-h-[calc(100vh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:p-5 ${size === "large" ? "max-w-4xl" : "max-w-2xl"}`} onChangeCapture={() => setDirty(true)} ref={dialogRef} role="dialog" tabIndex={-1}><header className="mb-4 flex shrink-0 items-center justify-between gap-4"><h2 className="text-xl font-semibold" id="modal-title">{title}</h2><button aria-label="Fermer" className="button button-outline" onClick={requestClose} ref={closeRef} type="button">Fermer</button></header><div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div><footer className="mt-4 shrink-0 border-t border-[var(--line)] pt-3"><button className="button button-outline" onClick={requestClose} type="button">Annuler</button></footer></section></div>;
}
