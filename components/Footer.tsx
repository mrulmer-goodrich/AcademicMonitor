export default function Footer() {
  return (
    <footer className="mt-16 border-t border-black/10 bg-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="font-semibold">Academic Monitor</div>
          <div className="text-black/60">Designed for touch-first classroom monitoring.</div>
        </div>
        <div className="flex flex-wrap gap-6 text-black/60">
          <span>Support: help@academicmonitor.test</span>
          <span>Built for daily use on iPad and Chromebook.</span>
        </div>
      </div>
    </footer>
  );
}
