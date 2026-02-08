"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
            {blocks.map((block) => (
              <tr key={block.id}>
                <td>
                  <input
                    className="form-control max-w-[120px]"
                    type="number"
                    value={block.blockNumber}
                    onChange={(e) =>
                      setBlocks((prev) =>
                        prev.map((b) =>
                          b.id === block.id ? { ...b, blockNumber: Number(e.target.value) } : b
                        )
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    className="form-control"
                    value={block.blockName}
                    onChange={(e) =>
                      setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, blockName: e.target.value } : b)))
                    }
                  />
                </td>
                <td>{block.archived ? "Archived" : "Active"}</td>
                <td className="text-sm text-ocean space-x-3">
                  <button type="button" onClick={() => updateBlock(block.id, block)}>
                    Save
                  </button>
                  <button type="button" onClick={() => updateBlock(block.id, { archived: !block.archived })}>
                    {block.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button type="button" onClick={() => deleteBlock(block.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
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
