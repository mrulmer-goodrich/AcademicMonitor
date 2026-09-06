"use client";

import { usePathname } from "next/navigation";
import GlobalHeader from "@/components/GlobalHeader";

function isWorkspacePath(pathname: string | null) {
  return Boolean(
    pathname === "/dashboard" ||
    pathname === "/account" ||
    pathname === "/report" ||
    pathname?.startsWith("/setup") ||
    pathname?.startsWith("/monitor")
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const workspace = isWorkspacePath(usePathname());
  return (
    <div className={`app-shell ${workspace ? "app-shell-workspace" : ""}`}>
      {!workspace && <GlobalHeader />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
