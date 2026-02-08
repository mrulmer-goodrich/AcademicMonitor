"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, startOfWeek } from "date-fns";

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

type Attendance = {
  id: string;
  studentId: string;
  status: "PRESENT" | "ABSENT" | "TARDY" | "LEFT_EARLY";
};

type Lap = {
  dayIndex: number;
  lapNumber: number;
  name: string;
};

type Performance = {
  studentId: string;
  lapNumber: number;
  color: "GREEN" | "YELLOW" | "RED";
};

const colorCycle: Performance["color"][] = ["GREEN", "YELLOW", "RED"];
const attendanceCycle: Attendance["status"][] = ["PRESENT", "ABSENT", "TARDY", "LEFT_EARLY"];

export default function MonitorPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [desks, setDesks] = useState<Desk[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [attendancePanel, setAttendancePanel] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [selectedLaps, setSelectedLaps] = useState<number[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeStudents, setActiveStudents] = useState<string[]>([]);
  const [editingLap, setEditingLap] = useState<Lap | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showCategories, setShowCategories] = useState(true);

  const [simulateDate, setSimulateDate] = useState<string>("");
  const dateToUse = simulateDate ? new Date(`${simulateDate}T09:00:00`) : new Date();
  const weekStart = startOfWeek(dateToUse, { weekStartsOn: 1 });
  const dayIndex = (dateToUse.getDay() + 6) % 7;
  const isWeekday = dayIndex >= 0 && dayIndex <= 4;

  useEffect(() => {
    loadBlocks();
  }, []);

  useEffect(() => {
    if (blockId) {
      loadDesks();
      loadActiveStudents();
      loadAttendance();
      loadLaps();
      loadPerformance();
    }
  }, [blockId, simulateDate]);

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

  async function loadDesks() {
    const res = await fetch(`/api/desks?blockId=${blockId}`);
    const data = await res.json();
    setDesks((data.desks || []).filter((d: Desk) => d.type === "STUDENT"));
  }

  async function loadActiveStudents() {
    const res = await fetch(`/api/students?blockId=${blockId}`);
    const data = await res.json();
    const ids = (data.students || []).filter((s: { active: boolean }) => s.active).map((s: { id: string }) => s.id);
    setActiveStudents(ids);
  }

  async function loadAttendance() {
    const res = await fetch(`/api/attendance?blockId=${blockId}&date=${dateToUse.toISOString()}`);
    const data = await res.json();
    setAttendance(data.attendance || []);
  }

  async function loadLaps() {
    const res = await fetch(`/api/laps?blockId=${blockId}&weekStart=${weekStart.toISOString()}`);
    const data = await res.json();
    setLaps(data.laps || []);
  }

  async function loadPerformance() {
    const res = await fetch(`/api/performance?blockId=${blockId}&date=${dateToUse.toISOString()}`);
    const data = await res.json();
    setPerformance(data.performance || []);
  }

  async function setAttendanceStatus(studentId: string, status: Attendance["status"]) {
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, studentId, date: dateToUse.toISOString(), status })
    });
    await loadAttendance();
  }

  async function bulkAttendance(status: Attendance["status"]) {
    const ok = confirm(`Mark all students as ${status.replace("_", " ")}?`);
    if (!ok) return;
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, date: dateToUse.toISOString(), mode: "bulk", status })
    });
    await loadAttendance();
  }

  async function cyclePerformance(studentId: string, lapNumber: number) {
    const current = performance.find((p) => p.studentId === studentId && p.lapNumber === lapNumber);
    const nextColor = current ? colorCycle[(colorCycle.indexOf(current.color) + 1) % colorCycle.length] : "GREEN";
    await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, studentId, date: dateToUse.toISOString(), lapNumber, color: nextColor })
    });
    await loadPerformance();
  }

  async function cycleAttendance(studentId: string) {
    const current = attendanceMap.get(studentId);
    const next = current
      ? attendanceCycle[(attendanceCycle.indexOf(current) + 1) % attendanceCycle.length]
      : "PRESENT";
    await setAttendanceStatus(studentId, next);
  }

  const todayLaps = useMemo(
    () => laps.filter((lap) => lap.dayIndex === dayIndex).sort((a, b) => a.lapNumber - b.lapNumber),
    [laps, dayIndex]
  );

  const attendanceMap = useMemo(() => {
    const map = new Map<string, Attendance["status"]>();
    attendance.forEach((a) => map.set(a.studentId, a.status));
    return map;
  }, [attendance]);

  const attendanceComplete = useMemo(() => {
    if (activeStudents.length === 0) return false;
    return activeStudents.every((id) => attendanceMap.has(id));
  }, [activeStudents, attendanceMap]);

  const performanceMap = useMemo(() => {
    const map = new Map<string, Performance["color"]>();
    performance.forEach((p) => map.set(`${p.studentId}-${p.lapNumber}`, p.color));
    return map;
  }, [performance]);

  const lapsNamed = todayLaps.length === 3;
  const readyForDisplay = lapsNamed && attendanceComplete && selectedLaps.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="small-header text-black/60">Monitor</div>
          <h1 className="section-title">Seat Display</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="form-control max-w-[240px]" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                Block {block.blockNumber} · {block.blockName}
              </option>
            ))}
          </select>
          <button
            className={`btn ${attendanceMode ? "btn-primary" : "btn-ghost"}`}
            type="button"
            onClick={() => setAttendanceMode((prev) => !prev)}
            disabled={!blockId}
          >
            Attendance Mode
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => setAttendancePanel(true)} disabled={!blockId}>
            Attendance Panel
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => setShowCategories((prev) => !prev)}>
            {showCategories ? "Hide Categories" : "Show Categories"}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => bulkAttendance("PRESENT")}
            disabled={!blockId}
          >
            Mark All Present
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => bulkAttendance("ABSENT")}
            disabled={!blockId}
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      {blocks.length === 0 && (
        <div className="hero-card p-4 text-sm text-black/70">
          No blocks yet. Create a block first in Setup.
        </div>
      )}

      <div className="hero-card p-4 text-sm text-black/70 flex flex-wrap items-center gap-3">
        <div className="font-semibold">Simulate date</div>
        <input
          className="form-control max-w-[200px]"
          type="date"
          value={simulateDate}
          onChange={(e) => setSimulateDate(e.target.value)}
        />
        <button className="btn btn-ghost" type="button" onClick={() => setSimulateDate("")}>
          Use Today
        </button>
        {!isWeekday && <div>Selected date is not a weekday. Pick Mon-Fri for monitoring.</div>}
      </div>

      <div className="hero-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-black/60">Date: {format(dateToUse, "MM/dd/yyyy")}</div>
          <div className="flex gap-2">
            {todayLaps.map((lap) => (
              <button
                key={lap.lapNumber}
                className={`btn ${selectedLaps.includes(lap.lapNumber) ? "btn-primary" : "btn-ghost"}`}
                type="button"
                disabled={!attendanceComplete || !lapsNamed}
                onClick={() =>
                  setSelectedLaps((prev) =>
                    prev.includes(lap.lapNumber)
                      ? prev.filter((n) => n !== lap.lapNumber)
                      : [...prev, lap.lapNumber].sort()
                  )
                }
                onDoubleClick={() => {
                  setEditingLap(lap);
                  setEditingName(lap.name);
                }}
              >
                Lap {lap.lapNumber}: {lap.name}
              </button>
            ))}
            {todayLaps.length < 3 && (
              <span className="text-sm text-red-700">Name laps in Setup first.</span>
            )}
          </div>
        </div>

        <div className="text-sm text-black/60">
          Attendance: {attendanceComplete ? "Complete" : "Incomplete"} · Mode:{" "}
          {attendanceMode ? "Tap desks to mark Present/Absent/Tardy/Left Early" : "Tap desks to log lap performance"}
        </div>

        <div className="hero-card h-[560px] p-4 relative overflow-hidden">
          {!readyForDisplay && !attendanceMode && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/75 text-sm font-semibold">
              Complete attendance and name laps to unlock SeatDisplay.
            </div>
          )}
          {desks.map((desk) => {
            const status = desk.studentId ? attendanceMap.get(desk.studentId) : undefined;
            const isAbsent = status === "ABSENT";
            const statusColor =
              status === "PRESENT"
                ? "bg-emerald-400"
                : status === "ABSENT"
                ? "bg-red-400"
                : status === "TARDY"
                ? "bg-yellow-300"
                : status === "LEFT_EARLY"
                ? "bg-orange-300"
                : "bg-slate-200";
            const statusBg =
              attendanceMode && status
                ? status === "PRESENT"
                  ? "bg-emerald-100"
                  : status === "ABSENT"
                  ? "bg-red-100"
                  : status === "TARDY"
                  ? "bg-yellow-100"
                  : "bg-orange-100"
                : "bg-white";
            const categories = showCategories && desk.student
              ? [
                  desk.student.ml ? { label: "ML", color: "#9ecae1" } : null,
                  desk.student.mlNew ? { label: "ML", color: "repeating-linear-gradient(45deg,#9ecae1,#9ecae1 4px,#ffffff 4px,#ffffff 8px)" } : null,
                  desk.student.iep504 ? { label: "IEP", color: "#f5a9b8" } : null,
                  desk.student.ec ? { label: "EC", color: "#f7d774" } : null,
                  desk.student.ca ? { label: "CA", color: "#ffffff" } : null,
                  desk.student.hiit ? { label: "HIIT", color: "#b18ad8" } : null
                ].filter(Boolean)
              : [];
            const eogLabel =
              desk.student?.eog === "FIVE"
                ? "5"
                : desk.student?.eog === "FOUR"
                ? "4"
                : desk.student?.eog === "THREE"
                ? "3"
                : desk.student?.eog === "NP"
                ? "NP"
                : null;
            const eogColor =
              desk.student?.eog === "FIVE"
                ? "#1f4c8f"
                : desk.student?.eog === "FOUR"
                ? "#4caf50"
                : desk.student?.eog === "THREE"
                ? "#f2994a"
                : desk.student?.eog === "NP"
                ? "#e74c3c"
                : null;
            const compactDots = selectedLaps.length >= 2;
            return (
              <div
                key={desk.id}
                className={`absolute rounded-2xl border border-black/10 px-4 py-4 text-center shadow ${statusBg} ${
                  isAbsent ? "opacity-50" : ""
                }`}
                style={{
                  left: desk.x,
                  top: desk.y,
                  width: desk.width,
                  height: desk.height,
                  transform: `rotate(${desk.rotation}deg)`
                }}
                onClick={() => {
                  if (attendanceMode && desk.studentId) {
                    cycleAttendance(desk.studentId);
                  }
                }}
              >
                <div className="text-sm text-black/60">Seat {desk.seatNumber}</div>
                <div className="text-lg font-semibold">{desk.student?.displayName}</div>
                <div className={`mx-auto mt-2 h-2 w-10 rounded-full ${statusColor}`} />
                {showCategories && desk.student && (
                  <>
                    {desk.student.hiit && (
                      <span
                        className={`absolute left-3 top-3 flex items-center justify-center rounded-full border border-black text-[7px] ${
                          compactDots ? "h-3 w-3" : "h-4 w-4"
                        }`}
                        style={{ background: "#b18ad8" }}
                      >
                        H
                      </span>
                    )}
                    {eogLabel && (
                      <span
                        className={`absolute right-3 top-3 flex items-center justify-center rounded-full border border-black text-[7px] ${
                          compactDots ? "h-3 w-3" : "h-4 w-4"
                        }`}
                        style={{ background: eogColor || "#ffffff", color: "#fff" }}
                      >
                        {eogLabel}
                      </span>
                    )}
                    <div className="mt-2 flex items-center justify-center gap-1 flex-nowrap">
                      {desk.student.ml && (
                        <span
                          className={`flex items-center justify-center rounded-full border border-black text-[7px] ${
                            compactDots ? "h-3 w-3" : "h-4 w-4"
                          }`}
                          style={{ background: "#9ecae1" }}
                        >
                          ML
                        </span>
                      )}
                      {desk.student.mlNew && (
                        <span
                          className={`flex items-center justify-center rounded-full border border-black text-[7px] ${
                            compactDots ? "h-3 w-3" : "h-4 w-4"
                          }`}
                          style={{
                            background:
                              "repeating-linear-gradient(45deg,#9ecae1,#9ecae1 4px,#ffffff 4px,#ffffff 8px)"
                          }}
                        >
                          ML
                        </span>
                      )}
                      {desk.student.iep504 && (
                        <span
                          className={`flex items-center justify-center rounded-full border border-black text-[7px] ${
                            compactDots ? "h-3 w-3" : "h-4 w-4"
                          }`}
                          style={{ background: "#f5a9b8" }}
                        >
                          I
                        </span>
                      )}
                      {desk.student.ec && (
                        <span
                          className={`flex items-center justify-center rounded-full border border-black text-[7px] ${
                            compactDots ? "h-3 w-3" : "h-4 w-4"
                          }`}
                          style={{ background: "#f7d774" }}
                        >
                          EC
                        </span>
                      )}
                      {desk.student.ca && (
                        <span
                          className={`flex items-center justify-center rounded-full border border-black text-[7px] ${
                            compactDots ? "h-3 w-3" : "h-4 w-4"
                          }`}
                          style={{ background: "#ffffff" }}
                        >
                          CA
                        </span>
                      )}
                    </div>
                  </>
                )}
                <div className="mt-3 flex h-12 overflow-hidden rounded-lg border border-black/20">
                  {selectedLaps.map((lapNumber) => {
                    const color = desk.studentId ? performanceMap.get(`${desk.studentId}-${lapNumber}`) : undefined;
                    const bg =
                      color === "GREEN"
                        ? "bg-emerald-400"
                        : color === "YELLOW"
                        ? "bg-yellow-300"
                        : color === "RED"
                        ? "bg-red-400"
                        : "bg-slate-200";

                    return (
                      <button
                        key={`${desk.id}-${lapNumber}`}
                        type="button"
                        disabled={!readyForDisplay || isAbsent || attendanceMode}
                        onClick={() => desk.studentId && cyclePerformance(desk.studentId, lapNumber)}
                        className={`flex-1 ${bg} text-[10px] font-semibold`}
                        title={`Lap ${lapNumber}`}
                      >
                        L{lapNumber}
                      </button>
                    );
                  })}
                </div>
                {attendanceMode && (
                  <div className="mt-3 w-full rounded-lg border border-black/20 py-2 text-xs">
                    {status ? `Status: ${status.replace("_", " ")}` : "Tap desk to mark attendance"}
                  </div>
                )}
                {isAbsent && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold pointer-events-auto"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    Absent
                  </div>
                )}
              </div>
            );
          })}
          {desks.length === 0 && (
            <div className="text-sm text-black/60">No seating chart found. Add desks in Setup.</div>
          )}
        </div>

        {!readyForDisplay && (
          <div className="text-sm text-black/60 flex flex-wrap items-center gap-3">
            Seat display unlocks after attendance is taken and three laps are named. Select at least one lap to begin.
            {!attendanceComplete && (
              <button className="btn btn-ghost" type="button" onClick={() => setAttendancePanel(true)}>
                Go to Attendance
              </button>
            )}
            {!lapsNamed && (
              <Link href="/setup/laps" className="btn btn-ghost">
                Go to Laps Setup
              </Link>
            )}
            {desks.length === 0 && (
              <Link href="/setup/seating" className="btn btn-ghost">
                Go to Seating Setup
              </Link>
            )}
          </div>
        )}
      </div>

      {editingLap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="hero-card w-full max-w-md p-6 space-y-4">
            <div>
              <div className="small-header text-black/60">Edit Lap</div>
              <h2 className="section-title">
                Lap {editingLap.lapNumber} · {format(dateToUse, "MM/dd/yyyy")}
              </h2>
            </div>
            <div>
              <label className="text-sm font-medium">Lap name</label>
              <input
                className="form-control"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  if (!editingName.trim()) return;
                  await fetch("/api/laps", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      blockId,
                      weekStart: weekStart.toISOString(),
                      dayIndex,
                      lapNumber: editingLap.lapNumber,
                      name: editingName.trim(),
                      standardCode: null
                    })
                  });
                  setEditingLap(null);
                  setEditingName("");
                  await loadLaps();
                }}
              >
                Save
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setEditingLap(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {attendancePanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="hero-card w-full max-w-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="small-header text-black/60">Attendance</div>
                <h2 className="section-title">Mark attendance</h2>
              </div>
              <button className="btn btn-ghost" type="button" onClick={() => setAttendancePanel(false)}>
                Close
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {desks.map((desk) => {
                if (!desk.studentId) return null;
                const status = attendanceMap.get(desk.studentId);
                return (
                  <div key={`att-${desk.id}`} className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                    <div className="font-semibold">{desk.student?.displayName}</div>
                    <div className="text-black/60 mb-2">Seat {desk.seatNumber}</div>
                    <div className="flex flex-wrap gap-2">
                      {attendanceCycle.map((state) => (
                        <button
                          key={`${desk.id}-${state}`}
                          type="button"
                          className={`btn ${status === state ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setAttendanceStatus(desk.studentId as string, state)}
                        >
                          {state.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
