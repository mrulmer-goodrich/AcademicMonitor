"use client";

import { useEffect } from "react";

export default function BackNavigationStyleRecovery() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      window.requestAnimationFrame(() => {
        const shell = document.querySelector<HTMLElement>(".app-shell");
        const shellStyled = shell ? window.getComputedStyle(shell).display === "flex" : false;
        const bodyStyled = window.getComputedStyle(document.body).backgroundImage !== "none";
        if (!shellStyled || !bodyStyled) window.location.reload();
      });
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
