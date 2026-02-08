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
    { href: "/setup/blocks", label: "Blocks", enabled: true, helper: "Create your first block." },
    {
      href: "/setup/students",
      label: "Students",
      enabled: blocksReady,
      helper: "Add at least one block to unlock students."
    },
    {
      href: "/setup/seating",
      label: "Seating",
      enabled: studentsReady,
      helper: "Add at least one student to unlock seating."
    },
    {
      href: "/setup/laps",
      label: "Laps",
      enabled: seatingReady,
      helper: "Create a seating chart to unlock laps."
    }
  ];

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {links.map((link) =>
        link.enabled ? (
          <Link key={link.href} href={link.href} className="btn btn-ghost">
            {link.label}
          </Link>
        ) : (
          <div
            key={link.href}
            className="rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-xs text-black/50"
          >
            {link.label} · {link.helper}
          </div>
        )
      )}
    </div>
  );
}
