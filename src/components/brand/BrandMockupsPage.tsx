"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  contrastRatio,
  formatContrastShort,
  needsContrastPlate,
  orderPaletteForLogo,
  pickPlateStyle,
  sampleAverageLogoRgb,
} from "@/lib/brandLogoContrast";
import { generatePalette, hexToHsl, hslToHex } from "@/lib/colorPalette";
import { extractDominantHexesFromFile } from "@/lib/extractImagePalette";

const FALLBACK_PALETTE = ["#EF767A", "#456990", "#49BEAA", "#49DCB1", "#EEB868", "#8b5cf6"];

function randomSeedHex() {
  return hslToHex(Math.random() * 360, 52 + Math.random() * 38, 48 + Math.random() * 14);
}

function LogoImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={640}
      height={640}
      unoptimized
      draggable={false}
      className={`pointer-events-none h-auto w-auto max-h-full max-w-full select-none object-contain ${className ?? ""}`}
    />
  );
}

/** Logo on a surface; adds a neutral plate when WCAG contrast vs logo sample is low. */
function LogoOnSurface({
  logoUrl,
  logoFgHex,
  surfaceBg,
  alt,
  className,
  imgClassName,
  forcePlate,
}: {
  logoUrl: string | null;
  logoFgHex: string | null;
  surfaceBg: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  forcePlate?: boolean;
}) {
  const plate =
    forcePlate || (logoFgHex ? needsContrastPlate(logoFgHex, surfaceBg) : false);
  const plateKind = logoFgHex && plate ? pickPlateStyle(logoFgHex) : null;

  const inner = logoUrl ? (
    <LogoImg src={logoUrl} alt={alt} className={imgClassName} />
  ) : (
    <div
      className={`flex min-h-[3.5rem] min-w-[5rem] items-center justify-center rounded-xl border border-dashed border-zinc-300/60 bg-zinc-100 px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500 ${imgClassName ?? ""}`}
    >
      Logo
    </div>
  );

  if (!plate || !plateKind) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <div className={className}>
      <div
        className={`mx-auto rounded-2xl px-5 py-4 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45)] ring-1 ring-black/10 ${
          plateKind === "light" ? "bg-zinc-50" : "bg-zinc-950"
        }`}
      >
        {inner}
      </div>
    </div>
  );
}

function CircleNav({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-700 shadow-md transition hover:border-zinc-300 hover:bg-white ${
        side === "left" ? "left-3 sm:left-4" : "right-3 sm:right-4"
      }`}
    >
      {side === "left" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function symbolGradientFromPalette(ranked: string[]): string {
  const a = ranked[2] ?? ranked[0]!;
  const b = ranked[4] ?? ranked[1] ?? a;
  const { h: h1, s: s1, l: l1 } = hexToHsl(a);
  const { h: h2, s: s2, l: l2 } = hexToHsl(b);
  const wash = hslToHex(h1, Math.min(88, s1 + 18), Math.min(94, l1 + 30));
  const pop = hslToHex((h2 + 18) % 360, Math.min(92, s2 + 22), Math.max(44, l2 - 2));
  return `linear-gradient(135deg, ${wash} 0%, ${pop} 100%)`;
}

export function BrandMockupsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFgHex, setLogoFgHex] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>(FALLBACK_PALETTE);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoUrlRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    logoUrlRef.current = logoUrl;
  }, [logoUrl]);

  useEffect(() => {
    return () => {
      if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!logoUrl) return;
    let cancelled = false;
    void sampleAverageLogoRgb(logoUrl).then((hex) => {
      if (!cancelled) setLogoFgHex(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const ranked = useMemo(() => orderPaletteForLogo(palette, logoFgHex), [palette, logoFgHex]);

  const applyRandomPalette = useCallback(() => {
    const fresh = generatePalette("analogous", randomSeedHex());
    setPalette(fresh.slice(0, 6));
    showToast("New palette");
  }, [showToast]);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) return;
      setBusy(true);
      try {
        setLogoFgHex(null);
        if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
        const url = URL.createObjectURL(file);
        logoUrlRef.current = url;
        setLogoUrl(url);
        const hexes = await extractDominantHexesFromFile(file, 6);
        setPalette(hexes);
        showToast("Logo + palette ready");
      } catch {
        showToast("Could not read that image");
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  const symbolGrad = useMemo(() => symbolGradientFromPalette(ranked), [ranked]);

  return (
    <div className="relative min-h-0 flex-1 bg-[#0b0b0c] text-zinc-100">
      <div className="grain" aria-hidden />

      <section className="relative border-b border-white/[0.06] px-4 pb-10 pt-10 sm:px-8 sm:pb-12 sm:pt-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-30%,rgba(139,92,246,0.18),transparent)]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">Brand mockups</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Lockups like a guidelines deck
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
            Upload your logo — panels update with your palette. Backgrounds rank for contrast; soft plates appear only
            when the mark needs help.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml"
              onChange={onFile}
              aria-label="Upload logo image"
            />
            <button
              type="button"
              disabled={busy}
              aria-busy={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_8px_28px_-6px_rgba(34,211,238,0.45)] transition hover:brightness-110 disabled:opacity-55"
            >
              {busy ? "Reading…" : "Upload logo"}
            </button>
            <button
              type="button"
              onClick={applyRandomPalette}
              className="rounded-full border border-white/12 bg-white/[0.05] px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.09]"
            >
              Shuffle palette
            </button>
            <Link
              href="/generator"
              className="rounded-full border border-violet-400/35 bg-violet-500/10 px-5 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-500/18"
            >
              Palette Lab
            </Link>
            <Link
              href="/logo-preview"
              className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-white/25 hover:bg-white/[0.1]"
            >
              Logo lab
            </Link>
          </div>
        </div>
      </section>

      {/* Hootsy-style bento */}
      <section className="px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="sr-only">Primary brand lockups</h2>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:min-h-[min(72vh,640px)] lg:grid-cols-2 lg:grid-rows-2">
            {/* Vertical logo — tall white panel */}
            <div className="relative flex min-h-[360px] flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_40px_80px_-48px_rgba(0,0,0,0.85)] lg:row-span-2 lg:min-h-0">
              <span className="absolute left-6 top-6 z-[1] text-sm font-medium tracking-tight text-zinc-900">
                Vertical logo
              </span>
              <CircleNav side="left" onClick={applyRandomPalette} label="Shuffle palette colours" />
              <div className="flex flex-1 items-center justify-center px-10 pb-16 pt-14 sm:px-14 sm:pb-20 sm:pt-16">
                <LogoOnSurface
                  logoUrl={logoUrl}
                  logoFgHex={logoFgHex}
                  surfaceBg="#ffffff"
                  alt="Vertical logo lockup"
                  className="flex w-full max-w-[280px] justify-center sm:max-w-[320px]"
                  imgClassName="max-h-[min(38vw,200px)] sm:max-h-[240px]"
                />
              </div>
              <div className="absolute bottom-6 left-6 flex gap-2">
                {ranked.slice(0, 3).map((hex, i) => (
                  <span
                    key={`dot-${hex}-${i}`}
                    className="h-2.5 w-2.5 rounded-full ring-2 ring-black/10"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            {/* Symbol — gradient */}
            <div
              className="relative min-h-[280px] overflow-hidden rounded-[1.75rem] shadow-[0_32px_60px_-40px_rgba(0,0,0,0.65)] lg:min-h-0"
              style={{ background: symbolGrad }}
            >
              <span className="absolute left-6 top-6 z-[1] text-sm font-medium tracking-tight text-zinc-900/90 drop-shadow-sm">
                Symbol
              </span>
              <CircleNav side="right" onClick={applyRandomPalette} label="Shuffle palette colours" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
              <div className="relative flex h-full min-h-[280px] items-center justify-center p-10 lg:min-h-0">
                <div className="aspect-square w-[min(52%,220px)] overflow-hidden rounded-[2rem] bg-white/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/10 backdrop-blur-[2px]">
                  {logoUrl ? (
                    <LogoImg
                      src={logoUrl}
                      alt="Symbol crop"
                      className="h-full w-full object-cover object-center drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)] scale-[1.28]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-800">
                      Logo
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Horizontal logo — dark strip */}
            <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-[1.75rem] bg-[#131316] shadow-[0_32px_60px_-40px_rgba(0,0,0,0.75)] lg:min-h-0">
              <span className="absolute left-6 top-6 z-[1] text-sm font-medium tracking-tight text-white/90">
                Horizontal logo
              </span>
              <div className="flex flex-wrap items-center justify-center gap-5 px-8 py-10 sm:gap-8 sm:px-12">
                <div className="rounded-2xl bg-white px-5 py-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
                  {logoUrl ? (
                    <LogoImg
                      src={logoUrl}
                      alt="Logo mark"
                      className="h-11 w-auto max-w-[140px] sm:h-12 sm:max-w-[160px]"
                    />
                  ) : (
                    <div className="flex h-11 w-24 items-center justify-center text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      Mark
                    </div>
                  )}
                </div>
                <span className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,5vw,2.75rem)] font-semibold tracking-tight text-white">
                  Brand
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contrast strip */}
      <section className="border-t border-white/[0.05] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Contrast-ranked swatches</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ranked.map((hex, i) => (
              <span
                key={`${hex}-r-${i}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-xs text-zinc-300"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                  style={{ backgroundColor: hex }}
                >
                  {i + 1}
                </span>
                <span className="font-mono text-[11px] text-zinc-400">{hex.toUpperCase()}</span>
                {logoFgHex ? (
                  <span className="text-[10px] text-emerald-400/90">
                    {formatContrastShort(contrastRatio(logoFgHex, hex))}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </section>

      {toast ? (
        <p
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-100 shadow-lg"
          role="status"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
