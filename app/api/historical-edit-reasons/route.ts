import { NextResponse } from "next/server";
import { parseISO } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, getSchoolDate, normalizeDate, requireUser } from "@/lib/server";

const validModes = new Set(["attendance", "performance"]);

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const schoolYear = await getActiveSchoolYear(user.id);
  const body = await req.json();
  const blockId = String(body.blockId || "");
  const dateValue = String(body.date || "");
  const mode = String(body.mode || "");
  const explanation = String(body.explanation || "").replace(/\s+/g, " ").trim();
  const date = normalizeDate(parseISO(dateValue));

  if (
    !blockId ||
    Number.isNaN(date.getTime()) ||
    date.getTime() >= getSchoolDate().getTime() ||
    !validModes.has(mode) ||
    explanation.length < 3 ||
    explanation.length > 500
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const block = await prisma.block.findFirst({
    where: { id: blockId, schoolYearId: schoolYear.id },
    select: { id: true }
  });
  if (!block) return NextResponse.json({ error: "block_not_found" }, { status: 404 });

  const reason = await prisma.historicalEditReason.create({
    data: {
      userId: user.id,
      schoolYearId: schoolYear.id,
      blockId,
      date,
      mode,
      explanation
    },
    select: { id: true }
  });

  return NextResponse.json({ id: reason.id });
}
