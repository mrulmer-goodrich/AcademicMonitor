export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-black/10 bg-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-5 text-sm text-black/65 sm:flex-row sm:items-center sm:justify-between">
        <div><span className="font-semibold text-black/80">Academic Monitor</span> · See learning while it happens.</div>
        <div>© {year} Academic Monitor</div>
      </div>
    </footer>
  );
}
