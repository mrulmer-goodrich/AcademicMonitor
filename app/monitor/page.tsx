"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

function MonitorPageInner() {
  const searchParams = useSearchParams();
  const requestedBlockId = searchParams.get("blockId");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [desks, setDesks] = useState<Desk[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendancePanel, setAttendancePanel] = useState(false);
  const [showAttendanceOverlay, setShowAttendanceOverlay] = useState(true);
  const [showAttendanceComplete, setShowAttendanceComplete] = useState(false);
  const [activeMode, setActiveMode] = useState<"attendance" | "performance">("attendance");
  const [laps, setLaps] = useState<Lap[]>([]);
  const [selectedLaps, setSelectedLaps] = useState<number[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeStudents, setActiveStudents] = useState<string[]>([]);
  const [editingLap, setEditingLap] = useState<Lap | null>(null);
  const [editingName, setEditingName] = useState("");

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
    if (!blockId && data.blocks?.length) {
      const match = requestedBlockId && data.blocks.some((block: Block) => block.id === requestedBlockId);
      setBlockId(match ? (requestedBlockId as string) : data.blocks[0].id);
    }
  }

  async function loadDesks() {
    const res = await fetch(`/api/desks?blockId=${blockId}`);
    const data = await res.json();
    const normalized = (data.desks || [])
      .filter((d: Desk) => d.type === "STUDENT")
      .map((desk: Desk) => ({
        ...desk,
        width: desk.width > 116 ? 116 : desk.width,
        height: desk.height > 82 ? 82 : desk.height
      }));
    setDesks(normalized);
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
    setAttendance((prev) => {
      const existing = prev.find((a) => a.studentId === studentId);
      if (existing) {
        return prev.map((a) => (a.studentId === studentId ? { ...a, status } : a));
      }
      return [...prev, { id: `temp-${studentId}`, studentId, status }];
    });
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
    setPerformance((prev) => {
      const existing = prev.find((p) => p.studentId === studentId && p.lapNumber === lapNumber);
      if (existing) {
        return prev.map((p) => (p.studentId === studentId && p.lapNumber === lapNumber ? { ...p, color: nextColor } : p));
      }
      return [...prev, { studentId, lapNumber, color: nextColor, date: dateToUse.toISOString() } as Performance];
    });
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
  const readyForPerformance = lapsNamed && attendanceComplete && selectedLaps.length > 0;
  const lapButtons = lapsNamed
    ? todayLaps.map((lap) => ({ lapNumber: lap.lapNumber, name: lap.name }))
    : [1, 2, 3].map((lapNumber) => ({ lapNumber, name: `Lap ${lapNumber}` }));

  useEffect(() => {
    if (attendanceComplete && attendancePanel) {
      setAttendancePanel(false);
    }
    if (attendanceComplete) {
      setActiveMode("performance");
      setShowAttendanceComplete(true);
      const timeout = setTimeout(() => setShowAttendanceComplete(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [attendanceComplete, attendancePanel]);

  useEffect(() => {
    setShowAttendanceOverlay(true);
    setShowAttendanceComplete(false);
    setActiveMode("attendance");
  }, [blockId, simulateDate]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select className="form-control max-w-[240px]" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                Block {block.blockNumber} · {block.blockName}
              </option>
            ))}
          </select>
          <button
            className={`btn ${activeMode === "attendance" ? "btn-primary" : "btn-ghost"}`}
            type="button"
            onClick={() =>
              setActiveMode((prev) => (prev === "attendance" ? (readyForPerformance ? "performance" : prev) : "attendance"))
            }
            disabled={!blockId}
          >
            Update Attendance
          </button>
          {lapButtons.map((lap) => (
            <button
              key={`lap-select-${lap.lapNumber}`}
              className={`btn ${selectedLaps.includes(lap.lapNumber) ? "btn-primary" : "btn-ghost"} ${
                lapsNamed ? "" : "ring-2 ring-amber-300"
              }`}
              type="button"
              onClick={() =>
                setSelectedLaps((prev) =>
                  prev.includes(lap.lapNumber)
                    ? prev.filter((n) => n !== lap.lapNumber)
                    : [...prev, lap.lapNumber].sort((a, b) => a - b)
                )
              }
              disabled={!lapsNamed}
            >
              {lap.name}
            </button>
          ))}
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
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-ghost" type="button" onClick={() => bulkAttendance("PRESENT")} disabled={!blockId}>
            Set All Present
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => bulkAttendance("ABSENT")} disabled={!blockId}>
            Set All Absent
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setActiveMode("attendance");
              setAttendancePanel(true);
            }}
            disabled={!blockId}
          >
            Switch to Attendance List
          </button>
        </div>

        <div className="hero-card h-[560px] p-4 relative overflow-hidden">
          {!attendanceComplete && showAttendanceOverlay && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 text-sm font-semibold"
              onClick={() => setShowAttendanceOverlay(false)}
            >
              Take Attendance
            </div>
          )}
          {showAttendanceComplete && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 text-sm font-semibold"
              onClick={() => setShowAttendanceComplete(false)}
            >
              Attendance Complete
            </div>
          )}
          {!lapsNamed && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/40 text-sm font-semibold">
              Name laps to unlock tracking
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
              status
                ? status === "PRESENT"
                  ? "bg-emerald-100"
                  : status === "ABSENT"
                  ? "bg-red-100"
                  : status === "TARDY"
                  ? "bg-yellow-100"
                  : "bg-orange-100"
                : "bg-white";
            return (
              <div
                key={desk.id}
                className={`absolute rounded-2xl border border-black/10 px-3 py-3 text-center shadow ${statusBg} ${
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
                  if (!desk.studentId) return;
                  if (activeMode === "attendance") {
                    cycleAttendance(desk.studentId);
                  }
                }}
              >
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <div className="text-lg font-semibold text-center">{desk.student?.displayName}</div>
                  <div className={`mx-auto mt-2 h-2 w-10 rounded-full ${statusColor}`} />
                </div>
                {activeMode === "performance" && selectedLaps.length > 0 && (
                  <div className="absolute inset-0 flex">
                    {selectedLaps.length === 1 && (
                      <button
                        type="button"
                        className="flex-1"
                        disabled={!readyForPerformance || isAbsent}
                        onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[0])}
                      />
                    )}
                    {selectedLaps.length === 2 && (
                      <>
                        <button
                          type="button"
                          className="flex-1 border-r border-black/10"
                          disabled={!readyForPerformance || isAbsent}
                          onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[0])}
                        />
                        <button
                          type="button"
                          className="flex-1"
                          disabled={!readyForPerformance || isAbsent}
                          onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[1])}
                        />
                      </>
                    )}
                    {selectedLaps.length === 3 && (
                      <>
                        <button
                          type="button"
                          className="flex-1 border-r border-black/10"
                          disabled={!readyForPerformance || isAbsent}
                          onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[0])}
                        />
                        <button
                          type="button"
                          className="flex-1 border-r border-black/10"
                          disabled={!readyForPerformance || isAbsent}
                          onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[1])}
                        />
                        <button
                          type="button"
                          className="flex-1"
                          disabled={!readyForPerformance || isAbsent}
                          onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[2])}
                        />
                      </>
                    )}
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

        {desks.length === 0 && (
          <div className="text-sm text-black/60 flex flex-wrap items-center gap-3">
            No seating chart found. Add desks in Setup.
            <Link href="/setup/seating" className="btn btn-ghost">
              Go to Seating Setup
            </Link>
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
            <div className="space-y-3">
              {desks
                .slice()
                .sort((a, b) => (a.student?.displayName || "").localeCompare(b.student?.displayName || ""))
                .map((desk) => {
                if (!desk.studentId) return null;
                const status = attendanceMap.get(desk.studentId);
                return (
                  <div key={`att-${desk.id}`} className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                    <div className="font-semibold">{desk.student?.displayName}</div>
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

export default function MonitorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10">Loading…</div>}>
      <MonitorPageInner />
    </Suspense>
  );
}
