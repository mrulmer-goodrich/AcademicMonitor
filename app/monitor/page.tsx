"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

const colorCycle: (Performance["color"] | null)[] = ["GREEN", "YELLOW", "RED", null];
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
  const wasAttendanceComplete = useRef(false);

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
    loadAttendance();
  }

  async function bulkAttendance(status: Attendance["status"]) {
    const ok = confirm(`Mark all students as ${status.replace("_", " ")}?`);
    if (!ok) return;
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, date: dateToUse.toISOString(), mode: "bulk", status })
    });
    loadAttendance();
  }

  async function cyclePerformance(studentId: string, lapNumber: number) {
    const current = performance.find((p) => p.studentId === studentId && p.lapNumber === lapNumber);
    const currentColor = current?.color ?? null;
    const nextColor = colorCycle[(colorCycle.indexOf(currentColor) + 1) % colorCycle.length];
    setPerformance((prev) => {
      const existing = prev.find((p) => p.studentId === studentId && p.lapNumber === lapNumber);
      if (existing) {
        return nextColor
          ? prev.map((p) =>
              p.studentId === studentId && p.lapNumber === lapNumber ? { ...p, color: nextColor } : p
            )
          : prev.filter((p) => !(p.studentId === studentId && p.lapNumber === lapNumber));
      }
      if (!nextColor) return prev;
      return [...prev, { studentId, lapNumber, color: nextColor, date: dateToUse.toISOString() } as Performance];
    });
    if (!nextColor) {
      await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, studentId, date: dateToUse.toISOString(), lapNumber, remove: true })
      });
      loadPerformance();
      return;
    }
    await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, studentId, date: dateToUse.toISOString(), lapNumber, color: nextColor })
    });
    loadPerformance();
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

  const unseatedActiveStudents = useMemo(() => {
    const assigned = new Set(desks.map((desk) => desk.studentId).filter(Boolean) as string[]);
    return activeStudents.filter((id) => !assigned.has(id));
  }, [activeStudents, desks]);

  const canTakeAttendance = unseatedActiveStudents.length === 0;

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
    if (!attendanceComplete) {
      wasAttendanceComplete.current = false;
      return;
    }
    if (wasAttendanceComplete.current) return;
    wasAttendanceComplete.current = true;
    const timeout = setTimeout(() => {
      setActiveMode("performance");
      setShowAttendanceComplete(true);
      setTimeout(() => setShowAttendanceComplete(false), 1500);
      if (attendancePanel) setAttendancePanel(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [attendanceComplete, attendancePanel]);

  useEffect(() => {
    setShowAttendanceOverlay(true);
    setShowAttendanceComplete(false);
    setActiveMode("attendance");
  }, [blockId, simulateDate]);

  useEffect(() => {
    if (activeMode === "attendance") return;
    if (attendanceComplete && selectedLaps.length > 0) {
      setActiveMode("performance");
    }
  }, [attendanceComplete, selectedLaps, activeMode]);

  useEffect(() => {
    if (attendancePanel) {
      setShowAttendanceOverlay(false);
    }
  }, [attendancePanel]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="form-control w-[260px] shrink-0 ml-2"
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
          >
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                Block {block.blockNumber} · {block.blockName}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 rounded-full border border-black/20 bg-white/70 px-3 py-2">
            <button
              className={`btn px-4 py-2 ${
                !attendanceComplete || activeMode === "attendance" ? "btn-primary" : "btn-ghost"
              }`}
              type="button"
              onClick={() => {
                if (!canTakeAttendance) {
                  setShowAttendanceOverlay(true);
                  return;
                }
                setActiveMode((prev) => {
                  if (prev === "attendance") {
                    return attendanceComplete ? "performance" : "attendance";
                  }
                  return "attendance";
                });
                if (!attendanceComplete) setShowAttendanceOverlay(false);
              }}
              disabled={!blockId || !canTakeAttendance}
            >
              {!attendanceComplete
                ? "Attendance"
                : activeMode === "attendance"
                ? "Back to Laps"
                : "Update Attendance"}
            </button>
            <button
              className="btn btn-ghost px-4 py-2"
              type="button"
              onClick={() => {
                setActiveMode("attendance");
                setShowAttendanceOverlay(false);
                setShowAttendanceComplete(false);
                setAttendancePanel(true);
              }}
              disabled={!blockId || !canTakeAttendance || activeMode !== "attendance"}
            >
              List
            </button>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-black/20 bg-white/70 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-black/60">
              Select Laps to Monitor
            </div>
            <div className="flex flex-wrap gap-2">
              {lapButtons.map((lap) => {
                const selected = selectedLaps.includes(lap.lapNumber);
                return (
                  <button
                    key={`lap-select-${lap.lapNumber}`}
                    className={`btn ${
                      selected ? "btn-primary shadow" : "btn-ghost border-2 border-dashed border-black/30"
                    } ${lapsNamed ? "" : "ring-2 ring-amber-300 animate-pulse"} w-[170px] h-12 rounded-full text-[11px] uppercase tracking-wide text-center leading-tight whitespace-normal break-words overflow-hidden flex items-center justify-center px-3`}
                    type="button"
                    onClick={() =>
                      !attendanceComplete
                        ? setActiveMode("attendance")
                        : lapsNamed
                          ? setSelectedLaps((prev) =>
                              prev.includes(lap.lapNumber)
                                ? prev.filter((n) => n !== lap.lapNumber)
                                : [...prev, lap.lapNumber].sort((a, b) => a - b)
                            )
                          : (window.location.href = `/setup/laps?returnTo=${encodeURIComponent(blockId ? `/monitor?blockId=${blockId}` : "/monitor")}&focusDate=${format(dateToUse, "yyyy-MM-dd")}`)
                    }
                    disabled={activeMode === "attendance" || !canTakeAttendance}
                    title={lap.name}
                  >
                    {lapsNamed ? lap.name : "+"}
                  </button>
                );
              })}
            </div>
          </div>
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

      {false && (
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
      )}

      <div className="hero-card p-6 space-y-4">
        <div className={`hero-card h-[560px] p-4 relative overflow-hidden ${activeMode === "attendance" ? "bg-black/5" : ""}`}>
          {!canTakeAttendance && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/40 text-center text-white">
              <div className="text-[5vw] leading-none font-semibold">Assign Seats</div>
              <div className="max-w-md text-sm text-white/90">
                {unseatedActiveStudents.length} active student
                {unseatedActiveStudents.length === 1 ? " is" : "s are"} unassigned. Update the seating chart first.
              </div>
              <Link href="/setup/seating" className="btn btn-ghost">
                Go to Seating Setup
              </Link>
            </div>
          )}
          {canTakeAttendance && !attendanceComplete && showAttendanceOverlay && !attendancePanel && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/45 text-white text-center cursor-pointer"
              onClick={() => setShowAttendanceOverlay(false)}
            >
              <div className="text-[12vw] leading-none font-semibold">Take Attendance</div>
              <div className="text-base text-white/80">Tap to begin</div>
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
          {attendanceComplete && !lapsNamed && (
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
                ? "bg-red-500"
                : status === "TARDY"
                ? "bg-yellow-300"
                : status === "LEFT_EARLY"
                ? "bg-orange-300"
                : "bg-slate-200";
            const statusBg =
              activeMode === "performance"
                ? selectedLaps.length > 0
                  ? "bg-slate-200"
                  : "bg-transparent"
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
                  if (!desk.studentId) return;
                  if (activeMode === "attendance") {
                    cycleAttendance(desk.studentId);
                  }
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
                      {activeMode === "attendance" && (
                        <div className={`mx-auto mt-2 h-2 w-10 rounded-full ${statusColor}`} />
                      )}
                    </>
                  )}
                </div>
                {desk.student && activeMode === "performance" && !isAbsent && (
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    {desk.student.hiit && (
                      <span
                        className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-black text-[8px]"
                        style={{ background: "#b18ad8" }}
                      >
                        H
                      </span>
                    )}
                    {desk.student.eog && (
                      <span
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-black text-[8px] text-white"
                        style={{
                          background:
                            desk.student.eog === "FIVE"
                              ? "#1f4c8f"
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
                    <div className="absolute left-1 right-1 bottom-1 flex flex-nowrap items-center justify-center gap-0.5">
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
                          style={{ background: "#f7d774" }}
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
                {activeMode === "performance" && selectedLaps.length > 0 && !isAbsent && (
                  <div className="absolute inset-0 z-0 flex">
                    {selectedLaps.length === 1 && (
                      <button
                        type="button"
                        className="flex-1"
                        disabled={!readyForPerformance || isAbsent}
                        style={{
                          background:
                            (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[0]}`) === "GREEN")
                              ? "rgba(52, 211, 153, 0.25)"
                              : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[0]}`) === "YELLOW")
                              ? "rgba(253, 224, 71, 0.25)"
                              : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[0]}`) === "RED")
                              ? "rgba(248, 113, 113, 0.25)"
                              : "transparent"
                        }}
                        onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[0])}
                      />
                    )}
                    {selectedLaps.length === 2 && (
                      <>
                        <button
                          type="button"
                          className="flex-1 border-r border-black/10"
                          disabled={!readyForPerformance || isAbsent}
                          style={{
                            background:
                              (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[0]}`) === "GREEN")
                                ? "rgba(52, 211, 153, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[0]}`) === "YELLOW")
                                ? "rgba(253, 224, 71, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[0]}`) === "RED")
                                ? "rgba(248, 113, 113, 0.25)"
                                : "transparent"
                          }}
                          onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[0])}
                        />
                        <button
                          type="button"
                          className="flex-1"
                          disabled={!readyForPerformance || isAbsent}
                          style={{
                            background:
                              (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[1]}`) === "GREEN")
                                ? "rgba(52, 211, 153, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[1]}`) === "YELLOW")
                                ? "rgba(253, 224, 71, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[1]}`) === "RED")
                                ? "rgba(248, 113, 113, 0.25)"
                                : "transparent"
                          }}
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
                          style={{
                            background:
                              (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[0]}`) === "GREEN")
                                ? "rgba(52, 211, 153, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[0]}`) === "YELLOW")
                                ? "rgba(253, 224, 71, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[0]}`) === "RED")
                                ? "rgba(248, 113, 113, 0.25)"
                                : "transparent"
                          }}
                          onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[0])}
                        />
                        <button
                          type="button"
                          className="flex-1 border-r border-black/10"
                          disabled={!readyForPerformance || isAbsent}
                          style={{
                            background:
                              (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[1]}`) === "GREEN")
                                ? "rgba(52, 211, 153, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[1]}`) === "YELLOW")
                                ? "rgba(253, 224, 71, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[1]}`) === "RED")
                                ? "rgba(248, 113, 113, 0.25)"
                                : "transparent"
                          }}
                          onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[1])}
                        />
                        <button
                          type="button"
                          className="flex-1"
                          disabled={!readyForPerformance || isAbsent}
                          style={{
                            background:
                              (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[2]}`) === "GREEN")
                                ? "rgba(52, 211, 153, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[2]}`) === "YELLOW")
                                ? "rgba(253, 224, 71, 0.25)"
                                : (desk.studentId && performanceMap.get(`${desk.studentId}-${selectedLaps[2]}`) === "RED")
                                ? "rgba(248, 113, 113, 0.25)"
                                : "transparent"
                          }}
                          onClick={() => desk.studentId && cyclePerformance(desk.studentId, selectedLaps[2])}
                        />
                      </>
                    )}
                  </div>
                )}
                {isAbsent && activeMode === "attendance" && (
                  <div
                    className="absolute inset-0 pointer-events-auto"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  />
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
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {desks
                .slice()
                .sort((a, b) => (a.student?.displayName || "").localeCompare(b.student?.displayName || ""))
                .map((desk) => {
                if (!desk.studentId) return null;
                const status = attendanceMap.get(desk.studentId);
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
                          {state.replace("_", " ")}
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
