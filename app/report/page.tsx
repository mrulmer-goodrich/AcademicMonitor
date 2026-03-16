"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { addDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";

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

function attendanceLabel(status: AttendanceStatus | "" | null | undefined) {
  if (!status) return "";
  return status.replace("_", " ");
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
  records
}: {
  visibleMonth: string;
  records: AttendanceStudentReport["records"];
}) {
  const statusByDate = useMemo(
    () => new Map(records.map((record) => [record.date, record.status])),
    [records]
  );
  const cells = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthDate = startOfMonth(parseIsoDate(visibleMonth));

  return (
    <div className="mx-auto w-full max-w-[392px] rounded-[18px] border border-black/10 bg-white p-4 shadow-[0_12px_28px_rgba(11,27,42,0.08)]">
      <div className="flex items-center justify-between text-[14px] text-black/60">
        <div>{format(monthDate, "MMMM yyyy")}</div>
        <div className="rounded-full border border-black/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em]">
          Today
        </div>
      </div>
      <div className="mb-3 mt-3 text-[14px] font-semibold text-black">{format(monthDate, "MMMM yyyy")}</div>
      <div className="mb-2 grid grid-cols-7 text-center text-[12px] text-black/45">
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
              : "text-black/75";

          return (
            <div key={dateKey} className="flex h-8 w-8 items-center justify-center justify-self-center">
              {status === "ABSENT" || status === "TARDY" || status === "LEFT_EARLY" ? (
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
    <div className="hero-card relative h-[560px] overflow-hidden p-4">
      {desks.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-black/60">
          No seating chart found for this block.
        </div>
      ) : (
        desks.map((desk) => {
          const status = desk.studentId ? attendanceByStudentId.get(desk.studentId) : undefined;
          return (
            <div
              key={desk.id}
              className={`absolute rounded-2xl border px-2 py-2 text-center shadow ${attendanceSeatClasses(status)}`}
              style={{
                left: desk.x,
                top: desk.y,
                width: desk.width > 116 ? 116 : desk.width,
                height: desk.height > 82 ? 82 : desk.height,
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
    </div>
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
    <div className="hero-card relative h-[560px] overflow-hidden p-4">
      {desks.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-black/60">
          No seating chart found for this block.
        </div>
      ) : (
        desks.map((desk) => {
          const status = desk.studentId ? attendanceByStudentId.get(desk.studentId) : undefined;
          const isAbsent = status === "ABSENT";

          return (
            <div
              key={desk.id}
              className={`absolute rounded-2xl border border-black/10 px-2 py-2 text-center shadow ${
                isAbsent ? "bg-red-200 opacity-35" : "bg-slate-100/75"
              }`}
              style={{
                left: desk.x,
                top: desk.y,
                width: desk.width > 116 ? 116 : desk.width,
                height: desk.height > 82 ? 82 : desk.height,
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
    </div>
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
  const [studentSearch, setStudentSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attendanceStudentReport, setAttendanceStudentReport] = useState<AttendanceStudentReport | null>(null);
  const [attendanceClassReport, setAttendanceClassReport] = useState<AttendanceClassReport | null>(null);
  const [monitoringReport, setMonitoringReport] = useState<MonitoringReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonitoringLapNumbers, setSelectedMonitoringLapNumbers] = useState<number[]>([]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );
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
          `/api/report/attendance?blockId=${selectedBlockId}&scope=student&studentId=${selectedStudentId}&month=${currentMonthIso}`
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
  }, [reportType, scope, selectedBlockId, selectedStudentId]);

  useEffect(() => {
    if (reportType !== "attendance" || scope !== "class" || !selectedBlockId) {
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
  }, [reportType, scope, selectedBlockId, selectedDate]);

  useEffect(() => {
    if (reportType !== "monitoring" || scope !== "class" || !selectedBlockId) {
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
  }, [reportType, scope, selectedBlockId, selectedDate]);

  useEffect(() => {
    const namedLapNumbers = monitoringReport?.laps.map((lap) => lap.lapNumber) || [];
    setSelectedMonitoringLapNumbers((current) => {
      const filtered = current.filter((lapNumber) => namedLapNumbers.includes(lapNumber));
      return filtered.length > 0 ? filtered : namedLapNumbers;
    });
  }, [monitoringReport]);

  const visibleStudents = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();
    if (!normalizedSearch) return activeStudents;

    const filtered = activeStudents.filter((student) =>
      student.displayName.toLowerCase().includes(normalizedSearch)
    );

    if (filtered.some((student) => student.id === selectedStudentId)) {
      return filtered;
    }

    const selectedStudent = activeStudents.find((student) => student.id === selectedStudentId);
    return selectedStudent ? [selectedStudent, ...filtered] : filtered;
  }, [activeStudents, selectedStudentId, studentSearch]);

  const attendanceStudentMonthRecords = useMemo(() => {
    if (!attendanceStudentReport) return [];
    const monthStart = startOfMonth(parseIsoDate(currentMonthIso));
    const monthEnd = endOfMonth(monthStart);

    return attendanceStudentReport.records.filter((record) => {
      const recordDate = parseIsoDate(record.date);
      return recordDate >= monthStart && recordDate <= monthEnd;
    });
  }, [attendanceStudentReport]);

  const attendanceByStudentId = useMemo(
    () =>
      new Map(
        (attendanceClassReport?.attendance || []).map((record) => [record.studentId, record.status])
      ),
    [attendanceClassReport]
  );

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

  function downloadAttendanceStudentXlsx() {
    if (!attendanceStudentReport) return;
    const rows = attendanceStudentReport.records.map((record) => ({
      Name: attendanceStudentReport.student.displayName,
      Date: record.date,
      "Attendance Status": attendanceLabel(record.status)
    }));

    downloadWorkbook(
      `attendance-${attendanceStudentReport.student.displayName}-${todayIso}.xlsx`,
      "Attendance",
      rows
    );
  }

  function downloadAttendanceClassXlsx() {
    if (!attendanceClassReport) return;
    const rows = attendanceClassReport.students.map((student) => ({
      Name: student.displayName,
      Date: attendanceClassReport.date,
      "Attendance Status": attendanceLabel(attendanceByStudentId.get(student.id) || ""),
      "Present Count": attendanceClassReport.summary.PRESENT,
      "Absent Count": attendanceClassReport.summary.ABSENT,
      "Tardy Count": attendanceClassReport.summary.TARDY,
      "Left Early Count": attendanceClassReport.summary.LEFT_EARLY
    }));

    downloadWorkbook(
      `attendance-class-${attendanceClassReport.date}.xlsx`,
      "Attendance",
      rows
    );
  }

  function downloadMonitoringClassXlsx() {
    if (!monitoringReport || selectedMonitoringLaps.length === 0) return;

    const rows = monitoringReport.desks
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

    downloadWorkbook(
      `monitoring-class-${monitoringReport.date}.xlsx`,
      "Monitoring",
      rows
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="hero-card overflow-hidden border-[#ded2bf] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,242,232,0.92)_100%)] p-6 md:p-8">
        <div className="text-center">
          <h1 className="text-[clamp(1.9rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-black">
            {selectedBlock ? `REPORTS FOR BLOCK ${selectedBlock.blockNumber} / ${selectedBlock.blockName}` : "REPORTS"}
          </h1>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!selectedBlock && !error && (
          <div className="mt-6 text-center text-sm text-black/60">
            Loading report options...
          </div>
        )}

        {selectedBlock && (
          <div className="mt-8 space-y-6">
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

                {reportType === "attendance" && scope === "student" && (
                  <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="feature-card">
                      <label className="small-header text-black/50" htmlFor="attendance-student-search">
                        Search For First Name
                      </label>
                      <input
                        id="attendance-student-search"
                        className="form-control"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="Start typing a student name"
                      />
                      <label className="small-header text-black/50" htmlFor="attendance-student-select">
                        Student
                      </label>
                      <select
                        id="attendance-student-select"
                        className="form-control"
                        value={selectedStudentId}
                        onChange={(event) => setSelectedStudentId(event.target.value)}
                      >
                        {visibleStudents.map((student) => (
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
                    </div>

                    <div className="space-y-4">
                      {loading && (
                        <div className="hero-card p-4 text-sm text-black/60">Loading attendance report...</div>
                      )}
                      {!loading && attendanceStudentReport && (
                        <>
                          <AttendanceCalendar visibleMonth={currentMonthIso} records={attendanceStudentMonthRecords} />
                          <div className="text-center text-sm text-black/60">
                            Showing the current month for {attendanceStudentReport.student.displayName}.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {reportType === "attendance" && scope === "class" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedDate((current) => shiftIsoDate(current, -1))}
                        >
                          Previous Day
                        </button>
                        <input
                          className="form-control min-w-[180px]"
                          type="date"
                          value={selectedDate}
                          onChange={(event) => setSelectedDate(event.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedDate((current) => shiftIsoDate(current, 1))}
                        >
                          Next Day
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={downloadAttendanceClassXlsx}
                        disabled={!attendanceClassReport}
                      >
                        Export XLSX
                      </button>
                    </div>

                    {attendanceClassReport && (
                      <>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <div className="rounded-full bg-emerald-100 px-4 py-2 font-semibold text-emerald-800">
                            Present: {attendanceClassReport.summary.PRESENT}
                          </div>
                          <div className="rounded-full bg-red-100 px-4 py-2 font-semibold text-red-800">
                            Absent: {attendanceClassReport.summary.ABSENT}
                          </div>
                          <div className="rounded-full bg-yellow-100 px-4 py-2 font-semibold text-yellow-900">
                            Tardy: {attendanceClassReport.summary.TARDY}
                          </div>
                          <div className="rounded-full bg-orange-100 px-4 py-2 font-semibold text-orange-900">
                            Left Early: {attendanceClassReport.summary.LEFT_EARLY}
                          </div>
                        </div>
                        {attendanceClassReport.usesCurrentSeatingLayout && (
                          <div className="text-sm text-black/60">
                            This report uses the current seating chart layout for the selected date.
                          </div>
                        )}
                        <AttendanceSeatChart
                          desks={attendanceClassReport.desks}
                          attendanceByStudentId={attendanceByStudentId}
                        />
                      </>
                    )}
                  </div>
                )}

                {reportType === "monitoring" && scope === "student" && (
                  <div className="hero-card p-8 text-center text-lg font-semibold text-black/70">
                    Coming soon
                  </div>
                )}

                {reportType === "monitoring" && scope === "class" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedDate((current) => shiftIsoDate(current, -1))}
                        >
                          Previous Day
                        </button>
                        <input
                          className="form-control min-w-[180px]"
                          type="date"
                          value={selectedDate}
                          onChange={(event) => setSelectedDate(event.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedDate((current) => shiftIsoDate(current, 1))}
                        >
                          Next Day
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={downloadMonitoringClassXlsx}
                        disabled={!monitoringReport || selectedMonitoringLaps.length === 0}
                      >
                        Export XLSX
                      </button>
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
