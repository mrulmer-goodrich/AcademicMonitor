import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PerformanceColor } from "@prisma/client";
import { getActiveSchoolYear, normalizeDate, requireUser } from "@/lib/server";
import { parseISO } from "date-fns";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get("blockId") || undefined;
  const dateParam = searchParams.get("date");
  if (!blockId || !dateParam) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const date = normalizeDate(parseISO(dateParam));

  const performance = await prisma.lapPerformance.findMany({
    where: { schoolYearId: schoolYear.id, blockId, date }
  });

  return NextResponse.json({ performance });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const body = await req.json();
  const blockId = String(body.blockId || "");
  const studentId = String(body.studentId || "");
  const date = normalizeDate(parseISO(String(body.date || "")));
  const lapNumber = Number(body.lapNumber);
  const remove = Boolean(body.remove);
  const colorValue = String(body.color || "GREEN");
  const color = Object.values(PerformanceColor).includes(colorValue as PerformanceColor)
    ? (colorValue as PerformanceColor)
    : PerformanceColor.GREEN;

  if (!blockId || !studentId || Number.isNaN(lapNumber)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (remove) {
    await prisma.lapPerformance.deleteMany({
      where: { studentId, date, lapNumber, schoolYearId: schoolYear.id, blockId }
    });
    return NextResponse.json({ ok: true });
  }

  const record = await prisma.lapPerformance.upsert({
    where: { studentId_date_lapNumber: { studentId, date, lapNumber } },
    update: { color },
    create: {
      schoolYearId: schoolYear.id,
      blockId,
      studentId,
      date,
      lapNumber,
      color
    }
  });

  return NextResponse.json({ performance: record });
}
