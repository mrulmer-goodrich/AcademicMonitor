import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export default function DashboardPage() {
  const user = getSessionUser();
  const isAuthed = Boolean(user);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="small-header text-black/60">Dashboard</div>
          <h1 className="section-title">{isAuthed ? `Welcome back, ${user?.displayName}` : "Welcome"}</h1>
        </div>
        <div className="flex gap-3">
          {isAuthed ? (
            <form action="/api/auth/logout" method="post">
              <button className="btn btn-ghost" type="submit">Log out</button>
            </form>
          ) : (
            <Link href="#login" className="btn btn-primary">Login</Link>
          )}
        </div>
      </div>

      {!isAuthed && (
        <div id="login" className="hero-card p-6">
          <h2 className="text-lg font-semibold">Login or create your teacher account</h2>
          <p className="text-sm text-black/60">Passwords are stored securely. Email reset is stubbed for now.</p>
          <div className="grid gap-6 md:grid-cols-2 mt-4">
            <form action="/api/auth/login" method="post" className="space-y-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input className="form-control" name="email" type="email" required />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <input className="form-control" name="password" type="password" required />
              </div>
              <button className="btn btn-primary" type="submit">Login</button>
            </form>

            <form action="/api/auth/register" method="post" className="space-y-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input className="form-control" name="email" type="email" required />
              </div>
              <div>
                <label className="text-sm font-medium">Teacher Name</label>
                <input className="form-control" name="teacherName" placeholder="Ms. Thompson" required />
              </div>
              <div>
                <label className="text-sm font-medium">Display Name for UI</label>
                <input className="form-control" name="displayName" placeholder="Ms. T" required />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <input className="form-control" name="password" type="password" required />
              </div>
              <button className="btn btn-ghost" type="submit">Create Account</button>
            </form>
          </div>
        </div>
      )}

      {isAuthed && (
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/setup" className="feature-card">
            <div className="text-lg font-semibold">Setup</div>
            <p className="text-sm text-black/70">Blocks, students, seating, laps.</p>
          </Link>
          <Link href="/monitor" className="feature-card">
            <div className="text-lg font-semibold">Monitor</div>
            <p className="text-sm text-black/70">Take attendance and tap lap performance.</p>
          </Link>
          <Link href="/report" className="feature-card">
            <div className="text-lg font-semibold">Report</div>
            <p className="text-sm text-black/70">Filter and export CSV/XLSX.</p>
          </Link>
        </div>
      )}
    </div>
  );
}
