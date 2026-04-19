"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { generatePalette, hslToHex } from "@/lib/colorPalette";
import { colorDisplayName, readableTextOn } from "@/lib/colorDisplayName";

const DEFAULT_SWATCHES = [
  { hex: "#EF767A", name: "Light Coral" },
  { hex: "#456990", name: "Baltic Blue" },
  { hex: "#49BEAA", name: "Ocean Mist" },
  { hex: "#49DCB1", name: "Turquoise" },
  { hex: "#EEB868", name: "Sunlit Clay" },
];

function randomSeedHex() {
  return hslToHex(Math.random() * 360, 52 + Math.random() * 38, 48 + Math.random() * 14);
}

type CoolorsPaletteGeneratorProps = {
  /** When set, height follows parent (e.g. under site header). Otherwise full viewport. */
  className?: string;
};

export function CoolorsPaletteGenerator({ className }: CoolorsPaletteGeneratorProps = {}) {
  const [colors, setColors] = useState<{ hex: string; name: string }[]>(() =>
    DEFAULT_SWATCHES.map((s) => ({ hex: s.hex, name: s.name })),
  );

  const regenerate = useCallback(() => {
    const seed = randomSeedHex();
    const next = generatePalette("analogous", seed);
    setColors(
      next.map((hex) => ({
        hex,
        name: colorDisplayName(hex),
      })),
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      e.preventDefault();
      regenerate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [regenerate]);

  return (
    <div
      className={`flex min-h-0 flex-col bg-white ${className ?? "h-[100dvh]"}`}
    >
      <header className="flex min-h-[2.75rem] shrink-0 flex-col gap-2 border-b border-zinc-200/90 bg-white px-3 py-2 sm:h-11 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:py-0 sm:px-5">
        <p className="text-center text-[10px] font-medium leading-snug tracking-wide text-zinc-400 sm:text-left sm:text-xs">
          <span className="hidden min-[400px]:inline">
            Press the <span className="text-zinc-600">spacebar</span> to generate color palettes!
          </span>
          <span className="min-[400px]:hidden">
            Tap swatches · <span className="text-zinc-600">Space</span> for new palette
          </span>
        </p>
        <nav
          className="flex flex-wrap items-center justify-center gap-0.5 text-zinc-400 sm:flex-nowrap sm:justify-end"
          aria-label="Palette actions"
        >
          <IconButton label="View" title="View">
            <EyeIcon />
          </IconButton>
          <IconButton label="Export" title="Export">
            <ExportIcon />
          </IconButton>
          <IconButton label="Save" title="Save">
            <HeartIcon />
          </IconButton>
          <IconButton label="Adjust" title="Adjust">
            <SlidersIcon />
          </IconButton>
          <IconButton label="Lock all" title="Lock">
            <LockIcon />
          </IconButton>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {colors.map((c, i) => {
          const fg = readableTextOn(c.hex);
          const sub = fg === "#ffffff" ? "text-white/85" : "text-black/75";
          return (
            <section
              key={`${c.hex}-${i}`}
              className="relative flex min-h-[18vh] min-w-0 flex-1 flex-col justify-end transition-colors duration-500 ease-out md:min-h-0"
              style={{ backgroundColor: c.hex }}
            >
              <div className="flex flex-col items-center px-2 pb-6 text-center md:pb-10">
                <p
                  className="font-semibold tracking-[0.2em] tabular-nums"
                  style={{ color: fg }}
                >
                  {c.hex.toUpperCase()}
                </p>
                <p className={`mt-1 text-sm font-medium ${sub}`}>{c.name}</p>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  title,
}: {
  children: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 sm:p-2"
    >
      {children}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
