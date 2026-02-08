export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-6">
      <div>
        <div className="small-header text-black/60">About</div>
        <h1 className="section-title">Academic Monitoring, simplified.</h1>
      </div>
      <p className="text-base text-black/70">
        Academic monitoring is the practice of observing student learning in real time, collecting brief evidence, and
        using that evidence to adjust instruction. Research in formative assessment shows that frequent, low‑friction
        feedback improves student outcomes when teachers can respond quickly and intentionally. This tool compresses
        observation, data capture, and reporting into a single tap‑driven workflow so teachers can act in the moment.
      </p>
      <div className="hero-card p-6 space-y-4">
        <div>
          <div className="text-lg font-semibold">Why it matters</div>
          <p className="text-sm text-black/70">
            In classrooms, small signals get lost. When teachers can capture quick performance indicators during laps,
            they surface patterns that otherwise disappear. This supports targeted re‑teaching, regrouping, and timely
            feedback without adding extra paperwork.
          </p>
        </div>
        <div>
          <div className="text-lg font-semibold">Instructional impact</div>
          <ul className="mt-2 list-disc pl-5 text-black/70">
            <li>Improves the speed of instructional adjustments.</li>
            <li>Creates consistent data for weekly planning.</li>
            <li>Builds a habit of evidence‑based decision‑making.</li>
          </ul>
        </div>
        <div>
          <div className="text-lg font-semibold">Teacher efficiency</div>
          <p className="text-sm text-black/70">
            The system reduces the time between observation and action. Tap‑to‑cycle performance removes the need for
            manual logs, while exports support meetings, parent communication, and MTSS documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
