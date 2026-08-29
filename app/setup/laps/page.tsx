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
  const notice = searchParams.get("notice");
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
  const [activeDayIndex, setActiveDayIndex] = useState(() => Math.min(Math.max((new Date().getDay() + 6) % 7, 0), 4));

  useEffect(() => {
    loadBlocks();
    loadStandards();
  }, []);

  useEffect(() => {
    if (!focusDate) return;
    const focus = new Date(`${focusDate}T09:00:00`);
    setWeekStart(startOfWeek(focus, { weekStartsOn: 1 }));
    setActiveDayIndex(Math.min(Math.max((focus.getDay() + 6) % 7, 0), 4));
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

  useEffect(() => {
    if (notice !== "name-laps-before-monitoring") return;
    window.alert("You have to name a lap before you can monitor it.");
  }, [notice]);

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

  async function copyPreviousWeek() {
    if (!blockId) return;
    const previousWeek = addDays(weekStart, -7);
    const res = await fetch(`/api/laps?blockId=${blockId}&weekStart=${previousWeek.toISOString()}`);
    if (!res.ok) {
      setStatusMessage("Unable to load the previous week.");
      return;
    }
    const data = await res.json();
    const previousLaps: Lap[] = data.laps || [];
    if (previousLaps.length === 0) {
      setStatusMessage("The previous week has no lap names to copy.");
      return;
    }
    setDrafts(buildDraftMap(previousLaps));
    setEditing(true);
    setStatusMessage("Previous week copied. Review, then save.");
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
    <div className="mx-auto max-w-[1440px] space-y-1 px-4 sm:px-6">
      <ReturnToDashboardButton className="!px-3 !py-1 text-xs" />

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div className="hero-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

            <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 whitespace-nowrap sm:flex sm:w-auto sm:shrink-0 sm:gap-2">
              <button
                className="btn btn-ghost shrink-0 whitespace-nowrap px-2 py-2 text-xs sm:px-3 sm:text-sm"
                type="button"
                onClick={() => requestNavigation(() => setWeekStart(addDays(weekStart, -7)))}
              >
                ← Previous
              </button>
              <div className="text-center text-sm font-semibold sm:text-base">Week of {format(weekStart, "MM/dd/yy")}</div>
              <button
                className="btn btn-ghost shrink-0 whitespace-nowrap px-2 py-2 text-xs sm:px-3 sm:text-sm"
                type="button"
                onClick={() => requestNavigation(() => setWeekStart(addDays(weekStart, 7)))}
              >
                Next →
              </button>
            </div>
          </div>

          <div className="flex min-h-[42px] min-w-[340px] flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-xs text-black/55" aria-live="polite">{statusMessage || (editing ? "Editing all 15 weekly slots" : "5 days · 3 laps each")}</span>
            {!editing && (
              <button className="btn btn-primary px-4 py-2 text-sm" type="button" onClick={startEditing} disabled={!blockId}>
                Edit Week
              </button>
            )}
            {editing && (
              <>
                <button className="btn btn-ghost px-3 py-2 text-sm" type="button" onClick={copyPreviousWeek} disabled={saving}>
                  Copy Previous Week
                </button>
                <button className="btn btn-primary px-4 py-2 text-sm" type="button" onClick={saveAll} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button className="btn btn-ghost px-3 py-2 text-sm" type="button" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-black/10 pt-3">
          <div>
            <div className="small-header text-black/45">Weekly lap plan</div>
            <div className="text-sm font-semibold">15 distinct day/lap combinations</div>
          </div>
          <div className="text-xs text-black/55">Each saved name and standard belongs to the day shown in its column.</div>
        </div>

        <div className="space-y-3 md:hidden">
          <div className="grid grid-cols-5 gap-1 rounded-2xl bg-black/5 p-1">
            {weekdays.map((day, dayIndex) => (
              <button
                key={`tab-${day}`}
                type="button"
                className={`min-h-[48px] rounded-xl px-2 py-2 text-center text-xs font-semibold transition ${activeDayIndex === dayIndex ? "bg-white text-black shadow-sm" : "text-black/55"}`}
                onClick={() => setActiveDayIndex(dayIndex)}
              >
                <span className="block">{day}</span>
                <span className="block text-[10px] font-normal">{format(addDays(weekStart, dayIndex), "MM/dd")}</span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
            Editing <span className="font-semibold">{weekdays[activeDayIndex]}, {format(addDays(weekStart, activeDayIndex), "MMMM d")}</span> · 3 of 15 weekly slots
          </div>

          <div className="grid gap-2">
            {lapNumbers.map((lapNumber) => {
              const key = draftKey(activeDayIndex, lapNumber);
              const draft = drafts[key] || { name: "", standardCode: "" };
              const lap = laps.find((entry) => entry.dayIndex === activeDayIndex && entry.lapNumber === lapNumber);
              return (
                <div key={`mobile-${key}`} className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
                  <div className="small-header text-black/45">Lap {lapNumber}</div>
                  {editing ? (
                    <div className="mt-2 grid gap-2">
                      <input className="form-control" value={draft.name} placeholder="Type lap name" onChange={(event) => updateDraft(activeDayIndex, lapNumber, { name: event.target.value })} />
                      <select className="form-control" value={draft.standardCode} onChange={(event) => updateDraft(activeDayIndex, lapNumber, { standardCode: event.target.value })}>
                        <option value="">No standard</option>
                        {standards.map((standard) => <option key={`mobile-${key}-${standard.code}`} value={standard.code}>{standard.code} — {standard.description}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="font-semibold">{lap?.name || <span className="text-black/35">No lap name</span>}</div>
                      <div className="mt-1 text-xs text-black/55">{lap?.standardCode || "No standard selected"}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden overflow-x-auto overflow-y-visible md:block">
          <table className="table table-compact w-full min-w-[900px] table-fixed">
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
                          className={`min-h-[88px] rounded-xl border p-2 transition ${
                            editing
                              ? "border-black/15 bg-[#fffdf8] shadow-sm"
                              : focusDayIndex !== null && isFocusDay
                              ? "border-black/20 bg-white shadow-sm"
                              : "border-black/10 bg-white/92"
                          }`}
                        >
                          {!editing && (
                            <div className="min-h-[76px] space-y-1.5">
                              <div className="text-sm font-semibold text-black">
                                {lap?.name || <span className="text-black/35">No lap name</span>}
                              </div>
                              <div className="text-xs text-black/55">{lap?.standardCode || "No standard selected"}</div>
                            </div>
                          )}

                          {editing && (
                            <div className="space-y-2">
                              <div>
                                <input
                                  className="form-control bg-white py-2 text-xs text-black"
                                  value={draft.name}
                                  placeholder="Type lap name"
                                  onChange={(e) => updateDraft(dayIndex, lapNumber, { name: e.target.value })}
                                  onPaste={(e) => {
                                    const pasted = e.clipboardData.getData("text");
                                    if (!pasted.includes("\t") && !pasted.includes("\n")) return;
                                    e.preventDefault();
                                    handlePaste(dayIndex, lapNumber, pasted);
                                  }}
                                />
                              </div>
                              <div>
                                <select
                                  className="form-control bg-white py-2 text-xs text-black"
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
