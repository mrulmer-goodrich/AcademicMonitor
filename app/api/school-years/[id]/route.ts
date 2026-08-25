import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";
import { normalizeSchoolYearLabel } from "@/lib/schoolYear";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const label = normalizeSchoolYearLabel(String(body.label || ""));
  if (!label) return NextResponse.json({ error: "invalid_school_year" }, { status: 400 });

  const ownedYear = await prisma.schoolYear.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true }
  });
  if (!ownedYear) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const otherYears = await prisma.schoolYear.findMany({
    where: { userId: user.id, id: { not: ownedYear.id } },
    select: { label: true }
  });
  if (otherYears.some((year) => normalizeSchoolYearLabel(year.label) === label)) {
    return NextResponse.json({ error: "school_year_exists" }, { status: 409 });
  }

  try {
    const schoolYear = await prisma.schoolYear.update({ where: { id: ownedYear.id }, data: { label } });
    return NextResponse.json({ schoolYear });
  } catch {
    return NextResponse.json({ error: "school_year_exists" }, { status: 409 });
  }
}
