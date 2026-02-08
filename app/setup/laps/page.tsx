"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import SetupNav from "@/components/SetupNav";

type Block = { id: string; blockNumber: number; blockName: string };

type Lap = {
  id: string;
  dayIndex: number;
  lapNumber: number;
  name: string;
  standardCode: string | null;
};

type Standard = { code: string; description: string };

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function LapsSetupPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [laps, setLaps] = useState<Lap[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    dayIndex: number;
    lapNumber: number;
    name: string;
    standardCode: string | null;
  } | null>(null);

  useEffect(() => {
    loadBlocks();
    loadStandards();
  }, []);

  useEffect(() => {
    if (blockId) loadLaps();
  }, [blockId, weekStart]);

  async function loadBlocks() {
    const res = await fetch("/api/blocks");
    if (res.status === 401) {
      setError("Please login first.");
      return;
    }
    const data = await res.json();
    setBlocks(data.blocks || []);
    if (!blockId && data.blocks?.length) setBlockId(data.blocks[0].id);
  }

  async function loadStandards() {
    const res = await fetch("/api/standards");
    const data = await res.json();
    setStandards(data.standards || []);
  }

  async function loadLaps() {
    const res = await fetch(`/api/laps?blockId=${blockId}&weekStart=${weekStart.toISOString()}`);
    const data = await res.json();
    setLaps(data.laps || []);
  }

  async function saveLap(dayIndex: number, lapNumber: number, name: string, standardCode: string | null) {
    const res = await fetch("/api/laps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockId,
        weekStart: weekStart.toISOString(),
        dayIndex,
        lapNumber,
        name,
        standardCode
      })
    });
    if (res.ok) await loadLaps();
  }


  function getLap(dayIndex: number, lapNumber: number) {
    return laps.find((lap) => lap.dayIndex === dayIndex && lap.lapNumber === lapNumber);
  }

  const blockOptions = useMemo(
    () => blocks.map((block) => ({ id: block.id, label: `Block ${block.blockNumber} · ${block.blockName}` })),
    [blocks]
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="section-title">Name Your Laps</h1>
        <p className="text-black/70 text-sm">
          Three laps per day. Each lap can optionally reference a standard. Scroll to future weeks to plan ahead.
        </p>
      </div>
      <SetupNav />

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div className="hero-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select className="form-control max-w-[260px]" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
              {blockOptions.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              Previous Week
            </button>
            <div className="text-lg font-semibold">Week of {format(weekStart, "MM/dd/yy")}</div>
            <button className="btn btn-ghost" type="button" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              Next Week
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="table table-compact min-w-[720px]">
            <thead>
              <tr>
                <th></th>
                {weekdays.map((day, index) => (
                  <th key={day} className="text-center">
                    <div className="font-semibold text-[15px]">{day}</div>
                    <div className="text-[13px] text-black/60">{format(addDays(weekStart, index), "MM/dd")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((lapNumber) => (
                <tr key={lapNumber}>
                  <td className="font-semibold text-[15px] text-center">Lap {lapNumber}</td>
                  {weekdays.map((_day, dayIndex) => {
                    const lap = getLap(dayIndex, lapNumber);
                    return (
                      <td key={`${dayIndex}-${lapNumber}`}>
                        <button
                          className="w-full h-16 rounded-xl border border-black/10 bg-white text-sm text-black/60 whitespace-normal break-words"
                          type="button"
                          onClick={() =>
                            setEditing({
                              dayIndex,
                              lapNumber,
                              name: lap?.name || "",
                              standardCode: lap?.standardCode || null
                            })
                          }
                        >
                          {lap ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-black">{lap.name}</span>
                              {lap.standardCode && <span className="text-[11px]">{lap.standardCode}</span>}
                            </div>
                          ) : (
                            "+"
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="hero-card w-full max-w-md p-6 space-y-4">
            <div>
              <div className="small-header text-black/60">Edit Lap</div>
              <h2 className="section-title">
                {weekdays[editing.dayIndex]} · Lap {editing.lapNumber}
              </h2>
            </div>
            <div>
              <label className="text-sm font-medium">Lap name</label>
              <input
                className="form-control"
                value={editing.name}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">NC Standard (optional)</label>
              <select
                className="form-control"
                value={editing.standardCode || ""}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, standardCode: e.target.value || null } : prev))
                }
              >
                <option value="">None</option>
                {standards.map((standard) => (
                  <option key={standard.code} value={standard.code}>
                    {standard.code} — {standard.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  if (!editing.name.trim()) return;
                  await saveLap(editing.dayIndex, editing.lapNumber, editing.name.trim(), editing.standardCode);
                  setEditing(null);
                }}
              >
                Save Lap
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
