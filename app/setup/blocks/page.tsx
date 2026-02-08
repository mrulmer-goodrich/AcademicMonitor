"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SetupNav from "@/components/SetupNav";

type Block = {
  id: string;
  blockNumber: number;
  blockName: string;
  archived: boolean;
};

export default function BlocksSetupPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockNumber, setBlockNumber] = useState(1);
  const [blockName, setBlockName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Block>>({});

  useEffect(() => {
    loadBlocks();
  }, []);

  async function loadBlocks() {
    const res = await fetch("/api/blocks");
    if (res.status === 401) {
      setError("Please login first.");
      return;
    }
    const data = await res.json();
    setBlocks(data.blocks || []);
  }

  async function addBlock() {
    setError(null);
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockNumber, blockName })
    });
    if (!res.ok) {
      setError("Unable to create block.");
      return;
    }
    setBlockName("");
    setBlockNumber((prev) => prev + 1);
    await loadBlocks();
  }

  async function updateBlock(id: string, data: Partial<Block>) {
    const res = await fetch(`/api/blocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) await loadBlocks();
  }

  async function deleteBlock(id: string) {
    if (!confirm("Delete this block?")) return;
    const res = await fetch(`/api/blocks/${id}`, { method: "DELETE" });
    if (res.ok) await loadBlocks();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div>
        <div className="small-header text-black/60">Setup</div>
        <h1 className="section-title">Blocks</h1>
        <p className="text-black/70 text-sm">Create, modify, archive, or delete blocks for the current school year.</p>
      </div>
      <SetupNav />

      {error && (
        <div className="hero-card p-4 text-sm text-red-700">
          {error} <Link className="underline" href="/dashboard">Go to login</Link>
        </div>
      )}

      <div className="hero-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="form-control max-w-[140px]"
            type="number"
            value={blockNumber}
            min={1}
            onChange={(e) => setBlockNumber(Number(e.target.value))}
            placeholder="Block #"
          />
          <input
            className="form-control flex-1 min-w-[220px]"
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            placeholder="Block name"
            onKeyDown={(e) => {
              if (e.key === "Enter") addBlock();
            }}
          />
          <button className="btn btn-primary" type="button" onClick={addBlock}>
            Add Block
          </button>
        </div>

        <table className="table mt-2">
          <thead>
            <tr>
              <th>Block Number</th>
              <th>Block Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => {
              const isEditing = editingId === block.id;
              const draftRow = draft[block.id] || block;
              return (
              <tr key={block.id}>
                <td>
                  <input
                    className="form-control max-w-[120px]"
                    type="number"
                    value={draftRow.blockNumber}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [block.id]: { ...draftRow, blockNumber: Number(e.target.value) }
                      }))
                    }
                  />
                </td>
                <td>
                  <input
                    className="form-control"
                    value={draftRow.blockName}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [block.id]: { ...draftRow, blockName: e.target.value }
                      }))
                    }
                  />
                </td>
                <td>{block.archived ? "Archived" : "Active"}</td>
                <td className="text-sm text-ocean space-x-3">
                  {!isEditing && (
                    <button type="button" onClick={() => {
                      setEditingId(block.id);
                      setDraft((prev) => ({ ...prev, [block.id]: block }));
                    }}>
                      Edit
                    </button>
                  )}
                  {isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await updateBlock(block.id, draftRow);
                          setEditingId(null);
                        }}
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => updateBlock(block.id, { archived: !block.archived })}>
                    {block.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button type="button" onClick={() => deleteBlock(block.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            )})}
            {blocks.length === 0 && (
              <tr>
                <td colSpan={4} className="text-sm text-black/60">
                  No blocks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
