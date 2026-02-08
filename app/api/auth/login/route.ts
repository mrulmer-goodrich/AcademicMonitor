import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.redirect(new URL("/dashboard?error=env", req.url));
    }
    const form = await req.formData();
    const email = String(form.get("email") || "").toLowerCase();
    const password = String(form.get("password") || "");

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user && email === "demo@academicmonitor.test") {
      const { hashPassword } = await import("@/lib/password");
      const passwordHash = await hashPassword("demo1234");
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          teacherName: "Mr. Ulmer-Goodrich",
          displayName: "Mr. UG",
          schoolYears: {
            create: {
              label: "2025-2026",
              active: true
            }
          }
        }
      });
    }

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
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.redirect(new URL("/dashboard?error=login_db", req.url));
  }
}
