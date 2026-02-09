import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const teacherName = String(body.teacherName || "").trim();
  const displayName = String(body.displayName || "").trim();
  if (!teacherName || !displayName) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { teacherName, displayName }
  });
  return NextResponse.json({ user: { teacherName: updated.teacherName, displayName: updated.displayName } });
}
