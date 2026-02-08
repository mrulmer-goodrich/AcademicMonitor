\"use client\";

import Link from \"next/link\";
import Image from \"next/image\";
import { useEffect, useState } from \"react\";
import { usePathname } from \"next/navigation\";

type SessionUser = { id: string } | null;

export default function GlobalHeader() {
  const [user, setUser] = useState<SessionUser>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch(\"/api/me\")\n      .then((res) => res.json())\n      .then((data) => setUser(data.user || null))\n      .catch(() => setUser(null));
  }, []);

  const isDashboard = pathname === \"/dashboard\";
  const logoHref = user ? (isDashboard ? \"/\" : \"/dashboard\") : \"/\";

  return (
    <div className=\"topbar\">\n      <div className=\"mx-auto flex max-w-6xl items-center justify-between px-6 py-1\">\n        <Link href={logoHref} className=\"flex items-center gap-2\" aria-label=\"Academic Monitor home\">\n          <div className=\"flex h-20 w-20 items-center justify-center overflow-hidden\">\n            <Image src=\"/logo.png\" alt=\"Academic Monitor logo\" width={96} height={96} className=\"object-contain\" />\n          </div>\n        </Link>\n        <nav className=\"flex items-center gap-4 text-sm font-medium\">\n          <Link href=\"/dashboard\">Dashboard</Link>\n          <Link href=\"/setup\">Setup</Link>\n          <Link href=\"/monitor\">Monitor</Link>\n          <Link href=\"/report\">Report</Link>\n          <Link href=\"/about\">About</Link>\n          <Link href=\"/contact\">Contact</Link>\n        </nav>\n      </div>\n    </div>\n  );
}
