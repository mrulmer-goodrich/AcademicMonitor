import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EogLevel } from "@prisma/client";
import { getActiveSchoolYear, requireUser } from "@/lib/server";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get("blockId") || undefined;

  const students = await prisma.student.findMany({
    where: {
      schoolYearId: schoolYear.id,
      ...(blockId ? { blockId } : {})
    },
    orderBy: [{ blockId: "asc" }, { seatNumber: "asc" }]
  });
  return NextResponse.json({ students });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const displayName = String(body.displayName || "").trim();
  const blockId = String(body.blockId || "").trim();
  if (!displayName || !blockId) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const schoolYear = await getActiveSchoolYear(user.id);
  const maxSeat = await prisma.student.aggregate({
    where: { schoolYearId: schoolYear.id },
    _max: { seatNumber: true }
  });
  const seatNumber = (maxSeat._max.seatNumber || 0) + 1;

  const eogValue = body.eog ? String(body.eog) : null;
  const eog = eogValue && Object.values(EogLevel).includes(eogValue as EogLevel) ? (eogValue as EogLevel) : null;
  const notes = body.notes ? String(body.notes) : null;

  const student = await prisma.student.create({
    data: {
      schoolYearId: schoolYear.id,
      blockId,
      displayName,
      seatNumber,
      active: true,
      ml: Boolean(body.ml),
      mlNew: Boolean(body.mlNew),
      iep504: Boolean(body.iep504),
      ec: Boolean(body.ec),
      ca: Boolean(body.ca),
      hiit: Boolean(body.hiit),
      eog,
      notes
    }
  });
  return NextResponse.json({ student });
}
