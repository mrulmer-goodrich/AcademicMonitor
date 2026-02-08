"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Block = { id: string; blockNumber: number; blockName: string };

type Desk = {
  id: string;
  type: "STUDENT" | "TEACHER";
  x: number;
  y: number;
  width: number;
  height: number;
};

type ActivityRecord = { updatedAt?: string; createdAt?: string; date?: string };

export default function MonitorSnapshotCard() {
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActivity, setHasActivity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSnapshot();
  }, []);

  async function loadSnapshot() {
    setLoading(true);
    setError(null);
    try {
      const blocksRes = await fetch("/api/blocks");
      if (!blocksRes.ok) {
        setError("Unable to load blocks.");
        setLoading(false);
        return;
      }
      const blocksData = await blocksRes.json();
      const blocks: Block[] = (blocksData.blocks || []).slice().sort((a: Block, b: Block) => a.blockNumber - b.blockNumber);
      if (!blocks.length) {
        setSelectedBlock(null);
        setDesks([]);
        setLoading(false);
        return;
      }

      const dateIso = new Date().toISOString();
      const activity = await Promise.all(
        blocks.map(async (block) => {
          const [attendanceRes, performanceRes] = await Promise.all([
            fetch(`/api/attendance?blockId=${block.id}&date=${dateIso}`),
            fetch(`/api/performance?blockId=${block.id}&date=${dateIso}`)
          ]);
          const attendanceData = attendanceRes.ok ? await attendanceRes.json() : { attendance: [] };
          const performanceData = performanceRes.ok ? await performanceRes.json() : { performance: [] };
          const records: ActivityRecord[] = [
            ...(attendanceData.attendance || []),
            ...(performanceData.performance || [])
          ];
          const timestamps = records
            .map((record) => new Date(record.updatedAt || record.createdAt || record.date || "").getTime())
            .filter((stamp) => !Number.isNaN(stamp));
          const lastActive = timestamps.length ? Math.max(...timestamps) : null;
          return { block, lastActive };
        })
      );

      const active = activity.filter((entry) => entry.lastActive !== null);
      const chosen = active.length
        ? active.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))[0]
        : activity[0];
      const targetBlock = chosen?.block || blocks[0];
      setSelectedBlock(targetBlock);
      setHasActivity(Boolean(chosen?.lastActive));

      const desksRes = await fetch(`/api/desks?blockId=${targetBlock.id}`);
      const desksData = desksRes.ok ? await desksRes.json() : { desks: [] };
      const studentDesks = (desksData.desks || []).filter((desk: Desk) => desk.type === "STUDENT");
      setDesks(studentDesks);
    } catch (err) {
      setError("Unable to load snapshot.");
    } finally {
      setLoading(false);
    }
  }

  const bounds = useMemo(() => {
    if (!desks.length) return { minX: 0, minY: 0, spanX: 1, spanY: 1 };
    const minX = Math.min(...desks.map((desk) => desk.x));
    const minY = Math.min(...desks.map((desk) => desk.y));
    const maxX = Math.max(...desks.map((desk) => desk.x + desk.width));
    const maxY = Math.max(...desks.map((desk) => desk.y + desk.height));
    return {
      minX,
      minY,
      spanX: Math.max(maxX - minX, 1),
      spanY: Math.max(maxY - minY, 1)
    };
  }, [desks]);

  const blockLabel = selectedBlock
    ? `Block ${selectedBlock.blockNumber} · ${selectedBlock.blockName}`
    : "No blocks yet";

  return (
    <Link
      href={selectedBlock ? `/monitor?blockId=${selectedBlock.id}` : "/monitor"}
      className="feature-card group"
      style={{ minHeight: 200 }}
    >
      <div className="text-2xl font-semibold">Monitor</div>
      <p className="text-sm text-black/70">Jump into today’s seating view</p>
      <div className="text-sm font-semibold text-black/80">{blockLabel}</div>
      <div className="relative mt-2 h-36 w-full overflow-hidden rounded-xl border border-black/10 bg-white/70">
        <div className="absolute inset-2">
          {desks.length > 0 &&
            desks.map((desk) => {
              const left = ((desk.x - bounds.minX) / bounds.spanX) * 100;
              const top = ((desk.y - bounds.minY) / bounds.spanY) * 100;
              const width = Math.max((desk.width / bounds.spanX) * 100, 4);
              const height = Math.max((desk.height / bounds.spanY) * 100, 6);
              return (
                <div
                  key={desk.id}
                  className="absolute rounded-md border border-black/10 bg-white/90 shadow-sm"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`
                  }}
                />
              );
            })}
          {desks.length === 0 && !loading && (
            <div className="flex h-full w-full items-center justify-center text-sm text-black/50">
              No seating chart yet
            </div>
          )}
        </div>
        <div className="absolute inset-0 rounded-xl ring-1 ring-transparent transition group-hover:ring-black/10" />
      </div>
      <div className="mt-auto text-sm font-semibold text-ocean">
        {hasActivity ? "Resume today’s class" : "Open today’s class"}
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </Link>
  );
}
