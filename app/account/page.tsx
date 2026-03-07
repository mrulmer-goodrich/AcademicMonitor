"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import useUnsavedChangesGuard from "@/lib/useUnsavedChangesGuard";

type Me = {
  email: string;
  teacherName: string;
  displayName: string;
};

type UsageSummary = {
  accountCreatedAt: string;
  schoolYear: string;
  blocksCount: number;
  studentsCount: number;
  desksCount: number;
  lapsCount: number;
  attendanceCount: number;
  performanceCount: number;
  latestActivityAt: string | null;
};

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [email, setEmail] = useState("");
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
          setEmail(data.user.email || "");
          setName(data.user.teacherName || "");
          setDisplayName(data.user.displayName || "");
        }
      });

    fetch("/api/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSummary(data?.summary || null))
      .catch(() => setSummary(null));
  }, []);

  const hasUnsavedChanges = useMemo(() => {
    const profileDirty = Boolean(
      me && (email !== me.email || name !== me.teacherName || displayName !== me.displayName)
    );
    const passwordDirty = Boolean(currentPassword || newPassword);
    return profileDirty || passwordDirty;
  }, [me, email, name, displayName, currentPassword, newPassword]);

  const { dialogProps } = useUnsavedChangesGuard({
    when: hasUnsavedChanges,
    description: "You have unsaved account changes on this screen. Leaving now will discard them."
  });

  async function saveProfile() {
    setStatus(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, teacherName: name, displayName })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        setMe(data.user);
        setEmail(data.user.email || "");
        setName(data.user.teacherName || "");
        setDisplayName(data.user.displayName || "");
      }
      setStatus("Saved.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setStatus(data.error === "email_exists" ? "That email is already in use." : "Unable to save.");
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
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Email / login</label>
            <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
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

      {summary && (
        <div className="hero-card p-6 space-y-4">
          <div className="text-lg font-semibold">Usage Snapshot</div>
          <div className="text-sm text-black/60">
            Current data available for inspection from the stored account records.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <div>School year: {summary.schoolYear}</div>
              <div>Blocks: {summary.blocksCount}</div>
              <div>Active students: {summary.studentsCount}</div>
              <div>Seated desks: {summary.desksCount}</div>
              <div>Lap definitions: {summary.lapsCount}</div>
            </div>
            <div className="space-y-2 text-sm">
              <div>Attendance records: {summary.attendanceCount}</div>
              <div>Performance records: {summary.performanceCount}</div>
              <div>Account created: {format(new Date(summary.accountCreatedAt), "MM/dd/yyyy")}</div>
              <div>
                Latest activity:{" "}
                {summary.latestActivityAt ? format(new Date(summary.latestActivityAt), "MM/dd/yyyy h:mm a") : "No activity yet"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hero-card p-6 space-y-4">
        <div className="text-lg font-semibold">Session</div>
        <div className="text-sm text-black/60">
          Logged in as {me?.email || email || "your account"}
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn btn-ghost" type="submit">
            Log out
          </button>
        </form>
      </div>

      <UnsavedChangesDialog {...dialogProps} />
    </div>
  );
}
