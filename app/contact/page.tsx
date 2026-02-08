export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-6">
      <div>
        <div className="small-header text-black/60">Contact</div>
        <h1 className="section-title">Share success stories.</h1>
      </div>
      <p className="text-base text-black/70">
        We are collecting short success stories. AI review and auto-posting will be added later. For now, submit a note
        and we will curate manually.
      </p>
      <form className="hero-card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Your name</label>
          <input className="form-control" placeholder="Ms. Thompson" />
        </div>
        <div>
          <label className="text-sm font-medium">School or district</label>
          <input className="form-control" placeholder="Riverside Middle" />
        </div>
        <div>
          <label className="text-sm font-medium">Success story</label>
          <textarea className="form-control" rows={5} placeholder="What changed for your students?" />
        </div>
        <button className="btn btn-primary" type="button">Submit</button>
      </form>
    </div>
  );
}
