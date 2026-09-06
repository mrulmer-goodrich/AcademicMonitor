"use client";

import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

const menuItemClass = "flex min-h-[40px] w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-black/70 transition hover:bg-black/[0.05] hover:text-black";

export default function DashboardAccountMenu() {
  return (
    <details className="group relative">
      <summary className="inline-flex min-h-[38px] cursor-pointer list-none items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-white/80 bg-white/70 px-3 py-2 text-center text-[12px] font-semibold leading-none text-black/70 shadow-[0_4px_12px_rgba(11,27,42,0.08)] transition hover:-translate-y-px hover:bg-white hover:text-black hover:shadow-[0_8px_18px_rgba(11,27,42,0.12)] [&::-webkit-details-marker]:hidden">
        Account
        <span aria-hidden="true" className="text-[10px] transition group-open:rotate-180">▾</span>
      </summary>
      <div className="invisible absolute right-0 top-[calc(100%-2px)] z-40 w-52 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-open:visible group-open:opacity-100">
        <div className="rounded-xl border border-black/10 bg-white p-1.5 shadow-[0_14px_34px_rgba(11,27,42,0.18)]">
          <Link className={menuItemClass} href="/account">Account Settings</Link>
          <a className={menuItemClass} href="https://ugmathtools.com">UG Math Tools Home</a>
          <div className="my-1 border-t border-black/10" />
          <LogoutButton className={`${menuItemClass} text-red-700 hover:text-red-800`} />
        </div>
      </div>
    </details>
  );
}
