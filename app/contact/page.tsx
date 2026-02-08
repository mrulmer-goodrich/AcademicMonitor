export default function ContactPage() {
  const contactEmail = "mug4631@gmail.com";
  const subject = encodeURIComponent("Academic Monitoring inquiry");
  const body = encodeURIComponent("Name:\nSchool/District:\n\nMessage:");
  const mailtoHref = `mailto:${contactEmail}?subject=${subject}&body=${body}`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-4">
      <div>
        <div className="small-header text-black/60">Contact</div>
        <h1 className="section-title">Let’s talk about your school.</h1>
      </div>
      <p className="text-base text-black/70 -mt-1">
        We work with school and district leaders who want clearer, faster classroom data. If you are evaluating Academic
        Monitor for your school, send a quick note and we will follow up with a tailored walkthrough.
      </p>
      <div className="hero-card p-6 space-y-4">
        <div className="text-sm text-black/70">
          Click the button below to send us an email. Your mail app will open with a pre-filled message.
        </div>
        <a className="btn btn-primary w-fit" href={mailtoHref}>
          Email us
        </a>
        <div className="text-xs text-black/60">Email goes to: {contactEmail}</div>
      </div>
    </div>
  );
}
