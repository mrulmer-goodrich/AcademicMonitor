import { NextResponse } from "next/server";
import { normalizeGradeLevels, standardsForGrade } from "@/lib/standards";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const gradeLevels = normalizeGradeLevels((searchParams.get("grades") || searchParams.get("grade") || "").split(","));
  if (gradeLevels.length === 0) {
    return NextResponse.json({ error: "invalid_grade" }, { status: 400 });
  }
  return NextResponse.json({
    gradeLevels,
    standards: gradeLevels.flatMap((gradeLevel) => standardsForGrade(gradeLevel))
  });
}
