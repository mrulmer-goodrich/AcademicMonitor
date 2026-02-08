import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, requireUser } from "@/lib/server";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const schoolYear = await getActiveSchoolYear(user.id);
  const blocks = await prisma.block.findMany({
    where: { schoolYearId: schoolYear.id },
    orderBy: { blockNumber: "asc" }
  });
  return NextResponse.json({ blocks, schoolYear });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const blockNumber = Number(body.blockNumber);
  const blockName = String(body.blockName || "").trim();
  if (!blockNumber || !blockName) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const schoolYear = await getActiveSchoolYear(user.id);
  const block = await prisma.block.create({
    data: {
      schoolYearId: schoolYear.id,
      blockNumber,
      blockName
    }
  });
  return NextResponse.json({ block });
}
