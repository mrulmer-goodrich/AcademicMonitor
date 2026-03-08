import Link from "next/link";
import { addDays, startOfWeek } from "date-fns";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolYear, normalizeDate } from "@/lib/server";

type SearchParams = {
  error?: string;
};

type DashboardStatusTone = "complete" | "attention" | "notStarted";
type DashboardTileKind = "attendance" | "laps" | "monitoring";

type DashboardTileData = {
  tone: DashboardStatusTone;
  status: string;
  detail: string;
  href: string;
};

type DashboardBlock = {
  id: string;
  title: string;
  subtitle: string;
  attendance: DashboardTileData;
  laps: DashboardTileData;
  monitoring: DashboardTileData;
};

type WeeklyStats = {
  id: string;
  title: string;
  total: number;
  green: number;
  yellow: number;
  red: number;
  href: string;
};

function percentage(count: number, total: number) {
  if (!total) return 0;
  return (count / total) * 100;
}

function tileAccentClasses(tone: DashboardStatusTone) {
  if (tone === "complete") {
    return "border-emerald-200 bg-[linear-gradient(145deg,#ffffff_0%,#eefbf3_55%,#ddf3e6_100%)]";
  }
  if (tone === "attention") {
    return "border-amber-200 bg-[linear-gradient(145deg,#ffffff_0%,#fff7e6_55%,#ffe8bc_100%)]";
  }
  return "border-red-200 bg-[linear-gradient(145deg,#ffffff_0%,#fff0ee_55%,#ffd8d2_100%)]";
}

function toneIconClasses(tone: DashboardStatusTone) {
  if (tone === "complete") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "attention") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-red-200 bg-red-50 text-red-700";
}

function dashboardTileCopy(kind: DashboardTileKind, tile: DashboardTileData) {
  if (tile.tone === "complete") {
    if (kind === "attendance") return "ATTENDANCE COMPLETE";
    if (kind === "laps") return "LAP NAMES COMPLETE";
    return "MONITORING COMPLETE";
  }

  if (kind === "attendance") {
    return tile.tone === "attention" ? "FINISH ATTENDANCE" : "TAKE ATTENDANCE";
  }

  if (kind === "laps") {
    return tile.tone === "attention" ? "FINISH NAMING LAPS" : "NAME YOUR LAPS";
  }

  return tile.tone === "attention" ? "FINISH MONITORING" : "START MONITORING";
}

function DashboardTileIcon({ tone }: { tone: DashboardStatusTone }) {
  const iconClasses = toneIconClasses(tone);

  if (tone === "complete") {
    return (
      <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${iconClasses}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    );
  }

  if (tone === "attention") {
    return (
      <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${iconClasses}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 7.5v5.5" />
          <circle cx="12" cy="16.5" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${iconClasses}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M5.5 12h11" />
        <path d="M12.5 8.5 18 12l-5.5 3.5" />
      </svg>
    </span>
  );
}

function DashboardTile({
  kind,
  tile
}: {
  kind: DashboardTileKind;
  tile: DashboardTileData;
}) {
  const label = dashboardTileCopy(kind, tile);

  return (
    <Link
      href={tile.href}
      className={`flex min-h-[112px] items-center gap-4 rounded-[24px] border px-5 py-4 shadow-[0_10px_24px_rgba(11,27,42,0.08)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(11,27,42,0.12)] ${tileAccentClasses(tile.tone)}`}
    >
      <DashboardTileIcon tone={tile.tone} />
      <div className="text-[1.45rem] font-bold uppercase leading-[1.02] tracking-[-0.04em] text-black lg:text-[1.6rem]">
        {label}
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
      className="inline-flex min-h-0 items-center justify-center rounded-full border border-[#d9ccb4] bg-[rgba(255,250,243,0.92)] px-3.5 py-2 text-center text-[11px] font-semibold leading-none tracking-[0.04em] text-black/80 shadow-[0_8px_18px_rgba(11,27,42,0.07)] transition hover:-translate-y-px hover:bg-white"
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
    <Link href={stats.href} className="feature-card min-h-[84px] gap-1 border border-black/10 px-2 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="small-header text-[10px] tracking-[0.08em] text-black/55">Current Week</div>
          <div className="text-sm font-semibold">{stats.title}</div>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">View</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-11 w-11 shrink-0 rounded-full" style={{ background: donutBackground }}>
          <div className="absolute inset-[8px] flex items-center justify-center rounded-full bg-white text-[10px] font-semibold">
            {stats.total}
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1 text-center text-[10px] leading-tight text-black/65">
          <div>
            <div className="font-semibold text-emerald-700">{stats.green}</div>
            <div>Green</div>
          </div>
          <div>
            <div className="font-semibold text-amber-700">{stats.yellow}</div>
            <div>Yellow</div>
          </div>
          <div>
            <div className="font-semibold text-red-700">{stats.red}</div>
            <div>Red</div>
          </div>
        </div>
      </div>
      <div className="text-[10px] font-semibold text-black/75">
        {stats.total} data point{stats.total === 1 ? "" : "s"}
      </div>
    </Link>
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
      className="feature-card min-h-[92px] items-center justify-center border border-black/10 px-3 py-2 text-center"
    >
      <div className="small-header text-black/50">Reports</div>
      <div className="text-[15px] font-semibold leading-tight">{label}</div>
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
  const currentWeekStartIso = startOfWeek(today, { weekStartsOn: 1 }).toISOString().slice(0, 10);

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
        const namedLapCount = todaysLaps.size;
        const monitoredLapCount = Array.from(todaysLaps).filter((lapNumber) => monitoringLaps.has(lapNumber)).length;
        const attendanceHref = `/monitor?blockId=${block.id}&mode=attendance`;
        const lapsHref = `/setup/laps?blockId=${block.id}&focusDate=${todayIso}`;
        const monitoringHref = `/monitor?blockId=${block.id}&mode=performance`;

        const attendance =
          activeCount === 0
            ? {
                tone: "notStarted" as const,
                status: "No students",
                detail: "Add students to begin",
                href: attendanceHref
              }
            : attendanceCount >= activeCount
            ? {
                tone: "complete" as const,
                status: "Complete",
                detail: `${attendanceCount}/${activeCount} marked`,
                href: attendanceHref
              }
            : attendanceCount === 0
            ? {
                tone: "notStarted" as const,
                status: "Not started",
                detail: `${activeCount} students pending`,
                href: attendanceHref
              }
            : {
                tone: "attention" as const,
                status: "Needs attention",
                detail: `${attendanceCount}/${activeCount} marked`,
                href: attendanceHref
              };

        const laps =
          namedLapCount === 3
            ? {
                tone: "complete" as const,
                status: "Complete",
                detail: "3 of 3 laps named",
                href: lapsHref
              }
            : namedLapCount === 0
            ? {
                tone: "notStarted" as const,
                status: "Not started",
                detail: "0 of 3 laps named",
                href: lapsHref
              }
            : {
                tone: "attention" as const,
                status: "Needs attention",
                detail: `${namedLapCount} of 3 laps named`,
                href: lapsHref
              };

        const monitoring =
          namedLapCount === 0
            ? {
                tone: "notStarted" as const,
                status: "Waiting on LAPs",
                detail: "Name today's laps first",
                href: monitoringHref
              }
            : namedLapCount === 3 && monitoredLapCount === 3
            ? {
                tone: "complete" as const,
                status: "Complete",
                detail: "3 of 3 laps entered",
                href: monitoringHref
              }
            : monitoredLapCount === 0
            ? {
                tone: "notStarted" as const,
                status: "Not started",
                detail: `0 of ${namedLapCount} laps entered`,
                href: monitoringHref
              }
            : {
                tone: "attention" as const,
                status: "Needs attention",
                detail: `${monitoredLapCount} of ${namedLapCount} laps entered`,
                href: monitoringHref
              };

        return {
          id: block.id,
          title: `Block ${block.blockNumber}`,
          subtitle: block.blockName,
          attendance,
          laps,
          monitoring
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
          red: counts.red,
          href: `/report?blocks=${block.id}&weekStart=${currentWeekStartIso}&days=0,1,2,3,4,5,6&laps=1,2,3&viewMode=records&autoRun=1`
        };
      });
    }
  }

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-1 px-1.5 py-1 lg:min-h-[calc(100vh-var(--topbar-height)-6px)]">
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
          <div className="hero-card flex flex-1 flex-col gap-4 overflow-hidden border-[#ded2bf] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,242,232,0.92)_100%)] p-3 lg:p-4">
            <div className="flex flex-col gap-3 border-b border-black/10 pb-3 xl:flex-row xl:items-end xl:justify-between">
              <h1 className="section-title mb-0 text-[clamp(1.85rem,2vw,2.35rem)]">Today&apos;s Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2">
                <DashboardQuickAction href="/setup/seating" label="Seating Chart" />
                <DashboardQuickAction href="/setup/laps" label="Name Your Laps" />
                <DashboardQuickAction href="/setup/blocks" label="Update Blocks" />
                <DashboardQuickAction href="/setup/students" label="Update Students" />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {dashboardBlocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-4 py-10 text-center text-sm text-black/60">
                  Create your blocks and students to start today&apos;s dashboard.
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_148px] xl:grid-rows-[minmax(0,1fr)_auto]">
                  <div className={`grid content-start gap-3 md:grid-cols-2 ${desktopGridCols(dashboardBlocks.length)}`}>
                    {dashboardBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="min-w-0 rounded-[30px] border border-[#dbcdb7] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,241,232,0.94)_100%)] p-4 shadow-[0_14px_34px_rgba(11,27,42,0.08)]"
                      >
                        <div className="border-b border-black/[0.08] pb-3 text-center">
                          <div className="text-[27px] font-bold uppercase leading-none tracking-[-0.04em] text-black">
                            {block.title}
                          </div>
                          <div className="mt-1 truncate text-[27px] font-bold leading-none tracking-[-0.04em] text-black/72">
                            {block.subtitle}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3">
                          <DashboardTile kind="attendance" tile={block.attendance} />
                          <DashboardTile kind="laps" tile={block.laps} />
                          <DashboardTile kind="monitoring" tile={block.monitoring} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden xl:block" />

                  <div className="rounded-[28px] border border-black/[0.08] bg-white/[0.55] px-3 py-3">
                    <div className="small-header text-center text-black/60">Current Week · Monday to Sunday</div>
                    <div className={`mt-3 grid gap-3 md:grid-cols-2 ${desktopGridCols(weeklyStats.length || 1)}`}>
                      {weeklyStats.map((stats) => (
                        <WeeklyStatsCard key={stats.id} stats={stats} />
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
