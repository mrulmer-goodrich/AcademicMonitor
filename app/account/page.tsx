"use client";

import { useEffect, useState } from "react";

type Me = {
  email: string;
  teacherName: string;
  displayName: string;
};

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setMe(data.user);
          setName(data.user.teacherName || "");
          setDisplayName(data.user.displayName || "");
        }
      });
  }, []);

  async function saveProfile() {
    setStatus(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherName: name, displayName })
    });
    setStatus(res.ok ? "Saved." : "Unable to save.");
  }

  async function updatePassword() {
    setPasswordStatus(null);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (res.ok) {
      setPasswordStatus("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      const data = await res.json().catch(() => ({}));
      setPasswordStatus(data.error || "Unable to update password.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
      <div>
        <h1 className="section-title">Account</h1>
      </div>

      <div className="hero-card p-6 space-y-4">
        <div className="text-lg font-semibold">Profile</div>
        <div className="text-sm text-black/60">{me?.email || ""}</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Teacher name</label>
            <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Display name</label>
            <input className="form-control" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" type="button" onClick={saveProfile}>
            Save
          </button>
          {status && <div className="text-sm text-black/60">{status}</div>}
        </div>
      </div>

      <div className="hero-card p-6 space-y-4">
        <div className="text-lg font-semibold">Password</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Current password</label>
            <input
              className="form-control"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">New password</label>
            <input
              className="form-control"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="text-xs text-black/60">
          If you don’t remember your current password, leave it blank and set a new one.
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" type="button" onClick={updatePassword}>
            Update password
          </button>
          {passwordStatus && <div className="text-sm text-black/60">{passwordStatus}</div>}
        </div>
      </div>

      <div className="hero-card p-6 space-y-4">
        <div className="text-lg font-semibold">Session</div>
        <form action="/api/auth/logout" method="post">
          <button className="btn btn-ghost" type="submit">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
