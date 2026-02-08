"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SetupNav from "@/components/SetupNav";

type Block = { id: string; blockNumber: number; blockName: string };

type Student = {
  id: string;
  displayName: string;
  seatNumber: number;
  ml?: boolean;
  mlNew?: boolean;
  iep504?: boolean;
  ec?: boolean;
  ca?: boolean;
  hiit?: boolean;
  eog?: "FIVE" | "FOUR" | "THREE" | "NP" | null;
};

type Desk = {
  id: string;
  type: "STUDENT" | "TEACHER";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  groupId: string | null;
  studentId: string | null;
  student?: Student | null;
  seatNumber?: number | null;
};

const SNAP_DISTANCE = 40;

export default function SeatingSetupPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [desks, setDesks] = useState<Desk[]>([]);
  const [unassigned, setUnassigned] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const gridSize = 20;
  const [snapTargetId, setSnapTargetId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("Teacher");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    groupPositions?: Record<string, { x: number; y: number }>;
  } | null>(null);

  useEffect(() => {
    loadBlocks();
  }, []);

  useEffect(() => {
    if (blockId) {
      loadDesks();
      loadUnassigned();
      loadTeacher();
    }
  }, [blockId]);

  async function loadTeacher() {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      setTeacherName(data.user?.teacherName || "Teacher");
    }
  }

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
    setDesks(data.desks || []);
  }

  async function loadUnassigned() {
    const res = await fetch(`/api/desks?blockId=${blockId}&unassigned=1`);
    const data = await res.json();
    setUnassigned(data.students || []);
    if (data.students?.length) setSelectedStudentId(data.students[0].id);
  }

  async function addStudentDesk() {
    if (!selectedStudentId) return;
    const res = await fetch("/api/desks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, type: "STUDENT", studentId: selectedStudentId, x: 40, y: 40 })
    });
    if (res.ok) {
      await loadDesks();
      await loadUnassigned();
    }
  }

  async function addTeacherDesk() {
    const res = await fetch("/api/desks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, type: "TEACHER", x: 80, y: 80, width: 160, height: 100 })
    });
    if (res.ok) {
      setLastSaved("Saved");
      await loadDesks();
    }
  }

  async function updateDesk(id: string, updates: Partial<Desk>) {
    await fetch(`/api/desks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    setLastSaved("Saved");
  }

  async function deleteDesk() {
    if (!selectedDeskId) return;
    await fetch(`/api/desks/${selectedDeskId}`, { method: "DELETE" });
    setSelectedDeskId(null);
    await loadDesks();
    await loadUnassigned();
  }

  // grouping controls removed in v1.1 simplification

  function onPointerDown(event: React.PointerEvent, desk: Desk) {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelectedDeskId(desk.id);
    const groupPositions =
      desk.groupId
        ? Object.fromEntries(
            desks
              .filter((d) => d.groupId === desk.groupId)
              .map((d) => [d.id, { x: d.x, y: d.y }])
          )
        : undefined;
    dragRef.current = {
      id: desk.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: desk.x,
      originY: desk.y,
      groupPositions
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!dragRef.current) return;
    const { id, startX, startY, originX, originY, groupPositions } = dragRef.current;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const container = containerRef.current?.getBoundingClientRect();

    setDesks((prev) => {
      const current = prev.find((d) => d.id === id);
      if (!current) return prev;
      const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
      const maxX = container ? container.width - current.width : Infinity;
      const maxY = container ? container.height - current.height : Infinity;
      if (current.groupId) {
        return prev.map((desk) =>
          desk.groupId === current.groupId
            ? {
                ...desk,
                x: clamp(
                  Math.round(((groupPositions?.[desk.id]?.x ?? desk.x) + dx) / gridSize) * gridSize,
                  0,
                  maxX
                ),
                y: clamp(
                  Math.round(((groupPositions?.[desk.id]?.y ?? desk.y) + dy) / gridSize) * gridSize,
                  0,
                  maxY
                )
              }
            : desk
        );
      }
      const nextX = clamp(
        Math.round((originX + dx) / gridSize) * gridSize,
        0,
        maxX
      );
      const nextY = clamp(
        Math.round((originY + dy) / gridSize) * gridSize,
        0,
        maxY
      );
      return prev.map((desk) => (desk.id === id ? { ...desk, x: nextX, y: nextY } : desk));
    });

    const current = desks.find((d) => d.id === id);
    if (current) {
      const nearest = desks
        .filter((d) => d.id !== current.id)
        .map((d) => {
          const dx = d.x - current.x;
          const dy = d.y - current.y;
          return { desk: d, dist: Math.hypot(dx, dy) };
        })
        .sort((a, b) => a.dist - b.dist)[0];
      const threshold = SNAP_DISTANCE;
      setSnapTargetId(nearest && nearest.dist < threshold ? nearest.desk.id : null);
    }
  }

  async function onPointerUp() {
    if (!dragRef.current) return;
    const id = dragRef.current.id;
    dragRef.current = null;
    setSnapTargetId(null);

    const desk = desks.find((d) => d.id === id);
    if (!desk) return;

    const nearest = desks
      .filter((d) => d.id !== desk.id)
      .map((d) => {
        const dx = d.x - desk.x;
        const dy = d.y - desk.y;
        return { desk: d, dist: Math.hypot(dx, dy) };
      })
      .sort((a, b) => a.dist - b.dist)[0];

    const threshold = SNAP_DISTANCE;
    let nextX = desk.x;
    let nextY = desk.y;
    if (nearest && nearest.dist < threshold) {
      if (Math.abs(nearest.desk.x - desk.x) < threshold) {
        nextX = nearest.desk.x;
      }
      if (Math.abs(nearest.desk.y - desk.y) < threshold) {
        nextY = nearest.desk.y;
      }
    }

    const updates: Partial<Desk> = { x: nextX, y: nextY };
    await updateDesk(desk.id, updates);
    setDesks((prev) => prev.map((d) => (d.id === desk.id ? { ...d, x: nextX, y: nextY } : d)));
    setTimeout(() => setLastSaved(null), 1500);
  }

  function rotateSelected(delta: number) {
    const desk = desks.find((d) => d.id === selectedDeskId);
    if (!desk) return;
    const rotation = (desk.rotation + delta) % 360;
    setDesks((prev) => prev.map((d) => (d.id === desk.id ? { ...d, rotation } : d)));
    updateDesk(desk.id, { rotation });
  }

  const blockOptions = useMemo(
    () => blocks.map((block) => ({ id: block.id, label: `Block ${block.blockNumber} · ${block.blockName}` })),
    [blocks]
  );


  async function autoFit() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const studentDesks = desks.filter((d) => d.type === "STUDENT");
    if (studentDesks.length === 0) return;
    const minX = Math.min(...studentDesks.map((d) => d.x));
    const minY = Math.min(...studentDesks.map((d) => d.y));
    const maxX = Math.max(...studentDesks.map((d) => d.x + d.width));
    const maxY = Math.max(...studentDesks.map((d) => d.y + d.height));
    const padding = 20;
    const width = maxX - minX;
    const height = maxY - minY;
    const scale = Math.min((rect.width - padding * 2) / width, (rect.height - padding * 2) / height);
    const next = studentDesks.map((d) => ({
      id: d.id,
      x: (d.x - minX) * scale + padding,
      y: (d.y - minY) * scale + padding,
      width: d.width * scale,
      height: d.height * scale
    }));
    await Promise.all(next.map((d) => updateDesk(d.id, d)));
    await loadDesks();
  }


  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="section-title">Set up / manage seating chart</h1>
        <p className="text-black/70 text-sm">
          Drag desks to arrange the room. Desks snap together when close and can move as grouped clusters.
        </p>
      </div>
      <SetupNav />

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select className="form-control max-w-[260px]" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
          {blockOptions.map((block) => (
            <option key={block.id} value={block.id}>
              {block.label}
            </option>
          ))}
        </select>
        <select
          className="form-control max-w-[220px]"
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          disabled={unassigned.length === 0}
        >
          {unassigned.map((student) => (
            <option key={student.id} value={student.id}>
              {student.displayName} (Seat {student.seatNumber})
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="button" onClick={addStudentDesk} disabled={unassigned.length === 0}>
          Add Student Desk
        </button>
        {unassigned.length === 0 && <div className="text-sm text-black/60">All students assigned</div>}
        <button className="btn btn-ghost" type="button" onClick={addTeacherDesk}>
          Add Teacher Desk
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => rotateSelected(15)}>
          Rotate +15°
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => rotateSelected(-15)}>
          Rotate -15°
        </button>
        <button className="btn btn-ghost" type="button" onClick={deleteDesk} disabled={!selectedDeskId}>
          Delete Desk
        </button>
        <button className="btn btn-ghost" type="button" onClick={autoFit}>
          Auto Fit
        </button>
        <div className="text-sm text-black/60">{lastSaved ? lastSaved : "Autosave enabled"}</div>
      </div>

      <div
        className="hero-card h-[560px] p-4 relative overflow-hidden"
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          backgroundImage: `linear-gradient(to right, rgba(11,27,42,0.06) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(11,27,42,0.06) 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`
        }}
      >
        {desks.map((desk) => (
          <div
            key={desk.id}
            className={`absolute rounded-2xl border border-black/20 bg-white/90 text-center text-xs shadow ${
              desk.id === selectedDeskId ? "ring-2 ring-ocean" : ""
            } ${desk.id === snapTargetId ? "ring-2 ring-coral" : ""} ${
              desk.type === "TEACHER" ? "flex items-center justify-center" : ""
            }`}
            style={{
              left: desk.x,
              top: desk.y,
              width: desk.width,
              height: desk.height,
              transform: `rotate(${desk.rotation}deg)`
            }}
            onPointerDown={(event) => onPointerDown(event, desk)}
          >
            <div className={desk.type === "TEACHER" ? "text-base font-semibold" : "mt-2 text-base font-semibold"}>
              {desk.type === "TEACHER" ? teacherName : desk.student?.displayName || "Student"}
            </div>
            {desk.type === "STUDENT" && desk.seatNumber && (
              <div className="text-[10px] text-black/60 sr-only">Seat {desk.seatNumber}</div>
            )}
            {desk.type === "STUDENT" && desk.student && (
              <>
                {desk.student.hiit && (
                  <span
                    className="absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full border border-black text-[7px]"
                    style={{ background: "#b18ad8" }}
                  >
                    H
                  </span>
                )}
                {desk.student.eog && (
                  <span
                    className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full border border-black text-[7px] text-white"
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
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1 px-2">
                  {desk.student.ml && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-black text-[7px]"
                      style={{ background: "#9ecae1" }}
                    >
                      ML
                    </span>
                  )}
                  {desk.student.mlNew && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-black text-[7px]"
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
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-black text-[7px]"
                      style={{ background: "#f5a9b8" }}
                    >
                      I
                    </span>
                  )}
                  {desk.student.ec && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-black text-[7px]"
                      style={{ background: "#f7d774" }}
                    >
                      EC
                    </span>
                  )}
                  {desk.student.ca && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-black text-[7px]"
                      style={{ background: "#ffffff" }}
                    >
                      CA
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {desks.length === 0 && (
          <div className="h-full rounded-2xl border border-dashed border-black/20 bg-white/40 flex items-center justify-center text-black/40">
            Seating chart canvas placeholder
          </div>
        )}
      </div>
    </div>
  );
}
