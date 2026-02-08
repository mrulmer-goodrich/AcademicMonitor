import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export default function DashboardPage({ searchParams }: { searchParams?: { error?: string } }) {
  const user = getSessionUser();
  const isAuthed = Boolean(user);
  const error = searchParams?.error || null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="small-header text-black/60">Dashboard</div>
          <h1 className="section-title">{isAuthed ? `Welcome back, ${user?.displayName}` : "Welcome"}</h1>
        </div>
        <div className="flex gap-3">
          {isAuthed && (
            <form action="/api/auth/logout" method="post">
              <button className="btn btn-ghost" type="submit">Log out</button>
            </form>
          )}
        </div>
      </div>

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
            </div>
          )}
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
