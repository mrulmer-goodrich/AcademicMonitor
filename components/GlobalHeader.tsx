import Link from "next/link";
import Image from "next/image";

export default function GlobalHeader() {
  return (
    <div className="topbar">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Academic Monitor home">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="Academic Monitor logo" width={40} height={40} className="object-contain" />
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
        </nav>
      </div>
    </div>
  );
}
