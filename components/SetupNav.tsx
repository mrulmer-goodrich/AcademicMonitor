"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SetupStatus = {
  blocksCount: number;
  studentsCount: number;
  desksCount: number;
  lapsCount: number;
};

export default function SetupNav() {
  const [status, setStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    fetch("/api/setup-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  const blocksReady = (status?.blocksCount || 0) > 0;
  const studentsReady = (status?.studentsCount || 0) > 0;
  const seatingReady = (status?.desksCount || 0) > 0;

  const links = [
    { href: "/setup/blocks", label: "1. Blocks", complete: blocksReady, helper: "Create class blocks." },
    {
      href: "/setup/students",
      label: "2. Students",
      complete: studentsReady,
      helper: blocksReady ? "Add or import students." : "Create a block first."
    },
    {
      href: "/setup/seating",
      label: "3. Seating",
      complete: seatingReady,
      helper: studentsReady ? "Arrange the classroom." : "Add students first."
    },
    {
      href: "/setup/laps",
      label: "4. Laps",
      complete: (status?.lapsCount || 0) > 0,
      helper: seatingReady ? "Name the week’s laps." : "Create seating first."
    }
  ];

  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">{link.label}</span>
            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${link.complete ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
              {link.complete ? "Complete" : "Open"}
            </span>
          </div>
          <div className="mt-2 text-xs text-black/55">{link.helper}</div>
        </Link>
      ))}
    </div>
  );
}
