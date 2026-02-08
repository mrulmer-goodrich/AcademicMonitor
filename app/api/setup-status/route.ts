import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, requireUser } from "@/lib/server";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const schoolYear = await getActiveSchoolYear(user.id);
  const blocks = await prisma.block.findMany({
    where: { schoolYearId: schoolYear.id, archived: false },
    orderBy: { blockNumber: "asc" }
  });
  const blocksCount = blocks.length;

  const studentsCount = await prisma.student.count({
    where: { schoolYearId: schoolYear.id, active: true }
  });

  const desksCount = await prisma.desk.count({
    where: { schoolYearId: schoolYear.id, type: "STUDENT" }
  });

  const lapsCount = await prisma.lapDefinition.count({
    where: { schoolYearId: schoolYear.id }
  });

  return NextResponse.json({
    blocksCount,
    studentsCount,
    desksCount,
    lapsCount
  });
}
