"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import ActionDialog from "@/components/ActionDialog";
import ClassroomCanvas from "@/components/ClassroomCanvas";
import ReturnToDashboardButton from "@/components/ReturnToDashboardButton";
import StudentIndicators from "@/components/StudentIndicators";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import useActionDialog from "@/lib/useActionDialog";
import useUnsavedChangesGuard from "@/lib/useUnsavedChangesGuard";
import { normalizeSchoolYearLabel } from "@/lib/schoolYear";
import { normalizeDeskGeometry } from "@/lib/classroomGeometry";

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

type AttendanceStudent = {
  id: string;
  displayName: string;
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

type PerformanceUpdate = {
  studentId: string;
  lapNumber: number;
  color?: PerformanceColor;
  remove?: boolean;
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

function performanceUpdatesBetween(
  saved: Record<string, PerformanceColor>,
  draft: Record<string, PerformanceColor>
) {
  return [
    ...Object.entries(draft)
      .filter(([key, color]) => saved[key] !== color)
      .map(([key, color]) => {
        const [studentId, lapNumber] = key.split("::");
        return { studentId, lapNumber: Number(lapNumber), color };
      }),
    ...Object.keys(saved)
      .filter((key) => !(key in draft))
      .map((key) => {
        const [studentId, lapNumber] = key.split("::");
        return { studentId, lapNumber: Number(lapNumber), remove: true };
      })
  ] satisfies PerformanceUpdate[];
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
  const requestedDate = searchParams.get("date");

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [desks, setDesks] = useState<Desk[]>([]);
  const [activeStudents, setActiveStudents] = useState<string[]>([]);
  const [attendanceStudents, setAttendanceStudents] = useState<AttendanceStudent[]>([]);
  const [unassignedActiveStudents, setUnassignedActiveStudents] = useState<string[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [attendancePanel, setAttendancePanel] = useState(false);
  const [activeMode, setActiveMode] = useState<"attendance" | "performance">("attendance");
  const [savedAttendance, setSavedAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [draftAttendance, setDraftAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [savedPerformance, setSavedPerformance] = useState<Record<string, PerformanceColor>>({});
  const [draftPerformance, setDraftPerformance] = useState<Record<string, PerformanceColor>>({});
  const [selectedLaps, setSelectedLaps] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalWarningOpen, setHistoricalWarningOpen] = useState(false);
  const [historicalExplanation, setHistoricalExplanation] = useState("");
  const [historicalSubmitting, setHistoricalSubmitting] = useState(false);
  const [dateKey, setDateKey] = useState(() => /^\d{4}-\d{2}-\d{2}$/.test(requestedDate || "") ? requestedDate! : format(new Date(), "yyyy-MM-dd"));
  const [schoolToday, setSchoolToday] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [schoolYearStart, setSchoolYearStart] = useState("");
  const attendanceAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attendanceSaveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const latestAttendanceRef = useRef<Record<string, AttendanceStatus>>({});
  const persistedAttendanceRef = useRef<Record<string, AttendanceStatus>>({});
  const performanceAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const performanceSaveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const latestPerformanceRef = useRef<Record<string, PerformanceColor>>({});
  const persistedPerformanceRef = useRef<Record<string, PerformanceColor>>({});
  const historicalVisitKeyRef = useRef("");
  const { ask, dialogProps: actionDialogProps } = useActionDialog();

  const dateToUse = parseISO(`${dateKey}T12:00:00`);
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
    setSelectedLaps([]);
  }, [laps, dayIndex, isWeekday]);

  useEffect(() => {
    if (!blockId || loading) return;
    const visitKey = `${blockId}:${dateKey}:${activeMode}`;
    if (dateKey >= schoolToday) {
      setHistoricalWarningOpen(false);
      setHistoricalExplanation("");
      return;
    }
    if (historicalVisitKeyRef.current === visitKey || historicalWarningOpen) return;
    setHistoricalExplanation("");
    setHistoricalWarningOpen(true);
  }, [activeMode, blockId, dateKey, historicalWarningOpen, loading, schoolToday]);

  useEffect(
    () => () => {
      if (performanceAutosaveTimerRef.current) {
        clearTimeout(performanceAutosaveTimerRef.current);
      }
      if (attendanceAutosaveTimerRef.current) {
        clearTimeout(attendanceAutosaveTimerRef.current);
      }
    },
    []
  );

  async function loadBlocks() {
    const res = await fetch("/api/blocks");
    if (res.status === 401) {
      setError("Please login first.");
      return;
    }
    const data = await res.json();
    const nextBlocks: Block[] = data.blocks || [];
    const nextSchoolToday = typeof data.schoolDate === "string" ? data.schoolDate : format(new Date(), "yyyy-MM-dd");
    const normalizedSchoolYear = normalizeSchoolYearLabel(String(data.schoolYear?.label || ""));
    const schoolYearPrefix = normalizedSchoolYear?.slice(0, 2);
    const nextSchoolYearStart = schoolYearPrefix ? `20${schoolYearPrefix}-07-01` : "";
    setSchoolToday(nextSchoolToday);
    setSchoolYearStart(nextSchoolYearStart);
    const requestedDateIsValid = Boolean(
      requestedDate &&
      requestedDate <= nextSchoolToday &&
      (!nextSchoolYearStart || requestedDate >= nextSchoolYearStart)
    );
    setDateKey(requestedDateIsValid ? requestedDate! : nextSchoolToday);
    setBlocks(nextBlocks);
    if (nextBlocks.length === 0) setLoading(false);
    if (!blockId && nextBlocks.length) {
      const matchedBlock = requestedBlockId ? nextBlocks.find((block) => block.id === requestedBlockId) : null;
      setBlockId(matchedBlock ? matchedBlock.id : nextBlocks[0].id);
    }
  }

  async function loadMonitorData() {
    setLoading(true);

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
        .map((desk: Desk) => normalizeDeskGeometry(desk));

      const nextAttendanceStudents = (studentsData.students || [])
        .filter((student: { active: boolean }) => student.active)
        .map((student: AttendanceStudent) => ({ id: student.id, displayName: student.displayName }));
      const activeStudentIds = nextAttendanceStudents.map((student: AttendanceStudent) => student.id);

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
      setAttendanceStudents(nextAttendanceStudents);
      setUnassignedActiveStudents((unassignedData.students || []).map((student: { id: string }) => student.id));
      setLaps(lapsData.laps || []);
      setSavedAttendance(savedAttendanceMap);
      setDraftAttendance(cloneRecordMap(savedAttendanceMap));
      persistedAttendanceRef.current = cloneRecordMap(savedAttendanceMap);
      latestAttendanceRef.current = cloneRecordMap(savedAttendanceMap);
      setSavedPerformance(savedPerformanceMap);
      setDraftPerformance(cloneRecordMap(savedPerformanceMap));
      persistedPerformanceRef.current = cloneRecordMap(savedPerformanceMap);
      latestPerformanceRef.current = cloneRecordMap(savedPerformanceMap);
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

  const canUseSeatMap = unassignedActiveStudents.length === 0;
  const namedLapMap = useMemo(
    () => new Map(todayLaps.map((lap) => [lap.lapNumber, lap])),
    [todayLaps]
  );
  const namedLapCount = todayLaps.length;
  const isTestSession = !isWeekday;
  const canMonitorFromSeatMap = canUseSeatMap;

  const performanceMap = useMemo(() => draftPerformance, [draftPerformance]);
  const hasUnsavedChanges = useMemo(
    () =>
      !recordMapsEqual(savedAttendance, draftAttendance) ||
      !recordMapsEqual(savedPerformance, draftPerformance),
    [savedAttendance, draftAttendance, savedPerformance, draftPerformance]
  );

  const { dialogProps } = useUnsavedChangesGuard({
    when: hasUnsavedChanges,
    description: "You have unsaved attendance or monitoring changes on this screen. Leaving now will discard them."
  });

  function cycleAttendance(studentId: string) {
    const current = latestAttendanceRef.current[studentId];
    const nextStatus = current
      ? attendanceCycle[(attendanceCycle.indexOf(current) + 1) % attendanceCycle.length]
      : "PRESENT";
    const next = { ...latestAttendanceRef.current, [studentId]: nextStatus };
    setDraftAttendance(next);
    scheduleAttendanceAutosave(next);
  }

  function setAttendanceStatus(studentId: string, status: AttendanceStatus) {
    const next = { ...latestAttendanceRef.current, [studentId]: status };
    setDraftAttendance(next);
    scheduleAttendanceAutosave(next);
  }

  async function bulkAttendance(status: AttendanceStatus) {
    const confirmed = await ask({
      eyebrow: "Attendance shortcut",
      title: `Mark everyone ${attendanceLabel(status).toLowerCase()}?`,
      description: `This will set all ${activeStudents.length} active students to ${attendanceLabel(status).toLowerCase()}. You can still adjust individual students afterward.`,
      confirmLabel: `Mark All ${attendanceLabel(status)}`,
      cancelLabel: "Cancel",
      tone: "info"
    });
    if (!confirmed) return;
    const next = { ...latestAttendanceRef.current };
    activeStudents.forEach((studentId) => {
      next[studentId] = status;
    });
    setDraftAttendance(next);
    scheduleAttendanceAutosave(next);
  }

  async function persistAttendanceSnapshot(snapshot: Record<string, AttendanceStatus>) {
    const records = Object.entries(snapshot)
      .filter(([studentId, status]) => persistedAttendanceRef.current[studentId] !== status)
      .map(([studentId, status]) => ({ studentId, status }));

    if (!records.length) {
      return true;
    }

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, date: dateKey, records })
      });
      if (!response.ok) throw new Error("attendance");

      const persisted = cloneRecordMap(snapshot);
      persistedAttendanceRef.current = persisted;
      setSavedAttendance(persisted);
      return true;
    } catch {
      setError("Attendance auto-save failed. Your changes remain on screen and will be retried before leaving.");
      return false;
    }
  }

  function scheduleAttendanceAutosave(snapshot: Record<string, AttendanceStatus>) {
    latestAttendanceRef.current = snapshot;
    if (attendanceAutosaveTimerRef.current) clearTimeout(attendanceAutosaveTimerRef.current);
    setError(null);

    attendanceAutosaveTimerRef.current = setTimeout(() => {
      attendanceAutosaveTimerRef.current = null;
      const queuedSnapshot = cloneRecordMap(latestAttendanceRef.current);
      attendanceSaveQueueRef.current = attendanceSaveQueueRef.current.then(() =>
        persistAttendanceSnapshot(queuedSnapshot)
      );
    }, 300);
  }

  async function flushAttendanceAutosave() {
    if (attendanceAutosaveTimerRef.current) {
      clearTimeout(attendanceAutosaveTimerRef.current);
      attendanceAutosaveTimerRef.current = null;
    }
    const snapshot = cloneRecordMap(latestAttendanceRef.current);
    attendanceSaveQueueRef.current = attendanceSaveQueueRef.current.then(() =>
      persistAttendanceSnapshot(snapshot)
    );
    return attendanceSaveQueueRef.current;
  }

  async function persistPerformanceSnapshot(snapshot: Record<string, PerformanceColor>) {
    const updates = performanceUpdatesBetween(persistedPerformanceRef.current, snapshot);
    if (!updates.length) {
      return true;
    }

    try {
      const response = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, date: dateKey, records: updates })
      });
      if (!response.ok) throw new Error("performance");

      const persisted = cloneRecordMap(snapshot);
      persistedPerformanceRef.current = persisted;
      setSavedPerformance(persisted);

      return true;
    } catch {
      setError("Monitoring auto-save failed. Your changes remain on screen and will be retried before leaving.");
      return false;
    }
  }

  function schedulePerformanceAutosave(snapshot: Record<string, PerformanceColor>) {
    latestPerformanceRef.current = snapshot;
    if (performanceAutosaveTimerRef.current) {
      clearTimeout(performanceAutosaveTimerRef.current);
    }
    setError(null);

    performanceAutosaveTimerRef.current = setTimeout(() => {
      performanceAutosaveTimerRef.current = null;
      const queuedSnapshot = cloneRecordMap(latestPerformanceRef.current);
      performanceSaveQueueRef.current = performanceSaveQueueRef.current.then(() =>
        persistPerformanceSnapshot(queuedSnapshot)
      );
    }, 300);
  }

  async function flushPerformanceAutosave() {
    if (performanceAutosaveTimerRef.current) {
      clearTimeout(performanceAutosaveTimerRef.current);
      performanceAutosaveTimerRef.current = null;
    }
    const snapshot = cloneRecordMap(latestPerformanceRef.current);
    performanceSaveQueueRef.current = performanceSaveQueueRef.current.then(() =>
      persistPerformanceSnapshot(snapshot)
    );
    return performanceSaveQueueRef.current;
  }

  function cyclePerformance(studentId: string, lapNumber: number) {
    const key = performanceKey(studentId, lapNumber);
    const currentColor = latestPerformanceRef.current[key] ?? null;
    const nextColor = colorCycle[(colorCycle.indexOf(currentColor) + 1) % colorCycle.length];
    const next = cloneRecordMap(latestPerformanceRef.current);
    if (nextColor) next[key] = nextColor;
    else delete next[key];

    setDraftPerformance(next);
    schedulePerformanceAutosave(next);
  }

  function lapsSetupHref(includeNotice = false, targetLap?: number) {
    const base = `/setup/laps?blockId=${blockId}&focusDate=${dateKey}&returnTo=${encodeURIComponent(
      `/monitor?blockId=${blockId}&mode=performance&date=${dateKey}`
    )}`;
    return `${base}${includeNotice ? "&notice=name-laps-before-monitoring" : ""}${targetLap ? `&targetLap=${targetLap}` : ""}`;
  }

  async function requestLapSetup(lapNumber: number) {
    const confirmed = await ask({
      eyebrow: "Lap setup needed",
      title: `Lap ${lapNumber} is not named`,
      description: <>There is no name for Lap {lapNumber} on <strong>{format(dateToUse, "EEEE, MMMM d")}</strong>. Name it now, and you will return directly to this monitoring date after it saves automatically.</>,
      confirmLabel: "Name This Lap",
      cancelLabel: "Not Now",
      tone: "info",
      size: "large"
    });
    if (!confirmed) return;
    const saved = activeMode === "performance"
      ? await flushPerformanceAutosave()
      : await flushAttendanceAutosave();
    if (saved) router.push(lapsSetupHref(true, lapNumber));
  }

  async function changeMonitorDate(nextDate: string) {
    if (!nextDate || nextDate < schoolYearStart || nextDate > schoolToday || nextDate === dateKey) return;
    const changeDate = () => setDateKey(nextDate);
    const saved = activeMode === "performance"
      ? await flushPerformanceAutosave()
      : await flushAttendanceAutosave();
    if (saved) changeDate();
  }

  async function handleCommandCenter() {
    const saved = activeMode === "performance"
      ? await flushPerformanceAutosave()
      : await flushAttendanceAutosave();
    if (saved) window.location.assign("/dashboard");
  }

  async function authorizeHistoricalEditing() {
    const explanation = historicalExplanation.replace(/\s+/g, " ").trim();
    if (explanation.length < 3 || historicalSubmitting) return;
    setHistoricalSubmitting(true);
    try {
      const response = await fetch("/api/historical-edit-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, date: dateKey, mode: activeMode, explanation })
      });
      if (!response.ok) throw new Error("historical-edit-reason");
      historicalVisitKeyRef.current = `${blockId}:${dateKey}:${activeMode}`;
      setHistoricalWarningOpen(false);
      setHistoricalExplanation("");
    } catch {
      setError("Unable to record the required explanation. Prior-day editing remains locked.");
    } finally {
      setHistoricalSubmitting(false);
    }
  }

  const monitoringLaps = lapNumbers.map((lapNumber) => {
    const lap = namedLapMap.get(lapNumber);
    return {
      lapNumber,
      label: lap?.name || (isTestSession ? `Test Lap ${lapNumber}` : `Name Lap ${lapNumber}`),
      isNamed: isTestSession || Boolean(lap?.name),
      isSelected: selectedLaps.includes(lapNumber)
    };
  });
  const selectedMonitoringLaps = monitoringLaps.filter((lap) => lap.isNamed && lap.isSelected);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6">
      <div>
        <ReturnToDashboardButton onClick={handleCommandCenter} />
      </div>

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      {!isWeekday && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950 shadow-sm">
          <span className="font-semibold">Weekend test session.</span> You can take attendance and monitor all three test
          laps today. Saturday and Sunday records are automatically excluded from standard reports.
        </div>
      )}

      {dateKey < schoolToday && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 shadow-sm">
          Editing records for <span className="font-semibold">{format(dateToUse, "EEEE, MMMM d, yyyy")}</span>.
        </div>
      )}

      {!loading && blocks.length === 0 && (
        <div className="hero-card p-4 text-sm text-black/70">
          No blocks yet. Create a block first from the dashboard setup actions.
        </div>
      )}

      {blocks.length > 0 && (
        <div className="hero-card p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {activeMode === "attendance" && (
                <button
                  className="btn btn-ghost px-4 py-2"
                  type="button"
                  onClick={() => setAttendancePanel(true)}
                >
                  Attendance List
                </button>
              )}
            </div>

            <div className="grid w-full grid-cols-[40px_minmax(0,1fr)_40px_auto] items-center gap-1.5 sm:w-auto sm:grid-cols-[40px_156px_40px_auto]">
              <button className="inline-flex h-10 items-center justify-center rounded-lg border border-black/15 bg-white text-sm font-semibold" type="button" aria-label="Previous monitoring date" onClick={() => void changeMonitorDate(format(addDays(dateToUse, -1), "yyyy-MM-dd"))} disabled={Boolean(schoolYearStart && dateKey <= schoolYearStart)}>←</button>
              <input className="h-10 min-w-0 rounded-lg border border-black/15 bg-white px-2 text-sm font-medium sm:w-[156px]" type="date" value={dateKey} min={schoolYearStart || undefined} max={schoolToday} onChange={(event) => void changeMonitorDate(event.target.value)} aria-label="Monitoring date" />
              <button className="inline-flex h-10 items-center justify-center rounded-lg border border-black/15 bg-white text-sm font-semibold" type="button" aria-label="Next monitoring date" onClick={() => void changeMonitorDate(format(addDays(dateToUse, 1), "yyyy-MM-dd"))} disabled={dateKey >= schoolToday}>→</button>
              <button className="inline-flex h-10 items-center rounded-lg border border-black/15 bg-white px-3 text-sm font-semibold" type="button" onClick={() => void changeMonitorDate(schoolToday)} disabled={dateKey === schoolToday}>Today</button>
            </div>

            {activeMode === "performance" && (
              <div
              className={`w-full text-center text-sm ${
                activeMode === "performance" && namedLapCount > 0 && selectedMonitoringLaps.length === 0
                  ? "font-bold text-black"
                  : "text-black/60"
              }`}
            >
              {loading
                ? "Loading..."
                : !canUseSeatMap
                ? "Assign every active student before monitoring from the seat map."
                : selectedMonitoringLaps.length === 0
                ? "Select one or more Laps"
                : "You may select more than one lap to monitor at the same time."}
              </div>
            )}
          </div>

          {!loading && activeMode === "performance" && !attendanceComplete && canUseSeatMap && (
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
                      aria-pressed={lap.isSelected}
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
                      onClick={() => void requestLapSetup(lap.lapNumber)}
                    >
                      Name Lap {lap.lapNumber}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          <div className={`hero-card relative aspect-[1040/528] w-full overflow-visible ${activeMode === "attendance" ? "bg-black/5" : ""}`}>
            {!canUseSeatMap && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/45 px-6 text-center text-white">
                <div className="text-4xl font-semibold">Assign Seats</div>
                <div className="max-w-md text-sm text-white/90">
                  {unassignedActiveStudents.length} active student
                  {unassignedActiveStudents.length === 1 ? " is" : "s are"} still unassigned.
                </div>
                <Link href="/setup/seating" className="btn border-white bg-white text-black hover:bg-white/90">
                  Go to Seating Chart
                </Link>
              </div>
            )}

            {!loading && canUseSeatMap && activeMode === "performance" && namedLapCount === 0 && !isTestSession && (
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
                      onClick={() => void requestLapSetup(1)}
                    >
                      Name Your Laps
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => void handleCommandCenter()}
                    >
                      Command Center
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ClassroomCanvas
              className={`h-full border-0 bg-transparent shadow-none transition duration-200 ${
                activeMode === "performance" && selectedMonitoringLaps.length === 0
                  ? "pointer-events-none grayscale opacity-35"
                  : ""
              }`}
              maxScale={2}
            >
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
                    if (!desk.studentId || activeMode !== "attendance" || !canUseSeatMap) return;
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
                    <StudentIndicators student={desk.student} />
                  )}

                  {activeMode === "performance" && !isAbsent && selectedMonitoringLaps.length > 0 && (
                    <div className="absolute inset-0 z-0 flex overflow-hidden rounded-2xl">
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
            </ClassroomCanvas>
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
              <h2 className="section-title">Mark attendance</h2>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-ghost" type="button" onClick={() => void bulkAttendance("PRESENT")}>
                  All Present
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setAttendancePanel(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {attendanceStudents
                .slice()
                .sort((left, right) => left.displayName.localeCompare(right.displayName))
                .map((student) => {
                  const status = draftAttendance[student.id];
                  return (
                    <div key={`att-${student.id}`} className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-base font-semibold">{student.displayName}</div>
                        <div className="flex flex-wrap gap-2">
                          {attendanceCycle.map((state) => (
                            <button
                              key={`${student.id}-${state}`}
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
                              onClick={() => setAttendanceStatus(student.id, state)}
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

      {historicalWarningOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
          <div className="hero-card w-full max-w-2xl space-y-5 p-6 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="historical-edit-heading">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Prior-day warning</div>
              <h2 className="mt-2 text-2xl font-bold" id="historical-edit-heading">You are entering data for a prior day</h2>
              <p className="mt-3 text-sm leading-relaxed text-black/65">
                You are about to edit {activeMode === "attendance" ? "attendance" : "monitoring"} records for <strong>{format(dateToUse, "EEEE, MMMM d, yyyy")}</strong>. Changes will be saved to that date, not today. Explain why this prior-day record is being changed before continuing.
              </p>
            </div>
            <label className="block">
              <span className="text-sm font-bold">Explanation Required</span>
              <textarea
                autoFocus
                className="form-control mt-2 min-h-[110px] resize-y"
                maxLength={500}
                placeholder="Enter the reason for editing this prior-day record."
                value={historicalExplanation}
                onChange={(event) => setHistoricalExplanation(event.target.value)}
              />
              <span className="mt-1 block text-right text-xs text-black/40">{historicalExplanation.length}/500</span>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="btn btn-ghost px-4 py-2"
                type="button"
                disabled={historicalSubmitting}
                onClick={() => {
                  setHistoricalWarningOpen(false);
                  setHistoricalExplanation("");
                  setDateKey(schoolToday);
                }}
              >
                Return to Today
              </button>
              <button
                className="btn btn-primary px-4 py-2"
                type="button"
                disabled={historicalExplanation.trim().length < 3 || historicalSubmitting}
                onClick={() => void authorizeHistoricalEditing()}
              >
                {historicalSubmitting ? "Recording…" : "Continue to Prior Day"}
              </button>
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesDialog {...dialogProps} />
      <ActionDialog {...actionDialogProps} />
    </div>
  );
}

export default function MonitorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1600px] px-6 py-10">Loading…</div>}>
      <MonitorPageInner />
    </Suspense>
  );
}
