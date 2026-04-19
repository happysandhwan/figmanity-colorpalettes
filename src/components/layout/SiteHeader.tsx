"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

const MOBILE_LINKS = [
  { href: "/#trending", label: "Trending" },
  { href: "/#generate", label: "Generate" },
  { href: "/generator", label: "Palette Lab" },
  { href: "/categories", label: "Categories" },
  { href: "/#palettes", label: "Palettes" },
  { href: "/#features", label: "Why here" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/75 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/[0.07] bg-black/85 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-5 md:px-8 md:py-4">
          <Link
            href="/"
            className="min-w-0 font-[family-name:var(--font-display)] text-base font-bold tracking-tight sm:text-lg md:text-xl"
            onClick={() => setOpen(false)}
          >
            <span className="block truncate">
              Figmanity
              <span className="text-zinc-500"> · </span>
              <span className="font-medium text-zinc-300">Palettes</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              className="hover-smooth rounded-full border border-white/25 bg-transparent px-3 py-2 text-xs font-medium text-zinc-100 hover:border-white/45 hover:bg-white/[0.05] sm:px-4 sm:text-sm md:hidden"
              href="/#cta"
              onClick={() => setOpen(false)}
            >
              Join
            </Link>
            <button
              type="button"
              className="hover-smooth flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-zinc-200 hover:border-white/30 hover:bg-white/[0.07] md:hidden"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <IconClose /> : <IconMenu />}
            </button>
            <nav
              className="hidden items-center gap-5 text-sm text-zinc-400 lg:gap-8 md:flex"
              aria-label="Main"
            >
              <Link className="hover-smooth hover:text-zinc-100" href="/#trending">
                Trending
              </Link>
              <Link className="hover-smooth hover:text-zinc-100" href="/#generate">
                Generate
              </Link>
              <Link className="hover-smooth hover:text-zinc-100" href="/generator">
                Palette Lab
              </Link>
              <Link className="hover-smooth hover:text-zinc-100" href="/categories">
                Categories
              </Link>
              <Link className="hover-smooth hover:text-zinc-100" href="/#palettes">
                Palettes
              </Link>
              <Link className="hover-smooth hover:text-zinc-100" href="/#features">
                Why here
              </Link>
              <Link
                className="hover-smooth rounded-full border border-white/25 bg-transparent px-4 py-2 text-zinc-100 hover:border-white/45 hover:bg-white/[0.05]"
                href="/#cta"
              >
                Get early access
              </Link>
            </nav>
          </div>
        </div>

        {open ? (
          <nav
            id={menuId}
            className="max-h-[min(70vh,calc(100dvh-5.5rem))] overflow-y-auto overscroll-contain border-t border-white/[0.08] bg-black/95 px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] md:hidden"
            aria-label="Mobile main"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {MOBILE_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover-smooth rounded-xl px-3 py-3 text-base font-medium text-zinc-200 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.08]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/#cta"
                className="hover-smooth mt-3 inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
                onClick={() => setOpen(false)}
              >
                Get early access
              </Link>
            </div>
          </nav>
        ) : null}
      </header>
    </>
  );
}

function IconMenu() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
