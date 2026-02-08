"use client";

import { useState } from "react";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      school: form.get("school"),
      message: form.get("message")
    };
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setStatus(res.ok ? "sent" : "error");
    if (res.ok) event.currentTarget.reset();
  }

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
      <form className="hero-card p-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium">Your name</label>
          <input className="form-control" name="name" placeholder="Mr. Ulmer-Goodrich" required />
        </div>
        <div>
          <label className="text-sm font-medium">School or district</label>
          <input className="form-control" name="school" placeholder="Eastway Middle" required />
        </div>
        <div>
          <label className="text-sm font-medium">Message</label>
          <textarea
            className="form-control"
            name="message"
            rows={5}
            placeholder="Tell us your goals, timeline, and number of teachers."
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending..." : "Send"}
        </button>
        {status === "sent" && <div className="text-sm text-emerald-700">Message sent. We’ll be in touch.</div>}
        {status === "error" && (
          <div className="text-sm text-red-700">Message failed. Please try again or email us directly.</div>
        )}
      </form>
    </div>
  );
}
