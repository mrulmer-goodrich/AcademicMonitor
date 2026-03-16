import { NextResponse } from "next/server";
import { startOfWeek, parseISO } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, normalizeDate, requireUser } from "@/lib/server";

function parseDateParam(value: string | null) {
  if (!value) return normalizeDate(new Date());
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? normalizeDate(new Date()) : normalizeDate(parsed);
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const schoolYear = await getActiveSchoolYear(user.id);
  const { searchParams } = new URL(req.url);
  const blockId = String(searchParams.get("blockId") || "");
  if (!blockId) {
    return NextResponse.json({ error: "invalid_block" }, { status: 400 });
  }

  const block = await prisma.block.findFirst({
    where: {
      id: blockId,
      schoolYearId: schoolYear.id
    },
    select: {
      id: true,
      blockNumber: true,
      blockName: true
    }
  });

  if (!block) {
    return NextResponse.json({ error: "block_not_found" }, { status: 404 });
  }

  const date = parseDateParam(searchParams.get("date"));
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const dayIndex = (date.getDay() + 6) % 7;

  const [desks, students, attendance, performance, laps] = await Promise.all([
    prisma.desk.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        type: "STUDENT"
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        student: {
          select: {
            id: true,
            displayName: true,
            active: true
          }
        }
      }
    }),
    prisma.student.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        active: true
      },
      orderBy: {
        seatNumber: "asc"
      },
      select: {
        id: true,
        displayName: true,
        seatNumber: true
      }
    }),
    prisma.attendanceRecord.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        date
      },
      select: {
        studentId: true,
        status: true
      }
    }),
    prisma.lapPerformance.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        date
      },
      select: {
        studentId: true,
        lapNumber: true,
        color: true
      }
    }),
    prisma.lapDefinition.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        weekStart,
        dayIndex
      },
      orderBy: {
        lapNumber: "asc"
      },
      select: {
        lapNumber: true,
        name: true,
        standardCode: true
      }
    })
  ]);

  return NextResponse.json({
    block,
    date: date.toISOString().slice(0, 10),
    usesCurrentSeatingLayout: true,
    desks: desks.map((desk) => ({
      id: desk.id,
      studentId: desk.studentId,
      x: desk.x,
      y: desk.y,
      width: desk.width,
      height: desk.height,
      rotation: desk.rotation,
      student: desk.student
        ? {
            id: desk.student.id,
            displayName: desk.student.displayName,
            active: desk.student.active
          }
        : null
    })),
    students,
    attendance,
    performance,
    laps
  });
}
