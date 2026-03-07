"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addDays, format, startOfWeek } from "date-fns";
import ReturnToDashboardButton from "@/components/ReturnToDashboardButton";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import useUnsavedChangesGuard from "@/lib/useUnsavedChangesGuard";

type Block = { id: string; blockNumber: number; blockName: string };

type Lap = {
  id: string;
  dayIndex: number;
  lapNumber: number;
  name: string;
  standardCode: string | null;
};

type Standard = { code: string; description: string };

type LapDraft = {
  name: string;
  standardCode: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const lapNumbers = [1, 2, 3];

function draftKey(dayIndex: number, lapNumber: number) {
  return `${dayIndex}-${lapNumber}`;
}

function buildDraftMap(laps: Lap[]) {
  const next: Record<string, LapDraft> = {};
  weekdays.forEach((_day, dayIndex) => {
    lapNumbers.forEach((lapNumber) => {
      const lap = laps.find((entry) => entry.dayIndex === dayIndex && entry.lapNumber === lapNumber);
      next[draftKey(dayIndex, lapNumber)] = {
        name: lap?.name || "",
        standardCode: lap?.standardCode || ""
      };
    });
  });
  return next;
}

function lapDraftsMatch(left: Record<string, LapDraft>, right: Record<string, LapDraft>) {
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
  return keys.every((key) => {
    const leftDraft = left[key] || { name: "", standardCode: "" };
    const rightDraft = right[key] || { name: "", standardCode: "" };
    return leftDraft.name === rightDraft.name && leftDraft.standardCode === rightDraft.standardCode;
  });
}

function LapsSetupPageInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const focusDate = searchParams.get("focusDate");
  const requestedBlockId = searchParams.get("blockId");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [laps, setLaps] = useState<Lap[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [drafts, setDrafts] = useState<Record<string, LapDraft>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBlocks();
    loadStandards();
  }, []);

  useEffect(() => {
    if (!focusDate) return;
    const focus = new Date(`${focusDate}T09:00:00`);
    setWeekStart(startOfWeek(focus, { weekStartsOn: 1 }));
  }, [focusDate]);

  useEffect(() => {
    if (!blockId) return;
    setEditing(false);
    setStatusMessage(null);
    loadLaps();
  }, [blockId, weekStart]);

  useEffect(() => {
    if (!requestedBlockId) return;
    if (!blocks.some((block) => block.id === requestedBlockId)) return;
    if (requestedBlockId !== blockId) {
      setBlockId(requestedBlockId);
    }
  }, [requestedBlockId, blocks, blockId]);

  useEffect(() => {
    if (!returnTo || !focusDate) return;
    const targetDate = new Date(`${focusDate}T09:00:00`);
    const targetIndex = (targetDate.getDay() + 6) % 7;
    const targetLaps = laps.filter((lap) => lap.dayIndex === targetIndex && lap.name.trim());
    if (targetLaps.length === 3) {
      window.location.href = returnTo;
    }
  }, [laps, returnTo, focusDate]);

  async function loadBlocks() {
    const res = await fetch("/api/blocks");
    if (res.status === 401) {
      setError("Please login first.");
      return;
    }
    const data = await res.json();
    const availableBlocks: Block[] = data.blocks || [];
    setBlocks(availableBlocks);
    if (!blockId && availableBlocks.length) {
      const matchingBlock = requestedBlockId
        ? availableBlocks.find((block) => block.id === requestedBlockId)
        : null;
      setBlockId(matchingBlock ? matchingBlock.id : availableBlocks[0].id);
    }
  }

  async function loadStandards() {
    const res = await fetch("/api/standards");
    const data = await res.json();
    setStandards(data.standards || []);
  }

  async function loadLaps() {
    const res = await fetch(`/api/laps?blockId=${blockId}&weekStart=${weekStart.toISOString()}`);
    const data = await res.json();
    const nextLaps: Lap[] = data.laps || [];
    setLaps(nextLaps);
    setDrafts(buildDraftMap(nextLaps));
  }

  function startEditing() {
    setStatusMessage(null);
    setDrafts(buildDraftMap(laps));
    setEditing(true);
  }

  function cancelEditing() {
    setDrafts(buildDraftMap(laps));
    setEditing(false);
    setStatusMessage(null);
  }

  async function saveAll() {
    if (!blockId) return;
    setSaving(true);
    setStatusMessage(null);

    const entries = weekdays.flatMap((_day, dayIndex) =>
      lapNumbers.map((lapNumber) => {
        const draft = drafts[draftKey(dayIndex, lapNumber)] || { name: "", standardCode: "" };
        const name = draft.name.trim();
        return {
          dayIndex,
          lapNumber,
          name,
          standardCode: draft.standardCode || null,
          delete: !name
        };
      })
    );

    const res = await fetch("/api/laps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockId,
        weekStart: weekStart.toISOString(),
        entries
      })
    });

    if (!res.ok) {
      setStatusMessage("Unable to save laps.");
      setSaving(false);
      return;
    }

    await loadLaps();
    setEditing(false);
    setSaving(false);
    setStatusMessage("Saved.");
  }

  function handlePaste(startDayIndex: number, startLapNumber: number, text: string) {
    const rows = text.replace(/\r/g, "").split("\n").filter((row) => row.length > 0);
    const startRowIndex = lapNumbers.indexOf(startLapNumber);
    if (!rows.length || startRowIndex < 0) return;

    setDrafts((prev) => {
      const next = { ...prev };
      rows.forEach((row, rowOffset) => {
        const lapNumber = lapNumbers[startRowIndex + rowOffset];
        if (!lapNumber) return;
        row.split("\t").forEach((value, colOffset) => {
          const dayIndex = startDayIndex + colOffset;
          if (dayIndex > weekdays.length - 1) return;
          const key = draftKey(dayIndex, lapNumber);
          next[key] = {
            ...(next[key] || { name: "", standardCode: "" }),
            name: value.trim()
          };
        });
      });
      return next;
    });
  }

  function updateDraft(dayIndex: number, lapNumber: number, value: Partial<LapDraft>) {
    const key = draftKey(dayIndex, lapNumber);
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { name: "", standardCode: "" }),
        ...value
      }
    }));
  }

  const blockOptions = useMemo(
    () => blocks.map((block) => ({ id: block.id, label: `Block ${block.blockNumber} · ${block.blockName}` })),
    [blocks]
  );

  const savedDrafts = useMemo(() => buildDraftMap(laps), [laps]);
  const hasUnsavedChanges = useMemo(
    () => editing && !lapDraftsMatch(drafts, savedDrafts),
    [editing, drafts, savedDrafts]
  );

  const { dialogProps, requestNavigation } = useUnsavedChangesGuard({
    when: hasUnsavedChanges,
    description: "You have unsaved lap edits on this screen. Leaving now will discard them."
  });

  const focusDayIndex = useMemo(() => {
    if (!focusDate) return null;
    const focus = new Date(`${focusDate}T09:00:00`);
    const focusWeekStart = startOfWeek(focus, { weekStartsOn: 1 });
    if (focusWeekStart.toISOString().slice(0, 10) !== weekStart.toISOString().slice(0, 10)) {
      return null;
    }
    return (focus.getDay() + 6) % 7;
  }, [focusDate, weekStart]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <ReturnToDashboardButton />

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div className="hero-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="form-control max-w-[280px]"
              value={blockId}
              onChange={(e) => {
                const nextBlockId = e.target.value;
                requestNavigation(() => setBlockId(nextBlockId));
              }}
            >
              {blockOptions.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.label}
                </option>
              ))}
            </select>

            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => requestNavigation(() => setWeekStart(addDays(weekStart, -7)))}
            >
              Previous Week
            </button>
            <div className="text-lg font-semibold">Week of {format(weekStart, "MM/dd/yy")}</div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => requestNavigation(() => setWeekStart(addDays(weekStart, 7)))}
            >
              Next Week
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!editing && (
              <button className="btn btn-primary" type="button" onClick={startEditing} disabled={!blockId}>
                Edit
              </button>
            )}
            {editing && (
              <>
                <button className="btn btn-primary" type="button" onClick={saveAll} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className="btn btn-ghost" type="button" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex min-h-[20px] items-center justify-end text-sm text-black/60">
          <div>{statusMessage || ""}</div>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="table table-compact w-full min-w-[980px] table-fixed">
            <thead>
              <tr>
                <th className="w-[120px]"></th>
                {weekdays.map((day, index) => {
                  const isFocusDay = focusDayIndex === null || focusDayIndex === index;
                  return (
                    <th key={day} className="text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="font-semibold text-[15px]">{day}</div>
                        <div className={`text-[13px] ${focusDayIndex !== null && isFocusDay ? "text-black" : "text-black/60"}`}>
                          {format(addDays(weekStart, index), "MM/dd")}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {lapNumbers.map((lapNumber) => (
                <tr key={lapNumber}>
                  <td className="align-top">
                    <div className="pt-3 text-center font-semibold text-[15px]">Lap {lapNumber}</div>
                  </td>
                  {weekdays.map((_day, dayIndex) => {
                    const key = draftKey(dayIndex, lapNumber);
                    const draft = drafts[key] || { name: "", standardCode: "" };
                    const lap = laps.find((entry) => entry.dayIndex === dayIndex && entry.lapNumber === lapNumber);
                    const isFocusDay = focusDayIndex === null || focusDayIndex === dayIndex;

                    return (
                      <td key={key} className="align-top">
                        <div
                          className={`rounded-2xl border p-3 ${
                            focusDayIndex !== null && isFocusDay
                              ? "border-black/20 bg-white shadow-sm"
                              : "border-black/10 bg-white/90"
                          }`}
                        >
                          {!editing && (
                            <div className="min-h-[72px] space-y-2">
                              <div className="text-sm font-semibold text-black">
                                {lap?.name || <span className="text-black/35">No lap name</span>}
                              </div>
                              <div className="text-xs text-black/55">{lap?.standardCode || "No standard selected"}</div>
                            </div>
                          )}

                          {editing && (
                            <div className="space-y-2">
                              <input
                                className="form-control bg-white text-sm"
                                value={draft.name}
                                placeholder="Lap name"
                                onChange={(e) => updateDraft(dayIndex, lapNumber, { name: e.target.value })}
                                onPaste={(e) => {
                                  const pasted = e.clipboardData.getData("text");
                                  if (!pasted.includes("\t") && !pasted.includes("\n")) return;
                                  e.preventDefault();
                                  handlePaste(dayIndex, lapNumber, pasted);
                                }}
                              />
                              <select
                                className="form-control bg-white text-sm"
                                value={draft.standardCode}
                                onChange={(e) => updateDraft(dayIndex, lapNumber, { standardCode: e.target.value })}
                              >
                                <option value="">No standard</option>
                                {standards.map((standard) => (
                                  <option key={standard.code} value={standard.code}>
                                    {standard.code} — {standard.description}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UnsavedChangesDialog {...dialogProps} />
    </div>
  );
}

export default function LapsSetupPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-6">Loading…</div>}>
      <LapsSetupPageInner />
    </Suspense>
  );
}
