"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
    if (res.ok) await loadStudents();
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
      <div>
        <div className="small-header text-black/60">Setup</div>
        <h1 className="section-title">Students</h1>
        <p className="text-black/70 text-sm">
          Import or edit students. Each student has a seat number that never gets reused within a school year.
        </p>
      </div>

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
          />
          <button className="btn btn-primary" type="button" onClick={addStudent}>
            Add Student
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <textarea
            className="form-control min-h-[120px]"
            placeholder="Paste student names (one per line). Optionally add block number after comma: Jane Doe,2"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button className="btn btn-ghost h-12" type="button" onClick={importStudents}>
            Import List
          </button>
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
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.seatNumber}</td>
                <td>
                  <input
                    className="form-control"
                    value={student.displayName}
                    onChange={(e) =>
                      setStudents((prev) =>
                        prev.map((s) => (s.id === student.id ? { ...s, displayName: e.target.value } : s))
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => updateStudent(student.id, { active: !student.active })}
                  >
                    {student.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((cat) => {
                      const key = cat.key as keyof Student;
                      const active = Boolean(student[key]);
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-black/70 text-[9px]"
                          style={{ background: active ? cat.color : "#e8e8e8" }}
                          onClick={() =>
                            setStudents((prev) =>
                              prev.map((s) => (s.id === student.id ? { ...s, [key]: !active } : s))
                            )
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
                    value={student.eog || ""}
                    onChange={(e) =>
                      setStudents((prev) =>
                        prev.map((s) =>
                          s.id === student.id
                            ? { ...s, eog: (e.target.value || null) as Student["eog"] }
                            : s
                        )
                      )
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
                  <button className="btn btn-primary" type="button" onClick={() => updateStudent(student.id, student)}>
                    Save
                  </button>
                </td>
              </tr>
            ))}
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
