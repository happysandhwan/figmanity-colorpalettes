"use client";

import { CategoryExplorer } from "@/components/landing/CategoryExplorer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PALETTE_CATEGORY_COUNT } from "@/data/paletteCategories";
import { useCallback, useState } from "react";

const BANNER_SWATCHES = ["#8b5cf6", "#d946ef", "#22d3ee", "#34d399", "#fbbf24"] as const;

export default function CategoriesPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }, []);

  const copyCategoryPaletteLines = useCallback(async (hexes: string[]) => {
    try {
      await navigator.clipboard.writeText(hexes.join("\n"));
      setCopied("category");
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }, []);

  const countLabel = PALETTE_CATEGORY_COUNT.toLocaleString();

  return (
    <div className="relative min-h-screen bg-black text-zinc-100">
      <div className="grain" aria-hidden />

      <SiteHeader />

      <main className="bg-[#070708] pb-20 pt-[calc(4.25rem+env(safe-area-inset-top,0px))] sm:pt-[4.5rem] md:pt-20">
        <section
          className="relative w-full bg-gradient-to-b from-[#0c0a10] via-[#08080b] to-[#070708] pb-10 pt-0 md:pb-14"
          aria-labelledby="categories-banner-title"
        >
          <div className="relative w-full overflow-hidden bg-[#09090d]/95">
            <div
              className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-600/25 blur-[80px]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-[72px]"
              aria-hidden
            />

            <div className="relative flex flex-col items-center px-4 pb-10 pt-3 text-center sm:px-10 md:px-12 md:pb-12 md:pt-4">
              <div className="mb-6 flex flex-wrap justify-center gap-2 sm:gap-2.5">
                {BANNER_SWATCHES.map((hex) => (
                  <span
                    key={hex}
                    className="h-2.5 w-10 rounded-full sm:h-3 sm:w-12"
                    style={{ backgroundColor: hex }}
                    aria-hidden
                  />
                ))}
              </div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-violet-400/95">
                Category library
              </p>
              <h1
                id="categories-banner-title"
                className="max-w-4xl font-[family-name:var(--font-display)] text-[clamp(1.85rem,4.5vw,3rem)] font-bold leading-[1.12] tracking-tight text-zinc-50"
              >
                <span className="block">{countLabel}+ named palettes</span>
                <span className="mt-2 block bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                  one search away
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 md:mt-6 md:text-[1.05rem]">
                Each label is a mood or niche — with a unique five-color palette. Search the full
                index, tap any swatch for HEX, or copy all five lines in one go.
              </p>

              <ul className="mt-9 flex max-w-2xl flex-wrap justify-center gap-3 md:mt-10">
                <li className="rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 backdrop-blur-sm">
                  <span className="text-violet-400/95">{countLabel}+</span> categories
                </li>
                <li className="rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 backdrop-blur-sm">
                  Instant HEX copy
                </li>
                <li className="rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 backdrop-blur-sm">
                  Copy-all per card
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-5 sm:pt-10 md:px-8 md:pt-12">
          <CategoryExplorer
            variant="full"
            onCopyHex={copyHex}
            onCopyPaletteLines={copyCategoryPaletteLines}
          />
        </div>
      </main>

      <footer className="border-t border-white/[0.06] px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] text-center text-xs text-zinc-600 sm:px-5">
        <p>© {new Date().getFullYear()} Figmanity · Built for designers who ship.</p>
      </footer>

      <div
        className={`pointer-events-none fixed left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/90 px-4 py-2 text-center text-xs text-zinc-200 shadow-2xl backdrop-blur-md transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:bottom-8 sm:max-w-none sm:px-5 sm:text-sm bottom-[max(1.25rem,env(safe-area-inset-bottom,0px)+0.75rem)] ${
          copied ? "opacity-100" : "opacity-0"
        }`}
        role="status"
      >
        {copied === "category"
          ? "Copied 5 swatches"
          : copied
            ? `Copied ${copied}`
            : ""}
      </div>
    </div>
  );
}
