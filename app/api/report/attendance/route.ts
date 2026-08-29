import { NextResponse } from "next/server";
import { differenceInCalendarDays, eachDayOfInterval, endOfMonth, parseISO, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, normalizeDate, requireUser } from "@/lib/server";
import { isStandardReportingDay } from "@/lib/reporting";

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
  const scope = searchParams.get("scope") === "student" ? "student" : "class";

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

  if (scope === "student") {
    const studentId = String(searchParams.get("studentId") || "");
    if (!studentId) {
      return NextResponse.json({ error: "student_required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        blockId,
        schoolYearId: schoolYear.id
      },
      select: {
        id: true,
        displayName: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: "student_not_found" }, { status: 404 });
    }

    const monthAnchor = parseDateParam(searchParams.get("month"));
    const monthStart = normalizeDate(startOfMonth(monthAnchor));
    const monthEnd = normalizeDate(endOfMonth(monthAnchor));
    const allRecords = await prisma.attendanceRecord.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        studentId
      },
      orderBy: {
        date: "asc"
      },
      select: {
        date: true,
        status: true
      }
    });

    return NextResponse.json({
      block,
      student,
      monthStart: monthStart.toISOString().slice(0, 10),
      monthEnd: monthEnd.toISOString().slice(0, 10),
      records: allRecords.filter((record) => isStandardReportingDay(record.date)).map((record) => ({
        date: record.date.toISOString().slice(0, 10),
        status: record.status
      }))
    });
  }

  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  if (startParam && endParam) {
    const rangeStart = parseDateParam(startParam);
    const rangeEnd = parseDateParam(endParam);
    const rangeLength = differenceInCalendarDays(rangeEnd, rangeStart);
    if (rangeLength < 0 || rangeLength > 45) {
      return NextResponse.json({ error: "invalid_range" }, { status: 400 });
    }

    const [students, attendance] = await Promise.all([
      prisma.student.findMany({
        where: { schoolYearId: schoolYear.id, blockId, active: true },
        orderBy: { seatNumber: "asc" },
        select: { id: true, displayName: true, seatNumber: true }
      }),
      prisma.attendanceRecord.findMany({
        where: {
          schoolYearId: schoolYear.id,
          blockId,
          date: { gte: rangeStart, lte: rangeEnd }
        },
        orderBy: [{ date: "asc" }, { student: { seatNumber: "asc" } }],
        select: {
          date: true,
          studentId: true,
          status: true,
          student: { select: { displayName: true } }
        }
      })
    ]);
    const standardAttendance = attendance.filter((record) => isStandardReportingDay(record.date));
    const dates = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
      .filter(isStandardReportingDay)
      .map((date) => date.toISOString().slice(0, 10));

    return NextResponse.json({
      block,
      rangeStart: rangeStart.toISOString().slice(0, 10),
      rangeEnd: rangeEnd.toISOString().slice(0, 10),
      excludesTestRecords: true,
      dates,
      students,
      attendance: standardAttendance.map((record) => ({
        date: record.date.toISOString().slice(0, 10),
        studentId: record.studentId,
        displayName: record.student.displayName,
        status: record.status
      })),
      summary: {
        PRESENT: standardAttendance.filter((record) => record.status === "PRESENT").length,
        ABSENT: standardAttendance.filter((record) => record.status === "ABSENT").length,
        TARDY: standardAttendance.filter((record) => record.status === "TARDY").length,
        LEFT_EARLY: standardAttendance.filter((record) => record.status === "LEFT_EARLY").length
      }
    });
  }

  const date = parseDateParam(searchParams.get("date"));
  const reportableDate = isStandardReportingDay(date);
  const [desks, students, attendance] = await Promise.all([
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
    reportableDate ? prisma.attendanceRecord.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId,
        date
      },
      orderBy: {
        student: {
          seatNumber: "asc"
        }
      },
      select: {
        studentId: true,
        status: true,
        student: {
          select: {
            displayName: true
          }
        }
      }
    }) : Promise.resolve([])
  ]);

  const summary = {
    PRESENT: attendance.filter((record) => record.status === "PRESENT").length,
    ABSENT: attendance.filter((record) => record.status === "ABSENT").length,
    TARDY: attendance.filter((record) => record.status === "TARDY").length,
    LEFT_EARLY: attendance.filter((record) => record.status === "LEFT_EARLY").length
  };

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
    attendance: attendance.map((record) => ({
      studentId: record.studentId,
      displayName: record.student.displayName,
      status: record.status
    })),
    summary
  });
}
