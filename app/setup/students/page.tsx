"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SetupNav from "@/components/SetupNav";

type Block = { id: string; blockNumber: number; blockName: string };

type Student = {
  id: string;
  displayName: string;
  blockId: string;
  active: boolean;
  seatNumber: number;
  ml: boolean;
  mlNew: boolean;
  iep504: boolean;
  ec: boolean;
  ca: boolean;
  hiit: boolean;
  eog: "FIVE" | "FOUR" | "THREE" | "NP" | null;
  notes?: string | null;
};

const categories = [
  { key: "ml", label: "ML", color: "#9ecae1" },
  { key: "mlNew", label: "ML New", color: "#9ecae1" },
  { key: "iep504", label: "IEP / 504", color: "#f5a9b8" },
  { key: "ec", label: "EC", color: "#f7d774" },
  { key: "ca", label: "CA", color: "#ffffff" },
  { key: "hiit", label: "HIIT", color: "#b18ad8" }
] as const;

const eogOptions: Student["eog"][] = [null, "FIVE", "FOUR", "THREE", "NP"];

export default function StudentsSetupPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Student>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"displayName" | "eog" | "ml" | "mlNew" | "iep504" | "ec" | "ca" | "hiit">(
    "displayName"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showInactive, setShowInactive] = useState(false);
  const [notesEditor, setNotesEditor] = useState<{ id: string; name: string; notes: string } | null>(null);
  const editingLocked = Boolean(editingId);

  useEffect(() => {
    loadBlocks();
  }, []);

  useEffect(() => {
    if (blockId) loadStudents();
  }, [blockId]);

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

  async function loadStudents() {
    const res = await fetch(`/api/students?blockId=${blockId}`);
    const data = await res.json();
    setStudents(data.students || []);
  }

  async function addStudent() {
    setError(null);
    if (!displayName || !blockId) return;
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, blockId })
    });
    if (!res.ok) {
      setError("Unable to add student.");
      return;
    }
    setDisplayName("");
    await loadStudents();
  }

  async function updateStudent(id: string, data: Partial<Student>) {
    const res = await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      setStatusMessage("Saved");
      setTimeout(() => setStatusMessage(null), 1500);
      setEditingId(null);
      setDraft((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadStudents();
    }
  }

  async function importStudents() {
    if (!importText.trim() || !blockId) return;
    const lines = importText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    for (const line of lines) {
      const name = line.trim();
      if (!name) continue;
      await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, blockId })
      });
    }
    setImportText("");
    await loadStudents();
  }

  const blockOptions = useMemo(
    () =>
      blocks.map((block) => ({
        id: block.id,
        label: `Block ${block.blockNumber} · ${block.blockName}`
      })),
    [blocks]
  );

  const sortedStudents = useMemo(() => {
    const filtered = showInactive ? students : students.filter((student) => student.active);
    const eogOrder: Record<string, number> = {
      FIVE: 5,
      FOUR: 4,
      THREE: 3,
      NP: 0,
      "": -1
    };
    const sorted = filtered.slice().sort((a, b) => {
      if (sortKey === "displayName") {
        const cmp = a.displayName.localeCompare(b.displayName);
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "eog") {
        const aVal = eogOrder[a.eog || ""];
        const bVal = eogOrder[b.eog || ""];
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aVal = Number(Boolean(a[sortKey]));
      const bVal = Number(Boolean(b[sortKey]));
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [students, showInactive, sortKey, sortDir]);

  function toggleSort(nextKey: typeof sortKey) {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("asc");
    }
  }

  function sortLabel(key: typeof sortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  async function deleteStudent(student: Student) {
    const confirmOne = confirm(`Delete ${student.displayName}? This cannot be undone.`);
    if (!confirmOne) return;
    const confirmTwo = confirm("This will permanently delete attendance, performance, and notes for this student.");
    if (!confirmTwo) return;
    const confirmThree = confirm("Consider setting the student to inactive instead. Delete anyway?");
    if (!confirmThree) return;
    const typed = prompt('Type "DELETE" to confirm.');
    if (typed !== "DELETE") return;
    const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Unable to delete student.");
      return;
    }
    await loadStudents();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="section-title">Set up / manage students</h1>
      </div>
      <SetupNav />

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div className="hero-card p-6 space-y-4">
        <div className="grid w-full grid-cols-[200px_minmax(120px,1fr)_auto_auto] items-center gap-2">
          <select
            className="form-control w-full truncate"
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
          >
            {blockOptions.map((block) => (
              <option key={block.id} value={block.id}>
                {block.label}
              </option>
            ))}
          </select>
          <input
            className="form-control min-w-0"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Student name"
            onKeyDown={(e) => {
              if (e.key === "Enter") addStudent();
            }}
            disabled={editingLocked}
          />
          <button className="btn btn-primary shrink-0 px-3 py-2 text-sm" type="button" onClick={addStudent} disabled={editingLocked}>
            Add Student
          </button>
          <button className="btn btn-ghost shrink-0 px-3 py-2 text-sm" type="button" onClick={() => setShowImport(true)} disabled={editingLocked}>
            Import List
          </button>
        </div>

        <div className="flex items-center justify-between text-sm text-black/60">
          <div>{statusMessage ? statusMessage : ""}</div>
          <button
            className="btn btn-ghost px-3 py-1 text-xs"
            type="button"
            onClick={() => setShowInactive((prev) => !prev)}
          >
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th className="text-center">
                <button className="btn btn-ghost h-9 px-3 text-xs flex items-center justify-center text-center" type="button" onClick={() => toggleSort("displayName")}>
                  Student Name{sortLabel("displayName")}
                </button>
              </th>
              <th className="text-center">
                <span className="btn btn-ghost h-9 px-3 text-xs cursor-default flex items-center justify-center text-center">Status</span>
              </th>
              <th className="text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {categories.map((cat) => (
                      <button
                        key={`sort-${cat.key}`}
                        className="btn btn-ghost h-10 w-10 rounded-full border border-black/40 text-[10px] font-bold leading-tight flex items-center justify-center text-center"
                        type="button"
                        onClick={() => toggleSort(cat.key)}
                      >
                        <span className="flex flex-col items-center justify-center leading-tight">
                          <span>{cat.label}</span>
                          {sortLabel(cat.key) && <span className="text-[9px]">{sortLabel(cat.key)}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </th>
              <th className="text-center">
                <button className="btn btn-ghost h-9 px-3 text-xs flex items-center justify-center text-center" type="button" onClick={() => toggleSort("eog")}>
                  EOG{sortLabel("eog")}
                </button>
              </th>
              <th className="text-center">
                <span className="btn btn-ghost h-9 px-3 text-xs cursor-default flex items-center justify-center text-center">Notes</span>
              </th>
              <th className="text-center">
                <span className="btn btn-ghost h-9 px-3 text-xs cursor-default flex items-center justify-center text-center">Save</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student) => {
              const isEditing = editingId === student.id;
              const draftRow = draft[student.id] || student;
              const hasChanges =
                draftRow.displayName !== student.displayName ||
                draftRow.active !== student.active ||
                draftRow.ml !== student.ml ||
                draftRow.mlNew !== student.mlNew ||
                draftRow.iep504 !== student.iep504 ||
                draftRow.ec !== student.ec ||
                draftRow.ca !== student.ca ||
                draftRow.hiit !== student.hiit ||
                draftRow.eog !== student.eog ||
                (draftRow.notes || "") !== (student.notes || "");
              const hasNotes = Boolean(student.notes && student.notes.trim().length > 0);

              return (
              <tr key={student.id}>
                <td>
                  <input
                    className="form-control"
                    value={draftRow.displayName}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [student.id]: { ...draftRow, displayName: e.target.value }
                      }))
                    }
                  />
                </td>
                <td>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={!isEditing}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        [student.id]: { ...draftRow, active: !draftRow.active }
                      }))
                    }
                  >
                    {draftRow.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((cat) => {
                      const key = cat.key as keyof Student;
                      const active = Boolean(draftRow[key]);
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          disabled={!isEditing}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/70 text-[10px] font-bold text-center leading-tight whitespace-normal break-words px-1"
                          style={{ background: active ? cat.color : "#e8e8e8" }}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              [student.id]: { ...draftRow, [key]: !active }
                            }))
                          }
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <select
                    className="form-control max-w-[120px]"
                    value={draftRow.eog || ""}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [student.id]: { ...draftRow, eog: (e.target.value || null) as Student["eog"] }
                      }))
                    }
                  >
                    {eogOptions.map((opt) => (
                      <option key={opt || "none"} value={opt || ""}>
                        {opt ? opt.replace("FIVE", "5").replace("FOUR", "4").replace("THREE", "3") : "-"}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() =>
                      setNotesEditor({
                        id: student.id,
                        name: student.displayName,
                        notes: student.notes || ""
                      })
                    }
                  >
                    Notes{hasNotes ? " •" : ""}
                  </button>
                </td>
                <td>
                  {!isEditing && (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => {
                        if (editingId && editingId !== student.id) return;
                        setEditingId(student.id);
                        setDraft((prev) => ({ ...prev, [student.id]: student }));
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {isEditing && (
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary"
                        type="button"
                        disabled={!hasChanges}
                        onClick={() => updateStudent(student.id, draftRow)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => deleteStudent(student)}
                      >
                        Delete
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setDraft((prev) => {
                            const next = { ...prev };
                            delete next[student.id];
                            return next;
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {isEditing && hasChanges && (
                    <div className="text-[11px] text-amber-700 mt-1">Unsaved changes</div>
                  )}
                </td>
              </tr>
            )})}
            {sortedStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="text-sm text-black/60">
                  No students yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="hero-card w-full max-w-md p-6 space-y-4">
            <div className="text-lg font-semibold">Import student list</div>
            <div className="text-sm text-black/60">
              Enter names, one per line. Make sure you selected the correct block before importing so students are assigned
              correctly.
            </div>
            <textarea
              className="form-control min-h-[140px]"
              placeholder="Enter student names, one per line."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              disabled={editingLocked}
            />
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  await importStudents();
                  setShowImport(false);
                }}
                disabled={editingLocked}
              >
                Import
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowImport(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {notesEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="hero-card w-full max-w-md p-6 space-y-4">
            <div>
              <div className="small-header text-black/60">Notes</div>
              <h2 className="section-title">{notesEditor.name}</h2>
            </div>
            <textarea
              className="form-control min-h-[160px]"
              value={notesEditor.notes}
              onChange={(e) =>
                setNotesEditor((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
              }
            />
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  await updateStudent(notesEditor.id, { notes: notesEditor.notes });
                  setNotesEditor(null);
                }}
              >
                Save Notes
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setNotesEditor(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
