import Link from "next/link";

export default function SetupHomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-6">
      <div>
        <div className="small-header text-black/60">Setup</div>
        <h1 className="section-title">Choose a setup task</h1>
      </div>
      <div className="hero-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/setup/blocks" className="feature-card">
            <div className="text-lg font-semibold">Blocks</div>
            <p className="text-sm text-black/70">Create, edit, archive blocks.</p>
          </Link>
          <Link href="/setup/students" className="feature-card">
            <div className="text-lg font-semibold">Students</div>
            <p className="text-sm text-black/70">Add, edit, import, or inactivate students.</p>
          </Link>
          <Link href="/setup/seating" className="feature-card">
            <div className="text-lg font-semibold">Seating Chart</div>
            <p className="text-sm text-black/70">Arrange desks and snap groups.</p>
          </Link>
          <Link href="/setup/laps" className="feature-card">
            <div className="text-lg font-semibold">Laps</div>
            <p className="text-sm text-black/70">Define weekly laps and standards.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
