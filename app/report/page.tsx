"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { startOfWeek } from "date-fns";

type Block = { id: string; blockNumber: number; blockName: string };
type Student = { id: string; displayName: string; blockId: string };
type Standard = { code: string; description: string };

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const categories = [
  { key: "ml", label: "ML" },
  { key: "mlNew", label: "ML New" },
  { key: "iep504", label: "IEP/504" },
  { key: "ec", label: "EC" },
  { key: "ca", label: "CA" },
  { key: "hiit", label: "HIIT" }
] as const;

export default function ReportPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [selectedLaps, setSelectedLaps] = useState<number[]>([1, 2, 3]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"class" | "student">("class");
  const [categoriesMatchAll, setCategoriesMatchAll] = useState(false);
  const [weekStart, setWeekStart] = useState<string>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().slice(0, 10)
  );
  const [weeksRange, setWeeksRange] = useState(1);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBlocks();
    loadStandards();
  }, []);

  useEffect(() => {
    if (selectedBlocks.length) {
      loadStudents();
    }
  }, [selectedBlocks]);

  async function loadBlocks() {
    const res = await fetch("/api/blocks");
    if (!res.ok) return;
    const data = await res.json();
    setBlocks(data.blocks || []);
    if ((data.blocks || []).length) setSelectedBlocks([data.blocks[0].id]);
  }

  async function loadStudents() {
    const results = await Promise.all(
      selectedBlocks.map((id) => fetch(`/api/students?blockId=${id}`).then((res) => res.json()))
    );
    const merged = results.flatMap((data) => data.students || []);
    setStudents(merged);
  }

  async function loadStandards() {
    const res = await fetch("/api/standards");
    const data = await res.json();
    setStandards(data.standards || []);
  }

  async function runReport() {
    setError(null);
    if (selectedBlocks.length === 0) {
      setError("Select at least one block.");
      return;
    }
    if (viewMode === "student" && selectedStudents.length !== 1) {
      setError("Select exactly one student for student view.");
      return;
    }
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart,
        weeksRange,
        days: selectedDays,
        laps: selectedLaps,
        blocks: selectedBlocks,
        students: selectedStudents,
        categories: selectedCategories,
        standards: selectedStandards,
        viewMode,
        categoriesMatchAll
      })
    });
    if (!res.ok) {
      setError("Unable to run report.");
      return;
    }
    const data = await res.json();
    setColumns(data.columns || []);
    setRows(data.rows || []);
    setSortKey(null);
  }

  function downloadCSV() {
    if (!columns.length) return;
    const csv = [
      columns.join(","),
      ...rows.map((row) => columns.map((col) => JSON.stringify(row[col] || "")).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "academic-monitor-report.csv";
    link.click();
  }

  function downloadXLSX() {
    if (!columns.length) return;
    const data = rows.map((row) => {
      const record: Record<string, string> = {};
      columns.forEach((col) => {
        record[col] = row[col] || "";
      });
      return record;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const blob = new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "academic-monitor-report.xlsx";
    link.click();
  }

  const filteredStudents = useMemo(
    () => students.filter((s) => selectedBlocks.includes(s.blockId)),
    [students, selectedBlocks]
  );

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey] || "";
      const bVal = b[sortKey] || "";
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div>
        <div className="small-header text-black/60">Report</div>
        <h1 className="section-title">Filters and Export</h1>
      </div>

      {error && <div className="hero-card p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="feature-card space-y-3">
          <div className="font-semibold">Report View</div>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="viewMode"
                checked={viewMode === "class"}
                onChange={() => setViewMode("class")}
              />
              Class View
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="viewMode"
                checked={viewMode === "student"}
                onChange={() => setViewMode("student")}
              />
              Student View
            </label>
          </div>
          <div className="text-xs text-black/60">Student view requires exactly one student selected.</div>
        </div>
        <div className="feature-card space-y-3">
          <div className="font-semibold">Week</div>
          <input className="form-control" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            Range (weeks)
            <input
              className="form-control max-w-[100px]"
              type="number"
              min={1}
              max={4}
              value={weeksRange}
              onChange={(e) => setWeeksRange(Number(e.target.value))}
            />
          </label>
          <div className="flex flex-wrap gap-2 text-sm">
            {dayLabels.map((label, index) => (
              <label key={label} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDays.includes(index)}
                  onChange={(e) =>
                    setSelectedDays((prev) =>
                      e.target.checked ? [...prev, index] : prev.filter((d) => d !== index)
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="feature-card space-y-3">
          <div className="font-semibold">Laps</div>
          <div className="flex flex-wrap gap-2 text-sm">
            {[1, 2, 3].map((lap) => (
              <label key={lap} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedLaps.includes(lap)}
                  onChange={(e) =>
                    setSelectedLaps((prev) => (e.target.checked ? [...prev, lap] : prev.filter((n) => n !== lap)))
                  }
                />
                Lap {lap}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="feature-card space-y-3">
          <div className="font-semibold">Blocks</div>
          <div className="flex flex-wrap gap-2 text-sm">
            {blocks.map((block) => (
              <label key={block.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedBlocks.includes(block.id)}
                  onChange={(e) =>
                    setSelectedBlocks((prev) =>
                      e.target.checked ? [...prev, block.id] : prev.filter((id) => id !== block.id)
                    )
                  }
                />
                Block {block.blockNumber} · {block.blockName}
              </label>
            ))}
          </div>
        </div>

        <div className="feature-card space-y-3">
          <div className="font-semibold">Students</div>
          <div className="max-h-40 overflow-auto text-sm space-y-1">
            {filteredStudents.map((student) => (
              <label key={student.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={(e) =>
                    setSelectedStudents((prev) =>
                      e.target.checked ? [...prev, student.id] : prev.filter((id) => id !== student.id)
                    )
                  }
                />
                {student.displayName}
              </label>
            ))}
            {filteredStudents.length === 0 && <div className="text-black/60">No students found.</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="feature-card space-y-3">
          <div className="font-semibold">Student Categories</div>
          <div className="flex flex-wrap gap-2 text-sm">
            {categories.map((cat) => (
              <label key={cat.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat.key)}
                  onChange={(e) =>
                    setSelectedCategories((prev) =>
                      e.target.checked ? [...prev, cat.key] : prev.filter((id) => id !== cat.key)
                    )
                  }
                />
                {cat.label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={categoriesMatchAll}
              onChange={(e) => setCategoriesMatchAll(e.target.checked)}
            />
            Match ALL selected categories
          </label>
        </div>

        <div className="feature-card space-y-3">
          <div className="font-semibold">Standards</div>
          <div className="max-h-40 overflow-auto text-sm space-y-1">
            {standards.map((standard) => (
              <label key={standard.code} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedStandards.includes(standard.code)}
                  onChange={(e) =>
                    setSelectedStandards((prev) =>
                      e.target.checked
                        ? [...prev, standard.code]
                        : prev.filter((code) => code !== standard.code)
                    )
                  }
                />
                {standard.code}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="hero-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold">Results</div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" type="button" onClick={downloadCSV} disabled={!columns.length}>
              Download CSV
            </button>
            <button className="btn btn-primary" type="button" onClick={downloadXLSX} disabled={!columns.length}>
              Download XLSX
            </button>
            <button className="btn btn-ghost" type="button" onClick={runReport}>
              Run Report
            </button>
          </div>
        </div>
        <div className="text-xs text-black/60">
          Color legend: GREEN = Proficient, YELLOW = Developing, RED = Nothing Written.
        </div>
        <div className="overflow-auto">
          <table className="table table-compact min-w-[720px]">
            <thead>
              <tr>
                {columns.map((col, index) => (
                  <th
                    key={col}
                    className={`${index === 0 ? "sticky-col" : ""} sticky-head cursor-pointer`}
                    onClick={() => {
                      if (sortKey === col) {
                        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                      } else {
                        setSortKey(col);
                        setSortDir("asc");
                      }
                    }}
                  >
                    {col} {sortKey === col ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {columns.map((col, index) => (
                    <td key={`${rowIndex}-${col}`} className={index === 0 ? "sticky-col" : ""}>
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={Math.max(columns.length, 1)} className="text-sm text-black/60">
                    Run a report to see results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
