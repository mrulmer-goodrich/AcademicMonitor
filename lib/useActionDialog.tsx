"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { ActionDialogProps, ActionDialogTone } from "@/components/ActionDialog";

type ActionDialogRequest = {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ActionDialogTone;
  size?: "default" | "large";
  requireText?: string;
};

export default function useActionDialog() {
  const [request, setRequest] = useState<ActionDialogRequest | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(confirmed);
  }, []);

  const ask = useCallback((nextRequest: ActionDialogRequest) => {
    resolverRef.current?.(false);
    setRequest(nextRequest);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    []
  );

  const dialogProps: ActionDialogProps = {
    open: Boolean(request),
    eyebrow: request?.eyebrow,
    title: request?.title || "",
    description: request?.description || "",
    confirmLabel: request?.confirmLabel || "Continue",
    cancelLabel: request?.cancelLabel,
    tone: request?.tone,
    size: request?.size,
    requireText: request?.requireText,
    onConfirm: () => close(true),
    onCancel: () => close(false)
  };

  return { ask, dialogProps };
}
