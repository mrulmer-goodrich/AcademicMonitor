"use client";

import { type ReactNode, useEffect, useState } from "react";

export type ActionDialogTone = "info" | "warning" | "danger";

export type ActionDialogProps = {
  open: boolean;
  eyebrow?: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ActionDialogTone;
  size?: "default" | "large";
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const toneStyles: Record<ActionDialogTone, { badge: string; button: string; glow: string }> = {
  info: {
    badge: "bg-sky-100 text-sky-800",
    button: "bg-[#0b1b2a] text-white",
    glow: "from-sky-200/65 via-cyan-100/25 to-transparent"
  },
  warning: {
    badge: "bg-amber-100 text-amber-900",
    button: "bg-amber-500 text-[#241600]",
    glow: "from-amber-200/75 via-orange-100/30 to-transparent"
  },
  danger: {
    badge: "bg-red-100 text-red-800",
    button: "bg-red-600 text-white",
    glow: "from-red-200/70 via-rose-100/30 to-transparent"
  }
};

export default function ActionDialog({
  open,
  eyebrow,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "info",
  size = "default",
  requireText,
  onConfirm,
  onCancel
}: ActionDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const styles = toneStyles[tone];
  const confirmationReady = !requireText || confirmationText === requireText;

  useEffect(() => {
    if (open) setConfirmationText("");
  }, [open, requireText]);

  useEffect(() => {
    if (!open || !cancelLabel) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelLabel, onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07131f]/70 p-4 backdrop-blur-[3px] sm:p-6">
      <div
        className={`hero-card relative w-full overflow-hidden border-white/70 bg-white px-6 py-7 text-center shadow-[0_30px_90px_rgba(2,12,22,0.38)] sm:px-10 sm:py-9 ${
          size === "large" ? "max-w-3xl" : "max-w-xl"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        aria-describedby="action-dialog-description"
      >
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${styles.glow}`} />
        <div className="relative">
          {eyebrow && (
            <div className={`mx-auto inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${styles.badge}`}>
              {eyebrow}
            </div>
          )}
          <h2 id="action-dialog-title" className="mt-4 text-2xl font-bold tracking-[-0.035em] text-[#071c2c] sm:text-3xl">
            {title}
          </h2>
          <div id="action-dialog-description" className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-black/65 sm:text-base">
            {description}
          </div>

          {requireText && (
            <label className="mx-auto mt-6 block max-w-sm text-left">
              <span className="text-xs font-semibold text-black/60">
                Type <span className="font-bold text-black">{requireText}</span> to confirm
              </span>
              <input
                autoFocus
                className="form-control mt-2 bg-white text-center font-bold tracking-[0.08em]"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && confirmationReady) onConfirm();
                }}
              />
            </label>
          )}

          <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
            {cancelLabel && (
              <button className="btn btn-ghost min-w-[170px] justify-center py-3" type="button" onClick={onCancel}>
                {cancelLabel}
              </button>
            )}
            <button
              autoFocus={!requireText}
              className={`btn min-w-[170px] justify-center border-0 py-3 ${styles.button}`}
              type="button"
              disabled={!confirmationReady}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
