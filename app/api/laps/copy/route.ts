import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, requireUser } from "@/lib/server";
import { parseISO } from "date-fns";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const body = await req.json();
  const fromBlockId = String(body.fromBlockId || "");
  const toBlockId = String(body.toBlockId || "");
  const weekStart = parseISO(String(body.weekStart || ""));
  const force = Boolean(body.force);

  if (!fromBlockId || !toBlockId) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const existing = await prisma.lapDefinition.findMany({
    where: { schoolYearId: schoolYear.id, blockId: toBlockId, weekStart }
  });

  if (existing.length > 0 && !force) {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }

  if (existing.length > 0 && force) {
    await prisma.lapDefinition.deleteMany({
      where: { schoolYearId: schoolYear.id, blockId: toBlockId, weekStart }
    });
  }

  const source = await prisma.lapDefinition.findMany({
    where: { schoolYearId: schoolYear.id, blockId: fromBlockId, weekStart }
  });

  const created = await prisma.lapDefinition.createMany({
    data: source.map((lap) => ({
      schoolYearId: schoolYear.id,
      blockId: toBlockId,
      weekStart,
      dayIndex: lap.dayIndex,
      lapNumber: lap.lapNumber,
      name: lap.name,
      standardCode: lap.standardCode
    }))
  });

  return NextResponse.json({ created: created.count });
}
