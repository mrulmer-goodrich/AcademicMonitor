import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  email: string;
  teacherName: string;
  displayName: string;
};

const SESSION_COOKIE = "am_session";

export function getSessionUser(): SessionUser | null {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (!decoded?.id) return null;
    return decoded as SessionUser;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
