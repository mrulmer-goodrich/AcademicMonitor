import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";
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

  const attendance = await prisma.attendanceRecord.findMany({
    where: { schoolYearId: schoolYear.id, blockId, date },
    include: { student: true }
  });

  return NextResponse.json({ attendance });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const body = await req.json();
  const blockId = String(body.blockId || "");
  const date = normalizeDate(parseISO(String(body.date || "")));
  if (!blockId || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (Array.isArray(body.records)) {
    const records = body.records
      .map((record: { studentId?: string; status?: string }) => {
        const studentId = String(record.studentId || "");
        const statusValue = String(record.status || "PRESENT");
        const status = Object.values(AttendanceStatus).includes(statusValue as AttendanceStatus)
          ? (statusValue as AttendanceStatus)
          : AttendanceStatus.PRESENT;
        return studentId ? { studentId, status } : null;
      })
      .filter(Boolean) as { studentId: string; status: AttendanceStatus }[];

    if (!records.length) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    await prisma.$transaction(
      records.map((record) =>
        prisma.attendanceRecord.upsert({
          where: { studentId_date: { studentId: record.studentId, date } },
          update: { status: record.status },
          create: {
            schoolYearId: schoolYear.id,
            blockId,
            studentId: record.studentId,
            date,
            status: record.status
          }
        })
      )
    );

    return NextResponse.json({ ok: true });
  }

  if (body.mode === "bulk") {
    const statusValue = String(body.status || "PRESENT");
    const status = Object.values(AttendanceStatus).includes(statusValue as AttendanceStatus)
      ? (statusValue as AttendanceStatus)
      : AttendanceStatus.PRESENT;
    const students = await prisma.student.findMany({
      where: { schoolYearId: schoolYear.id, blockId, active: true }
    });

    await Promise.all(
      students.map((student) =>
        prisma.attendanceRecord.upsert({
          where: { studentId_date: { studentId: student.id, date } },
          update: { status },
          create: {
            schoolYearId: schoolYear.id,
            blockId,
            studentId: student.id,
            date,
            status
          }
        })
      )
    );

    return NextResponse.json({ ok: true });
  }

  const studentId = String(body.studentId || "");
  const statusValue = String(body.status || "PRESENT");
  const status = Object.values(AttendanceStatus).includes(statusValue as AttendanceStatus)
    ? (statusValue as AttendanceStatus)
    : AttendanceStatus.PRESENT;
  if (!studentId) return NextResponse.json({ error: "student_required" }, { status: 400 });

  const record = await prisma.attendanceRecord.upsert({
    where: { studentId_date: { studentId, date } },
    update: { status },
    create: {
      schoolYearId: schoolYear.id,
      blockId,
      studentId,
      date,
      status
    }
  });

  return NextResponse.json({ attendance: record });
}
