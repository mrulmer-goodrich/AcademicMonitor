import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  if (!newPassword) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }
  if (currentPassword) {
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "invalid_password" }, { status: 400 });
    }
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });
  return NextResponse.json({ ok: true });
}
