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
};

const categories = [
  { key: "ml", label: "ML", color: "#9ecae1" },
  { key: "mlNew", label: "ML New", color: "#9ecae1" },
  { key: "iep504", label: "IEP/504", color: "#f5a9b8" },
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Student>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
      await loadStudents();
    }
  }

  async function importStudents() {
    if (!importText.trim() || !blockId) return;
    const lines = importText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    for (const line of lines) {
      const [name, maybeBlock] = line.split(",").map((part) => part.trim());
      const targetBlock = maybeBlock
        ? blocks.find((b) => String(b.blockNumber) === maybeBlock)?.id || blockId
        : blockId;
      if (!name) continue;
      await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, blockId: targetBlock })
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="space-y-2">
        <div className="small-header text-black/60">Setup</div>
        <h1 className="section-title">Students</h1>
        <p className="text-black/70 text-sm">
          Import or edit students. Each student has a seat number that never gets reused within a school year.
        </p>
      </div>
      <SetupNav />

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div className="hero-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select className="form-control max-w-[260px]" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            {blockOptions.map((block) => (
              <option key={block.id} value={block.id}>
                {block.label}
              </option>
            ))}
          </select>
          <input
            className="form-control flex-1 min-w-[220px]"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Student name"
            onKeyDown={(e) => {
              if (e.key === "Enter") addStudent();
            }}
          />
          <button className="btn btn-primary" type="button" onClick={addStudent}>
            Add Student
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[3fr_1fr]">
          <div className="text-sm text-black/60">
            {statusMessage ? statusMessage : "Rows are read‑only until you click Edit."}
          </div>
          <div className="flex flex-col gap-2">
            <textarea
              className="form-control min-h-[90px]"
              placeholder="Paste names (one per line). Optional block number after comma: Jane Doe,2"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <button className="btn btn-ghost" type="button" onClick={importStudents}>
              Import List
            </button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Seat #</th>
              <th>Student Name</th>
              <th>Status</th>
              <th>Categories</th>
              <th>EOG</th>
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
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
                draftRow.eog !== student.eog;

              return (
              <tr key={student.id}>
                <td>{student.seatNumber}</td>
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
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-black/70 text-[9px]"
                          style={{ background: active ? cat.color : "#e8e8e8" }}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              [student.id]: { ...draftRow, [key]: !active }
                            }))
                          }
                        >
                          {cat.label === "ML New" ? "ML" : cat.label}
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
                  {!isEditing && (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => {
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
                      <button className="btn btn-ghost" type="button" onClick={() => setEditingId(null)}>
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
            {students.length === 0 && (
              <tr>
                <td colSpan={6} className="text-sm text-black/60">
                  No students yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
