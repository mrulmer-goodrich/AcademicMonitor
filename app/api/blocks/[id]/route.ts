import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";
import { normalizeGradeLevels } from "@/lib/standards";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: { blockNumber?: number; blockName?: string; gradeLevels?: number[]; archived?: boolean } = {};
  if (body.blockNumber !== undefined) data.blockNumber = Number(body.blockNumber);
  if (body.blockName !== undefined) data.blockName = String(body.blockName).trim();
  if (body.gradeLevels !== undefined) {
    const gradeLevels = normalizeGradeLevels(body.gradeLevels);
    if (gradeLevels.length === 0) {
      return NextResponse.json({ error: "invalid_grade" }, { status: 400 });
    }
    data.gradeLevels = gradeLevels;
  }
  if (body.archived !== undefined) data.archived = Boolean(body.archived);

  const ownedBlock = await prisma.block.findFirst({
    where: { id: params.id, schoolYear: { userId: user.id } },
    select: { id: true, gradeLevels: true }
  });
  if (!ownedBlock) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const gradeChanged = data.gradeLevels !== undefined && data.gradeLevels.join(",") !== ownedBlock.gradeLevels.join(",");
  const block = await prisma.$transaction(async (tx) => {
    const updated = await tx.block.update({ where: { id: ownedBlock.id }, data });
    if (gradeChanged) {
      await tx.lapDefinition.updateMany({
        where: { blockId: ownedBlock.id },
        data: { standardCode: null }
      });
    }
    return updated;
  });
  return NextResponse.json({ block });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ownedBlock = await prisma.block.findFirst({
    where: { id: params.id, schoolYear: { userId: user.id } },
    select: { id: true }
  });
  if (!ownedBlock) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.block.delete({ where: { id: ownedBlock.id } });
  return NextResponse.json({ ok: true });
}
