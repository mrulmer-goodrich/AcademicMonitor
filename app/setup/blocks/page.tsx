"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ActionDialog from "@/components/ActionDialog";
import ReturnToDashboardButton from "@/components/ReturnToDashboardButton";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import useActionDialog from "@/lib/useActionDialog";
import useUnsavedChangesGuard from "@/lib/useUnsavedChangesGuard";
import { currentSchoolYearLabel, normalizeSchoolYearLabel } from "@/lib/schoolYear";

type Block = {
  id: string;
  blockNumber: number;
  blockName: string;
  gradeLevels: number[];
  archived: boolean;
};

type SchoolYear = {
  id: string;
  label: string;
  active: boolean;
  archived: boolean;
  blocks: Block[];
};

type BlockRow = Block & { schoolYearId: string; schoolYearLabel: string; schoolYearActive: boolean };
type SortKey = "schoolYear" | "blockNumber" | "blockName" | "gradeLevels" | "status";

function gradeLabel(grades: number[] = [7]) {
  const normalized = grades.length > 0 ? grades : [7];
  return normalized.slice().sort((left, right) => left - right).map((grade) => `Grade ${grade}`).join(" + ");
}

function toggleGrade(grades: number[], grade: number) {
  if (grades.includes(grade)) return grades.length === 1 ? grades : grades.filter((value) => value !== grade);
  return [...grades, grade].sort((left, right) => left - right);
}

export default function BlocksSetupPage() {
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYear | null>(null);
  const [newSchoolYearLabel, setNewSchoolYearLabel] = useState(currentSchoolYearLabel());
  const [showAddClass, setShowAddClass] = useState(false);
  const [classSchoolYearId, setClassSchoolYearId] = useState("");
  const [blockNumber, setBlockNumber] = useState(1);
  const [blockName, setBlockName] = useState("");
  const [gradeLevels, setGradeLevels] = useState<number[]>([7]);
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("schoolYear");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Block>>({});
  const { ask, dialogProps: actionDialogProps } = useActionDialog();

  useEffect(() => {
    void loadData();
  }, []);

  const allRows = useMemo<BlockRow[]>(
    () => schoolYears.flatMap((year) => year.blocks.map((block) => ({
      ...block,
      schoolYearId: year.id,
      schoolYearLabel: normalizeSchoolYearLabel(year.label) || year.label,
      schoolYearActive: year.active && !year.archived
    }))),
    [schoolYears]
  );

  const visibleRows = useMemo(() => {
    const rows = showArchived
      ? allRows
      : allRows.filter((row) => row.schoolYearActive && !row.archived);
    const direction = sortDir === "asc" ? 1 : -1;
    return rows.slice().sort((left, right) => {
      const yearComparison = left.schoolYearLabel.localeCompare(right.schoolYearLabel);
      if (sortKey !== "schoolYear" && yearComparison !== 0) return yearComparison * -1;
      let comparison = 0;
      if (sortKey === "schoolYear") comparison = yearComparison;
      if (sortKey === "blockNumber") comparison = left.blockNumber - right.blockNumber;
      if (sortKey === "blockName") comparison = left.blockName.localeCompare(right.blockName);
      if (sortKey === "gradeLevels") comparison = gradeLabel(left.gradeLevels).localeCompare(gradeLabel(right.gradeLevels));
      if (sortKey === "status") comparison = Number(left.archived || !left.schoolYearActive) - Number(right.archived || !right.schoolYearActive);
      if (comparison === 0 && sortKey !== "schoolYear") {
        comparison = left.schoolYearLabel.localeCompare(right.schoolYearLabel);
      }
      if (comparison === 0) return left.blockNumber - right.blockNumber;
      return comparison * direction;
    });
  }, [allRows, showArchived, sortDir, sortKey]);

  const archivedCount = allRows.filter((row) => row.archived || !row.schoolYearActive).length;

  const hasUnsavedChanges = useMemo(() => {
    if ((showAddClass && blockName.trim()) || newSchoolYearLabel !== currentSchoolYearLabel()) return true;
    if (!editingId) return false;
    const original = allRows.find((block) => block.id === editingId);
    const draftRow = draft[editingId];
    return Boolean(original && draftRow && (
      original.blockNumber !== draftRow.blockNumber ||
      original.blockName !== draftRow.blockName ||
      original.gradeLevels.join(",") !== draftRow.gradeLevels.join(",")
    ));
  }, [allRows, blockName, draft, editingId, newSchoolYearLabel, showAddClass]);

  const { dialogProps } = useUnsavedChangesGuard({
    when: hasUnsavedChanges,
    description: "You have unsaved class or school-year changes. Leaving now will discard them."
  });

  async function loadData() {
    const yearsRes = await fetch("/api/school-years");
    if (!yearsRes.ok) {
      setError(yearsRes.status === 401 ? "Please login first." : "Unable to load classes and school years.");
      return;
    }
    const yearsData = await yearsRes.json();
    const years: SchoolYear[] = (yearsData.schoolYears || []).map((year: SchoolYear) => ({
      ...year,
      blocks: year.blocks.map((block) => ({
        ...block,
        gradeLevels: Array.isArray(block.gradeLevels) && block.gradeLevels.length > 0 ? block.gradeLevels : [7]
      }))
    }));
    const activeYear = years.find((year) => year.active && !year.archived) || null;
    setSchoolYears(years);
    setActiveSchoolYear(activeYear);
    setClassSchoolYearId((current) => years.some((year) => year.id === current) ? current : activeYear?.id || years[0]?.id || "");
  }

  async function addBlock() {
    setError(null);
    setStatusMessage(null);
    if (!classSchoolYearId || !schoolYears.some((year) => year.id === classSchoolYearId)) {
      setError("Choose a school year before creating a class.");
      return;
    }
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolYearId: classSchoolYearId, blockNumber, blockName, gradeLevels })
    });
    if (!res.ok) {
      setError("Unable to create class. Check that the block number and name are valid for this school year.");
      return;
    }
    setBlockName("");
    setBlockNumber((current) => current + 1);
    setGradeLevels([7]);
    setShowAddClass(false);
    setStatusMessage("Class added.");
    await loadData();
  }

  async function updateBlock(original: BlockRow, data: Partial<Block>) {
    setError(null);
    setStatusMessage(null);
    if (data.gradeLevels !== undefined && data.gradeLevels.join(",") !== original.gradeLevels.join(",")) {
      const confirmed = await ask({
        eyebrow: "Standards update",
        title: `Change the grades for ${original.blockName}?`,
        description: <>This class will use <strong>{gradeLabel(data.gradeLevels)}</strong>. Existing standard selections will be cleared so they cannot point to the wrong grade, while lap names and recorded results will remain.</>,
        confirmLabel: "Change Grades",
        cancelLabel: "Keep Current Grades",
        tone: "warning"
      });
      if (!confirmed) return false;
    }
    const res = await fetch(`/api/blocks/${original.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      setError("Unable to update that class.");
      return false;
    }
    setStatusMessage("Class saved.");
    await loadData();
    return true;
  }

  async function deleteBlock(block: BlockRow) {
    const confirmed = await ask({
      eyebrow: "Permanent action",
      title: `Delete ${block.blockName}?`,
      description: "This permanently removes the class and its related records. Archive the class instead if you may need it again.",
      confirmLabel: "Delete Class",
      cancelLabel: "Cancel",
      tone: "danger"
    });
    if (!confirmed) return;
    const res = await fetch(`/api/blocks/${block.id}`, { method: "DELETE" });
    if (res.ok) {
      setStatusMessage("Class deleted.");
      await loadData();
    } else {
      setError("Unable to delete that class.");
    }
  }

  async function restoreSchoolYear(block: BlockRow) {
    const confirmed = await ask({
      eyebrow: "Restore school year",
      title: `Make ${block.schoolYearLabel} active again?`,
      description: <>This restores the full <strong>{block.schoolYearLabel}</strong> school year and all of its classes. The current school year will move into the historical section, and no records will be deleted.</>,
      confirmLabel: `Restore ${block.schoolYearLabel}`,
      cancelLabel: "Cancel",
      tone: "warning",
      size: "large"
    });
    if (!confirmed) return;
    const res = await fetch(`/api/school-years/${block.schoolYearId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true })
    });
    if (!res.ok) {
      setError("Unable to restore that school year.");
      return;
    }
    setStatusMessage(`${block.schoolYearLabel} restored.`);
    await loadData();
  }

  async function startSchoolYear() {
    const normalized = normalizeSchoolYearLabel(newSchoolYearLabel);
    if (!normalized) {
      setError("Use a consecutive school year such as 26/27.");
      return;
    }
    const confirmed = await ask({
      eyebrow: "School-year rollover",
      title: `Start ${normalized}?`,
      description: "The current school year and its classes will move into the clearly labeled historical section. All prior records will be preserved.",
      confirmLabel: `Start ${normalized}`,
      cancelLabel: "Cancel",
      tone: "warning",
      size: "large"
    });
    if (!confirmed) return;
    const res = await fetch("/api/school-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: normalized })
    });
    if (!res.ok) {
      setError("Unable to start that school year. It may already exist.");
      return;
    }
    setNewSchoolYearLabel(currentSchoolYearLabel());
    setStatusMessage(`${normalized} started.`);
    await loadData();
  }

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) setSortDir((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortKey(nextKey);
      setSortDir(nextKey === "schoolYear" ? "desc" : "asc");
    }
  }

  function sortLabel(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  function nextBlockNumber(schoolYearId: string) {
    const year = schoolYears.find((item) => item.id === schoolYearId);
    return Math.max(0, ...(year?.blocks.map((block) => block.blockNumber) || [])) + 1;
  }

  function openAddClass() {
    const schoolYearId = activeSchoolYear?.id || schoolYears[0]?.id || "";
    setClassSchoolYearId(schoolYearId);
    setBlockNumber(nextBlockNumber(schoolYearId));
    setBlockName("");
    setGradeLevels([7]);
    setShowAddClass(true);
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-4 sm:px-6">
      <div><ReturnToDashboardButton className="w-auto px-4 py-2 text-sm" /></div>

      {error && <div className="hero-card p-4 text-sm text-red-700">{error} <Link className="underline" href="/dashboard">Go to login</Link></div>}

      <section className="hero-card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary px-4 py-2 text-sm" type="button" onClick={openAddClass} disabled={schoolYears.length === 0}>Add Class</button>
          <label className="ml-auto inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border border-black/15 bg-white px-3 text-xs font-semibold">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            Show archived ({archivedCount})
          </label>
          <span className="sr-only" aria-live="polite">{statusMessage}</span>
        </div>

        <div className="min-h-[280px] overflow-x-auto md:overflow-visible">
          <table className="table table-compact w-full min-w-[1000px] table-fixed">
            <colgroup>
              <col className="w-[128px]" />
              <col className="w-[90px]" />
              <col />
              <col className="w-[280px]" />
              <col className="w-[118px]" />
              <col className="w-[286px]" />
            </colgroup>
            <thead className="sticky-head">
              <tr>
                <th><button className="font-semibold" type="button" onClick={() => toggleSort("schoolYear")}>School Year{sortLabel("schoolYear")}</button></th>
                <th><button className="font-semibold" type="button" onClick={() => toggleSort("blockNumber")}>Block{sortLabel("blockNumber")}</button></th>
                <th><button className="font-semibold" type="button" onClick={() => toggleSort("blockName")}>Class Name{sortLabel("blockName")}</button></th>
                <th><button className="font-semibold" type="button" onClick={() => toggleSort("gradeLevels")}>Grades{sortLabel("gradeLevels")}</button></th>
                <th><button className="font-semibold" type="button" onClick={() => toggleSort("status")}>Status{sortLabel("status")}</button></th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((block, index) => {
                const isEditing = editingId === block.id;
                const draftRow = draft[block.id] || block;
                const isArchived = block.archived || !block.schoolYearActive;
                const isHistorical = !block.schoolYearActive;
                const startsYearGroup = index === 0 || visibleRows[index - 1].schoolYearLabel !== block.schoolYearLabel;
                return (
                  <Fragment key={block.id}>
                  {startsYearGroup && (
                    <tr className={block.schoolYearActive ? "bg-emerald-50" : "bg-slate-100"}>
                      <td colSpan={6} className="!px-3 !py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#071c2c]">{block.schoolYearLabel}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${block.schoolYearActive ? "bg-emerald-200 text-emerald-900" : "bg-slate-300 text-slate-700"}`}>
                            {block.schoolYearActive ? "Current school year" : "Historical school year"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className={`h-[52px] ${isEditing ? "bg-amber-50/70" : isHistorical ? "bg-slate-50/80 text-black/70" : "bg-white/40"}`}>
                    <td className="font-semibold">{block.schoolYearLabel}</td>
                    <td>{isEditing ? <input className="form-control h-8 max-w-[76px] py-1 text-sm" type="number" min={1} value={draftRow.blockNumber} onChange={(event) => setDraft((current) => ({ ...current, [block.id]: { ...draftRow, blockNumber: Number(event.target.value) } }))} /> : block.blockNumber}</td>
                    <td className="overflow-hidden">{isEditing ? <input className="form-control h-8 py-1 text-sm font-semibold" value={draftRow.blockName} onChange={(event) => setDraft((current) => ({ ...current, [block.id]: { ...draftRow, blockName: event.target.value } }))} /> : <span className="block truncate whitespace-nowrap font-semibold" title={block.blockName}>{block.blockName}</span>}</td>
                    <td className="overflow-hidden">{isEditing ? <div className="flex h-8 items-center gap-1">{[6, 7, 8].map((grade) => <button key={grade} className={`rounded-lg px-2 py-1 text-xs font-semibold ${draftRow.gradeLevels.includes(grade) ? "bg-[#0b1b2a] text-white" : "bg-black/5 text-black/55"}`} type="button" aria-pressed={draftRow.gradeLevels.includes(grade)} onClick={() => setDraft((current) => ({ ...current, [block.id]: { ...draftRow, gradeLevels: toggleGrade(draftRow.gradeLevels, grade) } }))}>{grade}</button>)}</div> : <span className="block truncate whitespace-nowrap" title={gradeLabel(block.gradeLevels)}>{gradeLabel(block.gradeLevels)}</span>}</td>
                    <td><span className={`inline-flex h-7 items-center rounded-full px-2 text-[11px] font-semibold ${isArchived ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-800"}`}>{isHistorical ? "Historical" : block.archived ? "Archived" : "Active"}</span></td>
                    <td>
                      <div className="grid h-8 grid-cols-[82px_96px_82px] items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button className="h-8 rounded-lg bg-[#0b1b2a] px-3 text-xs font-bold text-white" type="button" onClick={async () => { if (await updateBlock(block, draftRow)) setEditingId(null); }}>Save</button>
                            <button className="h-8 rounded-lg border border-black/15 bg-white px-2 text-xs font-semibold" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button className="h-8 rounded-lg border border-black/15 bg-white px-3 text-xs font-semibold" type="button" onClick={() => { setEditingId(block.id); setDraft((current) => ({ ...current, [block.id]: block })); }}>Edit</button>
                        )}
                        {!isEditing && (isHistorical ? (
                          <button className="h-8 rounded-lg border border-black/15 bg-white px-2 text-xs font-semibold" type="button" onClick={() => void restoreSchoolYear(block)}>Unarchive</button>
                        ) : (
                          <button className="h-8 rounded-lg border border-black/15 bg-white px-2 text-xs font-semibold" type="button" onClick={() => void updateBlock(block, { archived: !block.archived })}>{block.archived ? "Unarchive" : "Archive"}</button>
                        ))}
                        <button className="h-8 rounded-lg border border-red-200 bg-white px-2 text-xs font-semibold text-red-700" type="button" onClick={() => void deleteBlock(block)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                  </Fragment>
                );
              })}
              {visibleRows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-black/55">No classes to show.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <details className="hero-card overflow-hidden">
        <summary className="cursor-pointer p-4 text-sm font-semibold text-ocean">Start a new school year</summary>
        <div className="flex flex-wrap items-end gap-2 border-t border-black/10 p-4">
          <label className="w-[150px]"><span className="small-header text-black/55">New year</span><input className="form-control mt-1 py-2 text-sm" value={newSchoolYearLabel} onChange={(event) => setNewSchoolYearLabel(event.target.value)} placeholder="27/28" /></label>
          <button className="btn btn-primary px-4 py-2 text-sm" type="button" onClick={startSchoolYear}>Start New School Year</button>
          <span className="text-xs text-black/55">One school year remains active. Prior classes and records are preserved in the archived view.</span>
        </div>
      </details>

      {showAddClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07131f]/70 p-4 backdrop-blur-[3px] sm:p-6">
          <div className="hero-card max-h-[calc(100vh-2rem)] w-full max-w-2xl space-y-4 overflow-y-auto p-5 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="add-class-heading">
            <div>
              <div className="small-header text-black/50">Classes & Years</div>
              <h2 className="section-title mt-1" id="add-class-heading">Add Class</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
              <label className="block">
                <span className="text-sm font-semibold">School year</span>
                <select className="form-control mt-1 py-2" value={classSchoolYearId} onChange={(event) => { const schoolYearId = event.target.value; setClassSchoolYearId(schoolYearId); setBlockNumber(nextBlockNumber(schoolYearId)); }}>
                  {schoolYears.map((year) => <option key={year.id} value={year.id}>{normalizeSchoolYearLabel(year.label) || year.label}{year.active && !year.archived ? " · Current" : " · Historical"}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Block number</span>
                <input className="form-control mt-1 py-2" type="number" min={1} value={blockNumber} onChange={(event) => setBlockNumber(Number(event.target.value))} />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold">Class name</span>
              <input autoFocus className="form-control mt-1 py-2" value={blockName} onChange={(event) => setBlockName(event.target.value)} placeholder="Math" onKeyDown={(event) => { if (event.key === "Enter" && blockName.trim()) void addBlock(); }} />
            </label>
            <fieldset>
              <legend className="text-sm font-semibold">Grades taught</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[6, 7, 8].map((grade) => <button key={`new-grade-${grade}`} className={`min-h-10 rounded-xl border border-black/15 px-3 text-sm font-semibold ${gradeLevels.includes(grade) ? "bg-[#0b1b2a] text-white" : "bg-black/5 text-black/55"}`} type="button" aria-pressed={gradeLevels.includes(grade)} onClick={() => setGradeLevels((current) => toggleGrade(current, grade))}>Grade {grade}</button>)}
              </div>
            </fieldset>
            <div className="flex gap-2">
              <button className="btn btn-primary" type="button" disabled={!blockName.trim() || !classSchoolYearId} onClick={() => void addBlock()}>Add Class</button>
              <button className="btn btn-ghost" type="button" onClick={() => { setShowAddClass(false); setBlockName(""); setGradeLevels([7]); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesDialog {...dialogProps} />
      <ActionDialog {...actionDialogProps} />
    </div>
  );
}
