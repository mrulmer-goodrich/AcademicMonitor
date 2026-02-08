import { NextResponse } from "next/server";
import { nc7MathStandards } from "@/lib/standards";

export async function GET() {
  return NextResponse.json({ standards: nc7MathStandards });
}
