import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";
import { normalizeSchoolYearLabel } from "@/lib/schoolYear";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const hasLabelUpdate = body.label !== undefined;
  const label = hasLabelUpdate ? normalizeSchoolYearLabel(String(body.label)) : null;
  const makeActive = body.active === true;
  if ((!hasLabelUpdate && !makeActive) || (hasLabelUpdate && !label)) {
    return NextResponse.json({ error: "invalid_school_year" }, { status: 400 });
  }

  const ownedYear = await prisma.schoolYear.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true }
  });
  if (!ownedYear) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (label) {
    const otherYears = await prisma.schoolYear.findMany({
      where: { userId: user.id, id: { not: ownedYear.id } },
      select: { label: true }
    });
    if (otherYears.some((year) => normalizeSchoolYearLabel(year.label) === label)) {
      return NextResponse.json({ error: "school_year_exists" }, { status: 409 });
    }
  }

  try {
    const schoolYear = makeActive
      ? await prisma.$transaction(async (tx) => {
          await tx.schoolYear.updateMany({
            where: { userId: user.id, id: { not: ownedYear.id }, active: true },
            data: { active: false, archived: true }
          });
          return tx.schoolYear.update({
            where: { id: ownedYear.id },
            data: { active: true, archived: false, ...(label ? { label } : {}) }
          });
        })
      : await prisma.schoolYear.update({ where: { id: ownedYear.id }, data: { label: label! } });
    return NextResponse.json({ schoolYear });
  } catch {
    return NextResponse.json({ error: "school_year_exists" }, { status: 409 });
  }
}
