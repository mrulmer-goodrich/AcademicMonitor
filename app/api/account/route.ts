import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, requireUser } from "@/lib/server";
import { setSessionCookie } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const schoolYear = await getActiveSchoolYear(user.id);
  const [blocksCount, studentsCount, desksCount, lapsCount, attendanceCount, performanceCount, latestAttendance, latestPerformance, latestLapUpdate, latestStudentUpdate, latestDeskUpdate] =
    await Promise.all([
      prisma.block.count({ where: { schoolYearId: schoolYear.id, archived: false } }),
      prisma.student.count({ where: { schoolYearId: schoolYear.id, active: true } }),
      prisma.desk.count({ where: { schoolYearId: schoolYear.id, type: "STUDENT" } }),
      prisma.lapDefinition.count({ where: { schoolYearId: schoolYear.id } }),
      prisma.attendanceRecord.count({ where: { schoolYearId: schoolYear.id } }),
      prisma.lapPerformance.count({ where: { schoolYearId: schoolYear.id } }),
      prisma.attendanceRecord.findFirst({
        where: { schoolYearId: schoolYear.id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      }),
      prisma.lapPerformance.findFirst({
        where: { schoolYearId: schoolYear.id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      }),
      prisma.lapDefinition.findFirst({
        where: { schoolYearId: schoolYear.id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      }),
      prisma.student.findFirst({
        where: { schoolYearId: schoolYear.id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      }),
      prisma.desk.findFirst({
        where: { schoolYearId: schoolYear.id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      })
    ]);

  const latestActivityAt = [
    latestAttendance?.updatedAt,
    latestPerformance?.updatedAt,
    latestLapUpdate?.updatedAt,
    latestStudentUpdate?.updatedAt,
    latestDeskUpdate?.updatedAt
  ]
    .filter(Boolean)
    .sort((left, right) => right!.getTime() - left!.getTime())[0] || null;

  return NextResponse.json({
    summary: {
      accountCreatedAt: user.createdAt,
      schoolYear: schoolYear.label,
      blocksCount,
      studentsCount,
      desksCount,
      lapsCount,
      attendanceCount,
      performanceCount,
      latestActivityAt
    }
  });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const teacherName = String(body.teacherName || "").trim();
  const displayName = String(body.displayName || "").trim();
  if (!email || !email.includes("@") || !teacherName || !displayName) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "email_exists" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { email, teacherName, displayName }
  });
  setSessionCookie({
    id: updated.id,
    email: updated.email,
    teacherName: updated.teacherName,
    displayName: updated.displayName
  });
  return NextResponse.json({
    user: {
      email: updated.email,
      teacherName: updated.teacherName,
      displayName: updated.displayName
    }
  });
}
