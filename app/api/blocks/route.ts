import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, getSchoolDate, requireUser } from "@/lib/server";
import { normalizeGradeLevels } from "@/lib/standards";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("includeArchived") === "1";
  const blocks = await prisma.block.findMany({
    where: { schoolYearId: schoolYear.id, ...(includeArchived ? {} : { archived: false }) },
    orderBy: { blockNumber: "asc" }
  });
  return NextResponse.json({ blocks, schoolYear, schoolDate: getSchoolDate().toISOString().slice(0, 10) });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const blockNumber = Number(body.blockNumber);
  const blockName = String(body.blockName || "").trim();
  const gradeLevels = normalizeGradeLevels(body.gradeLevels);
  if (!blockNumber || !blockName || gradeLevels.length === 0) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const schoolYear = body.schoolYearId
    ? await prisma.schoolYear.findFirst({ where: { id: String(body.schoolYearId), userId: user.id } })
    : await getActiveSchoolYear(user.id);
  if (!schoolYear) return NextResponse.json({ error: "school_year_not_found" }, { status: 404 });
  const block = await prisma.block.create({
    data: {
      schoolYearId: schoolYear.id,
      blockNumber,
      blockName,
      gradeLevels
    }
  });
  return NextResponse.json({ block });
}
