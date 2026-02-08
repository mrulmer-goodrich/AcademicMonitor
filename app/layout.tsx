import type { Metadata } from "next";
import "./globals.css";
import GlobalHeader from "@/components/GlobalHeader";

export const metadata: Metadata = {
  title: "Academic Monitor",
  description: "Touch-first academic monitoring and reporting tool."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <GlobalHeader />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
