"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(true)}>
        Log out
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="hero-card w-full max-w-sm p-6 space-y-4">
            <div className="text-lg font-semibold">Log out?</div>
            <p className="text-sm text-black/70">You will need to sign back in to access your data.</p>
            <div className="flex gap-2">
              <form action="/api/auth/logout" method="post">
                <button className="btn btn-primary" type="submit">Yes, log out</button>
              </form>
              <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
