"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SessionUser = { id: string } | null;

export default function GlobalHeader() {
  const [user, setUser] = useState<SessionUser>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null));
  }, []);

  const isFocusedPage = pathname?.startsWith("/setup") || pathname?.startsWith("/monitor");
  const logoHref = user ? "/dashboard" : "/";
  const navLinks = user
    ? isFocusedPage
      ? []
      : [
          { href: "/account", label: "Account" },
          { href: "/about", label: "About" },
          { href: "/contact", label: "Contact" }
        ]
    : [
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact" }
      ];

  return (
    <div className="topbar">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={logoHref} className="flex items-center gap-2" aria-label="Academic Monitor home">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="Academic Monitor logo"
              width={96}
              height={96}
              className="object-contain"
              priority
            />
          </div>
        </Link>
        <nav className="flex items-center gap-1.5 text-sm font-medium sm:gap-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-pill">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
