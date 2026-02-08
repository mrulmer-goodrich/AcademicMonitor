import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  const fields = ["x", "y", "width", "height", "rotation", "groupId", "studentId", "seatNumber"];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  const desk = await prisma.desk.update({
    where: { id: params.id },
    data,
    include: { student: true }
  });
  return NextResponse.json({ desk });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.desk.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
