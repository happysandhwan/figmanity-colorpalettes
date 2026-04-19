export function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-white/[0.06] px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] text-center text-xs text-zinc-600 sm:px-5 md:px-8">
      <p>© {new Date().getFullYear()} Figmanity · Built for designers who ship.</p>
    </footer>
  );
}
