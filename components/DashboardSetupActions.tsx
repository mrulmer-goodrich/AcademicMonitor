"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SetupStatus = {
  blocksCount: number;
  studentsCount: number;
  desksCount: number;
  lapsCount: number;
};

export default function DashboardSetupActions() {
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
  const lapsReady = (status?.lapsCount || 0) > 0;

  const actions = [
    {
      href: "/setup/blocks",
      label: "Setup / Manage Blocks",
      enabled: true,
      helper: "Start by creating a block."
    },
    {
      href: "/setup/students",
      label: "Setup / Manage Students",
      enabled: blocksReady,
      helper: "Add students after blocks."
    },
    {
      href: "/setup/seating",
      label: "Setup / Manage Seating Chart",
      enabled: studentsReady,
      helper: "Create a seating chart after students."
    },
    {
      href: "/setup/laps",
      label: "Name Your Laps",
      enabled: seatingReady,
      helper: "Name laps after seating is set."
    },
    {
      href: "/report",
      label: "Reporting",
      enabled: lapsReady,
      helper: "Reporting unlocks after laps are named."
    }
  ];

  return (
    <div className="grid gap-3">
      {actions.map((action) =>
        action.enabled ? (
          <Link key={action.href} href={action.href} className="feature-card items-center justify-center text-center py-4">
            <div className="text-lg font-semibold">{action.label}</div>
          </Link>
        ) : (
          <div
            key={action.href}
            className="feature-card items-center justify-center text-center py-4 opacity-60"
          >
            <div className="text-lg font-semibold">{action.label}</div>
            <div className="text-xs text-black/60 mt-1">{action.helper}</div>
          </div>
        )
      )}
    </div>
  );
}
