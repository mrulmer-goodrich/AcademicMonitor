import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, normalizeDate, requireUser } from "@/lib/server";
import { addDays, parseISO, startOfWeek } from "date-fns";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const body = await req.json();
  const viewMode = String(body.viewMode || "class");

  const weekStart = body.weekStart
    ? startOfWeek(parseISO(body.weekStart), { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weeksRange = Math.min(Math.max(Number(body.weeksRange || 1), 1), 4);
  const days: number[] = Array.isArray(body.days) ? body.days : [0, 1, 2, 3, 4];
  const laps: number[] = Array.isArray(body.laps) ? body.laps : [1, 2, 3];
  const blockIds: string[] = Array.isArray(body.blocks) ? body.blocks : [];
  const studentIds: string[] = Array.isArray(body.students) ? body.students : [];
  const allowedCategories = new Set(["ml", "mlNew", "iep504", "ec", "ca", "hiit"]);
  const categories: string[] = Array.isArray(body.categories)
    ? body.categories.filter((cat: string) => allowedCategories.has(cat))
    : [];
  const categoriesMatchAll = Boolean(body.categoriesMatchAll);
  const standards: string[] = Array.isArray(body.standards) ? body.standards : [];

  if (blockIds.length === 0) {
    return NextResponse.json({ error: "no_blocks" }, { status: 400 });
  }

  const dateMap = Array.from({ length: weeksRange }).flatMap((_, weekOffset) => {
    const base = addDays(weekStart, weekOffset * 7);
    return days.map((day) => ({
      dayIndex: day,
      date: normalizeDate(addDays(base, day))
    }));
  });

  const lapDefinitions = await prisma.lapDefinition.findMany({
    where: {
      schoolYearId: schoolYear.id,
      blockId: { in: blockIds },
      weekStart: { in: Array.from({ length: weeksRange }).map((_, i) => addDays(weekStart, i * 7)) },
      dayIndex: { in: days },
      lapNumber: { in: laps }
    }
  });

  const lapDefMap = new Map(
    lapDefinitions.map((lap) => [`${lap.blockId}-${lap.dayIndex}-${lap.lapNumber}`, lap])
  );

  const columns = dateMap.flatMap((d) =>
    laps.map((lapNumber) => {
      const dateWeekStart = startOfWeek(d.date, { weekStartsOn: 1 });
      const sample = lapDefinitions.find(
        (lap) =>
          lap.dayIndex === d.dayIndex &&
          lap.lapNumber === lapNumber &&
          lap.weekStart.toISOString().slice(0, 10) === dateWeekStart.toISOString().slice(0, 10)
      );
      const standardSuffix = sample?.standardCode ? ` (${sample.standardCode})` : "";
      return {
        dayIndex: d.dayIndex,
        date: d.date,
        lapNumber,
        standardCode: sample?.standardCode || null,
        label: `${d.date.toISOString().slice(0, 10)} Lap ${lapNumber}${standardSuffix}`
      };
    })
  );

  const filteredColumns = standards.length
    ? columns.filter((col) => col.standardCode && standards.includes(col.standardCode))
    : columns;

  const students = await prisma.student.findMany({
    where: {
      schoolYearId: schoolYear.id,
      blockId: { in: blockIds },
      ...(studentIds.length ? { id: { in: studentIds } } : {}),
      ...(categories.length
        ? categoriesMatchAll
          ? {
              AND: categories.map((cat) => ({ [cat]: true }))
            }
          : {
              OR: categories.map((cat) => ({ [cat]: true }))
            }
        : {})
    },
    orderBy: [{ blockId: "asc" }, { seatNumber: "asc" }],
    include: { block: true }
  });

  if (viewMode === "student") {
    if (studentIds.length !== 1) {
      return NextResponse.json({ error: "select_one_student" }, { status: 400 });
    }
    const student = students.find((s) => s.id === studentIds[0]);
    if (!student) {
      return NextResponse.json({ error: "student_not_found" }, { status: 404 });
    }

    const performances = await prisma.lapPerformance.findMany({
      where: {
        schoolYearId: schoolYear.id,
        blockId: { in: blockIds },
        studentId: student.id,
        date: { in: dateMap.map((d) => d.date) },
        lapNumber: { in: laps }
      },
      orderBy: [{ date: "desc" }, { lapNumber: "asc" }]
    });

    const rows = performances.map((p) => ({
      student: student.displayName,
      date: p.date.toISOString().slice(0, 10),
      lap: String(p.lapNumber),
      color: p.color
    }));

    return NextResponse.json({
      columns: ["student", "date", "lap", "color"],
      rows,
      meta: { weekStart: weekStart.toISOString() }
    });
  }

  const studentIdSet = new Set(students.map((s) => s.id));

  const performances = await prisma.lapPerformance.findMany({
    where: {
      schoolYearId: schoolYear.id,
      blockId: { in: blockIds },
      studentId: { in: Array.from(studentIdSet) },
      date: { in: dateMap.map((d) => d.date) },
      lapNumber: { in: laps }
    }
  });

  const perfMap = new Map(performances.map((p) => [`${p.studentId}-${p.date.toISOString()}-${p.lapNumber}`, p.color]));

  const includeBlock = blockIds.length > 1;

  const rows = students.map((student) => {
    const row: Record<string, string> = {
      student: student.displayName,
      ...(includeBlock ? { block: `Block ${student.block.blockNumber} · ${student.block.blockName}` } : {})
    };

    filteredColumns.forEach((col) => {
      const key = `${student.id}-${col.date.toISOString()}-${col.lapNumber}`;
      row[col.label] = perfMap.get(key) || "";
    });

    return row;
  });

  return NextResponse.json({
    columns: ["student", ...(includeBlock ? ["block"] : []), ...filteredColumns.map((c) => c.label)],
    rows,
    meta: {
      weekStart: weekStart.toISOString(),
      columns: filteredColumns
    }
  });
}
