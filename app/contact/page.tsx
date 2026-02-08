export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-6">
      <div>
        <div className="small-header text-black/60">Contact</div>
        <h1 className="section-title">Let’s talk about your school.</h1>
      </div>
      <p className="text-base text-black/70">
        We work with school and district leaders who want clearer, faster classroom data. If you are evaluating Academic
        Monitor for your school, send a quick note and we will follow up with a tailored walkthrough.
      </p>
      <form className="hero-card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Your name</label>
          <input className="form-control" placeholder="Mr. Ulmer-Goodrich" />
        </div>
        <div>
          <label className="text-sm font-medium">School or district</label>
          <input className="form-control" placeholder="Eastway Middle" />
        </div>
        <div>
          <label className="text-sm font-medium">Message</label>
          <textarea className="form-control" rows={5} placeholder="Tell us your goals, timeline, and number of teachers." />
        </div>
        <button className="btn btn-primary" type="button">Send</button>
      </form>
    </div>
  );
}
