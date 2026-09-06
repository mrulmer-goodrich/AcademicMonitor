"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ClassroomCanvas from "@/components/ClassroomCanvas";
import ReturnToDashboardButton from "@/components/ReturnToDashboardButton";
import StudentIndicators from "@/components/StudentIndicators";
import {
  CLASSROOM_HEIGHT,
  CLASSROOM_WIDTH,
  findOpenStudentDeskPosition,
  findOverlappingDeskIds,
  normalizeDeskGeometry
} from "@/lib/classroomGeometry";

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

function SeatingSetupPageInner() {
  const searchParams = useSearchParams();
  const requestedBlockId = searchParams.get("blockId");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [desks, setDesks] = useState<Desk[]>([]);
  const [unassigned, setUnassigned] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedDeskIds, setSelectedDeskIds] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gridSize = 20;
  const [snapTargetId, setSnapTargetId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("Teacher");
  const [canvasScale, setCanvasScale] = useState(1);
  const [creatingDesk, setCreatingDesk] = useState<"student" | "all" | "teacher" | null>(null);
  const creatingDeskRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    wasSelected: boolean;
    movingIds: string[];
    positions: Record<string, { x: number; y: number }>;
  } | null>(null);

  useEffect(() => {
    loadBlocks();
  }, []);

  useEffect(() => {
    if (!requestedBlockId) return;
    if (!blocks.some((block) => block.id === requestedBlockId)) return;
    if (requestedBlockId !== blockId) {
      setBlockId(requestedBlockId);
    }
  }, [requestedBlockId, blocks, blockId]);

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
    const availableBlocks: Block[] = data.blocks || [];
    setBlocks(availableBlocks);
    if (!blockId && availableBlocks.length) {
      const matchingBlock = requestedBlockId ? availableBlocks.find((block) => block.id === requestedBlockId) : null;
      setBlockId(matchingBlock ? matchingBlock.id : availableBlocks[0].id);
    }
  }

  async function loadDesks() {
    const res = await fetch(`/api/desks?blockId=${blockId}`);
    const data = await res.json();
    const normalized = (data.desks || []).map((desk: Desk) => normalizeDeskGeometry(desk));
    setDesks(normalized);
  }

  async function loadUnassigned() {
    const res = await fetch(`/api/desks?blockId=${blockId}&unassigned=1`);
    const data = await res.json();
    setUnassigned(data.students || []);
    setSelectedStudentId((current) =>
      data.students?.some((student: Student) => student.id === current) ? current : data.students?.[0]?.id || ""
    );
  }

  async function addStudentDesk() {
    if (!selectedStudentId || creatingDeskRef.current) return;
    creatingDeskRef.current = true;
    setCreatingDesk("student");
    setError(null);
    try {
      const position = findOpenStudentDeskPosition(desks);
      const res = await fetch("/api/desks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, type: "STUDENT", studentId: selectedStudentId, ...position })
      });
      if (!res.ok) throw new Error("Unable to add that student desk.");
      await Promise.all([loadDesks(), loadUnassigned()]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to add that student desk.");
    } finally {
      creatingDeskRef.current = false;
      setCreatingDesk(null);
    }
  }

  async function addAllStudentDesks() {
    if (!unassigned.length || creatingDeskRef.current) return;
    creatingDeskRef.current = true;
    setCreatingDesk("all");
    setError(null);
    let placedDesks = [...desks];
    try {
      for (const student of unassigned) {
        const position = findOpenStudentDeskPosition(placedDesks);
        const res = await fetch("/api/desks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId, type: "STUDENT", studentId: student.id, ...position })
        });
        if (!res.ok) throw new Error(`Unable to add a desk for ${student.displayName}.`);
        const data = await res.json();
        placedDesks = [...placedDesks, normalizeDeskGeometry(data.desk)];
        setDesks(placedDesks);
      }
      await Promise.all([loadDesks(), loadUnassigned()]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to add every student desk.");
      await Promise.all([loadDesks(), loadUnassigned()]);
    } finally {
      creatingDeskRef.current = false;
      setCreatingDesk(null);
    }
  }

  async function addTeacherDesk() {
    if (creatingDeskRef.current) return;
    creatingDeskRef.current = true;
    setCreatingDesk("teacher");
    try {
      const res = await fetch("/api/desks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, type: "TEACHER", x: 80, y: 80, width: 156, height: 92 })
      });
      if (res.ok) {
        await loadDesks();
      }
    } finally {
      creatingDeskRef.current = false;
      setCreatingDesk(null);
    }
  }

  async function updateDesk(id: string, updates: Partial<Desk>) {
    await fetch(`/api/desks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
  }

  async function removeSelectedDesks() {
    if (selectedDeskIds.length === 0) return;
    const label = selectedDeskIds.length === 1 ? "this desk" : `${selectedDeskIds.length} desks`;
    if (!confirm(`Remove ${label} from the seating chart? Students will return to the unassigned list.`)) return;
    await Promise.all(selectedDeskIds.map((id) => fetch(`/api/desks/${id}`, { method: "DELETE" })));
    setSelectedDeskIds([]);
    await loadDesks();
    await loadUnassigned();
  }

  // grouping controls removed in v1.1 simplification

  function onPointerDown(event: React.PointerEvent, desk: Desk) {
    if (unassigned.length > 0) return;
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const wasSelected = selectedDeskIds.includes(desk.id);
    const movingIds = multiSelect
      ? (wasSelected ? selectedDeskIds : [...selectedDeskIds, desk.id])
      : [desk.id];
    setSelectedDeskIds(movingIds);
    dragRef.current = {
      id: desk.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: desk.x,
      originY: desk.y,
      moved: false,
      wasSelected,
      movingIds,
      positions: Object.fromEntries(desks.filter((item) => movingIds.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }]))
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!dragRef.current) return;
    const { id, startX, startY, movingIds, positions } = dragRef.current;
    const rawDx = (event.clientX - startX) / canvasScale;
    const rawDy = (event.clientY - startY) / canvasScale;
    if (Math.abs(rawDx) > 2 || Math.abs(rawDy) > 2) dragRef.current.moved = true;
    const snappedDx = Math.round(rawDx / gridSize) * gridSize;
    const snappedDy = Math.round(rawDy / gridSize) * gridSize;
    const movingDesks = desks.filter((desk) => movingIds.includes(desk.id));
    const dx = Math.min(
      Math.max(snappedDx, ...movingDesks.map((desk) => -(positions[desk.id]?.x ?? desk.x))),
      ...movingDesks.map((desk) => CLASSROOM_WIDTH - desk.width - (positions[desk.id]?.x ?? desk.x))
    );
    const dy = Math.min(
      Math.max(snappedDy, ...movingDesks.map((desk) => -(positions[desk.id]?.y ?? desk.y))),
      ...movingDesks.map((desk) => CLASSROOM_HEIGHT - desk.height - (positions[desk.id]?.y ?? desk.y))
    );

    setDesks((prev) => {
      return prev.map((desk) => movingIds.includes(desk.id)
        ? { ...desk, x: (positions[desk.id]?.x ?? desk.x) + dx, y: (positions[desk.id]?.y ?? desk.y) + dy }
        : desk);
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
    const { id, moved, wasSelected, movingIds } = dragRef.current;
    dragRef.current = null;
    setSnapTargetId(null);

    if (multiSelect && !moved && wasSelected) {
      setSelectedDeskIds((current) => current.filter((selectedId) => selectedId !== id));
      return;
    }

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

    if (movingIds.length > 1) {
      await Promise.all(movingIds.map((movingId) => {
        const movingDesk = desks.find((item) => item.id === movingId);
        return movingDesk ? updateDesk(movingId, { x: movingDesk.x, y: movingDesk.y }) : Promise.resolve();
      }));
      return;
    }
    await updateDesk(desk.id, { x: nextX, y: nextY });
    setDesks((prev) => prev.map((d) => (d.id === desk.id ? { ...d, x: nextX, y: nextY } : d)));
  }

  function rotateSelected(delta: number) {
    const selected = desks.filter((desk) => selectedDeskIds.includes(desk.id));
    if (selected.length === 0) return;
    setDesks((current) => current.map((desk) => selectedDeskIds.includes(desk.id)
      ? { ...desk, rotation: (desk.rotation + delta + 360) % 360 }
      : desk));
    void Promise.all(selected.map((desk) => updateDesk(desk.id, { rotation: (desk.rotation + delta + 360) % 360 })));
  }

  function moveSelectedBy(dx: number, dy: number) {
    const selected = desks.filter((desk) => selectedDeskIds.includes(desk.id));
    if (selected.length === 0 || unassigned.length > 0) return;
    const allowedDx = Math.min(Math.max(dx, ...selected.map((desk) => -desk.x)), ...selected.map((desk) => CLASSROOM_WIDTH - desk.width - desk.x));
    const allowedDy = Math.min(Math.max(dy, ...selected.map((desk) => -desk.y)), ...selected.map((desk) => CLASSROOM_HEIGHT - desk.height - desk.y));
    const next = selected.map((desk) => ({ ...desk, x: desk.x + allowedDx, y: desk.y + allowedDy }));
    setDesks((current) => current.map((desk) => next.find((item) => item.id === desk.id) || desk));
    void Promise.all(next.map((desk) => updateDesk(desk.id, { x: desk.x, y: desk.y })));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (selectedDeskIds.length === 0 || unassigned.length > 0) return;
      const step = event.shiftKey ? gridSize * 3 : gridSize;
      const movement = event.key === "ArrowLeft" ? [-step, 0] : event.key === "ArrowRight" ? [step, 0] : event.key === "ArrowUp" ? [0, -step] : event.key === "ArrowDown" ? [0, step] : null;
      if (!movement) return;
      event.preventDefault();
      moveSelectedBy(movement[0], movement[1]);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [desks, selectedDeskIds, unassigned.length]);

  const blockOptions = useMemo(
    () => blocks.map((block) => ({ id: block.id, label: `Block ${block.blockNumber} · ${block.blockName}` })),
    [blocks]
  );
  const selectedBlock = useMemo(() => blocks.find((block) => block.id === blockId) || null, [blocks, blockId]);
  const blockLocked = useMemo(
    () => Boolean(requestedBlockId && blocks.some((block) => block.id === requestedBlockId)),
    [requestedBlockId, blocks]
  );
  const overlappingDeskIds = useMemo(() => findOverlappingDeskIds(desks), [desks]);

  // auto-fit removed


  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-4 sm:px-6 sm:py-6">
      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div><ReturnToDashboardButton className="w-auto shrink-0 px-4 py-2 text-sm md:min-w-0" /></div>

      <div className="hero-card flex flex-wrap items-center gap-2 p-3">
        {blockLocked ? (
          <div className="rounded-full border border-black/15 bg-white/85 px-3 py-2 text-sm font-semibold text-black/80 shadow-sm">
            {selectedBlock ? `Block ${selectedBlock.blockNumber} · ${selectedBlock.blockName}` : "Selected Block"}
          </div>
        ) : (
          <select className="form-control max-w-[240px] shrink-0 py-2 text-sm" value={blockId} onChange={(event) => { setBlockId(event.target.value); setSelectedDeskIds([]); }}>
            {blockOptions.map((block) => <option key={block.id} value={block.id}>{block.label}</option>)}
          </select>
        )}

        <select className="form-control max-w-[200px] shrink-0 py-2 text-sm" aria-label="Unassigned student" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} disabled={unassigned.length === 0 || Boolean(creatingDesk)}>
          {unassigned.length === 0 && <option value="">No students to add</option>}
          {unassigned.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}
        </select>
        <button className="btn btn-primary shrink-0 px-3 py-2 text-sm" type="button" onClick={addStudentDesk} disabled={unassigned.length === 0 || Boolean(creatingDesk)}>{creatingDesk === "student" ? "Adding…" : "Add Student"}</button>
        <button className="btn btn-ghost shrink-0 px-3 py-2 text-sm" type="button" onClick={addAllStudentDesks} disabled={unassigned.length === 0 || Boolean(creatingDesk)}>{creatingDesk === "all" ? `Adding ${unassigned.length}…` : "Add All"}</button>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button className="btn btn-ghost shrink-0 px-3 py-2 text-sm" type="button" onClick={addTeacherDesk} disabled={unassigned.length > 0 || Boolean(creatingDesk)}>{creatingDesk === "teacher" ? "Adding…" : "Add Teacher Desk"}</button>
          <button className={`btn shrink-0 px-3 py-2 text-sm ${multiSelect ? "btn-primary" : "btn-ghost"}`} type="button" aria-pressed={multiSelect} onClick={() => { setMultiSelect((current) => !current); setSelectedDeskIds([]); }} disabled={unassigned.length > 0}>Select Multiple</button>
          <button className="btn btn-ghost shrink-0 px-3 py-2 text-sm" type="button" onClick={() => rotateSelected(-15)} disabled={unassigned.length > 0 || selectedDeskIds.length === 0}>−15°</button>
          <button className="btn btn-ghost shrink-0 px-3 py-2 text-sm" type="button" onClick={() => rotateSelected(15)} disabled={unassigned.length > 0 || selectedDeskIds.length === 0}>+15°</button>
          <button className="btn btn-ghost shrink-0 px-3 py-2 text-sm" type="button" onClick={() => setSelectedDeskIds([])} disabled={selectedDeskIds.length === 0}>Clear Selection</button>
          {selectedDeskIds.length > 0 && (
            <details className="relative">
              <summary className="btn btn-ghost cursor-pointer list-none px-3 py-2 text-sm">More</summary>
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-black/10 bg-white p-2 shadow-xl">
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => void removeSelectedDesks()}>Remove selected desk{selectedDeskIds.length === 1 ? "" : "s"}</button>
              </div>
            </details>
          )}
        </div>
      </div>

      <ClassroomCanvas
        className={`aspect-[1040/528] w-full ${unassigned.length > 0 ? "opacity-60" : ""}`}
        canvasClassName="rounded-2xl border border-black/10"
        maxScale={2}
        onScaleChange={setCanvasScale}
        canvasRef={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        canvasStyle={{
          backgroundImage: `linear-gradient(to right, rgba(11,27,42,0.06) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(11,27,42,0.06) 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`
        }}
      >
        {desks.map((desk) => (
          <div
            key={desk.id}
            className={`absolute rounded-2xl border border-black/20 bg-white/90 text-center text-xs shadow ${
              selectedDeskIds.includes(desk.id) ? "ring-2 ring-ocean" : ""
            } ${desk.id === snapTargetId ? "ring-2 ring-coral" : ""} ${
              overlappingDeskIds.has(desk.id) ? "ring-4 ring-amber-400" : ""
            } ${
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
            <div className="absolute inset-0 flex items-center justify-center px-1">
              <div className="text-base font-semibold text-center leading-tight">
                {desk.type === "TEACHER" ? teacherName : desk.student?.displayName || "Student"}
              </div>
            </div>
            {desk.type === "STUDENT" && desk.student && (
              <StudentIndicators student={desk.student} size="seating" />
            )}
          </div>
        ))}
        {desks.length === 0 && (
          <div className="h-full rounded-2xl border border-dashed border-black/20 bg-white/40 flex items-center justify-center text-black/40">
            Seating chart canvas placeholder
          </div>
        )}
      </ClassroomCanvas>
    </div>
  );
}

export default function SeatingSetupPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1600px] px-6 py-6">Loading…</div>}>
      <SeatingSetupPageInner />
    </Suspense>
  );
}
