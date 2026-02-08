import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DeskType } from "@prisma/client";
import { getActiveSchoolYear, requireUser } from "@/lib/server";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get("blockId") || undefined;
  const unassigned = searchParams.get("unassigned") === "1";

  if (unassigned && blockId) {
    const students = await prisma.student.findMany({
      where: { blockId, active: true, schoolYearId: schoolYear.id },
      orderBy: { seatNumber: "asc" }
    });
    const desks = await prisma.desk.findMany({
      where: { blockId, schoolYearId: schoolYear.id, studentId: { not: null } }
    });
    const assigned = new Set(desks.map((d) => d.studentId));
    const unassignedStudents = students.filter((s) => !assigned.has(s.id));
    return NextResponse.json({ students: unassignedStudents });
  }

  const desks = await prisma.desk.findMany({
    where: {
      schoolYearId: schoolYear.id,
      ...(blockId ? { blockId } : {})
    },
    include: { student: true }
  });
  return NextResponse.json({ desks });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const body = await req.json();
  const blockId = String(body.blockId || "");
  const typeValue = String(body.type || "STUDENT");
  const type = Object.values(DeskType).includes(typeValue as DeskType)
    ? (typeValue as DeskType)
    : DeskType.STUDENT;
  if (!blockId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  let studentId: string | null = null;
  let seatNumber: number | null = null;
  if (type === "STUDENT") {
    studentId = String(body.studentId || "");
    if (!studentId) return NextResponse.json({ error: "student_required" }, { status: 400 });
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return NextResponse.json({ error: "student_not_found" }, { status: 404 });
    seatNumber = student.seatNumber;
  }

  const desk = await prisma.desk.create({
    data: {
      schoolYearId: schoolYear.id,
      blockId,
      type,
      studentId,
      seatNumber,
      x: body.x ?? 40,
      y: body.y ?? 40,
      width: body.width ?? 116,
      height: body.height ?? 82,
      rotation: body.rotation ?? 0,
      groupId: body.groupId ?? null
    },
    include: { student: true }
  });
  return NextResponse.json({ desk });
}
