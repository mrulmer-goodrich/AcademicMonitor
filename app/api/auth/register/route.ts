import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.redirect(new URL("/dashboard?error=env", req.url));
    }
    const form = await req.formData();
    const email = String(form.get("email") || "").toLowerCase();
    const password = String(form.get("password") || "");
    const teacherName = String(form.get("teacherName") || "");
    const displayName = String(form.get("displayName") || "");

    if (!email || !password || !teacherName || !displayName) {
      return NextResponse.redirect(new URL("/dashboard?error=missing", req.url));
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.redirect(new URL("/dashboard?error=exists", req.url));
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashed,
        teacherName,
        displayName,
        schoolYears: {
          create: {
            label: "2025-2026",
            active: true
          }
        }
      }
    });

    setSessionCookie({
      id: user.id,
      email: user.email,
      teacherName: user.teacherName,
      displayName: user.displayName
    });

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.redirect(new URL("/dashboard?error=register_db", req.url));
  }
}
