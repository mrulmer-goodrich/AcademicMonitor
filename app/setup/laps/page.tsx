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
  const [copyPrompt, setCopyPrompt] = useState(false);
  const [copySource, setCopySource] = useState<string>("");

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
    if (data.laps?.length === 0 && blocks.length > 1) {
      setCopyPrompt(true);
    } else {
      setCopyPrompt(false);
    }
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

  async function copyFromBlock(fromBlockId: string) {
    const res = await fetch("/api/laps/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromBlockId,
        toBlockId: blockId,
        weekStart: weekStart.toISOString(),
        force: true
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
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div>
        <div className="small-header text-black/60">Setup</div>
        <h1 className="section-title">Laps</h1>
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
            <select
              className="form-control max-w-[260px]"
              onChange={(e) => copyFromBlock(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                Copy week from block...
              </option>
              {blockOptions.filter((b) => b.id !== blockId).map((block) => (
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

        <div className="grid grid-cols-6 gap-3 text-sm">
          <div></div>
          {weekdays.map((day, index) => (
            <div key={day} className="text-center font-semibold">
              {day}
              <div className="text-[11px] text-black/60">{format(addDays(weekStart, index), "MM/dd")}</div>
            </div>
          ))}
          {[1, 2, 3].map((lapNumber) => (
            <div key={lapNumber} className="grid grid-cols-6 gap-3 items-center">
              <div className="font-semibold">Lap {lapNumber}</div>
              {weekdays.map((_day, dayIndex) => {
                const lap = getLap(dayIndex, lapNumber);
                return (
                  <button
                    key={`${dayIndex}-${lapNumber}`}
                    className="h-12 rounded-xl border border-black/10 bg-white text-xs text-black/60"
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
                        {lap.standardCode && <span className="text-[10px]">{lap.standardCode}</span>}
                      </div>
                    ) : (
                      "+"
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {standards.length > 0 && (
          <div className="text-xs text-black/60">
            Standards loaded: {standards.map((s) => s.code).join(", ")}
          </div>
        )}
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

      {copyPrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6">
          <div className="hero-card w-full max-w-md p-6 space-y-4">
            <div>
              <div className="small-header text-black/60">Copy Laps</div>
              <h2 className="section-title">No laps yet for this week</h2>
            </div>
            <div className="text-sm text-black/70">
              Would you like to copy laps from another block for this week?
            </div>
            <select
              className="form-control"
              value={copySource}
              onChange={(e) => setCopySource(e.target.value)}
            >
              <option value="">Select block...</option>
              {blocks.filter((b) => b.id !== blockId).map((block) => (
                <option key={block.id} value={block.id}>
                  Block {block.blockNumber} · {block.blockName}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  if (!copySource) return;
                  await copyFromBlock(copySource);
                  setCopyPrompt(false);
                  setCopySource("");
                }}
              >
                Copy Laps
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setCopyPrompt(false)}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
