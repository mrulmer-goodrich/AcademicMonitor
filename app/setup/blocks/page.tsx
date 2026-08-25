"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReturnToDashboardButton from "@/components/ReturnToDashboardButton";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import useUnsavedChangesGuard from "@/lib/useUnsavedChangesGuard";
import { currentSchoolYearLabel, normalizeSchoolYearLabel } from "@/lib/schoolYear";

type Block = {
  id: string;
  blockNumber: number;
  blockName: string;
  archived: boolean;
};

type SchoolYear = {
  id: string;
  label: string;
  active: boolean;
  archived: boolean;
  blocks: Block[];
};

export default function BlocksSetupPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYear | null>(null);
  const [schoolYearLabel, setSchoolYearLabel] = useState("");
  const [newSchoolYearLabel, setNewSchoolYearLabel] = useState(currentSchoolYearLabel());
  const [blockNumber, setBlockNumber] = useState(1);
  const [blockName, setBlockName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Block>>({});

  useEffect(() => {
    loadData();
  }, []);

  const activeBlocks = useMemo(() => blocks.filter((block) => !block.archived), [blocks]);
  const archivedBlocks = useMemo(() => blocks.filter((block) => block.archived), [blocks]);
  const historicalYears = useMemo(() => schoolYears.filter((year) => !year.active), [schoolYears]);
  const archivedCount = archivedBlocks.length + historicalYears.reduce((sum, year) => sum + year.blocks.length, 0);

  const hasUnsavedChanges = useMemo(() => {
    if (blockName.trim() || newSchoolYearLabel !== currentSchoolYearLabel()) return true;
    if (activeSchoolYear && schoolYearLabel !== (normalizeSchoolYearLabel(activeSchoolYear.label) || activeSchoolYear.label)) {
      return true;
    }
    if (!editingId) return false;
    const original = blocks.find((block) => block.id === editingId) ||
      schoolYears.flatMap((year) => year.blocks).find((block) => block.id === editingId);
    const draftRow = draft[editingId];
    return Boolean(original && draftRow &&
      (original.blockNumber !== draftRow.blockNumber || original.blockName !== draftRow.blockName));
  }, [activeSchoolYear, blockName, blocks, draft, editingId, newSchoolYearLabel, schoolYearLabel, schoolYears]);

  const { dialogProps } = useUnsavedChangesGuard({
    when: hasUnsavedChanges,
    description: "You have unsaved block or school-year changes. Leaving now will discard them."
  });

  async function loadData() {
    const blocksRes = await fetch("/api/blocks?includeArchived=1");
    if (!blocksRes.ok) {
      setError(blocksRes.status === 401 ? "Please login first." : "Unable to load classes.");
      return;
    }
    const blocksData = await blocksRes.json();
    const yearsRes = await fetch("/api/school-years");
    if (!yearsRes.ok) {
      setError(yearsRes.status === 401 ? "Please login first." : "Unable to load school years.");
      return;
    }
    const yearsData = await yearsRes.json();
    const nextYear = blocksData.schoolYear as SchoolYear;
    setBlocks(blocksData.blocks || []);
    setSchoolYears(yearsData.schoolYears || []);
    setActiveSchoolYear(nextYear);
    setSchoolYearLabel(normalizeSchoolYearLabel(nextYear.label) || nextYear.label);
  }

  async function addBlock() {
    setError(null);
    if (!normalizeSchoolYearLabel(schoolYearLabel)) {
      setError("Add the school year in 25/26 format before creating a block.");
      return;
    }
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockNumber, blockName })
    });
    if (!res.ok) {
      setError("Unable to create block. Check that the number and name are unique for this school year.");
      return;
    }
    setBlockName("");
    setBlockNumber((prev) => prev + 1);
    await loadData();
  }

  async function updateBlock(id: string, data: Partial<Block>) {
    setError(null);
    const res = await fetch(`/api/blocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) setError("Unable to update that block.");
    else await loadData();
  }

  async function deleteBlock(id: string) {
    if (!confirm("Delete this block and its related class records? Archiving is safer if you may need them later.")) return;
    const res = await fetch(`/api/blocks/${id}`, { method: "DELETE" });
    if (res.ok) await loadData();
    else setError("Unable to delete that block.");
  }

  async function saveSchoolYear(id: string, label: string) {
    const normalized = normalizeSchoolYearLabel(label);
    if (!normalized) {
      setError("Use the school-year format 25/26.");
      return;
    }
    const res = await fetch(`/api/school-years/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: normalized })
    });
    if (!res.ok) setError("Unable to save that school year. The label may already exist.");
    else await loadData();
  }

  async function startSchoolYear() {
    const normalized = normalizeSchoolYearLabel(newSchoolYearLabel);
    if (!normalized) {
      setError("Use the school-year format 26/27.");
      return;
    }
    if (!confirm(`Start ${normalized}? The current school year and its classes will move into Archived classes.`)) return;
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
    setBlockNumber(1);
    setBlockName("");
    await loadData();
  }

  function renderBlockRows(rows: Block[], canChangeArchive: boolean) {
    return rows.map((block) => {
      const isEditing = editingId === block.id;
      const draftRow = draft[block.id] || block;
      return (
        <tr key={block.id}>
          <td>
            <input
              aria-label={`Block number for ${block.blockName}`}
              className="form-control max-w-[120px]"
              type="number"
              value={draftRow.blockNumber}
              disabled={!isEditing}
              onChange={(event) => setDraft((prev) => ({
                ...prev,
                [block.id]: { ...draftRow, blockNumber: Number(event.target.value) }
              }))}
            />
          </td>
          <td>
            <input
              aria-label={`Block name for block ${block.blockNumber}`}
              className="form-control min-w-[220px]"
              value={draftRow.blockName}
              disabled={!isEditing}
              onChange={(event) => setDraft((prev) => ({
                ...prev,
                [block.id]: { ...draftRow, blockName: event.target.value }
              }))}
            />
          </td>
          <td className="whitespace-nowrap text-sm text-ocean">
            {!isEditing ? (
              <button type="button" onClick={() => {
                setEditingId(block.id);
                setDraft((prev) => ({ ...prev, [block.id]: block }));
              }}>Edit</button>
            ) : (
              <span className="space-x-3">
                <button type="button" onClick={async () => {
                  await updateBlock(block.id, draftRow);
                  setEditingId(null);
                }}>Save</button>
                <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
              </span>
            )}
            {canChangeArchive && (
              <button className="ml-4" type="button" onClick={() => updateBlock(block.id, { archived: !block.archived })}>
                {block.archived ? "Unarchive" : "Archive"}
              </button>
            )}
            <button className="ml-4" type="button" onClick={() => deleteBlock(block.id)}>Delete</button>
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
      <ReturnToDashboardButton />

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <section className="hero-card space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-5">
          <label className="min-w-[220px] flex-1">
            <span className="small-header text-black/60">Current school year</span>
            <span className="mt-2 flex max-w-sm gap-2">
              <input
                className="form-control"
                required
                inputMode="numeric"
                value={schoolYearLabel}
                onChange={(event) => setSchoolYearLabel(event.target.value)}
                placeholder="25/26"
                aria-label="Current school year"
              />
              <button
                className="btn btn-ghost shrink-0"
                type="button"
                disabled={!activeSchoolYear}
                onClick={() => activeSchoolYear && saveSchoolYear(activeSchoolYear.id, schoolYearLabel)}
              >Save</button>
            </span>
            <span className="mt-1 block text-xs text-black/55">Required format: 25/26</span>
          </label>

          <div className="min-w-[260px]">
            <div className="small-header text-black/60">Start a new school year</div>
            <div className="mt-2 flex gap-2">
              <input
                className="form-control max-w-[130px]"
                value={newSchoolYearLabel}
                onChange={(event) => setNewSchoolYearLabel(event.target.value)}
                placeholder="26/27"
                aria-label="New school year"
              />
              <button className="btn btn-primary shrink-0" type="button" onClick={startSchoolYear}>Start Year</button>
            </div>
          </div>
        </div>

        <div>
          <h1 className="section-title">Active classes</h1>
          <p className="mt-1 text-sm text-black/60">Only these classes appear in daily setup and monitoring.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="form-control max-w-[140px]"
            type="number"
            value={blockNumber}
            min={1}
            onChange={(event) => setBlockNumber(Number(event.target.value))}
            placeholder="Block #"
            aria-label="New block number"
          />
          <input
            className="form-control min-w-[220px] flex-1"
            value={blockName}
            onChange={(event) => setBlockName(event.target.value)}
            placeholder="Block name"
            aria-label="New block name"
            onKeyDown={(event) => { if (event.key === "Enter") addBlock(); }}
          />
          <button className="btn btn-primary" type="button" onClick={addBlock}>Add Block</button>
        </div>

        <div className="overflow-x-auto">
          <table className="table mt-2 min-w-[680px]">
            <thead><tr><th>Block Number</th><th>Block Name</th><th>Actions</th></tr></thead>
            <tbody>
              {renderBlockRows(activeBlocks, true)}
              {activeBlocks.length === 0 && <tr><td colSpan={3} className="text-sm text-black/60">No active classes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <details className="hero-card group overflow-hidden" open={archivedCount > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
          <span>
            <span className="section-title">Archived classes</span>
            <span className="ml-3 rounded-full bg-black/[0.08] px-3 py-1 text-sm font-semibold text-black/60">{archivedCount}</span>
          </span>
          <span className="text-sm font-semibold text-ocean group-open:hidden">Show</span>
          <span className="hidden text-sm font-semibold text-ocean group-open:inline">Hide</span>
        </summary>

        <div className="space-y-6 border-t border-black/10 bg-black/[0.025] p-5 sm:p-6">
          {archivedBlocks.length > 0 && (
            <section>
              <h2 className="font-semibold">{schoolYearLabel || "Current year"}</h2>
              <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10 bg-white/70 p-2">
                <table className="table min-w-[680px]"><tbody>{renderBlockRows(archivedBlocks, true)}</tbody></table>
              </div>
            </section>
          )}

          {historicalYears.map((year) => (
            <section key={year.id}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="form-control max-w-[130px]"
                  defaultValue={normalizeSchoolYearLabel(year.label) || year.label}
                  aria-label={`School year for archived classes ${year.label}`}
                  id={`year-${year.id}`}
                />
                <button
                  className="btn btn-ghost px-3 py-2 text-sm"
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(`year-${year.id}`) as HTMLInputElement | null;
                    if (input) saveSchoolYear(year.id, input.value);
                  }}
                >Save year</button>
              </div>
              <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10 bg-white/70 p-2">
                <table className="table min-w-[680px]">
                  <tbody>
                    {renderBlockRows(year.blocks, false)}
                    {year.blocks.length === 0 && <tr><td className="text-sm text-black/60">No classes in this school year.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          {archivedCount === 0 && <p className="text-sm text-black/60">Archived classes will be collected here by school year.</p>}
        </div>
      </details>

      <UnsavedChangesDialog {...dialogProps} />
    </div>
  );
}
