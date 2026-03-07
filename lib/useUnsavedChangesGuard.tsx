"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseUnsavedChangesGuardOptions = {
  when: boolean;
  description: string;
};

export default function useUnsavedChangesGuard({ when, description }: UseUnsavedChangesGuardOptions) {
  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef<null | (() => void)>(null);
  const ignoreNextNavigationRef = useRef(false);
  const popstateTrapRef = useRef(false);

  const requestNavigation = useCallback(
    (action: () => void) => {
      if (!when) {
        action();
        return true;
      }

      pendingActionRef.current = action;
      setOpen(true);
      return false;
    },
    [when]
  );

  const stayOnPage = useCallback(() => {
    pendingActionRef.current = null;
    setOpen(false);
  }, []);

  const leaveWithoutSaving = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setOpen(false);
    if (!action) return;
    ignoreNextNavigationRef.current = true;
    action();
    window.setTimeout(() => {
      ignoreNextNavigationRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (!when) {
      pendingActionRef.current = null;
      setOpen(false);
    }
  }, [when]);

  useEffect(() => {
    if (!when) {
      if (popstateTrapRef.current) {
        popstateTrapRef.current = false;
        ignoreNextNavigationRef.current = true;
        window.history.back();
        window.setTimeout(() => {
          ignoreNextNavigationRef.current = false;
        }, 0);
      }
      return;
    }

    if (!popstateTrapRef.current) {
      popstateTrapRef.current = true;
      window.history.pushState({ __unsavedGuard: true }, "", window.location.href);
    }
  }, [when]);

  useEffect(() => {
    if (!when) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (ignoreNextNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function handleClickCapture(event: MouseEvent) {
      if (ignoreNextNavigationRef.current) return;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const anchor =
        target instanceof Element ? (target.closest("a[href]") as HTMLAnchorElement | null) : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const nextHref = anchor.href;
      if (!nextHref || nextHref === window.location.href) return;

      event.preventDefault();
      requestNavigation(() => {
        window.location.href = nextHref;
      });
    }

    function handleSubmitCapture(event: Event) {
      if (ignoreNextNavigationRef.current) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      event.preventDefault();
      requestNavigation(() => {
        form.submit();
      });
    }

    function handlePopState() {
      if (ignoreNextNavigationRef.current) return;
      requestNavigation(() => {
        popstateTrapRef.current = false;
        window.history.go(-2);
      });
      window.setTimeout(() => {
        window.history.go(1);
      }, 0);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClickCapture, true);
    document.addEventListener("submit", handleSubmitCapture, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClickCapture, true);
      document.removeEventListener("submit", handleSubmitCapture, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [requestNavigation, when]);

  return {
    dialogProps: {
      open,
      description,
      onStay: stayOnPage,
      onLeave: leaveWithoutSaving
    },
    requestNavigation
  };
}
