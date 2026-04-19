"use client";

import Link from "next/link";
import { PALETTE_CATEGORY_COUNT } from "@/data/paletteCategories";
import { HeroBentoPalette } from "@/components/landing/HeroBentoPalette";

const statFmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`;

export function HeroSection() {
  const cats = statFmt(PALETTE_CATEGORY_COUNT);

  return (
    <section className="hero-shell relative min-h-[min(92svh,880px)] overflow-hidden bg-black px-4 pb-[max(5rem,env(safe-area-inset-bottom,0px))] pt-[calc(7rem+env(safe-area-inset-top,0px))] sm:px-5 md:px-8 md:pb-24 md:pt-36 lg:min-h-[min(90svh,920px)]">
      <div className="relative mx-auto max-w-[1280px]">
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-10 xl:gap-x-14">
          {/* Copy — ~40% */}
          <div className="relative z-[1] flex flex-col lg:col-span-5 lg:min-h-0 lg:max-w-xl lg:pt-1">
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.1rem,6.5vw,4.75rem)] font-extrabold leading-[1.02] tracking-tight">
              <span className="block overflow-hidden">
                <span className="hero-line-inner inline-block text-white">The last palette</span>
              </span>
              <span className="mt-2 block overflow-hidden">
                <span className="hero-line-inner hero-shimmer inline-block bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                  tab you’ll pin.
                </span>
              </span>
            </h1>

            <p className="hero-fade mt-7 max-w-lg text-base leading-relaxed text-zinc-500 md:text-lg">
              One home for harmony, contrast checks, and export — so you stop juggling generators
              and mood boards.
              <span className="mt-2 block text-zinc-400">
                Ek jagah. Poora color flow.
              </span>
            </p>

            <div className="hero-fade mt-9 flex flex-wrap gap-3">
              {[
                { v: `${cats}+`, l: "moods & categories" },
                { v: "12", l: "hue families" },
                { v: "5-stop", l: "ramps & export" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="hero-stat-chip rounded-[1.25rem] bg-[#111111] px-4 py-3 md:rounded-3xl md:px-5 md:py-3.5"
                >
                  <p className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums text-white md:text-2xl">
                    {s.v}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="hero-cta mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
              <Link
                href="/generator"
                className="hero-cta hover-smooth group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 px-9 text-sm font-semibold text-white shadow-[0_0_48px_-10px_rgba(139,92,246,0.65)] hover:shadow-[0_0_56px_-6px_rgba(139,92,246,0.85)] active:scale-[0.98]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100" />
                <span className="relative">Open palette lab</span>
              </Link>
              <a
                href="#trending"
                className="hero-cta hover-smooth inline-flex h-14 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-8 text-sm font-medium text-zinc-200 backdrop-blur-sm hover:border-white/22 hover:bg-white/[0.08]"
              >
                See what’s trending
              </a>
            </div>
          </div>

          {/* Bento palette preview — ~60% */}
          <div className="relative z-[1] flex w-full items-start justify-end self-start lg:col-span-7">
            <HeroBentoPalette />
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="hero-scroll-hint pointer-events-none absolute bottom-8 left-1/2 z-[2] hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
        <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-zinc-600">
          Scroll
        </span>
        <span className="flex h-9 w-5 justify-center rounded-full border border-white/10 bg-white/[0.03] pt-2">
          <span className="h-1.5 w-0.5 animate-pulse rounded-full bg-zinc-500" />
        </span>
      </div>
    </section>
  );
}
