import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, requireUser } from "@/lib/server";
import { parseISO } from "date-fns";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get("blockId") || undefined;
  const weekStartParam = searchParams.get("weekStart");
  if (!blockId || !weekStartParam) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const weekStart = parseISO(weekStartParam);

  const laps = await prisma.lapDefinition.findMany({
    where: {
      schoolYearId: schoolYear.id,
      blockId,
      weekStart
    },
    orderBy: [{ dayIndex: "asc" }, { lapNumber: "asc" }]
  });

  return NextResponse.json({ laps });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const body = await req.json();
  const blockId = String(body.blockId || "");
  const weekStart = parseISO(String(body.weekStart || ""));
  const dayIndex = Number(body.dayIndex);
  const lapNumber = Number(body.lapNumber);
  const name = String(body.name || "").trim();
  const standardCode = body.standardCode ? String(body.standardCode) : null;

  if (!blockId || !name || Number.isNaN(dayIndex) || Number.isNaN(lapNumber)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const lap = await prisma.lapDefinition.upsert({
    where: {
      blockId_weekStart_dayIndex_lapNumber: {
        blockId,
        weekStart,
        dayIndex,
        lapNumber
      }
    },
    update: { name, standardCode },
    create: {
      schoolYearId: schoolYear.id,
      blockId,
      weekStart,
      dayIndex,
      lapNumber,
      name,
      standardCode
    }
  });

  return NextResponse.json({ lap });
}
