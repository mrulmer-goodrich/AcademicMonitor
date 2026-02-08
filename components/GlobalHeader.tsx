import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";

export default function GlobalHeader() {
  const user = getSessionUser();
  const logoHref = user ? "/dashboard" : "/";

  return (
    <div className="topbar">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
        <Link href={logoHref} className="flex items-center gap-2" aria-label="Academic Monitor home">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="Academic Monitor logo" width={56} height={56} className="object-contain" />
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/setup">Setup</Link>
          <Link href="/monitor">Monitor</Link>
          <Link href="/report">Report</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </div>
    </div>
  );
}
