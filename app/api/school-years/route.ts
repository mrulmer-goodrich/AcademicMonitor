import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";
import { normalizeSchoolYearLabel } from "@/lib/schoolYear";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const schoolYears = await prisma.schoolYear.findMany({
    where: { userId: user.id },
    include: { blocks: { orderBy: { blockNumber: "asc" } } },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ schoolYears });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const label = normalizeSchoolYearLabel(String(body.label || ""));
  if (!label) return NextResponse.json({ error: "invalid_school_year" }, { status: 400 });

  const existingYears = await prisma.schoolYear.findMany({
    where: { userId: user.id },
    select: { label: true }
  });
  if (existingYears.some((year) => normalizeSchoolYearLabel(year.label) === label)) {
    return NextResponse.json({ error: "school_year_exists" }, { status: 409 });
  }

  const schoolYear = await prisma.$transaction(async (tx) => {
    await tx.schoolYear.updateMany({
      where: { userId: user.id, active: true },
      data: { active: false, archived: true }
    });
    return tx.schoolYear.create({ data: { userId: user.id, label, active: true, archived: false } });
  });

  return NextResponse.json({ schoolYear });
}
