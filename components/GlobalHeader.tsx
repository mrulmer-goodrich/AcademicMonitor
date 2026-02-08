import Link from "next/link";

export default function GlobalHeader() {
  return (
    <div className="topbar">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Academic Monitor home">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white text-sm font-semibold">
            UG
          </div>
        </Link>
        <div className="text-xs text-black/50">Tap icon to return home</div>
      </div>
    </div>
  );
}
