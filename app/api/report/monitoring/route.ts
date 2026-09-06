import { NextResponse } from "next/server";
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, parseISO, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { calendarDayRange, getActiveSchoolYear, normalizeDate, requireUser } from "@/lib/server";
import { isStandardReportingDay } from "@/lib/reporting";
import { normalizeGradeLevels, qualifyStandardCode } from "@/lib/standards";

function parseDateParam(value: string | null) {
  if (!value) return normalizeDate(new Date());
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? normalizeDate(new Date()) : normalizeDate(parsed);
}

function lapDateKey(weekStart: Date, dayIndex: number) {
  const calendarAnchor = new Date(`${weekStart.toISOString().slice(0, 10)}T00:00:00.000Z`);
  calendarAnchor.setUTCDate(calendarAnchor.getUTCDate() + dayIndex);
  return calendarAnchor.toISOString().slice(0, 10);
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
      blockName: true,
      gradeLevels: true
    }
  });

  if (!block) {
    return NextResponse.json({ error: "block_not_found" }, { status: 404 });
  }

  const date = parseDateParam(searchParams.get("date"));
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  if (startParam && endParam) {
    const rangeStart = parseDateParam(startParam);
    const rangeEnd = parseDateParam(endParam);
    const rangeLength = differenceInCalendarDays(rangeEnd, rangeStart);
    if (rangeLength < 0 || rangeLength > 45) {
      return NextResponse.json({ error: "invalid_range" }, { status: 400 });
    }
    const dates = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
      .filter(isStandardReportingDay)
      .map((day) => format(day, "yyyy-MM-dd"));
    const firstWeekStart = startOfWeek(rangeStart, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(rangeEnd, { weekStartsOn: 1 });
    const [students, attendance, performance, laps] = await Promise.all([
      prisma.student.findMany({
        where: { schoolYearId: schoolYear.id, blockId, active: true },
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true, seatNumber: true }
      }),
      prisma.attendanceRecord.findMany({
        where: { schoolYearId: schoolYear.id, blockId, date: { gte: rangeStart, lte: rangeEnd }, student: { active: true } },
        select: { date: true, studentId: true, status: true }
      }),
      prisma.lapPerformance.findMany({
        where: { schoolYearId: schoolYear.id, blockId, date: { gte: rangeStart, lte: rangeEnd }, student: { active: true } },
        select: { date: true, studentId: true, lapNumber: true, color: true }
      }),
      prisma.lapDefinition.findMany({
        where: {
          schoolYearId: schoolYear.id,
          blockId,
          weekStart: { gte: normalizeDate(firstWeekStart), lt: addDays(normalizeDate(lastWeekStart), 1) }
        },
        orderBy: [{ weekStart: "asc" }, { dayIndex: "asc" }, { lapNumber: "asc" }],
        select: { weekStart: true, dayIndex: true, lapNumber: true, name: true, standardCode: true }
      })
    ]);
    const gradeLevels = normalizeGradeLevels(block.gradeLevels);
    return NextResponse.json({
      block,
      rangeStart: format(rangeStart, "yyyy-MM-dd"),
      rangeEnd: format(rangeEnd, "yyyy-MM-dd"),
      excludesTestRecords: true,
      dates,
      students,
      attendance: attendance.filter((record) => isStandardReportingDay(record.date)).map((record) => ({
        date: format(record.date, "yyyy-MM-dd"),
        studentId: record.studentId,
        status: record.status
      })),
      performance: performance.filter((record) => isStandardReportingDay(record.date)).map((record) => ({
        date: format(record.date, "yyyy-MM-dd"),
        studentId: record.studentId,
        lapNumber: record.lapNumber,
        color: record.color
      })),
      laps: laps.map((lap) => ({
        date: lapDateKey(lap.weekStart, lap.dayIndex),
        lapNumber: lap.lapNumber,
        name: lap.name,
        standardCode: gradeLevels.length > 0 ? qualifyStandardCode(lap.standardCode, gradeLevels[0]) : lap.standardCode
      })).filter((lap) => dates.includes(lap.date))
    });
  }
  const reportableDate = isStandardReportingDay(date);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const dayIndex = (date.getDay() + 6) % 7;

  const [desks, students, attendance, performance, laps] = await Promise.all([
    prisma.desk.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        type: "STUDENT",
        student: { active: true }
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
    reportableDate ? prisma.attendanceRecord.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        date,
        student: { active: true }
      },
      select: {
        studentId: true,
        status: true
      }
    }) : Promise.resolve([]),
    reportableDate ? prisma.lapPerformance.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        date,
        student: { active: true }
      },
      select: {
        studentId: true,
        lapNumber: true,
        color: true
      }
    }) : Promise.resolve([]),
    prisma.lapDefinition.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        weekStart: calendarDayRange(weekStart),
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
    excludesTestRecords: true,
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
    laps: laps.map((lap) => ({
      ...lap,
      standardCode: normalizeGradeLevels(block.gradeLevels).length > 0
        ? qualifyStandardCode(lap.standardCode, normalizeGradeLevels(block.gradeLevels)[0])
        : lap.standardCode
    }))
  });
}
