import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, requireUser } from "@/lib/server";
import { parseISO } from "date-fns";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get("blockId") || undefined;
  const weekStartParam = searchParams.get("weekStart");
  if (!blockId || !weekStartParam) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const weekStart = parseISO(weekStartParam);

  const laps = await prisma.lapDefinition.findMany({
    where: {
      schoolYearId: schoolYear.id,
      blockId,
      weekStart
    },
    orderBy: [{ dayIndex: "asc" }, { lapNumber: "asc" }]
  });

  return NextResponse.json({ laps });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const body = await req.json();
  const blockId = String(body.blockId || "");
  const weekStart = parseISO(String(body.weekStart || ""));

  if (Array.isArray(body.entries)) {
    const entries = body.entries
      .map(
        (entry: {
          dayIndex?: number;
          lapNumber?: number;
          name?: string;
          standardCode?: string | null;
          delete?: boolean;
        }) => {
          const dayIndex = Number(entry.dayIndex);
          const lapNumber = Number(entry.lapNumber);
          const name = String(entry.name || "").trim();
          if (Number.isNaN(dayIndex) || Number.isNaN(lapNumber)) return null;
          return {
            dayIndex,
            lapNumber,
            name,
            standardCode: entry.standardCode ? String(entry.standardCode) : null,
            delete: Boolean(entry.delete) || !name
          };
        }
      )
      .filter(Boolean) as {
      dayIndex: number;
      lapNumber: number;
      name: string;
      standardCode: string | null;
      delete: boolean;
    }[];

    if (!blockId || Number.isNaN(weekStart.getTime()) || !entries.length) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    await prisma.$transaction(
      entries.map((entry) =>
        entry.delete
          ? prisma.lapDefinition.deleteMany({
              where: {
                schoolYearId: schoolYear.id,
                blockId,
                weekStart,
                dayIndex: entry.dayIndex,
                lapNumber: entry.lapNumber
              }
            })
          : prisma.lapDefinition.upsert({
              where: {
                blockId_weekStart_dayIndex_lapNumber: {
                  blockId,
                  weekStart,
                  dayIndex: entry.dayIndex,
                  lapNumber: entry.lapNumber
                }
              },
              update: { name: entry.name, standardCode: entry.standardCode },
              create: {
                schoolYearId: schoolYear.id,
                blockId,
                weekStart,
                dayIndex: entry.dayIndex,
                lapNumber: entry.lapNumber,
                name: entry.name,
                standardCode: entry.standardCode
              }
            })
      )
    );

    return NextResponse.json({ ok: true });
  }

  const dayIndex = Number(body.dayIndex);
  const lapNumber = Number(body.lapNumber);
  const name = String(body.name || "").trim();
  const standardCode = body.standardCode ? String(body.standardCode) : null;

  if (!blockId || !name || Number.isNaN(dayIndex) || Number.isNaN(lapNumber)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const lap = await prisma.lapDefinition.upsert({
    where: {
      blockId_weekStart_dayIndex_lapNumber: {
        blockId,
        weekStart,
        dayIndex,
        lapNumber
      }
    },
    update: { name, standardCode },
    create: {
      schoolYearId: schoolYear.id,
      blockId,
      weekStart,
      dayIndex,
      lapNumber,
      name,
      standardCode
    }
  });

  return NextResponse.json({ lap });
}
