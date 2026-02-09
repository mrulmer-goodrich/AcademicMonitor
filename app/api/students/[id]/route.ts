import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EogLevel } from "@prisma/client";
import { requireUser } from "@/lib/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  const fields = [
    "displayName",
    "active",
    "blockId",
    "ml",
    "mlNew",
    "iep504",
    "ec",
    "ca",
    "hiit",
    "eog",
    "notes"
  ];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  if (body.eog !== undefined) {
    const eogValue = body.eog ? String(body.eog) : null;
    data.eog =
      eogValue && Object.values(EogLevel).includes(eogValue as EogLevel) ? (eogValue as EogLevel) : null;
  }

  const student = await prisma.student.update({
    where: { id: params.id },
    data
  });
  return NextResponse.json({ student });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({ where: { studentId: params.id } }),
    prisma.lapPerformance.deleteMany({ where: { studentId: params.id } }),
    prisma.desk.updateMany({ where: { studentId: params.id }, data: { studentId: null } }),
    prisma.student.delete({ where: { id: params.id } })
  ]);
  return NextResponse.json({ ok: true });
}
