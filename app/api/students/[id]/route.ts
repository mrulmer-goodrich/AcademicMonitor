import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  const fields = [
    "displayName",
    "active",
    "blockId",
    "ml",
    "mlNew",
    "iep504",
    "ec",
    "ca",
    "hiit",
    "eog"
  ];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const student = await prisma.student.update({
    where: { id: params.id },
    data
  });
  return NextResponse.json({ student });
}
