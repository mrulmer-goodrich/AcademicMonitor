"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReturnToDashboardButton from "@/components/ReturnToDashboardButton";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import useUnsavedChangesGuard from "@/lib/useUnsavedChangesGuard";

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

type CategoryKey = "ml" | "mlNew" | "iep504" | "ec" | "ca" | "hiit";

type NewStudentDraft = {
  displayName: string;
  ml: boolean;
  mlNew: boolean;
  iep504: boolean;
  ec: boolean;
  ca: boolean;
  hiit: boolean;
  eog: Student["eog"];
  notes: string;
};

const categories = [
  { key: "ml", label: "ML", color: "#9ecae1" },
  { key: "mlNew", label: "ML New", color: "#9ecae1" },
  { key: "iep504", label: "IEP/ 504", color: "#f5a9b8" },
  { key: "ec", label: "EC", color: "#f7d774" },
  { key: "ca", label: "CA", color: "#ffffff" },
  { key: "hiit", label: "HIIT", color: "#b18ad8" }
] as const;

const eogOptions: Student["eog"][] = [null, "FIVE", "FOUR", "THREE", "NP"];

function emptyNewStudent(): NewStudentDraft {
  return {
    displayName: "",
    ml: false,
    mlNew: false,
    iep504: false,
    ec: false,
    ca: false,
    hiit: false,
    eog: null,
    notes: ""
  };
}

function studentHasChanges(student: Student, draftRow: Student) {
  return (
    draftRow.displayName !== student.displayName ||
    draftRow.active !== student.active ||
    draftRow.ml !== student.ml ||
    draftRow.mlNew !== student.mlNew ||
    draftRow.iep504 !== student.iep504 ||
    draftRow.ec !== student.ec ||
    draftRow.ca !== student.ca ||
    draftRow.hiit !== student.hiit ||
    draftRow.eog !== student.eog ||
    (draftRow.notes || "") !== (student.notes || "")
  );
}

export default function StudentsSetupPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [blockId, setBlockId] = useState<string>("");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState<NewStudentDraft>(emptyNewStudent);
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Student>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ completed: 0, total: 0 });
  const [sortKey, setSortKey] = useState<"displayName" | "eog" | "ml" | "mlNew" | "iep504" | "ec" | "ca" | "hiit">(
    "displayName"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showInactive, setShowInactive] = useState(false);
  const [notesEditor, setNotesEditor] = useState<{ id: string; name: string; notes: string } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkField, setBulkField] = useState<CategoryKey | "eog" | "active">("ml");
  const [bulkValue, setBulkValue] = useState("true");
  const [bulkSaving, setBulkSaving] = useState(false);
  const editingLocked = Boolean(editingId) || importing || bulkSaving;

  useEffect(() => {
    loadBlocks();
  }, []);

  useEffect(() => {
    if (blockId) loadStudents();
  }, [blockId]);

  const hasUnsavedChanges = useMemo(() => {
    const hasNewStudentDraft = showAddStudent && JSON.stringify(newStudent) !== JSON.stringify(emptyNewStudent());
    const hasImportDraft = Boolean(importText.trim());
    const editingStudent = editingId ? students.find((student) => student.id === editingId) : null;
    const editingDraft = editingId ? draft[editingId] : null;
    const editingDirty = Boolean(editingStudent && editingDraft && studentHasChanges(editingStudent, editingDraft));
    const currentNotes = notesEditor ? students.find((student) => student.id === notesEditor.id)?.notes || "" : "";
    const notesDirty = Boolean(notesEditor && notesEditor.notes !== currentNotes);

    return hasNewStudentDraft || hasImportDraft || editingDirty || notesDirty;
  }, [showAddStudent, newStudent, importText, editingId, draft, students, notesEditor]);

  const { dialogProps, requestNavigation } = useUnsavedChangesGuard({
    when: hasUnsavedChanges,
    description: "You have unsaved student changes on this screen. Leaving now will discard them."
  });

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
    if (!newStudent.displayName.trim() || !blockId) return;
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newStudent, displayName: newStudent.displayName.trim(), blockId })
    });
    if (!res.ok) {
      setError("Unable to add student.");
      return;
    }
    setNewStudent(emptyNewStudent());
    setShowAddStudent(false);
    setStatusMessage(`${newStudent.displayName.trim()} added.`);
    await loadStudents();
  }

  async function applyBulkChange() {
    if (selectedStudentIds.length === 0 || bulkSaving) return;
    setBulkSaving(true);
    setError(null);
    try {
      const value = bulkField === "eog" ? bulkValue || null : bulkValue === "true";
      const results = await Promise.all(
        selectedStudentIds.map((id) =>
          fetch(`/api/students/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [bulkField]: value })
          })
        )
      );
      const failed = results.filter((result) => !result.ok).length;
      if (failed > 0) {
        setError(`${failed} selected student${failed === 1 ? "" : "s"} could not be updated.`);
      } else {
        setStatusMessage(`${selectedStudentIds.length} student${selectedStudentIds.length === 1 ? "" : "s"} updated.`);
        setSelectedStudentIds([]);
      }
      await loadStudents();
    } catch {
      setError("Unable to apply the class change.");
    } finally {
      setBulkSaving(false);
    }
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
    } else {
      setError("Unable to save student changes.");
    }
  }

  async function importStudents() {
    if (!importText.trim() || !blockId || importing) return;
    const lines = importText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    setImporting(true);
    setImportProgress({ completed: 0, total: lines.length });
    setError(null);
    const failedNames: string[] = [];
    try {
      for (let index = 0; index < lines.length; index += 1) {
        const name = lines[index];
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: name, blockId })
        });
        if (!res.ok) failedNames.push(name);
        setImportProgress({ completed: index + 1, total: lines.length });
      }
      setImportText(failedNames.join("\n"));
      await loadStudents();
      if (failedNames.length === 0) {
        setStatusMessage(`${lines.length} student${lines.length === 1 ? "" : "s"} imported.`);
        setShowImport(false);
      } else {
        setError(`${failedNames.length} student${failedNames.length === 1 ? "" : "s"} could not be imported. The remaining names are still in the import box.`);
      }
    } finally {
      setImporting(false);
    }
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

  const visibleStudentIds = sortedStudents.map((student) => student.id);
  const allVisibleSelected = visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedStudentIds.includes(id));

  function toggleStudentSelection(id: string) {
    setSelectedStudentIds((current) =>
      current.includes(id) ? current.filter((studentId) => studentId !== id) : [...current, id]
    );
  }

  function cancelStudentEdit(id: string) {
    setEditingId(null);
    setDraft((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
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
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-4 sm:px-6">
      <ReturnToDashboardButton />

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div className="hero-card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="form-control max-w-[280px]"
            value={blockId}
            onChange={(event) => {
              const nextBlockId = event.target.value;
              requestNavigation(() => {
                setBlockId(nextBlockId);
                setEditingId(null);
                setDraft({});
                setSelectedStudentIds([]);
              });
            }}
          >
            {blockOptions.map((block) => <option key={block.id} value={block.id}>{block.label}</option>)}
          </select>
          <button className="btn btn-primary px-4 py-2 text-sm" type="button" onClick={() => setShowAddStudent(true)} disabled={editingLocked}>
            Add Student
          </button>
          <button className="btn btn-ghost px-4 py-2 text-sm" type="button" onClick={() => setShowImport(true)} disabled={editingLocked}>
            Import List
          </button>
          <label className="ml-auto inline-flex min-h-[36px] items-center gap-2 whitespace-nowrap rounded-full border border-black/15 bg-white px-3 text-xs font-semibold">
            <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
            Show inactive
          </label>
        </div>

        <div className="flex min-h-[24px] items-center text-xs text-black/60" aria-live="polite">
          {statusMessage || `${students.filter((student) => student.active).length} active students`}
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="mr-2">
              <div className="small-header text-sky-900/60">Class tools</div>
              <div className="text-sm font-semibold text-sky-950">{selectedStudentIds.length} selected</div>
            </div>
            <label className="min-w-[150px] flex-1 sm:flex-none">
              <span className="sr-only">Attribute</span>
              <select
                className="form-control py-2 text-sm"
                value={bulkField}
                onChange={(event) => {
                  const nextField = event.target.value as CategoryKey | "eog" | "active";
                  setBulkField(nextField);
                  setBulkValue(nextField === "eog" ? "" : "true");
                }}
              >
                {categories.map((category) => <option key={`bulk-${category.key}`} value={category.key}>{category.label}</option>)}
                <option value="eog">EOG level</option>
                <option value="active">Student status</option>
              </select>
            </label>
            <label className="min-w-[130px] flex-1 sm:flex-none">
              <span className="sr-only">New value</span>
              {bulkField === "eog" ? (
                <select className="form-control py-2 text-sm" value={bulkValue} onChange={(event) => setBulkValue(event.target.value)}>
                  <option value="">Not set</option>
                  {eogOptions.filter(Boolean).map((option) => <option key={`bulk-eog-${option}`} value={option || ""}>{option?.replace("FIVE", "5").replace("FOUR", "4").replace("THREE", "3")}</option>)}
                </select>
              ) : (
                <select className="form-control py-2 text-sm" value={bulkValue} onChange={(event) => setBulkValue(event.target.value)}>
                  <option value="true">{bulkField === "active" ? "Active" : "Set"}</option>
                  <option value="false">{bulkField === "active" ? "Inactive" : "Remove"}</option>
                </select>
              )}
            </label>
            <button className="btn btn-primary px-4 py-2 text-sm" type="button" disabled={selectedStudentIds.length === 0 || bulkSaving || Boolean(editingId)} onClick={applyBulkChange}>
              {bulkSaving ? "Applying…" : "Apply"}
            </button>
            {selectedStudentIds.length > 0 && (
              <button className="btn btn-ghost px-3 py-2 text-sm" type="button" onClick={() => setSelectedStudentIds([])}>Clear</button>
            )}
          </div>
        </div>

        <div className="hidden max-h-[calc(100vh-300px)] min-h-[280px] overflow-auto lg:block">
          <table className="table table-compact min-w-[940px]">
            <thead className="sticky-head">
              <tr>
                <th className="w-8 text-center">
                  <input
                    aria-label="Select all visible students"
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => setSelectedStudentIds((current) => allVisibleSelected ? current.filter((id) => !visibleStudentIds.includes(id)) : Array.from(new Set([...current, ...visibleStudentIds])))}
                  />
                </th>
                <th className="w-[150px]"><button className="font-semibold" type="button" onClick={() => toggleSort("displayName")}>Student{sortLabel("displayName")}</button></th>
                <th className="w-[72px] text-center">Status</th>
                <th>
                  <div className="flex items-center gap-1">
                    {categories.map((category) => (
                      <button key={`sort-${category.key}`} className="min-w-[44px] whitespace-nowrap rounded-full border border-black/15 px-1.5 py-1 text-[10px] font-bold" type="button" onClick={() => toggleSort(category.key)}>
                        {category.label}{sortLabel(category.key)}
                      </button>
                    ))}
                  </div>
                </th>
                <th className="w-[64px] text-center"><button className="font-semibold" type="button" onClick={() => toggleSort("eog")}>EOG{sortLabel("eog")}</button></th>
                <th className="w-[64px] text-center">Notes</th>
                <th className="w-[180px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student) => {
                const isEditing = editingId === student.id;
                const draftRow = draft[student.id] || student;
                const hasChanges = studentHasChanges(student, draftRow);
                return (
                  <tr key={student.id} className={isEditing ? "bg-amber-50/70" : "bg-white/40"}>
                    <td className="text-center"><input aria-label={`Select ${student.displayName}`} type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudentSelection(student.id)} /></td>
                    <td>
                      {isEditing ? (
                        <input className="form-control h-8 py-1.5 text-sm" value={draftRow.displayName} onChange={(event) => setDraft((current) => ({ ...current, [student.id]: { ...draftRow, displayName: event.target.value } }))} />
                      ) : <div className="flex h-8 items-center truncate font-semibold">{student.displayName}</div>}
                    </td>
                    <td className="text-center">
                      {isEditing ? (
                        <button className="h-8 whitespace-nowrap rounded-full border border-black/15 bg-white px-2 text-xs font-semibold" type="button" onClick={() => setDraft((current) => ({ ...current, [student.id]: { ...draftRow, active: !draftRow.active } }))}>{draftRow.active ? "Active" : "Inactive"}</button>
                      ) : <span className={`inline-flex h-8 items-center whitespace-nowrap rounded-full px-2 text-xs font-semibold ${student.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{student.active ? "Active" : "Inactive"}</span>}
                    </td>
                    <td>
                      <div className="flex h-8 items-center gap-1">
                        {categories.map((category) => {
                          const active = Boolean(draftRow[category.key]);
                          const className = "inline-flex h-7 min-w-[44px] items-center justify-center whitespace-nowrap rounded-full border border-black/20 px-1.5 text-[10px] font-bold";
                          return isEditing ? (
                            <button key={category.key} type="button" aria-pressed={active} className={className} style={{ background: active ? category.color : "#f1f1f1", opacity: active ? 1 : 0.55 }} onClick={() => setDraft((current) => ({ ...current, [student.id]: { ...draftRow, [category.key]: !active } }))}>{category.label}</button>
                          ) : (
                            <span key={category.key} className={className} style={{ background: active ? category.color : "transparent", opacity: active ? 1 : 0.22 }}>{category.label}</span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="text-center">
                      {isEditing ? (
                        <select className="form-control h-8 py-1 text-xs" value={draftRow.eog || ""} onChange={(event) => setDraft((current) => ({ ...current, [student.id]: { ...draftRow, eog: (event.target.value || null) as Student["eog"] } }))}>
                          {eogOptions.map((option) => <option key={option || "none"} value={option || ""}>{option ? option.replace("FIVE", "5").replace("FOUR", "4").replace("THREE", "3") : "—"}</option>)}
                        </select>
                      ) : <span className="text-xs font-semibold">{student.eog ? student.eog.replace("FIVE", "5").replace("FOUR", "4").replace("THREE", "3") : "—"}</span>}
                    </td>
                    <td className="text-center"><button className="h-8 whitespace-nowrap rounded-lg border border-black/15 bg-white px-2 text-xs font-semibold" type="button" onClick={() => setNotesEditor({ id: student.id, name: student.displayName, notes: student.notes || "" })}>{student.notes?.trim() ? "Notes •" : "Notes"}</button></td>
                    <td>
                      <div className="flex h-8 w-[170px] items-center justify-end gap-1">
                        <span aria-label={hasChanges ? "Unsaved changes" : undefined} className={`mr-1 h-2 w-2 rounded-full ${hasChanges ? "bg-amber-500" : "bg-transparent"}`} />
                        {isEditing ? (
                          <>
                            <button className="h-8 rounded-lg bg-[#0b1b2a] px-3 text-xs font-bold text-white disabled:opacity-35" type="button" disabled={!hasChanges} onClick={() => updateStudent(student.id, draftRow)}>Save</button>
                            <button className="h-8 rounded-lg border border-black/15 bg-white px-2 text-xs font-semibold" type="button" onClick={() => cancelStudentEdit(student.id)}>Cancel</button>
                            <button className="h-8 rounded-lg border border-red-200 bg-white px-2 text-xs font-semibold text-red-700" type="button" onClick={() => deleteStudent(student)}>Delete</button>
                          </>
                        ) : (
                          <button className="h-8 rounded-lg border border-black/15 bg-white px-3 text-xs font-semibold" type="button" disabled={Boolean(editingId)} onClick={() => { setEditingId(student.id); setDraft((current) => ({ ...current, [student.id]: student })); }}>Edit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedStudents.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-black/55">No students to show.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="grid gap-2 lg:hidden">
          {sortedStudents.map((student) => {
            const isEditing = editingId === student.id;
            const draftRow = draft[student.id] || student;
            const hasChanges = studentHasChanges(student, draftRow);
            return (
              <div key={`card-${student.id}`} className={`scroll-mt-24 rounded-2xl border p-3 shadow-sm ${isEditing ? "border-amber-300 bg-amber-50" : "border-black/10 bg-white"}`}>
                <div className="flex items-center gap-3">
                  <input aria-label={`Select ${student.displayName}`} type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudentSelection(student.id)} />
                  <div className="min-w-0 flex-1">
                    {isEditing ? <input className="form-control py-2" value={draftRow.displayName} onChange={(event) => setDraft((current) => ({ ...current, [student.id]: { ...draftRow, displayName: event.target.value } }))} /> : <div className="truncate font-semibold">{student.displayName}</div>}
                    <div className="text-xs text-black/50">Seat {student.seatNumber} · {draftRow.active ? "Active" : "Inactive"}</div>
                  </div>
                  {!isEditing && <button className="btn btn-ghost px-3 py-2 text-xs" type="button" disabled={Boolean(editingId)} onClick={() => { setEditingId(student.id); setDraft((current) => ({ ...current, [student.id]: student })); }}>Edit</button>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {categories.map((category) => {
                    const active = Boolean(draftRow[category.key]);
                    return isEditing ? <button key={`mobile-${student.id}-${category.key}`} className="min-h-[36px] whitespace-nowrap rounded-full border border-black/20 px-2 text-[10px] font-bold" type="button" aria-pressed={active} style={{ background: active ? category.color : "#f1f1f1", opacity: active ? 1 : 0.55 }} onClick={() => setDraft((current) => ({ ...current, [student.id]: { ...draftRow, [category.key]: !active } }))}>{category.label}</button> : active ? <span key={`mobile-${student.id}-${category.key}`} className="whitespace-nowrap rounded-full border border-black/15 px-2 py-1 text-[10px] font-bold" style={{ background: category.color }}>{category.label}</span> : null;
                  })}
                  {draftRow.eog && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">EOG {draftRow.eog.replace("FIVE", "5").replace("FOUR", "4").replace("THREE", "3")}</span>}
                </div>
                {isEditing && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <div className="flex gap-2">
                      <button className="btn btn-ghost flex-1 justify-center px-3 py-2 text-xs" type="button" onClick={() => setDraft((current) => ({ ...current, [student.id]: { ...draftRow, active: !draftRow.active } }))}>{draftRow.active ? "Set inactive" : "Set active"}</button>
                      <select className="form-control max-w-[130px] py-2 text-xs" value={draftRow.eog || ""} onChange={(event) => setDraft((current) => ({ ...current, [student.id]: { ...draftRow, eog: (event.target.value || null) as Student["eog"] } }))}>{eogOptions.map((option) => <option key={option || "none"} value={option || ""}>EOG {option ? option.replace("FIVE", "5").replace("FOUR", "4").replace("THREE", "3") : "—"}</option>)}</select>
                    </div>
                    <div className="flex gap-1">
                      <button className="btn btn-primary px-3 py-2 text-xs" type="button" disabled={!hasChanges} onClick={() => updateStudent(student.id, draftRow)}>Save</button>
                      <button className="btn btn-ghost px-3 py-2 text-xs" type="button" onClick={() => cancelStudentEdit(student.id)}>Cancel</button>
                      <button className="btn btn-ghost px-3 py-2 text-xs text-red-700" type="button" onClick={() => deleteStudent(student)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {sortedStudents.length === 0 && <div className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-black/55">No students to show.</div>}
        </div>
      </div>

      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="hero-card max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto p-5">
            <div>
              <div className="small-header text-black/50">Single student</div>
              <h2 className="section-title mb-0">Add Student</h2>
              <div className="text-sm text-black/55">Add the name and student-specific setup together.</div>
            </div>
            <label className="block">
              <span className="text-sm font-semibold">Student name</span>
              <input autoFocus className="form-control mt-1" value={newStudent.displayName} onChange={(event) => setNewStudent((current) => ({ ...current, displayName: event.target.value }))} />
            </label>
            <div>
              <div className="text-sm font-semibold">Student attributes</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((category) => {
                  const active = newStudent[category.key];
                  return <button key={`new-${category.key}`} className="min-h-[44px] whitespace-nowrap rounded-full border border-black/20 px-3 text-xs font-bold" type="button" aria-pressed={active} style={{ background: active ? category.color : "#f1f1f1" }} onClick={() => setNewStudent((current) => ({ ...current, [category.key]: !active }))}>{category.label}</button>;
                })}
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-semibold">EOG level</span>
              <select className="form-control mt-1" value={newStudent.eog || ""} onChange={(event) => setNewStudent((current) => ({ ...current, eog: (event.target.value || null) as Student["eog"] }))}>
                {eogOptions.map((option) => <option key={`new-eog-${option || "none"}`} value={option || ""}>{option ? option.replace("FIVE", "5").replace("FOUR", "4").replace("THREE", "3") : "Not set"}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Notes <span className="font-normal text-black/45">(optional)</span></span>
              <textarea className="form-control mt-1 min-h-[90px]" value={newStudent.notes} onChange={(event) => setNewStudent((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <div className="flex gap-2">
              <button className="btn btn-primary" type="button" disabled={!newStudent.displayName.trim()} onClick={addStudent}>Add Student</button>
              <button className="btn btn-ghost" type="button" onClick={() => {
                if (JSON.stringify(newStudent) === JSON.stringify(emptyNewStudent())) {
                  setShowAddStudent(false);
                  return;
                }
                requestNavigation(() => {
                  setNewStudent(emptyNewStudent());
                  setShowAddStudent(false);
                });
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
                onClick={importStudents}
                disabled={editingLocked}
              >
                {importing ? `Importing ${importProgress.completed}/${importProgress.total}…` : "Import"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={importing}
                onClick={() => {
                  if (!importText.trim()) {
                    setShowImport(false);
                    return;
                  }
                  requestNavigation(() => {
                    setShowImport(false);
                    setImportText("");
                  });
                }}
              >
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
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  const originalNotes = students.find((student) => student.id === notesEditor.id)?.notes || "";
                  if (notesEditor.notes === originalNotes) {
                    setNotesEditor(null);
                    return;
                  }
                  requestNavigation(() => setNotesEditor(null));
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesDialog {...dialogProps} />
    </div>
  );
}
