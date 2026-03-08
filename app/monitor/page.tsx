"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, startOfWeek } from "date-fns";
import ReturnToDashboardButton from "@/components/ReturnToDashboardButton";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import useUnsavedChangesGuard from "@/lib/useUnsavedChangesGuard";

type Block = { id: string; blockNumber: number; blockName: string };

type Desk = {
  id: string;
  type: "STUDENT" | "TEACHER";
  studentId: string | null;
  seatNumber: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  student?: {
    displayName: string;
    ml: boolean;
    mlNew: boolean;
    iep504: boolean;
    ec: boolean;
    ca: boolean;
    hiit: boolean;
    eog: "FIVE" | "FOUR" | "THREE" | "NP" | null;
  } | null;
};

type AttendanceStatus = "PRESENT" | "ABSENT" | "TARDY" | "LEFT_EARLY";

type AttendanceRecord = {
  studentId: string;
  status: AttendanceStatus;
};

type Lap = {
  dayIndex: number;
  lapNumber: number;
  name: string;
};

type PerformanceColor = "GREEN" | "YELLOW" | "RED";

type PerformanceRecord = {
  studentId: string;
  lapNumber: number;
  color: PerformanceColor;
};

const colorCycle: (PerformanceColor | null)[] = ["GREEN", "YELLOW", "RED", null];
const attendanceCycle: AttendanceStatus[] = ["PRESENT", "ABSENT", "TARDY", "LEFT_EARLY"];
const lapNumbers = [1, 2, 3];

function performanceKey(studentId: string, lapNumber: number) {
  return `${studentId}::${lapNumber}`;
}

function cloneRecordMap<T extends string>(value: Record<string, T>) {
  return Object.fromEntries(Object.entries(value)) as Record<string, T>;
}

function recordMapsEqual<T extends string>(left: Record<string, T>, right: Record<string, T>) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
}

function attendanceLabel(status: AttendanceStatus) {
  return status.replace("_", " ");
}

function performanceBackground(color?: PerformanceColor) {
  return color === "GREEN"
    ? "rgba(52, 211, 153, 0.25)"
    : color === "YELLOW"
    ? "rgba(253, 224, 71, 0.25)"
    : color === "RED"
    ? "rgba(248, 113, 113, 0.25)"
    : "transparent";
}

function MonitorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBlockId = searchParams.get("blockId");
  const requestedMode = searchParams.get("mode") === "performance" ? "performance" : "attendance";

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [desks, setDesks] = useState<Desk[]>([]);
  const [activeStudents, setActiveStudents] = useState<string[]>([]);
  const [unassignedActiveStudents, setUnassignedActiveStudents] = useState<string[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [attendancePanel, setAttendancePanel] = useState(false);
  const [activeMode, setActiveMode] = useState<"attendance" | "performance">("attendance");
  const [savedAttendance, setSavedAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [draftAttendance, setDraftAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [savedPerformance, setSavedPerformance] = useState<Record<string, PerformanceColor>>({});
  const [draftPerformance, setDraftPerformance] = useState<Record<string, PerformanceColor>>({});
  const [selectedLaps, setSelectedLaps] = useState<number[]>([]);
  const [attendanceCompletionPromptOpen, setAttendanceCompletionPromptOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attendanceReadyRef = useRef(false);
  const attendancePromptInitializedRef = useRef(false);

  const dateToUse = new Date();
  const dateKey = format(dateToUse, "yyyy-MM-dd");
  const weekStart = startOfWeek(dateToUse, { weekStartsOn: 1 });
  const dayIndex = (dateToUse.getDay() + 6) % 7;
  const isWeekday = dayIndex >= 0 && dayIndex <= 4;

  useEffect(() => {
    loadBlocks();
  }, []);

  useEffect(() => {
    if (!blockId) return;
    loadMonitorData();
  }, [blockId, dateKey]);

  useEffect(() => {
    if (!requestedBlockId) return;
    if (!blocks.some((block) => block.id === requestedBlockId)) return;
    if (requestedBlockId !== blockId) {
      setBlockId(requestedBlockId);
    }
  }, [requestedBlockId, blocks, blockId]);

  useEffect(() => {
    setActiveMode(requestedMode === "performance" ? "performance" : "attendance");
  }, [blockId, requestedMode]);

  useEffect(() => {
    attendancePromptInitializedRef.current = false;
    setAttendanceCompletionPromptOpen(false);
  }, [blockId, dateKey, activeMode]);

  useEffect(() => {
    const availableLapNumbers = laps
      .filter((lap) => lap.dayIndex === dayIndex)
      .sort((left, right) => left.lapNumber - right.lapNumber)
      .map((lap) => lap.lapNumber);

    setSelectedLaps((prev) => {
      const filtered = prev.filter((lapNumber) => availableLapNumbers.includes(lapNumber));
      if (availableLapNumbers.length === 0) {
        return filtered.length === 0 ? prev : [];
      }
      return filtered.length > 0 ? filtered : availableLapNumbers;
    });
  }, [laps, dayIndex]);

  async function loadBlocks() {
    const res = await fetch("/api/blocks");
    if (res.status === 401) {
      setError("Please login first.");
      return;
    }
    const data = await res.json();
    const nextBlocks: Block[] = data.blocks || [];
    setBlocks(nextBlocks);
    if (!blockId && nextBlocks.length) {
      const matchedBlock = requestedBlockId ? nextBlocks.find((block) => block.id === requestedBlockId) : null;
      setBlockId(matchedBlock ? matchedBlock.id : nextBlocks[0].id);
    }
  }

  async function loadMonitorData() {
    setLoading(true);
    setSaveState(null);

    try {
      const [desksRes, studentsRes, unassignedRes, attendanceRes, lapsRes, performanceRes] = await Promise.all([
        fetch(`/api/desks?blockId=${blockId}`),
        fetch(`/api/students?blockId=${blockId}`),
        fetch(`/api/desks?blockId=${blockId}&unassigned=1`),
        fetch(`/api/attendance?blockId=${blockId}&date=${dateKey}`),
        fetch(`/api/laps?blockId=${blockId}&weekStart=${weekStart.toISOString()}`),
        fetch(`/api/performance?blockId=${blockId}&date=${dateKey}`)
      ]);

      const desksData = desksRes.ok ? await desksRes.json() : { desks: [] };
      const studentsData = studentsRes.ok ? await studentsRes.json() : { students: [] };
      const unassignedData = unassignedRes.ok ? await unassignedRes.json() : { students: [] };
      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : { attendance: [] };
      const lapsData = lapsRes.ok ? await lapsRes.json() : { laps: [] };
      const performanceData = performanceRes.ok ? await performanceRes.json() : { performance: [] };

      const nextDesks = (desksData.desks || [])
        .filter((desk: Desk) => desk.type === "STUDENT")
        .map((desk: Desk) => ({
          ...desk,
          width: desk.width > 116 ? 116 : desk.width,
          height: desk.height > 82 ? 82 : desk.height
        }));

      const activeStudentIds = (studentsData.students || [])
        .filter((student: { active: boolean }) => student.active)
        .map((student: { id: string }) => student.id);

      const savedAttendanceMap = Object.fromEntries(
        (attendanceData.attendance || []).map((record: AttendanceRecord) => [record.studentId, record.status])
      ) as Record<string, AttendanceStatus>;

      const savedPerformanceMap = Object.fromEntries(
        (performanceData.performance || []).map((record: PerformanceRecord) => [
          performanceKey(record.studentId, record.lapNumber),
          record.color
        ])
      ) as Record<string, PerformanceColor>;

      setDesks(nextDesks);
      setActiveStudents(activeStudentIds);
      setUnassignedActiveStudents((unassignedData.students || []).map((student: { id: string }) => student.id));
      setLaps(lapsData.laps || []);
      setSavedAttendance(savedAttendanceMap);
      setDraftAttendance(cloneRecordMap(savedAttendanceMap));
      setSavedPerformance(savedPerformanceMap);
      setDraftPerformance(cloneRecordMap(savedPerformanceMap));
      setError(null);
    } catch {
      setError("Unable to load monitor data.");
    } finally {
      setLoading(false);
    }
  }

  const todayLaps = useMemo(
    () => laps.filter((lap) => lap.dayIndex === dayIndex).sort((a, b) => a.lapNumber - b.lapNumber),
    [laps, dayIndex]
  );

  const attendanceComplete = useMemo(() => {
    if (activeStudents.length === 0) return false;
    return activeStudents.every((studentId) => Boolean(draftAttendance[studentId]));
  }, [activeStudents, draftAttendance]);

  const canTakeAttendance = unassignedActiveStudents.length === 0;
  const namedLapMap = useMemo(
    () => new Map(todayLaps.map((lap) => [lap.lapNumber, lap])),
    [todayLaps]
  );
  const namedLapCount = todayLaps.length;
  const canMonitorFromSeatMap = canTakeAttendance && isWeekday;

  const performanceMap = useMemo(() => draftPerformance, [draftPerformance]);
  const hasUnsavedChanges = useMemo(
    () =>
      !recordMapsEqual(savedAttendance, draftAttendance) ||
      !recordMapsEqual(savedPerformance, draftPerformance),
    [savedAttendance, draftAttendance, savedPerformance, draftPerformance]
  );

  const { dialogProps, requestNavigation } = useUnsavedChangesGuard({
    when: hasUnsavedChanges,
    description: "You have unsaved attendance or monitoring changes on this screen. Leaving now will discard them."
  });

  useEffect(() => {
    if (loading || activeMode !== "attendance" || !canTakeAttendance) {
      attendanceReadyRef.current = attendanceComplete;
      return;
    }

    if (!attendancePromptInitializedRef.current) {
      attendancePromptInitializedRef.current = true;
      attendanceReadyRef.current = attendanceComplete;
      return;
    }

    const wasComplete = attendanceReadyRef.current;
    attendanceReadyRef.current = attendanceComplete;

    if (!wasComplete && attendanceComplete) {
      setAttendanceCompletionPromptOpen(true);
    }
  }, [attendanceComplete, activeMode, canTakeAttendance, loading]);

  function cycleAttendance(studentId: string) {
    setDraftAttendance((prev) => {
      const current = prev[studentId];
      const next = current
        ? attendanceCycle[(attendanceCycle.indexOf(current) + 1) % attendanceCycle.length]
        : "PRESENT";
      return {
        ...prev,
        [studentId]: next
      };
    });
    setSaveState(null);
  }

  function setAttendanceStatus(studentId: string, status: AttendanceStatus) {
    setDraftAttendance((prev) => ({
      ...prev,
      [studentId]: status
    }));
    setSaveState(null);
  }

  function bulkAttendance(status: AttendanceStatus) {
    const ok = confirm(`Mark all active students as ${attendanceLabel(status)}?`);
    if (!ok) return;
    setDraftAttendance((prev) => {
      const next = { ...prev };
      activeStudents.forEach((studentId) => {
        next[studentId] = status;
      });
      return next;
    });
    setSaveState(null);
  }

  function cyclePerformance(studentId: string, lapNumber: number) {
    const key = performanceKey(studentId, lapNumber);
    const currentColor = draftPerformance[key] ?? null;
    const nextColor = colorCycle[(colorCycle.indexOf(currentColor) + 1) % colorCycle.length];

    setDraftPerformance((prev) => {
      if (!nextColor) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: nextColor
      };
    });
    setSaveState(null);
  }

  function lapsSetupHref(includeNotice = false) {
    const base = `/setup/laps?blockId=${blockId}&focusDate=${dateKey}&returnTo=${encodeURIComponent(
      `/monitor?blockId=${blockId}&mode=performance`
    )}`;
    return includeNotice ? `${base}&notice=name-laps-before-monitoring` : base;
  }

  async function saveChanges(options: { nextUrl?: string } = {}) {
    const { nextUrl } = options;
    if (!blockId) {
      if (nextUrl) router.push(nextUrl);
      return;
    }

    if (!hasUnsavedChanges) {
      setSaveState("No unsaved changes.");
      if (nextUrl) {
        router.push(nextUrl);
      }
      return;
    }

    setSaving(true);
    setSaveState(null);

    const attendanceUpdates = Object.entries(draftAttendance)
      .filter(([studentId, status]) => savedAttendance[studentId] !== status)
      .map(([studentId, status]) => ({ studentId, status }));

    const performanceUpdates = [
      ...Object.entries(draftPerformance)
        .filter(([key, color]) => savedPerformance[key] !== color)
        .map(([key, color]) => {
          const [studentId, lapNumber] = key.split("::");
          return {
            studentId,
            lapNumber: Number(lapNumber),
            color
          };
        }),
      ...Object.keys(savedPerformance)
        .filter((key) => !(key in draftPerformance))
        .map((key) => {
          const [studentId, lapNumber] = key.split("::");
          return {
            studentId,
            lapNumber: Number(lapNumber),
            remove: true
          };
        })
    ];

    try {
      if (attendanceUpdates.length) {
        const attendanceRes = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockId,
            date: dateKey,
            records: attendanceUpdates
          })
        });
        if (!attendanceRes.ok) {
          throw new Error("attendance");
        }
      }

      if (performanceUpdates.length) {
        const performanceRes = await fetch("/api/performance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockId,
            date: dateKey,
            records: performanceUpdates
          })
        });
        if (!performanceRes.ok) {
          throw new Error("performance");
        }
      }

      setSavedAttendance(cloneRecordMap(draftAttendance));
      setSavedPerformance(cloneRecordMap(draftPerformance));
      setSaveState("Saved.");

      if (nextUrl) {
        router.push(nextUrl);
      }
    } catch {
      setSaveState("Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAttendanceCompletionAction(action: "stay" | "monitor" | "dashboard") {
    if (action === "stay") {
      setAttendanceCompletionPromptOpen(false);
      return;
    }

    const nextUrl =
      action === "dashboard"
        ? "/dashboard"
        : namedLapCount === 0
        ? lapsSetupHref(true)
        : `/monitor?blockId=${blockId}&mode=performance`;

    setAttendanceCompletionPromptOpen(false);
    await saveChanges({ nextUrl });
  }

  const monitoringLaps = lapNumbers.map((lapNumber) => {
    const lap = namedLapMap.get(lapNumber);
    return {
      lapNumber,
      label: lap?.name || `Name Lap ${lapNumber}`,
      isNamed: Boolean(lap?.name),
      isSelected: selectedLaps.includes(lapNumber)
    };
  });
  const selectedMonitoringLaps = monitoringLaps.filter((lap) => lap.isNamed && lap.isSelected);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ReturnToDashboardButton />
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-black/60">
            {saveState || (hasUnsavedChanges ? "Unsaved changes" : "No unsaved changes")}
          </div>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => saveChanges()}
            disabled={!blockId || saving || !hasUnsavedChanges}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => saveChanges({ nextUrl: "/dashboard" })}
            disabled={!blockId || saving}
          >
            {saving ? "Saving..." : "Save & Return"}
          </button>
        </div>
      </div>

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      {!isWeekday && (
        <div className="hero-card p-4 text-sm text-black/70">
          Monitoring is available Monday through Friday. Today is outside the school-week workflow.
        </div>
      )}

      {blocks.length === 0 && (
        <div className="hero-card p-4 text-sm text-black/70">
          No blocks yet. Create a block first from the dashboard setup actions.
        </div>
      )}

      {blocks.length > 0 && (
        <div className="hero-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {activeMode === "attendance" && (
                <button
                  className="btn btn-ghost px-4 py-2"
                  type="button"
                  onClick={() => setAttendancePanel(true)}
                  disabled={!canTakeAttendance}
                >
                  Attendance List
                </button>
              )}
            </div>

            <div className="text-sm text-black/60">
              {loading
                ? "Loading..."
                : !canTakeAttendance
                ? "Seat every active student before using the seat map."
                : activeMode === "attendance"
                ? "Take attendance and save whenever you're ready."
                : namedLapCount === 0
                ? "Name at least one lap to begin monitoring."
                : selectedMonitoringLaps.length === 0
                ? "Select one or more named laps to begin monitoring."
                : "Named laps can be monitored immediately. Unnamed laps open Name Your Laps."}
            </div>
          </div>

          {activeMode === "performance" && !attendanceComplete && canTakeAttendance && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Attendance is not complete. Monitoring is still available, but attendance should be taken first.
            </div>
          )}

          {activeMode === "performance" && (
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="grid gap-2 md:grid-cols-3">
                {monitoringLaps.map((lap) =>
                  lap.isNamed ? (
                    <button
                      key={lap.lapNumber}
                      type="button"
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        lap.isSelected
                          ? "border-sky-500 bg-sky-50 shadow-[0_10px_24px_rgba(14,116,144,0.12)]"
                          : "border-black/10 bg-white hover:border-black/20"
                      }`}
                      onClick={() =>
                        setSelectedLaps((prev) =>
                          prev.includes(lap.lapNumber)
                            ? prev.filter((lapNumber) => lapNumber !== lap.lapNumber)
                            : [...prev, lap.lapNumber].sort((left, right) => left - right)
                        )
                      }
                    >
                      <div className="small-header text-black/45">Lap {lap.lapNumber}</div>
                      <div className="mt-1 text-sm font-semibold">{lap.label}</div>
                    </button>
                  ) : (
                    <button
                      key={lap.lapNumber}
                      type="button"
                      className="btn btn-ghost justify-center border-2 border-dashed border-black/20 px-3 py-3 text-center"
                      onClick={() => requestNavigation(() => router.push(lapsSetupHref(true)))}
                    >
                      Name Lap {lap.lapNumber}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          <div className={`hero-card relative h-[560px] overflow-visible p-4 pr-8 ${activeMode === "attendance" ? "bg-black/5" : ""}`}>
            {!canTakeAttendance && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/45 px-6 text-center text-white">
                <div className="text-4xl font-semibold">Assign Seats</div>
                <div className="max-w-md text-sm text-white/90">
                  {unassignedActiveStudents.length} active student
                  {unassignedActiveStudents.length === 1 ? " is" : "s are"} still unassigned.
                </div>
                <Link href="/setup/seating" className="btn btn-ghost">
                  Go to Seating Chart
                </Link>
              </div>
            )}

            {canTakeAttendance && activeMode === "performance" && namedLapCount === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[rgba(255,250,243,0.78)] px-6 backdrop-blur-sm">
                <div className="max-w-xl rounded-[24px] border border-black/10 bg-white/92 px-8 py-7 text-center shadow-[0_18px_40px_rgba(11,27,42,0.14)]">
                  <div className="text-2xl font-semibold">Name a lap before monitoring.</div>
                  <div className="mx-auto mt-3 max-w-xl text-sm text-black/65">
                    Monitoring is available from this screen, but at least one lap must be named first. You can name a lap
                    now or head back to the dashboard.
                  </div>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => requestNavigation(() => router.push(lapsSetupHref(true)))}
                    >
                      Name Your Laps
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => requestNavigation(() => router.push("/dashboard"))}
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {desks.map((desk) => {
              const status = desk.studentId ? draftAttendance[desk.studentId] : undefined;
              const isAbsent = status === "ABSENT";
              const statusColor =
                status === "PRESENT"
                  ? "bg-emerald-400"
                  : status === "ABSENT"
                  ? "bg-red-500"
                  : status === "TARDY"
                  ? "bg-yellow-300"
                  : status === "LEFT_EARLY"
                  ? "bg-orange-300"
                  : "bg-slate-200";
              const statusBg =
                activeMode === "performance"
                  ? "bg-slate-100/70"
                  : status
                  ? status === "PRESENT"
                    ? "bg-emerald-100"
                    : status === "ABSENT"
                    ? "bg-red-200"
                    : status === "TARDY"
                    ? "bg-yellow-100"
                    : "bg-orange-100"
                  : "bg-white";

              return (
                <div
                  key={desk.id}
                  className={`absolute rounded-2xl border border-black/10 px-2 py-2 text-center shadow ${statusBg} ${
                    isAbsent && activeMode === "performance" ? "opacity-30" : ""
                  } ${isAbsent ? "border-red-500" : ""}`}
                  style={{
                    left: desk.x,
                    top: desk.y,
                    width: desk.width,
                    height: desk.height,
                    transform: `rotate(${desk.rotation}deg)`
                  }}
                  onClick={() => {
                    if (!desk.studentId || activeMode !== "attendance" || !canTakeAttendance) return;
                    cycleAttendance(desk.studentId);
                  }}
                >
                  <div
                    className={`relative z-10 flex h-full w-full flex-col items-center justify-center ${
                      activeMode === "performance" ? "pointer-events-none" : ""
                    }`}
                  >
                    {!(isAbsent && activeMode === "performance") && (
                      <>
                        <div className="text-lg font-semibold text-center">{desk.student?.displayName}</div>
                        {activeMode === "attendance" && <div className={`mx-auto mt-2 h-2 w-10 rounded-full ${statusColor}`} />}
                      </>
                    )}
                  </div>

                  {desk.student && activeMode === "performance" && !isAbsent && (
                    <div className="pointer-events-none absolute inset-0 z-10">
                      <div className="absolute right-1 top-1 flex items-center gap-0.5">
                        {desk.student.hiit && (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[8px]"
                            style={{ background: "#b18ad8" }}
                          >
                            H
                          </span>
                        )}
                        {desk.student.eog && (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[8px] text-white"
                            style={{
                              background:
                                desk.student.eog === "FIVE"
                                  ? "#3f6db5"
                                  : desk.student.eog === "FOUR"
                                  ? "#4caf50"
                                  : desk.student.eog === "THREE"
                                  ? "#f2994a"
                                  : "#e74c3c"
                            }}
                          >
                            {desk.student.eog === "FIVE"
                              ? "5"
                              : desk.student.eog === "FOUR"
                              ? "4"
                              : desk.student.eog === "THREE"
                              ? "3"
                              : "NP"}
                          </span>
                        )}
                      </div>
                      <div className="absolute left-1 bottom-1 flex items-center gap-0.5">
                        {desk.student.ml && (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[8px]"
                            style={{ background: "#9ecae1" }}
                          >
                            ML
                          </span>
                        )}
                        {desk.student.mlNew && (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[8px]"
                            style={{
                              background:
                                "repeating-linear-gradient(45deg,#9ecae1,#9ecae1 3px,#ffffff 3px,#ffffff 6px)"
                            }}
                          >
                            ML
                          </span>
                        )}
                      </div>
                      <div className="absolute right-1 bottom-1 flex items-center gap-0.5">
                        {desk.student.iep504 && (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[8px]"
                            style={{ background: "#f5a9b8" }}
                          >
                            I
                          </span>
                        )}
                        {desk.student.ec && (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[8px]"
                            style={{ background: "#ffd633" }}
                          >
                            EC
                          </span>
                        )}
                        {desk.student.ca && (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-black text-[8px]"
                            style={{ background: "#ffffff" }}
                          >
                            CA
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {activeMode === "performance" && !isAbsent && selectedMonitoringLaps.length > 0 && (
                    <div className="absolute inset-0 z-0 flex">
                      {selectedMonitoringLaps.map((lap, index) => {
                        const currentColor = desk.studentId
                          ? performanceMap[performanceKey(desk.studentId, lap.lapNumber)]
                          : undefined;
                        return (
                          <button
                            key={`${desk.id}-${lap.lapNumber}`}
                            type="button"
                            className={index < selectedMonitoringLaps.length - 1 ? "flex-1 border-r border-black/10" : "flex-1"}
                            disabled={!canMonitorFromSeatMap || !desk.studentId}
                            style={{ background: performanceBackground(currentColor) }}
                            title={`Lap ${lap.lapNumber}: ${lap.label}`}
                            onClick={() => {
                              if (!desk.studentId) return;
                              cyclePerformance(desk.studentId, lap.lapNumber);
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {desks.length === 0 && !loading && (
              <div className="flex h-full items-center justify-center text-sm text-black/60">
                No seating chart found. Add desks from Seating Chart setup.
              </div>
            )}
          </div>

          {desks.length === 0 && !loading && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-black/60">
              No seating chart found.
              <Link href="/setup/seating" className="btn btn-ghost">
                Go to Seating Chart
              </Link>
            </div>
          )}
        </div>
      )}

      {attendancePanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="hero-card w-full max-w-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="small-header text-black/60">Attendance</div>
                <h2 className="section-title">Mark attendance</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-ghost" type="button" onClick={() => bulkAttendance("PRESENT")}>
                  All Present
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setAttendancePanel(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {desks
                .slice()
                .sort((left, right) => (left.student?.displayName || "").localeCompare(right.student?.displayName || ""))
                .map((desk) => {
                  if (!desk.studentId) return null;
                  const status = draftAttendance[desk.studentId];
                  return (
                    <div key={`att-${desk.id}`} className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-base font-semibold">{desk.student?.displayName}</div>
                        <div className="flex flex-wrap gap-2">
                          {attendanceCycle.map((state) => (
                            <button
                              key={`${desk.id}-${state}`}
                              type="button"
                              className={`btn ${
                                status === state
                                  ? state === "PRESENT"
                                    ? "bg-emerald-500 text-white"
                                    : state === "ABSENT"
                                    ? "bg-red-500 text-white"
                                    : state === "TARDY"
                                    ? "bg-yellow-400 text-black"
                                    : "bg-orange-400 text-black"
                                  : "btn-ghost"
                              }`}
                              onClick={() => setAttendanceStatus(desk.studentId as string, state)}
                            >
                              {attendanceLabel(state)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {attendanceCompletionPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6">
          <div className="hero-card w-full max-w-3xl p-8 text-center">
            <div className="small-header text-black/55">Attendance Complete</div>
            <h2 className="section-title mt-2">What should happen next?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-black/65">
              Every seated student now has an attendance record. You can stay here, move forward into monitoring, or save
              and head back to the dashboard.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <button
                className="btn btn-ghost min-h-[88px] justify-center text-center"
                type="button"
                onClick={() => handleAttendanceCompletionAction("stay")}
              >
                Return to Attendance
              </button>
              <button
                className="btn btn-primary min-h-[88px] justify-center text-center"
                type="button"
                onClick={() => handleAttendanceCompletionAction("monitor")}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Attendance and Move to Monitoring"}
              </button>
              <button
                className="btn btn-ghost min-h-[88px] justify-center text-center"
                type="button"
                onClick={() => handleAttendanceCompletionAction("dashboard")}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Attendance and Return to Dashboard"}
              </button>
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesDialog {...dialogProps} />
    </div>
  );
}

export default function MonitorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10">Loading…</div>}>
      <MonitorPageInner />
    </Suspense>
  );
}
