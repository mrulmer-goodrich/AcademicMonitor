import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").toLowerCase();
  const password = String(form.get("password") || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid", req.url));
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid", req.url));
  }

  setSessionCookie({
    id: user.id,
    email: user.email,
    teacherName: user.teacherName,
    displayName: user.displayName
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
