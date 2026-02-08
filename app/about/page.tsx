export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-6">
      <div>
        <div className="small-header text-black/60">About</div>
        <h1 className="section-title">Academic Monitoring, simplified.</h1>
      </div>
      <p className="text-base text-black/70">
        Academic Monitoring compresses observation, feedback, and reporting into a single tap-driven workflow. Teachers
        can see more in the moment and plan interventions sooner. This page is reserved for research-backed benefits
        and citations. We will add them after the first working build.
      </p>
      <div className="hero-card p-6">
        <h2 className="text-lg font-semibold">Why this matters</h2>
        <ul className="mt-3 list-disc pl-5 text-black/70">
          <li>Quick capture of lap-level performance without leaving the room flow.</li>
          <li>Consistent data collection that makes small interventions visible.</li>
          <li>Reports that match how teachers already think about blocks and seats.</li>
        </ul>
      </div>
    </div>
  );
}
