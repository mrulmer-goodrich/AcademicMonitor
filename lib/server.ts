import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { parseISO, startOfDay } from "date-fns";
import { currentSchoolYearLabel } from "@/lib/schoolYear";

export const SCHOOL_TIME_ZONE = process.env.SCHOOL_TIME_ZONE || "America/New_York";

export async function requireUser() {
  const user = getSessionUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return null;
  return dbUser;
}

export async function getActiveSchoolYear(userId: string) {
  const year = await prisma.schoolYear.findFirst({
    where: { userId, active: true, archived: false },
    orderBy: { createdAt: "desc" }
  });
  if (year) return year;
  return prisma.schoolYear.create({
    data: {
      userId,
      label: currentSchoolYearLabel(),
      active: true
    }
  });
}

export function normalizeDate(date: Date) {
  return startOfDay(date);
}

export function getSchoolDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return normalizeDate(parseISO(`${values.year}-${values.month}-${values.day}`));
}
