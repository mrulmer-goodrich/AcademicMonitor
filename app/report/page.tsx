"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { addDays, addMonths, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import ClassroomCanvas from "@/components/ClassroomCanvas";
import { normalizeDeskGeometry } from "@/lib/classroomGeometry";

type Block = {
  id: string;
  blockNumber: number;
  blockName: string;
};

type Student = {
  id: string;
  displayName: string;
  blockId: string;
  active: boolean;
  seatNumber: number;
};

type AttendanceStatus = "PRESENT" | "ABSENT" | "TARDY" | "LEFT_EARLY";
type PerformanceColor = "GREEN" | "YELLOW" | "RED";
type ReportType = "attendance" | "monitoring";
type ReportScope = "class" | "student";
type ClassAttendanceView = "day" | "week" | "month";

type ReportDesk = {
  id: string;
  studentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  student: {
    id: string;
    displayName: string;
    active: boolean;
  } | null;
};

type AttendanceRecord = {
  studentId: string;
  displayName: string;
  status: AttendanceStatus;
};

type AttendanceStudentReport = {
  block: Block;
  student: {
    id: string;
    displayName: string;
  };
  monthStart: string;
  monthEnd: string;
  records: {
    date: string;
    status: AttendanceStatus;
  }[];
};

type AttendanceClassReport = {
  block: Block;
  date: string;
  usesCurrentSeatingLayout: boolean;
  desks: ReportDesk[];
  students: {
    id: string;
    displayName: string;
    seatNumber: number;
  }[];
  attendance: AttendanceRecord[];
  summary: Record<AttendanceStatus, number>;
};

type AttendanceClassRangeReport = {
  block: Block;
  rangeStart: string;
  rangeEnd: string;
  dates: string[];
  students: {
    id: string;
    displayName: string;
    seatNumber: number;
  }[];
  attendance: (AttendanceRecord & { date: string })[];
  summary: Record<AttendanceStatus, number>;
};

type MonitoringReport = {
  block: Block;
  date: string;
  usesCurrentSeatingLayout: boolean;
  desks: ReportDesk[];
  students: {
    id: string;
    displayName: string;
    seatNumber: number;
  }[];
  attendance: {
    studentId: string;
    status: AttendanceStatus;
  }[];
  performance: {
    studentId: string;
    lapNumber: number;
    color: PerformanceColor;
  }[];
  laps: {
    lapNumber: number;
    name: string;
    standardCode: string | null;
  }[];
};

const calendarDayLabels = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const todayIso = format(new Date(), "yyyy-MM-dd");
const currentMonthIso = format(startOfMonth(new Date()), "yyyy-MM-dd");

function parseRequestedBlockId(value: string | null, legacyValue: string | null) {
  if (value) return value;
  if (!legacyValue) return "";
  return legacyValue.split(",").map((entry) => entry.trim()).find(Boolean) || "";
}

function parseRequestedReportType(value: string | null): ReportType | null {
  if (value === "attendance" || value === "monitoring") return value;
  return null;
}

function parseRequestedScope(value: string | null): ReportScope {
  return value === "student" ? "student" : "class";
}

function parseIsoDate(value: string) {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function shiftIsoDate(value: string, days: number) {
  return format(addDays(parseIsoDate(value), days), "yyyy-MM-dd");
}

function shiftMonthIso(value: string, months: number) {
  return format(startOfMonth(addMonths(parseIsoDate(value), months)), "yyyy-MM-dd");
}

function attendanceRange(view: Exclude<ClassAttendanceView, "day">, anchorIso: string) {
  const anchor = parseIsoDate(anchorIso);
  if (view === "week") {
    return {
      start: format(startOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end: format(endOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd")
    };
  }
  return {
    start: format(startOfMonth(anchor), "yyyy-MM-dd"),
    end: format(endOfMonth(anchor), "yyyy-MM-dd")
  };
}

function attendanceLabel(status: AttendanceStatus | "" | null | undefined) {
  if (!status) return "";
  return status.replace("_", " ");
}

function attendanceStatusClasses(status?: AttendanceStatus) {
  if (status === "PRESENT") return "bg-emerald-100 text-emerald-900";
  if (status === "ABSENT") return "bg-red-100 text-red-800";
  if (status === "TARDY") return "bg-yellow-100 text-yellow-900";
  if (status === "LEFT_EARLY") return "bg-orange-100 text-orange-900";
  return "bg-slate-50 text-black/30";
}

function attendanceStatusShort(status?: AttendanceStatus) {
  if (status === "PRESENT") return "P";
  if (status === "ABSENT") return "A";
  if (status === "TARDY") return "T";
  if (status === "LEFT_EARLY") return "LE";
  return "—";
}

function downloadWorkbook(filename: string, sheetName: string, rows: Record<string, string | number>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [columns.map(escapeCell).join(","), ...rows.map((row) => columns.map((column) => escapeCell(row[column] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function attendanceSeatClasses(status?: AttendanceStatus) {
  if (status === "ABSENT") return "bg-red-200 border-red-500";
  if (status === "TARDY") return "bg-yellow-100 border-yellow-400";
  if (status === "LEFT_EARLY") return "bg-orange-100 border-orange-400";
  if (status === "PRESENT") return "bg-emerald-100 border-emerald-400";
  return "bg-white border-black/10";
}

function attendanceBarClasses(status?: AttendanceStatus) {
  if (status === "ABSENT") return "bg-red-500";
  if (status === "TARDY") return "bg-yellow-300";
  if (status === "LEFT_EARLY") return "bg-orange-300";
  if (status === "PRESENT") return "bg-emerald-400";
  return "bg-slate-200";
}

function performanceBackground(color?: PerformanceColor) {
  if (color === "GREEN") return "rgba(52, 211, 153, 0.25)";
  if (color === "YELLOW") return "rgba(253, 224, 71, 0.25)";
  if (color === "RED") return "rgba(248, 113, 113, 0.25)";
  return "transparent";
}

function buildCalendarDays(monthIso: string) {
  const monthDate = startOfMonth(parseIsoDate(monthIso));
  const lastDay = endOfMonth(monthDate).getDate();
  const leadingBlanks = monthDate.getDay();
  const cells: Array<Date | null> = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function AttendanceCalendar({
  visibleMonth,
  records,
  onPreviousMonth,
  onNextMonth,
  onToday
}: {
  visibleMonth: string;
  records: AttendanceStudentReport["records"];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}) {
  const statusByDate = useMemo(
    () => new Map(records.map((record) => [record.date, record.status])),
    [records]
  );
  const cells = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthDate = startOfMonth(parseIsoDate(visibleMonth));

  return (
    <div className="mx-auto w-full max-w-[520px] rounded-[18px] border border-black/10 bg-white p-4 shadow-[0_12px_28px_rgba(11,27,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-base font-semibold text-black">{format(monthDate, "MMMM yyyy")}</div>
        <div className="flex gap-1">
          <button className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold" type="button" onClick={onPreviousMonth} aria-label="Previous month">←</button>
          <button className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold" type="button" onClick={onToday}>Today</button>
          <button className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold" type="button" onClick={onNextMonth} aria-label="Next month">→</button>
        </div>
      </div>
      <div className="mb-2 mt-4 grid grid-cols-7 text-center text-[12px] text-black/45">
        {calendarDayLabels.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-x-[6px] gap-y-[8px]">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`blank-${index}`} className="h-8 w-8" />;
          }

          const dateKey = format(cell, "yyyy-MM-dd");
          const status = statusByDate.get(dateKey);
          const circleClass =
            status === "ABSENT"
              ? "bg-red-500 text-white"
              : status === "TARDY"
              ? "bg-yellow-300 text-black"
              : status === "LEFT_EARLY"
              ? "bg-orange-300 text-black"
              : status === "PRESENT"
              ? "bg-emerald-200 text-emerald-950"
              : "text-black/45";

          return (
            <div key={dateKey} className="flex h-8 w-8 items-center justify-center justify-self-center">
              {status ? (
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium ${circleClass}`}>
                  {cell.getDate()}
                </div>
              ) : (
                <div className={`text-[13px] font-medium ${circleClass}`}>{cell.getDate()}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-black/60">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-200" />Present</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Absent</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-yellow-300" />Tardy</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-orange-300" />Left early</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-black/15" />No record</span>
      </div>
    </div>
  );
}

function AttendanceSeatChart({
  desks,
  attendanceByStudentId
}: {
  desks: ReportDesk[];
  attendanceByStudentId: Map<string, AttendanceStatus>;
}) {
  return (
    <ClassroomCanvas className="h-[min(560px,70vh)] min-h-[390px] p-4">
      {desks.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-black/60">
          No seating chart found for this block.
        </div>
      ) : (
        desks.map((desk) => {
          const normalizedDesk = normalizeDeskGeometry({ ...desk, type: "STUDENT" as const });
          const status = desk.studentId ? attendanceByStudentId.get(desk.studentId) : undefined;
          return (
            <div
              key={desk.id}
              className={`absolute rounded-2xl border px-2 py-2 text-center shadow ${attendanceSeatClasses(status)}`}
              style={{
                left: normalizedDesk.x,
                top: normalizedDesk.y,
                width: normalizedDesk.width,
                height: normalizedDesk.height,
                transform: `rotate(${desk.rotation}deg)`
              }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center">
                <div className="text-base font-semibold">{desk.student?.displayName || ""}</div>
                <div className={`mx-auto mt-2 h-2 w-10 rounded-full ${attendanceBarClasses(status)}`} />
              </div>
            </div>
          );
        })
      )}
    </ClassroomCanvas>
  );
}

function MonitoringSeatChart({
  desks,
  attendanceByStudentId,
  performanceByCell,
  selectedLaps
}: {
  desks: ReportDesk[];
  attendanceByStudentId: Map<string, AttendanceStatus>;
  performanceByCell: Map<string, PerformanceColor>;
  selectedLaps: MonitoringReport["laps"];
}) {
  return (
    <ClassroomCanvas className="h-[min(560px,70vh)] min-h-[390px] p-4">
      {desks.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-black/60">
          No seating chart found for this block.
        </div>
      ) : (
        desks.map((desk) => {
          const normalizedDesk = normalizeDeskGeometry({ ...desk, type: "STUDENT" as const });
          const status = desk.studentId ? attendanceByStudentId.get(desk.studentId) : undefined;
          const isAbsent = status === "ABSENT";

          return (
            <div
              key={desk.id}
              className={`absolute rounded-2xl border border-black/10 px-2 py-2 text-center shadow ${
                isAbsent ? "bg-red-200 opacity-35" : "bg-slate-100/75"
              }`}
              style={{
                left: normalizedDesk.x,
                top: normalizedDesk.y,
                width: normalizedDesk.width,
                height: normalizedDesk.height,
                transform: `rotate(${desk.rotation}deg)`
              }}
            >
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
                {!isAbsent && <div className="text-base font-semibold">{desk.student?.displayName || ""}</div>}
              </div>
              {!isAbsent && desk.studentId && selectedLaps.length > 0 && (
                <div className="absolute inset-0 z-0 flex">
                  {selectedLaps.map((lap, index) => {
                    const color = performanceByCell.get(`${desk.studentId}-${lap.lapNumber}`);
                    return (
                      <div
                        key={`${desk.id}-${lap.lapNumber}`}
                        className={index < selectedLaps.length - 1 ? "flex-1 border-r border-black/10" : "flex-1"}
                        style={{ background: performanceBackground(color) }}
                        title={`Lap ${lap.lapNumber}: ${lap.name}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </ClassroomCanvas>
  );
}

function ReportPageInner() {
  const searchParams = useSearchParams();
  const requestedBlockId = useMemo(
    () => parseRequestedBlockId(searchParams.get("blockId"), searchParams.get("blocks")),
    [searchParams]
  );
  const requestedReportType = useMemo(
    () => parseRequestedReportType(searchParams.get("reportType")),
    [searchParams]
  );
  const requestedScope = useMemo(
    () => parseRequestedScope(searchParams.get("scope")),
    [searchParams]
  );
  const requestedDate = searchParams.get("date") || todayIso;
  const requestedStudentId = searchParams.get("studentId") || "";

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [reportType, setReportType] = useState<ReportType | null>(requestedReportType);
  const [scope, setScope] = useState<ReportScope>(requestedScope);
  const [selectedDate, setSelectedDate] = useState(requestedDate);
  const [selectedStudentId, setSelectedStudentId] = useState(requestedStudentId);
  const [visibleMonthIso, setVisibleMonthIso] = useState(currentMonthIso);
  const [classAttendanceView, setClassAttendanceView] = useState<ClassAttendanceView>("day");
  const [error, setError] = useState<string | null>(null);
  const [attendanceStudentReport, setAttendanceStudentReport] = useState<AttendanceStudentReport | null>(null);
  const [attendanceClassReport, setAttendanceClassReport] = useState<AttendanceClassReport | null>(null);
  const [attendanceClassRangeReport, setAttendanceClassRangeReport] = useState<AttendanceClassRangeReport | null>(null);
  const [monitoringReport, setMonitoringReport] = useState<MonitoringReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonitoringLapNumbers, setSelectedMonitoringLapNumbers] = useState<number[]>([]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );
  const selectedDateIsTest = useMemo(() => {
    const day = parseIsoDate(selectedDate).getDay();
    return day === 0 || day === 6;
  }, [selectedDate]);
  const activeStudents = useMemo(
    () => students.filter((student) => student.active),
    [students]
  );

  useEffect(() => {
    setReportType(requestedReportType);
    setScope(requestedScope);
    setSelectedDate(requestedDate);
    if (requestedStudentId) {
      setSelectedStudentId(requestedStudentId);
    }
  }, [requestedReportType, requestedScope, requestedDate, requestedStudentId]);

  useEffect(() => {
    async function loadBlocks() {
      const res = await fetch("/api/blocks");
      if (!res.ok) {
        setError("Unable to load blocks.");
        return;
      }

      const data = await res.json();
      const nextBlocks: Block[] = data.blocks || [];
      setBlocks(nextBlocks);

      if (requestedBlockId && nextBlocks.some((block) => block.id === requestedBlockId)) {
        setSelectedBlockId(requestedBlockId);
        return;
      }

      if (nextBlocks.length > 0) {
        setSelectedBlockId(nextBlocks[0].id);
      }
    }

    void loadBlocks();
  }, [requestedBlockId]);

  useEffect(() => {
    if (!selectedBlockId) return;

    async function loadStudents() {
      const res = await fetch(`/api/students?blockId=${selectedBlockId}`);
      if (!res.ok) {
        setError("Unable to load students.");
        return;
      }

      const data = await res.json();
      setStudents(data.students || []);
    }

    void loadStudents();
  }, [selectedBlockId]);

  useEffect(() => {
    if (!activeStudents.length) {
      setSelectedStudentId("");
      return;
    }

    if (requestedStudentId && activeStudents.some((student) => student.id === requestedStudentId)) {
      setSelectedStudentId((current) => current || requestedStudentId);
      return;
    }

    if (!activeStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(activeStudents[0].id);
    }
  }, [activeStudents, requestedStudentId, selectedStudentId]);

  useEffect(() => {
    if (reportType !== "attendance" || scope !== "student" || !selectedBlockId || !selectedStudentId) {
      setAttendanceStudentReport(null);
      return;
    }

    async function loadAttendanceStudentReport() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/report/attendance?blockId=${selectedBlockId}&scope=student&studentId=${selectedStudentId}&month=${visibleMonthIso}`
        );
        if (!res.ok) {
          throw new Error("attendance_student");
        }
        const data = await res.json();
        setAttendanceStudentReport(data);
      } catch {
        setError("Unable to load the student attendance report.");
      } finally {
        setLoading(false);
      }
    }

    void loadAttendanceStudentReport();
  }, [reportType, scope, selectedBlockId, selectedStudentId, visibleMonthIso]);

  useEffect(() => {
    if (reportType !== "attendance" || scope !== "class" || !selectedBlockId || classAttendanceView !== "day") {
      setAttendanceClassReport(null);
      return;
    }

    async function loadAttendanceClassReport() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/report/attendance?blockId=${selectedBlockId}&scope=class&date=${selectedDate}`
        );
        if (!res.ok) {
          throw new Error("attendance_class");
        }
        const data = await res.json();
        setAttendanceClassReport(data);
      } catch {
        setError("Unable to load the class attendance report.");
      } finally {
        setLoading(false);
      }
    }

    void loadAttendanceClassReport();
  }, [reportType, scope, selectedBlockId, selectedDate, classAttendanceView]);

  useEffect(() => {
    if (reportType !== "attendance" || scope !== "class" || !selectedBlockId || classAttendanceView === "day") {
      setAttendanceClassRangeReport(null);
      return;
    }

    async function loadAttendanceClassRangeReport() {
      setLoading(true);
      setError(null);
      const range = attendanceRange(classAttendanceView as Exclude<ClassAttendanceView, "day">, selectedDate);
      try {
        const res = await fetch(
          `/api/report/attendance?blockId=${selectedBlockId}&scope=class&start=${range.start}&end=${range.end}`
        );
        if (!res.ok) throw new Error("attendance_class_range");
        setAttendanceClassRangeReport(await res.json());
      } catch {
        setError("Unable to load the class attendance range.");
      } finally {
        setLoading(false);
      }
    }

    void loadAttendanceClassRangeReport();
  }, [reportType, scope, selectedBlockId, selectedDate, classAttendanceView]);

  useEffect(() => {
    if (reportType !== "monitoring" || !selectedBlockId) {
      setMonitoringReport(null);
      return;
    }

    async function loadMonitoringReport() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/report/monitoring?blockId=${selectedBlockId}&date=${selectedDate}`);
        if (!res.ok) {
          throw new Error("monitoring_class");
        }
        const data = await res.json();
        setMonitoringReport(data);
      } catch {
        setError("Unable to load the monitoring report.");
      } finally {
        setLoading(false);
      }
    }

    void loadMonitoringReport();
  }, [reportType, selectedBlockId, selectedDate]);

  useEffect(() => {
    const namedLapNumbers = monitoringReport?.laps.map((lap) => lap.lapNumber) || [];
    setSelectedMonitoringLapNumbers((current) => {
      const filtered = current.filter((lapNumber) => namedLapNumbers.includes(lapNumber));
      return filtered.length > 0 ? filtered : namedLapNumbers;
    });
  }, [monitoringReport]);

  const attendanceStudentMonthRecords = useMemo(() => {
    if (!attendanceStudentReport) return [];
    const monthStart = startOfMonth(parseIsoDate(visibleMonthIso));
    const monthEnd = endOfMonth(monthStart);

    return attendanceStudentReport.records.filter((record) => {
      const recordDate = parseIsoDate(record.date);
      return recordDate >= monthStart && recordDate <= monthEnd;
    });
  }, [attendanceStudentReport, visibleMonthIso]);

  const attendanceByStudentId = useMemo(
    () =>
      new Map(
        (attendanceClassReport?.attendance || []).map((record) => [record.studentId, record.status])
      ),
    [attendanceClassReport]
  );

  const rangeAttendanceByCell = useMemo(
    () => new Map((attendanceClassRangeReport?.attendance || []).map((record) => [`${record.studentId}-${record.date}`, record.status])),
    [attendanceClassRangeReport]
  );
  const activeClassAttendanceSummary = classAttendanceView === "day"
    ? attendanceClassReport?.summary
    : attendanceClassRangeReport?.summary;
  const hasClassAttendanceData = classAttendanceView === "day"
    ? Boolean(attendanceClassReport)
    : Boolean(attendanceClassRangeReport);

  const monitoringAttendanceByStudentId = useMemo(
    () =>
      new Map(
        (monitoringReport?.attendance || []).map((record) => [record.studentId, record.status])
      ),
    [monitoringReport]
  );

  const monitoringPerformanceByCell = useMemo(
    () =>
      new Map(
        (monitoringReport?.performance || []).map((record) => [
          `${record.studentId}-${record.lapNumber}`,
          record.color
        ])
      ),
    [monitoringReport]
  );

  const selectedMonitoringLaps = useMemo(
    () =>
      (monitoringReport?.laps || []).filter((lap) =>
        selectedMonitoringLapNumbers.includes(lap.lapNumber)
      ),
    [monitoringReport, selectedMonitoringLapNumbers]
  );

  const selectedStudentMonitoringRows = useMemo(() => {
    if (!monitoringReport || !selectedStudentId) return [];
    const student = activeStudents.find((entry) => entry.id === selectedStudentId);
    if (!student) return [];
    return monitoringReport.laps.map((lap) => ({
      Name: student.displayName,
      Date: monitoringReport.date,
      "Lap #": lap.lapNumber,
      "Lap Name": lap.name,
      "NC Standard": lap.standardCode || "",
      Color: monitoringPerformanceByCell.get(`${student.id}-${lap.lapNumber}`) || "Not recorded"
    }));
  }, [monitoringReport, selectedStudentId, activeStudents, monitoringPerformanceByCell]);

  function attendanceStudentRows() {
    if (!attendanceStudentReport) return [];
    return attendanceStudentReport.records.map((record) => ({
      Name: attendanceStudentReport.student.displayName,
      Date: record.date,
      "Attendance Status": attendanceLabel(record.status)
    }));
  }

  function attendanceClassRows() {
    if (classAttendanceView === "day" && attendanceClassReport) {
      return attendanceClassReport.students.map((student) => ({
        Name: student.displayName,
        Date: attendanceClassReport.date,
        "Attendance Status": attendanceLabel(attendanceByStudentId.get(student.id) || "")
      }));
    }
    if (!attendanceClassRangeReport) return [];
    return attendanceClassRangeReport.students.flatMap((student) =>
      attendanceClassRangeReport.dates.map((date) => ({
        Name: student.displayName,
        Date: date,
        "Attendance Status": attendanceLabel(rangeAttendanceByCell.get(`${student.id}-${date}`) || "")
      }))
    );
  }

  function monitoringClassRows() {
    if (!monitoringReport || selectedMonitoringLaps.length === 0) return [];
    return monitoringReport.desks
      .filter((desk) => Boolean(desk.studentId && desk.student))
      .flatMap((desk) =>
        selectedMonitoringLaps.map((lap) => ({
          Name: desk.student?.displayName || "",
          "Lap #": String(lap.lapNumber),
          "Lap Name": lap.name,
          "NC Standard": lap.standardCode || "",
          Color: desk.studentId ? monitoringPerformanceByCell.get(`${desk.studentId}-${lap.lapNumber}`) || "" : ""
        }))
      );
  }

  function downloadAttendanceStudentXlsx() {
    if (!attendanceStudentReport) return;
    const rows = attendanceStudentRows();

    downloadWorkbook(
      `attendance-${attendanceStudentReport.student.displayName}-${todayIso}.xlsx`,
      "Attendance",
      rows
    );
  }

  function downloadAttendanceClassXlsx() {
    const rows = attendanceClassRows();
    if (rows.length === 0) return;
    const dateLabel = attendanceClassReport?.date || `${attendanceClassRangeReport?.rangeStart}-${attendanceClassRangeReport?.rangeEnd}`;

    downloadWorkbook(
      `attendance-class-${dateLabel}.xlsx`,
      "Attendance",
      rows
    );
  }

  function downloadMonitoringClassXlsx() {
    if (!monitoringReport || selectedMonitoringLaps.length === 0) return;
    const rows = monitoringClassRows();

    downloadWorkbook(
      `monitoring-class-${monitoringReport.date}.xlsx`,
      "Monitoring",
      rows
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6">
      <div className="hero-card overflow-hidden border-[#ded2bf] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,242,232,0.92)_100%)] p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-[clamp(1.9rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-black">
            Reports
          </h1>
          {blocks.length > 1 && (
            <label className="block w-full max-w-sm text-left sm:w-auto sm:min-w-[280px]">
              <span className="small-header text-black/45">Class</span>
              <select className="form-control mt-1 bg-white py-2" value={selectedBlockId} onChange={(event) => setSelectedBlockId(event.target.value)}>
                {blocks.map((block) => <option key={block.id} value={block.id}>Block {block.blockNumber} · {block.blockName}</option>)}
              </select>
            </label>
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!selectedBlock && !error && (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="h-44 animate-pulse rounded-2xl bg-black/5" />
            <div className="h-44 animate-pulse rounded-2xl bg-black/5" />
          </div>
        )}

        {selectedBlock && (
          <div className="mt-5 space-y-4">
            {!reportType && (
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  className="feature-card min-h-[180px] items-center justify-center text-center text-[1.35rem] font-semibold uppercase tracking-[0.02em] text-black"
                  onClick={() => {
                    setReportType("attendance");
                    setScope("class");
                  }}
                >
                  Attendance Reports
                </button>
                <button
                  type="button"
                  className="feature-card min-h-[180px] items-center justify-center text-center text-[1.35rem] font-semibold uppercase tracking-[0.02em] text-black"
                  onClick={() => {
                    setReportType("monitoring");
                    setScope("class");
                  }}
                >
                  Monitoring Reports
                </button>
              </div>
            )}

            {reportType && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={reportType === "attendance" ? "btn btn-primary" : "btn btn-ghost"}
                      onClick={() => setReportType("attendance")}
                    >
                      Attendance Reports
                    </button>
                    <button
                      type="button"
                      className={reportType === "monitoring" ? "btn btn-primary" : "btn btn-ghost"}
                      onClick={() => setReportType("monitoring")}
                    >
                      Monitoring Reports
                    </button>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={() => setReportType(null)}>
                    Back to Report Choices
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={scope === "class" ? "btn btn-primary" : "btn btn-ghost"}
                    onClick={() => setScope("class")}
                  >
                    Entire Class
                  </button>
                  <button
                    type="button"
                    className={scope === "student" ? "btn btn-primary" : "btn btn-ghost"}
                    onClick={() => setScope("student")}
                  >
                    Individual Student
                  </button>
                </div>

                {selectedDateIsTest && scope === "class" && (reportType === "monitoring" || classAttendanceView === "day") && (
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
                    Weekend records are test data and are intentionally excluded from standard reports. Choose a weekday to view class results.
                  </div>
                )}

                {reportType === "attendance" && scope === "student" && (
                  <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="feature-card h-fit p-4">
                      <label className="small-header text-black/50" htmlFor="attendance-student-select">
                        Student
                      </label>
                      <select
                        id="attendance-student-select"
                        className="form-control"
                        value={selectedStudentId}
                        onChange={(event) => setSelectedStudentId(event.target.value)}
                      >
                        {activeStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.displayName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={downloadAttendanceStudentXlsx}
                        disabled={!attendanceStudentReport || attendanceStudentReport.records.length === 0}
                      >
                        Export XLSX
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => downloadCsv(`attendance-${attendanceStudentReport?.student.displayName || "student"}-${todayIso}.csv`, attendanceStudentRows())} disabled={!attendanceStudentReport || attendanceStudentReport.records.length === 0}>
                        Export CSV
                      </button>
                    </div>

                    <div className="space-y-4">
                      {loading && (
                        <div className="hero-card p-4 text-sm text-black/60">Loading attendance report...</div>
                      )}
                      {!loading && attendanceStudentReport && (
                        <>
                          <AttendanceCalendar
                            visibleMonth={visibleMonthIso}
                            records={attendanceStudentMonthRecords}
                            onPreviousMonth={() => setVisibleMonthIso((current) => shiftMonthIso(current, -1))}
                            onNextMonth={() => setVisibleMonthIso((current) => shiftMonthIso(current, 1))}
                            onToday={() => setVisibleMonthIso(currentMonthIso)}
                          />
                          <div className="text-center text-sm text-black/60">
                            Attendance history for {attendanceStudentReport.student.displayName}.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {reportType === "attendance" && scope === "class" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 p-3">
                      <div className="flex rounded-xl bg-black/5 p-1">
                        {(["day", "week", "month"] as ClassAttendanceView[]).map((view) => (
                          <button
                            key={view}
                            type="button"
                            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${classAttendanceView === view ? "bg-white text-black shadow-sm" : "text-black/55"}`}
                            onClick={() => setClassAttendanceView(view)}
                          >
                            {view}
                          </button>
                        ))}
                      </div>
                      <div className="grid w-full max-w-lg grid-cols-[auto_minmax(150px,1fr)_auto] gap-2 sm:w-auto">
                        <button
                          type="button"
                          className="btn btn-ghost px-3 py-2"
                          onClick={() => setSelectedDate((current) => classAttendanceView === "month" ? shiftMonthIso(current, -1) : shiftIsoDate(current, classAttendanceView === "week" ? -7 : -1))}
                        >
                          ← <span className="hidden sm:inline">Previous</span>
                        </button>
                        <input
                          className="form-control min-w-0 bg-white py-2"
                          type="date"
                          value={selectedDate}
                          onChange={(event) => setSelectedDate(event.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost px-3 py-2"
                          onClick={() => setSelectedDate((current) => classAttendanceView === "month" ? shiftMonthIso(current, 1) : shiftIsoDate(current, classAttendanceView === "week" ? 7 : 1))}
                        >
                          <span className="hidden sm:inline">Next</span> →
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-primary px-3 py-2 text-sm" onClick={downloadAttendanceClassXlsx} disabled={!hasClassAttendanceData}>Export XLSX</button>
                        <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={() => downloadCsv(`attendance-class-${selectedDate}.csv`, attendanceClassRows())} disabled={!hasClassAttendanceData}>Export CSV</button>
                      </div>
                    </div>

                    {activeClassAttendanceSummary && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="rounded-full bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-800">Present: {activeClassAttendanceSummary.PRESENT}</div>
                        <div className="rounded-full bg-red-100 px-3 py-1.5 font-semibold text-red-800">Absent: {activeClassAttendanceSummary.ABSENT}</div>
                        <div className="rounded-full bg-yellow-100 px-3 py-1.5 font-semibold text-yellow-900">Tardy: {activeClassAttendanceSummary.TARDY}</div>
                        <div className="rounded-full bg-orange-100 px-3 py-1.5 font-semibold text-orange-900">Left Early: {activeClassAttendanceSummary.LEFT_EARLY}</div>
                      </div>
                    )}

                    {classAttendanceView === "day" && attendanceClassReport && (
                      <>
                        <AttendanceSeatChart
                          desks={attendanceClassReport.desks}
                          attendanceByStudentId={attendanceByStudentId}
                        />
                      </>
                    )}

                    {classAttendanceView !== "day" && attendanceClassRangeReport && (
                      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
                        <table className="table table-compact min-w-max">
                          <thead>
                            <tr>
                              <th className="sticky left-0 z-10 min-w-[170px] bg-white">Student</th>
                              {attendanceClassRangeReport.dates.map((date) => (
                                <th key={date} className="min-w-[54px] text-center">
                                  <div>{format(parseIsoDate(date), "EEE")}</div>
                                  <div className="font-normal text-black/45">{format(parseIsoDate(date), "M/d")}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceClassRangeReport.students.map((student) => (
                              <tr key={`range-${student.id}`}>
                                <td className="sticky left-0 z-[1] bg-white font-semibold">{student.displayName}</td>
                                {attendanceClassRangeReport.dates.map((date) => {
                                  const status = rangeAttendanceByCell.get(`${student.id}-${date}`);
                                  return (
                                    <td key={`${student.id}-${date}`} className="text-center">
                                      <span title={attendanceLabel(status)} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[10px] font-bold ${attendanceStatusClasses(status)}`}>
                                        {attendanceStatusShort(status)}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {reportType === "monitoring" && scope === "student" && (
                  <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                    <div className="feature-card h-fit">
                      <label className="small-header text-black/50" htmlFor="monitoring-student-select">Student</label>
                      <select id="monitoring-student-select" className="form-control" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                        {activeStudents.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}
                      </select>
                      <label className="small-header text-black/50" htmlFor="monitoring-student-date">Date</label>
                      <input id="monitoring-student-date" className="form-control" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-primary" disabled={selectedStudentMonitoringRows.length === 0} onClick={() => downloadWorkbook(`monitoring-${selectedStudentMonitoringRows[0]?.Name || "student"}-${selectedDate}.xlsx`, "Monitoring", selectedStudentMonitoringRows)}>Export XLSX</button>
                        <button type="button" className="btn btn-ghost" disabled={selectedStudentMonitoringRows.length === 0} onClick={() => downloadCsv(`monitoring-${selectedStudentMonitoringRows[0]?.Name || "student"}-${selectedDate}.csv`, selectedStudentMonitoringRows)}>Export CSV</button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {loading && <div className="h-40 animate-pulse rounded-2xl bg-black/5" />}
                      {!loading && monitoringReport && selectedStudentMonitoringRows.length > 0 && selectedStudentMonitoringRows.map((row) => (
                        <div key={`${row["Lap #"]}`} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div><div className="small-header text-black/45">Lap {row["Lap #"]}</div><div className="mt-1 font-semibold">{row["Lap Name"]}</div><div className="text-xs text-black/55">{row["NC Standard"] || "No standard"}</div></div>
                            <div className={`rounded-full px-4 py-2 text-sm font-semibold ${row.Color === "GREEN" ? "bg-emerald-100 text-emerald-800" : row.Color === "YELLOW" ? "bg-yellow-100 text-yellow-900" : row.Color === "RED" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}`}>{row.Color}</div>
                          </div>
                        </div>
                      ))}
                      {!loading && monitoringReport && selectedStudentMonitoringRows.length === 0 && <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-black/55">No named laps are available for this date.</div>}
                    </div>
                  </div>
                )}

                {reportType === "monitoring" && scope === "class" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="grid w-full max-w-xl grid-cols-[auto_minmax(150px,1fr)_auto] gap-2 sm:w-auto">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedDate((current) => shiftIsoDate(current, -1))}
                        >
                          ← <span className="hidden sm:inline">Previous</span>
                        </button>
                        <input
                          className="form-control min-w-0 bg-white"
                          type="date"
                          value={selectedDate}
                          onChange={(event) => setSelectedDate(event.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedDate((current) => shiftIsoDate(current, 1))}
                        >
                          <span className="hidden sm:inline">Next</span> →
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-primary" onClick={downloadMonitoringClassXlsx} disabled={!monitoringReport || selectedMonitoringLaps.length === 0}>Export XLSX</button>
                        <button type="button" className="btn btn-ghost" onClick={() => downloadCsv(`monitoring-class-${monitoringReport?.date || selectedDate}.csv`, monitoringClassRows())} disabled={!monitoringReport || selectedMonitoringLaps.length === 0}>Export CSV</button>
                      </div>
                    </div>

                    {monitoringReport && monitoringReport.laps.length > 0 && (
                      <div className="rounded-2xl border border-black/10 bg-white/75 p-4">
                        <div className="grid gap-2 md:grid-cols-3">
                          {monitoringReport.laps.map((lap) => {
                            const isSelected = selectedMonitoringLapNumbers.includes(lap.lapNumber);
                            return (
                              <button
                                key={lap.lapNumber}
                                type="button"
                                className={`rounded-xl border px-3 py-3 text-left transition ${
                                  isSelected
                                    ? "border-sky-500 bg-sky-50 shadow-[0_10px_24px_rgba(14,116,144,0.12)]"
                                    : "border-black/10 bg-white hover:border-black/20"
                                }`}
                                onClick={() =>
                                  setSelectedMonitoringLapNumbers((current) =>
                                    current.includes(lap.lapNumber)
                                      ? current.filter((lapNumber) => lapNumber !== lap.lapNumber)
                                      : [...current, lap.lapNumber].sort((left, right) => left - right)
                                  )
                                }
                              >
                                <div className="small-header text-black/45">Lap {lap.lapNumber}</div>
                                <div className="mt-1 text-sm font-semibold">{lap.name}</div>
                                <div className="mt-1 text-xs text-black/55">{lap.standardCode || "No NC Standard"}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {monitoringReport && monitoringReport.laps.length === 0 && (
                      <div className="hero-card p-4 text-sm text-black/60">
                        No laps were named for this block on {monitoringReport.date}.
                      </div>
                    )}

                    {monitoringReport?.usesCurrentSeatingLayout && (
                      <div className="text-sm text-black/60">
                        This report uses the current seating chart layout for the selected date.
                      </div>
                    )}

                    {monitoringReport && (
                      <MonitoringSeatChart
                        desks={monitoringReport.desks}
                        attendanceByStudentId={monitoringAttendanceByStudentId}
                        performanceByCell={monitoringPerformanceByCell}
                        selectedLaps={selectedMonitoringLaps}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10">Loading...</div>}>
      <ReportPageInner />
    </Suspense>
  );
}
