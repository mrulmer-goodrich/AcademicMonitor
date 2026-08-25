import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { startOfDay } from "date-fns";
import { currentSchoolYearLabel } from "@/lib/schoolYear";

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
