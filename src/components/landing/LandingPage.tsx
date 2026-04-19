"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type GeneratorMode,
  generatePalette,
} from "@/lib/colorPalette";
import { PALETTE_CATEGORY_COUNT } from "@/data/paletteCategories";
import { CategoryExplorer } from "@/components/landing/CategoryExplorer";
import { HeroSection } from "@/components/landing/HeroSection";
import { SeedColorPicker } from "@/components/landing/SeedColorPicker";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

const PALETTES = [
  {
    name: "Midnight Bloom",
    swatches: ["#1a0a2e", "#451f55", "#e879f9", "#f0abfc", "#fdf4ff"],
  },
  {
    name: "Solar Forge",
    swatches: ["#0f172a", "#ea580c", "#fbbf24", "#fef3c7", "#fffbeb"],
  },
  {
    name: "Glacier Mint",
    swatches: ["#042f2e", "#0d9488", "#5eead4", "#ccfbf1", "#f0fdfa"],
  },
];

const TRENDING_PALETTES = [
  {
    name: "Neon Noir",
    swatches: ["#09090b", "#18181b", "#a855f7", "#e879f9", "#fafafa"],
    saves: "18.2k",
    delta: "+12%",
  },
  {
    name: "Tokyo Dawn",
    swatches: ["#1e1b4b", "#4338ca", "#6366f1", "#a5b4fc", "#eef2ff"],
    saves: "14.9k",
    delta: "+9%",
  },
  {
    name: "Matcha Latte",
    swatches: ["#14532d", "#166534", "#4ade80", "#bbf7d0", "#f7fee7"],
    saves: "21.1k",
    delta: "+24%",
  },
  {
    name: "Copper Clay",
    swatches: ["#431407", "#9a3412", "#ea580c", "#fed7aa", "#fff7ed"],
    saves: "11.3k",
    delta: "+6%",
  },
  {
    name: "Arctic Rose",
    swatches: ["#0c4a6e", "#0369a1", "#38bdf8", "#e0f2fe", "#fce7f3"],
    saves: "16.7k",
    delta: "+15%",
  },
  {
    name: "Lunar Gold",
    swatches: ["#1c1917", "#44403c", "#d97706", "#fcd34d", "#fffbeb"],
    saves: "9.8k",
    delta: "+4%",
  },
];

const GENERATOR_MODES: { id: GeneratorMode; label: string; hint: string }[] = [
  { id: "ramp", label: "Ramp", hint: "5-stop lightness ramp" },
  { id: "analogous", label: "Analogous", hint: "neighboring hues" },
  { id: "complementary", label: "Complement", hint: "opposite + mixes" },
  { id: "triadic", label: "Triadic", hint: "120° harmony" },
  { id: "random", label: "Random", hint: "surprise me" },
];

const FEATURES = [
  {
    title: "Harmony baked in",
    body: "Complementary pairs, triads, and semantic ramps — not random swatches.",
  },
  {
    title: "A11y that actually ships",
    body: "Contrast pairs flagged before you paste into production.",
  },
  {
    title: "Figma-native flow",
    body: "Variables, styles, and tokens — export once, sync everywhere.",
  },
];

function registerGsap() {
  gsap.registerPlugin(ScrollTrigger);
}

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
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

  const [baseHex, setBaseHex] = useState("#456990");
  const [genMode, setGenMode] = useState<GeneratorMode>("ramp");
  const [generated, setGenerated] = useState<string[]>(() =>
    generatePalette("ramp", "#456990"),
  );
  const genRowRef = useRef<HTMLDivElement>(null);
  const [generateMeshHue, setGenerateMeshHue] = useState(0);
  const [hueAnimEnabled, setHueAnimEnabled] = useState(false);
  const hueTransition = "filter 3.5s cubic-bezier(0.2, 0.8, 0.2, 1)";
  const generateHueStyle = hueAnimEnabled
    ? {
        filter: `hue-rotate(${generateMeshHue}deg)`,
        transition: hueTransition,
      }
    : undefined;
  const generateHueStylePanelGlow = hueAnimEnabled
    ? {
        filter: `hue-rotate(${generateMeshHue}deg)`,
        transition: `${hueTransition}, opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }
    : undefined;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const ok = !mq.matches;
      setHueAnimEnabled(ok);
      if (ok) setGenerateMeshHue(Math.random() * 360);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!hueAnimEnabled) return;
    const tick = () => setGenerateMeshHue(Math.random() * 360);
    tick();
    const id = window.setInterval(tick, 4200);
    return () => window.clearInterval(id);
  }, [hueAnimEnabled]);

  const runGenerate = useCallback(() => {
    setGenerated(generatePalette(genMode, baseHex));
  }, [baseHex, genMode]);

  useEffect(() => {
    if (!genRowRef.current) return;
    const swatches = genRowRef.current.querySelectorAll(".gen-swatch");
    gsap.fromTo(
      swatches,
      { scale: 0.88, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        stagger: 0.07,
        duration: 0.5,
        ease: "back.out(1.35)",
      },
    );
  }, [generated]);

  useGSAP(
    () => {
      registerGsap();
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.from(".hero-line-inner", {
            yPercent: 110,
            opacity: 0,
            duration: 0.85,
            stagger: 0.06,
          })
          .from(
            ".hero-fade",
            { opacity: 0, y: 28, duration: 0.7, stagger: 0.08 },
            "-=0.45",
          )
          .from(
            ".hero-stat-chip",
            { opacity: 0, y: 18, duration: 0.55, stagger: 0.07, ease: "power3.out" },
            "-=0.4",
          )
          .from(
            ".hero-cta",
            { opacity: 0, y: 20, scale: 0.96, duration: 0.55, stagger: 0.06 },
            "-=0.35",
          )
          .from(
            ".hero-visual",
            { opacity: 0, x: 40, scale: 0.97, duration: 1, ease: "power3.out" },
            "-=0.75",
          )
          .from(
            ".hero-scroll-hint",
            { opacity: 0, y: 8, duration: 0.6, ease: "power2.out" },
            "-=0.5",
          );

        gsap.to(".marquee-track", {
          xPercent: -50,
          ease: "none",
          duration: 28,
          repeat: -1,
        });

        gsap.utils.toArray<HTMLElement>(".reveal-block").forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 56,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none none",
              invalidateOnRefresh: true,
            },
          });
        });

        gsap.utils.toArray<HTMLElement>(".palette-card").forEach((card, i) => {
          gsap.from(card, {
            opacity: 0,
            y: 40,
            rotateX: -6,
            duration: 0.9,
            delay: i * 0.06,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              toggleActions: "play none none none",
              invalidateOnRefresh: true,
            },
          });
        });

        gsap.utils.toArray<HTMLElement>(".trending-card").forEach((card, i) => {
          gsap.from(card, {
            opacity: 0,
            y: 36,
            duration: 0.75,
            delay: i * 0.04,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              toggleActions: "play none none none",
              invalidateOnRefresh: true,
            },
          });
        });

        gsap.from(".generate-panel", {
          opacity: 0,
          y: 48,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".generate-section",
            start: "top 86%",
            toggleActions: "play none none none",
            invalidateOnRefresh: true,
          },
        });

        gsap.from(".category-section-inner", {
          opacity: 0,
          y: 40,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".category-section",
            start: "top 88%",
            toggleActions: "play none none none",
            invalidateOnRefresh: true,
          },
        });

        gsap.from(".feature-pill", {
          opacity: 0,
          y: 24,
          stagger: 0.08,
          duration: 0.65,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".feature-grid",
            start: "top 85%",
            toggleActions: "play none none none",
            invalidateOnRefresh: true,
          },
        });

        gsap.from(".cta-glow", {
          scale: 0.92,
          opacity: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".cta-section",
            start: "top 80%",
            toggleActions: "play none none none",
            invalidateOnRefresh: true,
          },
        });
      }, root);

      return () => {
        ctx.revert();
      };
    },
    { scope: root },
  );

  useEffect(() => {
    registerGsap();
    const refresh = () => {
      ScrollTrigger.refresh();
    };
    refresh();
    const t0 = window.setTimeout(refresh, 0);
    const t1 = window.setTimeout(refresh, 120);
    const onLoad = () => refresh();
    window.addEventListener("load", onLoad);
    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(refresh);
    };
    window.addEventListener("resize", onResize);
    void document.fonts?.ready.then(refresh).catch(() => {});
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(resizeRaf);
    };
  }, []);

  return (
    <div ref={root} className="relative min-h-screen bg-black text-zinc-100">
      <div className="grain" aria-hidden />

      <SiteHeader />

      <HeroSection />

      <div className="border-y border-black/[0.08] bg-[#20d54d] py-5 overflow-hidden">
        <div className="marquee-track flex w-[200%] gap-12 whitespace-nowrap text-sm font-medium uppercase tracking-[0.35em] text-zinc-950/85">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex gap-12">
              {[
                "Harmonic ramps",
                "WCAG aware",
                "Figma tokens",
                "No more 47 tabs",
                "Ship faster",
                "One home for color",
              ].map((t) => (
                <span key={`${dup}-${t}`}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="trending" className="scroll-mt-28 border-t border-white/[0.06] bg-[#070708] px-4 py-16 sm:px-5 sm:py-20 md:scroll-mt-24 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal-block mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#EF767A]/90">
                Live community pulse
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight md:text-4xl">
                Trending color palettes
              </h2>
              <p className="mt-3 text-zinc-400">
                What teams are saving this week — tap any swatch to copy HEX.
              </p>
            </div>
            <a
              href="#generate"
              className="hover-smooth inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm font-medium text-zinc-100 hover:border-[#49BEAA]/50 hover:bg-white/[0.09] active:scale-[0.98]"
            >
              Make your own →
            </a>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TRENDING_PALETTES.map((p) => (
              <article
                key={p.name}
                className="trending-card hover-smooth group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c10] shadow-[0_20px_60px_-36px_rgba(0,0,0,0.85)] hover:border-white/[0.12] hover:shadow-[0_28px_72px_-40px_rgba(0,0,0,0.92)] hover:-translate-y-0.5"
              >
                <div className="flex h-24 overflow-hidden sm:h-28">
                  {p.swatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      title={`Copy ${hex}`}
                      onClick={() => copyHex(hex)}
                      className="hover-swatch relative flex-1 group-hover:flex-[1.12] hover:flex-[1.2] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
                      style={{ backgroundColor: hex }}
                    >
                      <span className="sr-only">Copy {hex}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-start justify-between gap-3 px-4 py-4">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-tight">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">{p.saves} saves · updated weekly</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    {p.delta}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="generate"
        className="generate-section relative scroll-mt-28 overflow-hidden border-t border-white/[0.07] bg-[#060607] px-4 py-12 sm:px-5 sm:py-16 md:scroll-mt-24 md:px-8 md:py-20"
      >
        {/* Colored atmosphere */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_80%_at_15%_20%,rgba(124,58,237,0.22),transparent_55%),radial-gradient(ellipse_90%_70%_at_85%_15%,rgba(34,211,238,0.14),transparent_50%),radial-gradient(ellipse_70%_60%_at_50%_85%,rgba(244,114,182,0.12),transparent_50%),radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(99,102,241,0.08),transparent_60%)]"
          style={generateHueStyle}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_28%,transparent_72%,rgba(15,15,25,0.9)_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 -z-10 h-px bg-gradient-to-r from-transparent via-[#49BEAA]/40 to-transparent"
          style={generateHueStyle}
          aria-hidden
        />

        <div className="relative z-[1] mx-auto max-w-6xl">
          <div className="reveal-block mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#49BEAA]/25 bg-[#49BEAA]/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7fe8d4]/95">
                Palette lab
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                Generate{" "}
                <span className="bg-gradient-to-r from-[#EF767A] via-[#49BEAA] to-[#EEB868] bg-clip-text text-transparent">
                  in one click
                </span>
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-400 md:text-lg">
                Seed a color, pick a harmony rule, export — no tab roulette, no guesswork.
              </p>
            </div>
            <div className="w-full shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-left backdrop-blur-sm sm:w-auto sm:text-right">
              <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-zinc-100">
                5
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                harmony modes
              </p>
            </div>
          </div>

          <div className="generate-panel group/panel relative">
            <div
              className="absolute -inset-px rounded-[2rem] bg-gradient-to-br from-[#EF767A]/30 via-[#456990]/20 to-[#49DCB1]/28 opacity-90 blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/panel:opacity-100"
              style={generateHueStylePanelGlow}
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[linear-gradient(145deg,rgba(18,18,28,0.97)_0%,rgba(8,8,14,0.98)_45%,rgba(12,14,24,0.96)_100%)] p-5 shadow-[0_40px_120px_-50px_rgba(88,28,135,0.45)] backdrop-blur-xl md:p-6 lg:p-8">
              <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:items-stretch lg:gap-8">
                <div className="flex min-h-0 flex-col gap-5">
                  <SeedColorPicker value={baseHex} onChange={setBaseHex} />

                  <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-4 md:p-5">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#49DCB1] to-[#EF767A]" />
                      Harmony mode
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {GENERATOR_MODES.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setGenMode(m.id)}
                          title={m.hint}
                          className={`rounded-full px-4 py-2.5 text-sm font-medium hover-smooth ${
                            genMode === m.id
                              ? "bg-gradient-to-r from-[#456990] to-[#49BEAA] text-white shadow-[0_8px_28px_-6px_rgba(73,190,170,0.5)] hover:brightness-110"
                              : "border border-white/12 bg-black/30 text-zinc-300 hover:border-white/25 hover:bg-white/[0.06]"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 border-t border-white/[0.06] pt-2 text-xs leading-snug text-zinc-500 md:text-sm md:leading-relaxed">
                      {GENERATOR_MODES.find((m) => m.id === genMode)?.hint}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={runGenerate}
                      className="hover-smooth inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#456990] via-[#49BEAA] to-[#49DCB1] px-7 text-sm font-semibold text-white shadow-[0_12px_40px_-8px_rgba(73,190,170,0.48)] hover:brightness-110 active:scale-[0.98] md:h-12 md:px-9"
                    >
                      Generate palette
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(generated.join("\n"));
                          setCopied("palette");
                          window.setTimeout(() => setCopied(null), 1600);
                        } catch {
                          setCopied(null);
                        }
                      }}
                      className="hover-smooth inline-flex h-11 items-center justify-center rounded-full border border-white/18 bg-white/[0.05] px-5 text-sm font-medium text-zinc-100 backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.1] active:scale-[0.99] md:h-12 md:px-6"
                    >
                      Copy all HEX
                    </button>
                  </div>
                </div>

                <div className="hover-smooth flex min-h-[200px] flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-black/50 to-black/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:min-h-[240px] md:min-h-[260px] lg:min-h-0 lg:h-full">
                  <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-3 py-2 md:px-4 md:py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                      Live preview
                    </p>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      5 swatches
                    </span>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col p-2 md:p-4">
                    <div
                      ref={genRowRef}
                      className="flex min-h-[160px] flex-1 overflow-hidden rounded-xl ring-1 ring-black/40 sm:min-h-[180px] md:min-h-[200px] lg:min-h-0"
                    >
                      {generated.map((hex, idx) => (
                        <button
                          key={`${idx}-${hex}`}
                          type="button"
                          title={`Copy ${hex}`}
                          onClick={() => copyHex(hex)}
                          className="gen-swatch hover-swatch relative flex min-h-0 flex-1 flex-col justify-end self-stretch p-3 text-left hover:flex-[1.15] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                          style={{ backgroundColor: hex }}
                        >
                          <span className="font-mono text-[10px] font-semibold text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] md:text-xs">
                            {hex.toUpperCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="categories"
        className="category-section scroll-mt-28 border-t border-white/[0.06] bg-[#070708] px-4 py-16 sm:px-5 sm:py-20 md:scroll-mt-24 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="category-section-inner">
            <div className="reveal-block mb-10 max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#49DCB1]/90">
                Category library
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight md:text-4xl">
                {PALETTE_CATEGORY_COUNT.toLocaleString()}+ named palettes to explore
              </h2>
              <p className="mt-3 text-base leading-relaxed text-zinc-400">
                Each category is a mood, niche, or vibe — and comes with a unique five-color
                palette you can copy in one tap. Below is a quick preview; open the full gallery to
                search the entire index.
              </p>
            </div>
            <CategoryExplorer
              variant="preview"
              onCopyHex={copyHex}
              onCopyPaletteLines={copyCategoryPaletteLines}
            />
          </div>
        </div>
      </section>

      <section id="palettes" className="scroll-mt-28 px-4 py-16 sm:px-5 sm:py-20 md:scroll-mt-24 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal-block mb-14 max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight md:text-4xl">
              Palettes that feel{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EF767A] to-[#49DCB1]">
                finished
              </span>
              , not fetched.
            </h2>
            <p className="mt-4 text-zinc-400">
              Tap a swatch to copy HEX — micro-interactions that respect your flow.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {PALETTES.map((p) => (
              <article
                key={p.name}
                className="palette-card hover-smooth group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0e0e12] p-1 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.9)] hover:border-white/[0.12] hover:shadow-[0_32px_96px_-48px_rgba(0,0,0,0.95)] hover:-translate-y-0.5"
              >
                <div className="flex h-32 overflow-hidden rounded-2xl sm:h-40">
                  {p.swatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      title={`Copy ${hex}`}
                      onClick={() => copyHex(hex)}
                      className="hover-swatch relative flex-1 group-hover:flex-[1.15] hover:flex-[1.25] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                      style={{ backgroundColor: hex }}
                    >
                      <span className="sr-only">Copy {hex}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-4">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    {p.name}
                  </h3>
                  <span className="text-xs text-zinc-500">5-stop ramp</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-28 border-t border-white/[0.06] bg-gradient-to-b from-[#060607] to-[#0a0a0f] px-4 py-16 sm:px-5 sm:py-20 md:scroll-mt-24 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="reveal-block mb-12 max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold md:text-4xl">
              Why designers bookmark this
            </h2>
            <p className="mt-3 text-zinc-400">
              Not another generator dump — a calm system for decisions you actually ship.
            </p>
          </div>

          <div className="feature-grid grid gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="feature-pill hover-smooth rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 hover:border-white/18 hover:bg-white/[0.05] hover:-translate-y-0.5"
              >
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal-block px-4 py-12 sm:px-5 sm:py-16 md:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/[0.08] bg-[linear-gradient(135deg,rgba(139,92,246,0.12),rgba(34,211,238,0.08))] p-6 text-center sm:rounded-3xl sm:p-10 md:p-14">
          <p className="font-[family-name:var(--font-display)] text-xl font-bold leading-snug sm:text-2xl md:text-3xl">
            “Finally — color that doesn’t fight the product. It’s the first tab I pin.”
          </p>
          <p className="mt-6 text-sm text-zinc-500">— Design leads who are tired of guessing</p>
        </div>
      </section>

      <section id="cta" className="cta-section scroll-mt-28 px-4 pb-[max(7rem,env(safe-area-inset-bottom,0px)+4rem)] pt-8 sm:px-5 md:scroll-mt-24 md:px-8">
        <div className="cta-glow relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c10] p-[1px] sm:rounded-[2rem]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#456990]/35 via-[#EF767A]/18 to-[#49DCB1]/28 blur-3xl" />
          <div className="relative rounded-2xl bg-[#0a0a0f] px-5 py-10 text-center sm:rounded-[2rem] sm:px-8 sm:py-14 md:px-16 md:py-20">
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.65rem,6vw,3rem)] font-extrabold tracking-tight md:text-5xl">
              Ready to never leave?
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-zinc-400">
              Join the waitlist — we’re polishing the full palette OS. Early birds get lifetime
              perks.
            </p>
            <form
              className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@studio.com"
                className="hover-smooth h-14 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-0 focus:border-[#49BEAA]/55 hover:border-white/18"
              />
              <button
                type="submit"
                className="hover-smooth h-14 shrink-0 rounded-full bg-white px-8 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.98]"
              >
                Join waitlist
              </button>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />

      <div
        className={`pointer-events-none fixed left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/90 px-4 py-2 text-center text-xs text-zinc-200 shadow-2xl backdrop-blur-md transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:bottom-8 sm:max-w-none sm:px-5 sm:text-sm bottom-[max(1.25rem,env(safe-area-inset-bottom,0px)+0.75rem)] ${
          copied ? "opacity-100" : "opacity-0"
        }`}
        role="status"
      >
        {copied === "palette"
          ? "Copied all HEX lines"
          : copied === "category"
            ? "Copied 5 swatches"
            : copied
              ? `Copied ${copied}`
              : ""}
      </div>
    </div>
  );
}
