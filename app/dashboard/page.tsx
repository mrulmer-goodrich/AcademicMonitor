import Link from "next/link";
import { addDays, startOfWeek } from "date-fns";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, normalizeDate } from "@/lib/server";

type SearchParams = {
  error?: string;
};

type DashboardBlock = {
  id: string;
  title: string;
  subtitle: string;
  attendanceStatus: "Click here to complete" | "Incomplete" | "Complete";
  lapsStatus: "Incomplete" | "Complete";
  monitoringStatus: "Incomplete" | "Complete";
  attendanceHref: string;
  lapsHref: string;
  monitoringHref: string;
};

type WeeklyStats = {
  id: string;
  title: string;
  total: number;
  green: number;
  yellow: number;
  red: number;
};

function percentage(count: number, total: number) {
  if (!total) return 0;
  return (count / total) * 100;
}

function statusPillClasses(status: string) {
  if (status === "Complete") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status === "Click here to complete") {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  return "bg-orange-50 text-orange-800 border-orange-200";
}

function tileCardClasses(status: string) {
  if (status === "Complete") {
    return "border-emerald-200 bg-gradient-to-br from-white to-emerald-50";
  }
  if (status === "Click here to complete") {
    return "border-amber-200 bg-gradient-to-br from-white to-amber-50";
  }
  return "border-orange-200 bg-gradient-to-br from-white to-orange-50";
}

function DashboardTile({
  title,
  status,
  href
}: {
  title: string;
  status: string;
  href: string;
}) {
  return (
    <Link href={href} className={`feature-card min-h-[96px] gap-2 border px-4 py-3 ${tileCardClasses(status)}`}>
      <div className="small-header text-[10px] tracking-[0.08em] text-black/55">{title}</div>
      <div className="min-h-[2.6em] text-[clamp(1rem,1.15vw,1.45rem)] font-semibold leading-tight text-black">
        {status}
      </div>
      <div
        className={`mt-auto inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusPillClasses(
          status
        )}`}
      >
        Open
      </div>
    </Link>
  );
}

function DashboardQuickAction({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-0 items-center justify-center rounded-full border border-black/15 bg-white/85 px-3 py-2 text-center text-[11px] font-semibold leading-none text-black/80 shadow-sm transition hover:-translate-y-px hover:bg-white"
    >
      <div>{label}</div>
    </Link>
  );
}

function WeeklyStatsCard({ stats }: { stats: WeeklyStats }) {
  const greenPercent = percentage(stats.green, stats.total);
  const yellowPercent = percentage(stats.yellow, stats.total);
  const redStart = greenPercent + yellowPercent;
  const donutBackground = stats.total
    ? `conic-gradient(#34d399 0% ${greenPercent}%, #facc15 ${greenPercent}% ${redStart}%, #f87171 ${redStart}% 100%)`
    : "conic-gradient(#e5e7eb 0% 100%)";

  return (
    <div className="rounded-[18px] border border-black/10 bg-white/80 p-3">
      <div className="text-center text-sm font-semibold">{stats.title}</div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <div className="relative h-16 w-16 shrink-0 rounded-full" style={{ background: donutBackground }}>
          <div className="absolute inset-[12px] flex items-center justify-center rounded-full bg-white text-xs font-semibold">
            {stats.total}
          </div>
        </div>
        <div className="space-y-1 text-xs text-black/65">
          <div>Green: {stats.green}</div>
          <div>Yellow: {stats.yellow}</div>
          <div>Red: {stats.red}</div>
        </div>
      </div>
      <div className="mt-3 text-center text-xs font-semibold text-black/75">
        {stats.total} data point{stats.total === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function DashboardReportsButton({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="feature-card min-h-[150px] items-center justify-center border border-black/10 px-4 py-5 text-center"
    >
      <div className="small-header text-black/50">Reports</div>
      <div className="text-lg font-semibold leading-tight">{label}</div>
    </Link>
  );
}

function desktopGridCols(count: number) {
  const clamped = Math.max(1, Math.min(count, 6));
  switch (clamped) {
    case 1:
      return "xl:grid-cols-1";
    case 2:
      return "xl:grid-cols-2";
    case 3:
      return "xl:grid-cols-3";
    case 4:
      return "xl:grid-cols-4";
    case 5:
      return "xl:grid-cols-5";
    default:
      return "xl:grid-cols-6";
  }
}

export default async function DashboardPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = getSessionUser();
  const isAuthed = Boolean(user);
  const error = searchParams?.error || null;
  const today = normalizeDate(new Date());
  const todayIso = today.toISOString().slice(0, 10);

  let dashboardBlocks: DashboardBlock[] = [];
  let weeklyStats: WeeklyStats[] = [];

  if (user) {
    const schoolYear = await getActiveSchoolYear(user.id);
    const blocks = await prisma.block.findMany({
      where: { schoolYearId: schoolYear.id, archived: false },
      orderBy: { blockNumber: "asc" }
    });
    const blockIds = blocks.map((block) => block.id);
    const todayDayIndex = (today.getDay() + 6) % 7;
    const isWeekday = todayDayIndex >= 0 && todayDayIndex <= 4;
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = normalizeDate(addDays(weekStart, 6));

    if (blockIds.length > 0) {
      const [activeStudents, todayAttendance, todayLaps, todayPerformance, weeklyPerformance] = await Promise.all([
        prisma.student.findMany({
          where: {
            schoolYearId: schoolYear.id,
            blockId: { in: blockIds },
            active: true
          },
          select: { blockId: true }
        }),
        prisma.attendanceRecord.findMany({
          where: {
            schoolYearId: schoolYear.id,
            blockId: { in: blockIds },
            date: today
          },
          select: { studentId: true, blockId: true }
        }),
        isWeekday
          ? prisma.lapDefinition.findMany({
              where: {
                schoolYearId: schoolYear.id,
                blockId: { in: blockIds },
                weekStart,
                dayIndex: todayDayIndex
              },
              select: { blockId: true, lapNumber: true }
            })
          : Promise.resolve([]),
        isWeekday
          ? prisma.lapPerformance.findMany({
              where: {
                schoolYearId: schoolYear.id,
                blockId: { in: blockIds },
                date: today
              },
              select: { blockId: true, lapNumber: true }
            })
          : Promise.resolve([]),
        prisma.lapPerformance.findMany({
          where: {
            schoolYearId: schoolYear.id,
            blockId: { in: blockIds },
            date: {
              gte: normalizeDate(weekStart),
              lte: weekEnd
            }
          },
          select: { blockId: true, color: true }
        })
      ]);

      const activeStudentCounts = new Map<string, number>();
      activeStudents.forEach((student) => {
        activeStudentCounts.set(student.blockId, (activeStudentCounts.get(student.blockId) || 0) + 1);
      });

      const attendanceCounts = new Map<string, number>();
      todayAttendance.forEach((record) => {
        attendanceCounts.set(record.blockId, (attendanceCounts.get(record.blockId) || 0) + 1);
      });

      const lapCoverage = new Map<string, Set<number>>();
      todayLaps.forEach((lap) => {
        const set = lapCoverage.get(lap.blockId) || new Set<number>();
        set.add(lap.lapNumber);
        lapCoverage.set(lap.blockId, set);
      });

      const monitoringCoverage = new Map<string, Set<number>>();
      todayPerformance.forEach((record) => {
        const set = monitoringCoverage.get(record.blockId) || new Set<number>();
        set.add(record.lapNumber);
        monitoringCoverage.set(record.blockId, set);
      });

      const weeklyCounts = new Map<string, { green: number; yellow: number; red: number }>();
      weeklyPerformance.forEach((record) => {
        const current = weeklyCounts.get(record.blockId) || { green: 0, yellow: 0, red: 0 };
        if (record.color === "GREEN") current.green += 1;
        if (record.color === "YELLOW") current.yellow += 1;
        if (record.color === "RED") current.red += 1;
        weeklyCounts.set(record.blockId, current);
      });

      dashboardBlocks = blocks.map((block) => {
        const attendanceCount = attendanceCounts.get(block.id) || 0;
        const activeCount = activeStudentCounts.get(block.id) || 0;
        const todaysLaps = lapCoverage.get(block.id) || new Set<number>();
        const monitoringLaps = monitoringCoverage.get(block.id) || new Set<number>();
        const attendanceStatus: DashboardBlock["attendanceStatus"] =
          activeCount > 0 && attendanceCount >= activeCount
            ? "Complete"
            : attendanceCount === 0
            ? "Click here to complete"
            : "Incomplete";
        const lapsStatus: DashboardBlock["lapsStatus"] = todaysLaps.size === 3 ? "Complete" : "Incomplete";
        const monitoringStatus: DashboardBlock["monitoringStatus"] =
          todaysLaps.size === 3 && Array.from(todaysLaps).every((lapNumber) => monitoringLaps.has(lapNumber))
            ? "Complete"
            : "Incomplete";

        return {
          id: block.id,
          title: `Block ${block.blockNumber}`,
          subtitle: block.blockName,
          attendanceStatus,
          lapsStatus,
          monitoringStatus,
          attendanceHref: `/monitor?blockId=${block.id}&mode=attendance`,
          lapsHref: `/setup/laps?blockId=${block.id}&focusDate=${todayIso}`,
          monitoringHref: `/monitor?blockId=${block.id}&mode=performance`
        };
      });

      weeklyStats = blocks.map((block) => {
        const counts = weeklyCounts.get(block.id) || { green: 0, yellow: 0, red: 0 };
        return {
          id: block.id,
          title: `Block ${block.blockNumber}`,
          total: counts.green + counts.yellow + counts.red,
          green: counts.green,
          yellow: counts.yellow,
          red: counts.red
        };
      });
    }
  }

  return (
    <div className="mx-auto flex max-w-[1380px] flex-col gap-3 px-4 py-3 lg:min-h-[calc(100vh-var(--topbar-height)-12px)]">
      {!isAuthed && (
        <div id="login" className="hero-card p-6">
          <h2 className="text-lg font-semibold">Login or create your teacher account</h2>
          <p className="text-sm text-black/60">Passwords are stored securely. Email reset is stubbed for now.</p>
          {error && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error === "missing" && "Please fill out all required fields."}
              {error === "exists" && "An account with that email already exists."}
              {error === "invalid" && "Invalid email or password."}
              {error === "register" && "Registration failed. Please try again."}
              {error === "login" && "Login failed. Please try again."}
              {error === "env" && "Server is missing DATABASE_URL. Set it in Vercel environment variables."}
              {error === "register_db" && "Registration failed due to a server/database error."}
              {error === "login_db" && "Login failed due to a server/database error."}
            </div>
          )}
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <form action="/api/auth/login" method="post" className="space-y-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input className="form-control" name="email" type="email" required />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <input className="form-control" name="password" type="password" required />
              </div>
              <button className="btn btn-primary" type="submit">
                Login
              </button>
            </form>

            <form action="/api/auth/register" method="post" className="space-y-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input className="form-control" name="email" type="email" required />
              </div>
              <div>
                <label className="text-sm font-medium">Teacher Name</label>
                <input className="form-control" name="teacherName" placeholder="Mr. Ulmer-Goodrich" required />
              </div>
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <input className="form-control" name="displayName" placeholder="Mr. UG" required />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <input className="form-control" name="password" type="password" required />
              </div>
              <button className="btn btn-ghost" type="submit">
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {isAuthed && (
        <>
          <div className="hero-card flex flex-1 flex-col gap-3 overflow-hidden p-4 lg:p-5">
            <div className="flex flex-col gap-3 border-b border-black/10 pb-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="small-header text-black/55">Overview</div>
                <h1 className="section-title mb-0 text-[clamp(2rem,2.3vw,2.7rem)]">Today&apos;s Dashboard</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DashboardQuickAction href="/setup/seating" label="Seating Chart" />
                <DashboardQuickAction href="/setup/laps" label="Name Your Laps" />
                <DashboardQuickAction href="/setup/blocks" label="update BLOCKS" />
                <DashboardQuickAction href="/setup/students" label="update STUDENTS" />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {dashboardBlocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-4 py-10 text-center text-sm text-black/60">
                  Create your blocks and students to start today&apos;s dashboard.
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_170px] xl:grid-rows-[minmax(0,1fr)_auto]">
                  <div className={`grid content-start gap-3 md:grid-cols-2 ${desktopGridCols(dashboardBlocks.length)}`}>
                    {dashboardBlocks.map((block) => (
                      <div key={block.id} className="min-w-0 rounded-[22px] border border-black/10 bg-white/72 p-3 lg:p-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold lg:text-xl">{block.title}</div>
                          <div className="truncate text-sm text-black/60">{block.subtitle}</div>
                        </div>
                        <div className="mt-3 grid gap-2.5">
                          <DashboardTile title="Attendance" status={block.attendanceStatus} href={block.attendanceHref} />
                          <DashboardTile title="LAP Status" status={block.lapsStatus} href={block.lapsHref} />
                          <DashboardTile
                            title="Monitoring Status"
                            status={block.monitoringStatus}
                            href={block.monitoringHref}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden xl:block" />

                  <div className="border-t border-black/10 pt-3">
                    <div className="small-header text-center text-black/60">Current Week · Monday to Sunday</div>
                    <div className={`mt-3 grid gap-3 md:grid-cols-2 ${desktopGridCols(weeklyStats.length || 1)}`}>
                      {dashboardBlocks.map((block) => (
                        <WeeklyStatsCard key={block.id} stats={weeklyStats.find((stats) => stats.id === block.id) || {
                          id: block.id,
                          title: block.title,
                          total: 0,
                          green: 0,
                          yellow: 0,
                          red: 0
                        }} />
                      ))}
                    </div>
                  </div>

                  <div className="xl:self-end">
                    <DashboardReportsButton href="/report" label="other REPORTS" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
