import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/auth";
import { getSessionCookieName } from "@/lib/auth";

export function setSessionCookie(user: SessionUser) {
  const token = Buffer.from(JSON.stringify(user)).toString("base64");
  cookies().set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function clearSessionCookie() {
  cookies().set(getSessionCookieName(), "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/"
  });
}
