import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from "@/lib/classroomGeometry";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const ownedDesk = await prisma.desk.findFirst({
    where: { id: params.id, schoolYear: { userId: user.id } },
    select: { id: true, width: true, height: true }
  });
  if (!ownedDesk) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  const fields = ["x", "y", "width", "height", "rotation", "groupId", "studentId", "seatNumber"];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (data.x !== undefined) data.x = Math.min(Math.max(0, Number(data.x)), CLASSROOM_WIDTH - ownedDesk.width);
  if (data.y !== undefined) data.y = Math.min(Math.max(0, Number(data.y)), CLASSROOM_HEIGHT - ownedDesk.height);
  const desk = await prisma.desk.update({
    where: { id: ownedDesk.id },
    data,
    include: { student: true }
  });
  return NextResponse.json({ desk });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ownedDesk = await prisma.desk.findFirst({
    where: { id: params.id, schoolYear: { userId: user.id } },
    select: { id: true }
  });
  if (!ownedDesk) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.desk.delete({ where: { id: ownedDesk.id } });
  return NextResponse.json({ ok: true });
}
