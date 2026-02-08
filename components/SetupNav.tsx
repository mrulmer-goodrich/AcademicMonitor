import Link from "next/link";

const links = [
  { href: "/setup/blocks", label: "Blocks" },
  { href: "/setup/students", label: "Students" },
  { href: "/setup/seating", label: "Seating" },
  { href: "/setup/laps", label: "Laps" }
];

export default function SetupNav() {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="btn btn-ghost">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
