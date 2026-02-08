import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const school = String(body.school || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !school || !message) {
      return NextResponse.json({ error: "missing" }, { status: 400 });
    }

    const contactEmail = process.env.CONTACT_EMAIL;
    const resendKey = process.env.RESEND_API_KEY;

    if (!contactEmail || !resendKey) {
      return NextResponse.json({ error: "email_not_configured" }, { status: 500 });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Academic Monitoring <no-reply@academicmonitoring.com>",
        to: [contactEmail],
        subject: `Academic Monitoring inquiry from ${name}`,
        text: `Name: ${name}\nSchool/District: ${school}\n\n${message}`
      })
    });

    if (!response.ok) {
      const data = await response.text();
      return NextResponse.json({ error: "email_failed", details: data }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
