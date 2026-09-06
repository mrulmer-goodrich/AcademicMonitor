"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addDays, format, startOfWeek } from "date-fns";
import ActionDialog from "@/components/ActionDialog";
import ReturnToDashboardButton from "@/components/ReturnToDashboardButton";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import useActionDialog from "@/lib/useActionDialog";
import useUnsavedChangesGuard from "@/lib/useUnsavedChangesGuard";

type Block = { id: string; blockNumber: number; blockName: string; gradeLevels: number[] };

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

function buildLapsFromDrafts(drafts: Record<string, LapDraft>, existingLaps: Lap[]) {
  return weekdays.flatMap((_day, dayIndex) =>
    lapNumbers.flatMap((lapNumber) => {
      const key = draftKey(dayIndex, lapNumber);
      const draft = drafts[key] || { name: "", standardCode: "" };
      const name = draft.name.trim();
      if (!name) return [];
      const existing = existingLaps.find((lap) => lap.dayIndex === dayIndex && lap.lapNumber === lapNumber);
      return [{
        id: existing?.id || key,
        dayIndex,
        lapNumber,
        name,
        standardCode: draft.standardCode || null
      }];
    })
  );
}

function buildEntries(snapshot: Record<string, LapDraft>) {
  return weekdays.flatMap((_day, dayIndex) =>
    lapNumbers.map((lapNumber) => {
      const draft = snapshot[draftKey(dayIndex, lapNumber)] || { name: "", standardCode: "" };
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
}

function LapsSetupPageInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const focusDate = searchParams.get("focusDate");
  const requestedBlockId = searchParams.get("blockId");
  const notice = searchParams.get("notice");
  const targetLapNumber = Number(searchParams.get("targetLap"));
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [laps, setLaps] = useState<Lap[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [drafts, setDrafts] = useState<Record<string, LapDraft>>({});
  const [savedDrafts, setSavedDrafts] = useState<Record<string, LapDraft>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyAction, setCopyAction] = useState("");
  const appliedRequestedBlockId = useRef<string | null>(null);
  const draftsRef = useRef<Record<string, LapDraft>>({});
  const savedDraftsRef = useRef<Record<string, LapDraft>>({});
  const latestQueuedDraftsRef = useRef<Record<string, LapDraft>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const pendingSaveCountRef = useRef(0);
  const [activeDayIndex, setActiveDayIndex] = useState(() => Math.min(Math.max((new Date().getDay() + 6) % 7, 0), 4));
  const { ask, dialogProps: actionDialogProps } = useActionDialog();

  useEffect(() => {
    loadBlocks();
  }, []);

  const selectedBlock = useMemo(() => blocks.find((block) => block.id === blockId) || null, [blocks, blockId]);

  useEffect(() => {
    if (selectedBlock) void loadStandards(selectedBlock.gradeLevels);
  }, [selectedBlock]);

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
    if (appliedRequestedBlockId.current === requestedBlockId) return;
    if (!blocks.some((block) => block.id === requestedBlockId)) return;
    appliedRequestedBlockId.current = requestedBlockId;
    setCopyAction("");
    setBlockId(requestedBlockId);
  }, [requestedBlockId, blocks]);

  useEffect(() => {
    if (!returnTo || !focusDate) return;
    const targetDate = new Date(`${focusDate}T09:00:00`);
    const targetIndex = (targetDate.getDay() + 6) % 7;
    const targetLaps = laps.filter((lap) => lap.dayIndex === targetIndex && lap.name.trim());
    const targetLapIsReady = Number.isInteger(targetLapNumber) && targetLapNumber >= 1 && targetLapNumber <= 3
      ? targetLaps.some((lap) => lap.lapNumber === targetLapNumber)
      : targetLaps.length > 0;
    if (targetLapIsReady) {
      window.location.href = returnTo;
    }
  }, [laps, returnTo, focusDate, targetLapNumber]);

  useEffect(() => {
    if (notice !== "name-laps-before-monitoring") return;
    void ask({
      eyebrow: "Lap setup needed",
      title: "Name a lap before monitoring",
      description: "Give the lap a short instructional name. Your change will save automatically, and you will return directly to the monitoring date you selected.",
      confirmLabel: "Name This Lap",
      tone: "info",
      size: "large"
    });
  }, [ask, notice]);

  async function loadBlocks() {
    const res = await fetch("/api/blocks");
    if (res.status === 401) {
      setError("Please login first.");
      return;
    }
    const data = await res.json();
    const availableBlocks: Block[] = (data.blocks || []).map((block: Block) => ({
      ...block,
      gradeLevels: Array.isArray(block.gradeLevels) && block.gradeLevels.length > 0 ? block.gradeLevels : [7]
    }));
    setBlocks(availableBlocks);
    if (!blockId && availableBlocks.length) {
      const matchingBlock = requestedBlockId
        ? availableBlocks.find((block) => block.id === requestedBlockId)
        : null;
      setBlockId(matchingBlock ? matchingBlock.id : availableBlocks[0].id);
    }
  }

  async function loadStandards(gradeLevels: number[]) {
    const res = await fetch(`/api/standards?grades=${gradeLevels.join(",")}`);
    const data = await res.json();
    setStandards(data.standards || []);
  }

  async function loadLaps() {
    const res = await fetch(`/api/laps?blockId=${blockId}&weekStart=${weekStart.toISOString()}`);
    const data = await res.json();
    const nextLaps: Lap[] = data.laps || [];
    const nextDrafts = buildDraftMap(nextLaps);
    setLaps(nextLaps);
    setDrafts(nextDrafts);
    setSavedDrafts(nextDrafts);
    draftsRef.current = nextDrafts;
    savedDraftsRef.current = nextDrafts;
    latestQueuedDraftsRef.current = nextDrafts;
  }

  function startEditing() {
    setStatusMessage(null);
    const nextDrafts = buildDraftMap(laps);
    setDrafts(nextDrafts);
    setSavedDrafts(nextDrafts);
    draftsRef.current = nextDrafts;
    savedDraftsRef.current = nextDrafts;
    latestQueuedDraftsRef.current = nextDrafts;
    setEditing(true);
  }

  const queueAutosave = useCallback(function queueAutosave(
    snapshot: Record<string, LapDraft>,
    targetBlockId = blockId,
    targetWeekStart = weekStart
  ) {
    if (!targetBlockId) return Promise.resolve(false);
    const queuedSnapshot = structuredClone(snapshot);
    const targetWeekKey = targetWeekStart.toISOString();
    latestQueuedDraftsRef.current = queuedSnapshot;
    pendingSaveCountRef.current += 1;
    setSaving(true);
    setStatusMessage("Saving changes…");

    const operation = saveChainRef.current.catch(() => false).then(async () => {
      const res = await fetch("/api/laps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId: targetBlockId,
          weekStart: targetWeekKey,
          entries: buildEntries(queuedSnapshot)
        })
      });

      if (!res.ok) return false;

      if (blockId === targetBlockId && weekStart.toISOString() === targetWeekKey) {
        savedDraftsRef.current = queuedSnapshot;
        setSavedDrafts(queuedSnapshot);
        setLaps((current) => buildLapsFromDrafts(queuedSnapshot, current));
      }
      return true;
    });

    saveChainRef.current = operation;
    void operation.then((ok) => {
      pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
      if (!ok && blockId === targetBlockId && weekStart.toISOString() === targetWeekKey) {
        latestQueuedDraftsRef.current = savedDraftsRef.current;
        setStatusMessage("Unable to save laps. Your changes are still on screen.");
      } else if (
        ok &&
        blockId === targetBlockId &&
        weekStart.toISOString() === targetWeekKey &&
        lapDraftsMatch(queuedSnapshot, latestQueuedDraftsRef.current)
      ) {
        setStatusMessage("All changes saved.");
      }
      if (pendingSaveCountRef.current === 0) setSaving(false);
    });

    return operation;
  }, [blockId, weekStart]);

  async function flushAutosave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!lapDraftsMatch(draftsRef.current, latestQueuedDraftsRef.current)) {
      return queueAutosave(draftsRef.current);
    }
    return saveChainRef.current;
  }

  async function finishEditing() {
    const saved = await flushAutosave();
    if (!saved) return;
    setEditing(false);
    setStatusMessage("All changes saved.");
  }

  async function navigateAfterSaving(action: () => void) {
    const saved = await flushAutosave();
    if (saved) action();
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
      draftsRef.current = next;
      return next;
    });
  }

  function updateDraft(dayIndex: number, lapNumber: number, value: Partial<LapDraft>) {
    const key = draftKey(dayIndex, lapNumber);
    setDrafts((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...(prev[key] || { name: "", standardCode: "" }),
          ...value
        }
      };
      draftsRef.current = next;
      return next;
    });
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
    const nextDrafts = buildDraftMap(previousLaps);
    setDrafts(nextDrafts);
    draftsRef.current = nextDrafts;
    setEditing(true);
    setStatusMessage("Previous week copied. Changes will save automatically.");
  }

  async function copyFromClass(sourceBlockId: string) {
    if (!sourceBlockId) return;
    const res = await fetch(`/api/laps?blockId=${sourceBlockId}&weekStart=${weekStart.toISOString()}`);
    if (!res.ok) {
      setStatusMessage("Unable to load that class.");
      return;
    }
    const data = await res.json();
    const sourceLaps: Lap[] = data.laps || [];
    const sourceBlock = blocks.find((block) => block.id === sourceBlockId);
    if (sourceLaps.length === 0) {
      setStatusMessage(`${sourceBlock?.blockName || "That class"} has no lap names for this week.`);
      return;
    }
    const nextDrafts = buildDraftMap(sourceLaps);
    setDrafts(nextDrafts);
    draftsRef.current = nextDrafts;
    setEditing(true);
    setStatusMessage(`Copied this week from Block ${sourceBlock?.blockNumber}. Changes will save automatically.`);
  }

  const blockOptions = useMemo(
    () => blocks.map((block) => ({ id: block.id, label: `Block ${block.blockNumber} · ${block.blockName}` })),
    [blocks]
  );
  const copySourceOptions = useMemo(
    () => blockOptions.filter((block) => block.id !== blockId),
    [blockOptions, blockId]
  );

  const hasUnsavedChanges = useMemo(
    () => editing && !lapDraftsMatch(drafts, savedDrafts),
    [editing, drafts, savedDrafts]
  );

  useEffect(() => {
    if (!editing || lapDraftsMatch(drafts, latestQueuedDraftsRef.current)) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setStatusMessage("Changes pending…");
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void queueAutosave(drafts);
    }, 700);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [drafts, editing, queueAutosave]);

  const { dialogProps } = useUnsavedChangesGuard({
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
    <div className="mx-auto max-w-[1440px] space-y-3 px-4 py-4 sm:px-6">
      <div><ReturnToDashboardButton className="w-auto px-4 py-2 text-sm" /></div>

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div className="hero-card space-y-3 p-4">
        <div className="flex min-w-0 flex-wrap items-start gap-2">
          <select
            aria-label="Class"
            className="form-control w-full sm:w-[210px] sm:shrink-0 xl:w-[230px]"
            value={blockId}
            onChange={(e) => {
              const nextBlockId = e.target.value;
              void navigateAfterSaving(() => {
                setCopyAction("");
                setBlockId(nextBlockId);
              });
            }}
          >
            {blockOptions.map((block) => (
              <option key={block.id} value={block.id}>
                {block.label}
              </option>
            ))}
          </select>

          {selectedBlock && <div className="whitespace-nowrap rounded-full bg-black/5 px-3 py-2 text-xs font-semibold text-black/60">Grades {selectedBlock.gradeLevels.join(" + ")} standards</div>}

          <div className="grid grid-cols-[auto_auto] items-start gap-2">
            {!editing && (
              <button className="btn btn-primary col-span-2 px-4 py-2 text-sm" type="button" onClick={startEditing} disabled={!blockId}>
                Edit Week
              </button>
            )}
            {editing && (
              <>
                <div className="btn btn-primary col-span-2 justify-center px-4 py-2 text-sm" aria-current="true">
                  Editing Week
                </div>
                <button className="btn btn-ghost px-4 py-2 text-sm" type="button" onClick={() => void finishEditing()} disabled={saving}>
                  Done Editing
                </button>
                <select
                  aria-label="Copy laps"
                  className="form-control !w-[180px] py-2 text-sm"
                  value={copyAction}
                  onChange={(event) => {
                    const action = event.target.value;
                    setCopyAction("");
                    if (action === "previous-week") {
                      void copyPreviousWeek();
                    } else if (action) {
                      void copyFromClass(action);
                    }
                  }}
                  disabled={saving}
                >
                  <option value="">Copy…</option>
                  <option value="previous-week">Previous week</option>
                  {copySourceOptions.length > 0 && (
                    <optgroup label="This week from class">
                      {copySourceOptions.map((block) => (
                        <option key={`copy-${block.id}`} value={block.id}>{block.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </>
            )}
          </div>
        </div>

        {statusMessage && <div className="text-xs text-black/55" aria-live="polite">{statusMessage}</div>}

        <div className="space-y-3 md:hidden">
          <div className="grid grid-cols-[44px_repeat(5,minmax(0,1fr))_44px] gap-1 rounded-2xl border border-black/15 bg-black/[0.03] p-1">
            <button
              className="min-h-[48px] rounded-xl border border-black/15 bg-white text-lg font-bold shadow-sm"
              type="button"
              aria-label="Previous week"
              title={`Previous week · ${format(addDays(weekStart, -7), "MM/dd/yy")}`}
              onClick={() => void navigateAfterSaving(() => setWeekStart(addDays(weekStart, -7)))}
            >
              ←
            </button>
            {weekdays.map((day, dayIndex) => (
              <button
                key={`tab-${day}`}
                type="button"
                className={`min-h-[48px] rounded-xl border px-1 py-2 text-center text-xs font-semibold transition ${activeDayIndex === dayIndex ? "border-ocean bg-white text-black shadow-sm" : "border-black/10 bg-white/65 text-black/55"}`}
                onClick={() => setActiveDayIndex(dayIndex)}
              >
                <span className="block">{day}</span>
                <span className="block text-[10px] font-normal">{format(addDays(weekStart, dayIndex), "MM/dd")}</span>
              </button>
            ))}
            <button
              className="min-h-[48px] rounded-xl border border-black/15 bg-white text-lg font-bold shadow-sm"
              type="button"
              aria-label="Next week"
              title={`Next week · ${format(addDays(weekStart, 7), "MM/dd/yy")}`}
              onClick={() => void navigateAfterSaving(() => setWeekStart(addDays(weekStart, 7)))}
            >
              →
            </button>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
            {editing ? "Editing " : ""}<span className="font-semibold">{weekdays[activeDayIndex]}, {format(addDays(weekStart, activeDayIndex), "MMMM d")}</span> · 3 laps
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
                      <div className="break-words font-semibold [overflow-wrap:anywhere]">{lap?.name || <span className="text-black/35">No lap name</span>}</div>
                      <div className="mt-1 text-xs text-black/55">{lap?.standardCode || "No standard selected"}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden overflow-x-auto overflow-y-visible md:block">
          <table className="table table-compact w-full min-w-[1020px] table-fixed">
            <colgroup>
              <col className="w-[120px]" />
              {weekdays.map((day) => <col key={`column-${day}`} />)}
              <col className="w-[120px]" />
            </colgroup>
            <thead>
              <tr>
                <th className="p-1.5 align-middle">
                  <button
                    className="flex min-h-[58px] w-full items-center justify-center rounded-xl border border-black/20 bg-white px-2 text-sm font-bold shadow-sm transition hover:border-ocean hover:text-ocean"
                    type="button"
                    title={`Previous week · ${format(addDays(weekStart, -7), "MM/dd/yy")}`}
                    onClick={() => void navigateAfterSaving(() => setWeekStart(addDays(weekStart, -7)))}
                  >
                    ← Previous
                  </button>
                </th>
                {weekdays.map((day, index) => {
                  const isFocusDay = focusDayIndex === null || focusDayIndex === index;
                  return (
                    <th key={day} className="p-1.5 text-center">
                      <div className={`flex min-h-[58px] flex-col items-center justify-center rounded-xl border bg-white/75 ${focusDayIndex !== null && isFocusDay ? "border-ocean shadow-sm" : "border-black/15"}`}>
                        <div className="font-semibold text-[15px]">{day}</div>
                        <div className={`text-[13px] ${focusDayIndex !== null && isFocusDay ? "text-black" : "text-black/60"}`}>
                          {format(addDays(weekStart, index), "MM/dd")}
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th className="p-1.5 align-middle">
                  <button
                    className="flex min-h-[58px] w-full items-center justify-center rounded-xl border border-black/20 bg-white px-2 text-sm font-bold shadow-sm transition hover:border-ocean hover:text-ocean"
                    type="button"
                    title={`Next week · ${format(addDays(weekStart, 7), "MM/dd/yy")}`}
                    onClick={() => void navigateAfterSaving(() => setWeekStart(addDays(weekStart, 7)))}
                  >
                    Next →
                  </button>
                </th>
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
                      <td key={key} className="align-top whitespace-normal">
                    <div
                          className={`min-h-[88px] rounded-xl border p-2 transition ${
                            editing
                              ? "border-black/15 bg-white shadow-sm"
                              : focusDayIndex !== null && isFocusDay
                              ? "border-black/20 bg-white shadow-sm"
                              : "border-black/10 bg-white/92"
                          }`}
                        >
                          {!editing && (
                            <div className="min-h-[76px] space-y-1.5">
                              <div className="max-w-full overflow-hidden break-words whitespace-normal [overflow-wrap:anywhere] text-sm font-semibold leading-snug text-black">
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
                  <td aria-hidden="true"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UnsavedChangesDialog {...dialogProps} />
      <ActionDialog {...actionDialogProps} />
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
