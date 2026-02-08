import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: { blockNumber?: number; blockName?: string; archived?: boolean } = {};
  if (body.blockNumber !== undefined) data.blockNumber = Number(body.blockNumber);
  if (body.blockName !== undefined) data.blockName = String(body.blockName).trim();
  if (body.archived !== undefined) data.archived = Boolean(body.archived);

  const block = await prisma.block.update({
    where: { id: params.id },
    data
  });
  return NextResponse.json({ block });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.block.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
