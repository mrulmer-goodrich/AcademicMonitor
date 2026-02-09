import Link from "next/link";
import Footer from "@/components/Footer";
import { getSessionUser } from "@/lib/auth";

export default function HomePage() {
  const user = getSessionUser();
  const isAuthed = Boolean(user);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl flex-col gap-10 px-6 py-10">
      <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] hero-layout items-center">
        <div className="space-y-6">
          <span className="badge badge-hero">Academic Monitoring</span>
          <h1 className="text-4xl font-bold leading-tight" style={{ fontFamily: "Space Grotesk" }}>
            Track learning while it’s happening.
          </h1>
          <p className="text-lg text-black/70">
            Use current real data to influence instructional moves.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={isAuthed ? "/dashboard" : "/dashboard?login=1"} className="btn btn-hero">
              {isAuthed ? "Open today’s class" : "Login or Create Account"}
            </Link>
            <Link href="/about" className="btn btn-ghost">
              Why Academic Monitoring
            </Link>
          </div>
        </div>
        <div className="hero-card p-6">
          <div className="space-y-3">
            <div className="small-header text-black/60">Today at a glance</div>
            <div className="text-2xl font-semibold">Block 2 · Honors Math</div>
            <div className="flex gap-2">
              <span className="badge">Lap 1: RP.1</span>
              <span className="badge">Lap 2: RP.2</span>
              <span className="badge">Lap 3: RP.3</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`desk-${index}`}
                  className="rounded-xl border border-black/10 bg-white px-3 py-4 text-sm text-black/70 shadow"
                >
                  Desk {index + 1}
                  <div className="mt-2 h-2 w-full rounded-full bg-mint" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Launch Path</h2>
        </div>
        <div className="card-grid">
          {[
            {
              title: "Setup",
              body: "Create blocks, students, seating, and laps. One screen per task",
              href: "/setup"
            },
            {
              title: "Monitor",
              body: "Take attendance and tap seats to log lap performance",
              href: "/monitor"
            },
            {
              title: "Report",
              body: "Filter by laps, blocks, students, and download CSV/XLSX",
              href: "/report"
            }
          ].map((card) => (
            <div key={card.title} className="feature-card hover:shadow-lift transition-all">
              <div className="text-xl font-semibold">{card.title}</div>
              <p className="text-sm text-black/70">{card.body}</p>
              <Link
                href={isAuthed ? card.href : "/dashboard?login=1"}
                className="text-sm font-semibold text-ocean"
              >
                {isAuthed ? "Open" : "Login required"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
