"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useCallback, useEffect, useRef, useState } from "react";

type Cell = {
  name: string;
  hex: string;
  gridClass: string;
  labelClass: string;
};

const PRESETS: Cell[][] = [
  [
    { name: "Blue Kadestin", hex: "#0D9488", gridClass: "col-start-1 row-start-1 row-span-2", labelClass: "text-white" },
    { name: "Old Leaf", hex: "#172554", gridClass: "col-start-2 row-start-1", labelClass: "text-white" },
    { name: "Maroona", hex: "#CA8A04", gridClass: "col-start-2 row-start-2", labelClass: "text-zinc-950" },
    { name: "Mendung", hex: "#EA580C", gridClass: "col-start-2 row-start-3", labelClass: "text-white" },
    { name: "Mendung Parah", hex: "#38BDF8", gridClass: "col-start-1 row-start-3", labelClass: "text-zinc-950" },
  ],
  [
    { name: "Lilac Veil", hex: "#5B21B6", gridClass: "col-start-1 row-start-1 row-span-2", labelClass: "text-white" },
    { name: "Night Ink", hex: "#1E1B4B", gridClass: "col-start-2 row-start-1", labelClass: "text-white" },
    { name: "Soft Iris", hex: "#C4B5FD", gridClass: "col-start-2 row-start-2", labelClass: "text-zinc-950" },
    { name: "Fuchsia Pop", hex: "#DB2777", gridClass: "col-start-2 row-start-3", labelClass: "text-white" },
    { name: "Glacier", hex: "#67E8F9", gridClass: "col-start-1 row-start-3", labelClass: "text-zinc-950" },
  ],
  [
    { name: "Moss Deep", hex: "#065F46", gridClass: "col-start-1 row-start-1 row-span-2", labelClass: "text-white" },
    { name: "Pine", hex: "#14532D", gridClass: "col-start-2 row-start-1", labelClass: "text-white" },
    { name: "Chartreuse", hex: "#84CC16", gridClass: "col-start-2 row-start-2", labelClass: "text-zinc-950" },
    { name: "Honey", hex: "#EAB308", gridClass: "col-start-2 row-start-3", labelClass: "text-zinc-950" },
    { name: "Mint Mist", hex: "#99F6E4", gridClass: "col-start-1 row-start-3", labelClass: "text-zinc-950" },
  ],
  [
    { name: "Slate Core", hex: "#334155", gridClass: "col-start-1 row-start-1 row-span-2", labelClass: "text-white" },
    { name: "Ink", hex: "#0F172A", gridClass: "col-start-2 row-start-1", labelClass: "text-white" },
    { name: "Rose Clay", hex: "#FB7185", gridClass: "col-start-2 row-start-2", labelClass: "text-zinc-950" },
    { name: "Apricot", hex: "#FB923C", gridClass: "col-start-2 row-start-3", labelClass: "text-zinc-950" },
    { name: "Paper", hex: "#F8FAFC", gridClass: "col-start-1 row-start-3", labelClass: "text-zinc-950" },
  ],
];

export function HeroBentoPalette() {
  const root = useRef<HTMLDivElement>(null);
  const prevPresetForAnim = useRef<number | null>(null);

  const [presetIndex, setPresetIndex] = useState(0);
  const [past, setPast] = useState<number[]>([]);
  const [future, setFuture] = useState<number[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const cells = PRESETS[presetIndex] ?? PRESETS[0];
  const n = PRESETS.length;
  const themeNum = presetIndex + 1;

  const stepTheme = useCallback((delta: number) => {
    setPresetIndex((cur) => {
      const next = ((cur + delta) % n + n) % n;
      if (next !== cur) {
        setPast((p) => [...p, cur].slice(-24));
        setFuture([]);
      }
      return next;
    });
  }, [n]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setPresetIndex((cur) => {
        setFuture((f) => [cur, ...f]);
        return prev;
      });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPresetIndex((cur) => {
        setPast((p) => [...p, cur].slice(-24));
        return next;
      });
      return f.slice(1);
    });
  }, []);

  const copyHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
    } catch {
      setCopied(null);
    }
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1400);
    return () => window.clearTimeout(id);
  }, [copied]);

  useGSAP(
    () => {
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".bento-toolbar", {
        opacity: 0,
        y: -14,
        duration: 0.42,
      }      ).from(
        ".bento-cell",
        {
          // Avoid animating opacity on the swatch itself: a stuck/low final opacity
          // reads as “black tiles” over the grid while HEX labels still render.
          y: 14,
          duration: 0.45,
          stagger: 0.07,
          ease: "power2.out",
          clearProps: "transform",
        },
        "-=0.12",
      );
    },
    { scope: root },
  );

  useGSAP(
    () => {
      if (prevPresetForAnim.current === null) {
        prevPresetForAnim.current = presetIndex;
        return;
      }
      if (prevPresetForAnim.current === presetIndex) return;
      prevPresetForAnim.current = presetIndex;

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      gsap.fromTo(
        root.current?.querySelectorAll(".bento-cell") ?? [],
        { scale: 0.985 },
        {
          scale: 1,
          duration: 0.38,
          stagger: 0.06,
          ease: "power2.out",
          clearProps: "transform",
        },
      );
    },
    { scope: root, dependencies: [presetIndex] },
  );

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return (
    <div
      ref={root}
      className="hero-visual relative w-full max-w-[min(100%,560px)] lg:max-w-none"
    >
      <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[#0a0a0d] shadow-[0_32px_100px_-36px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.04)] md:rounded-[2rem]">
        <div className="bento-toolbar flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/[0.07] bg-zinc-950/80 px-3 py-3 sm:gap-4 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              className="hover-smooth flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-zinc-900/90 text-[1.05rem] font-medium leading-none text-zinc-400 hover:border-white/20 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.97] sm:h-10 sm:w-10"
              aria-label="Previous theme"
              onClick={() => stepTheme(-1)}
            >
              −
            </button>
            <div className="flex min-w-[2.75rem] flex-col items-center justify-center gap-px py-0.5 text-center sm:min-w-[3.25rem]">
              <span
                className="text-lg font-semibold tabular-nums leading-none tracking-tight text-zinc-100 sm:text-xl"
                title={`Theme ${themeNum} of ${n}`}
              >
                {themeNum}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                of {n}
              </span>
            </div>
            <button
              type="button"
              className="hover-smooth flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-zinc-900/90 text-[1.05rem] font-medium leading-none text-zinc-400 hover:border-white/20 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.97] sm:h-10 sm:w-10"
              aria-label="Next theme"
              onClick={() => stepTheme(1)}
            >
              +
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-zinc-400 sm:gap-3">
            <a
              href="#generate"
              className="hover-smooth rounded-md p-1.5 hover:bg-white/10 hover:text-zinc-100"
              title="Open palette lab"
              aria-label="Open palette lab"
            >
              <IconFlask />
            </a>
            <a
              href="#palettes"
              className="hover-smooth rounded-md p-1.5 hover:bg-white/10 hover:text-zinc-100"
              title="Browse palettes"
              aria-label="Browse palettes"
            >
              <IconBucket />
            </a>
            <a
              href="#features"
              className="hover-smooth hidden rounded-md p-1.5 hover:bg-white/10 hover:text-zinc-100 sm:inline-flex"
              title="Why Figmanity"
              aria-label="Why Figmanity"
            >
              <IconEye />
            </a>
            <button
              type="button"
              disabled={!canUndo}
              className="hover-smooth hidden rounded-md p-1.5 text-sm text-zinc-400 enabled:hover:bg-white/10 enabled:hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-25 sm:inline"
              aria-label="Undo theme"
              onClick={undo}
            >
              ↺
            </button>
            <button
              type="button"
              disabled={!canRedo}
              className="hover-smooth hidden rounded-md p-1.5 text-sm text-zinc-400 enabled:hover:bg-white/10 enabled:hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-25 sm:inline"
              aria-label="Redo theme"
              onClick={redo}
            >
              ↻
            </button>
            <a
              href="#cta"
              className="hover-smooth rounded-md p-1.5 hover:bg-white/10 hover:text-zinc-100"
              title="Get early access"
              aria-label="Get early access"
            >
              <IconBookmark />
            </a>
          </div>
        </div>

        <div className="relative grid min-h-[260px] grid-cols-2 grid-rows-3 gap-2 bg-black/55 p-2 h-[min(68vw,380px)] sm:h-[400px] sm:min-h-[400px] sm:p-3 md:h-[440px] md:min-h-[440px]">
          {cells.map((cell) => (
            <div
              key={`${presetIndex}-${cell.name}`}
              className={`bento-cell hover-smooth relative flex min-h-0 flex-col overflow-hidden rounded-2xl p-3 ring-1 ring-white/[0.06] hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-18px_rgba(0,0,0,0.75)] sm:p-4 ${cell.gridClass}`}
              style={{ backgroundColor: cell.hex }}
            >
              <p
                className={`line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-tight sm:text-base ${cell.labelClass}`}
              >
                {cell.name}
              </p>
              <div className="mt-auto flex items-end justify-between gap-2 pt-6">
                <span
                  className={`font-mono text-[10px] tracking-wide sm:text-xs ${cell.labelClass} opacity-90`}
                >
                  {cell.hex}
                </span>
                <button
                  type="button"
                  onClick={() => copyHex(cell.hex)}
                  aria-label={`Copy ${cell.hex}`}
                  className={`hover-smooth flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm active:scale-95 ${
                    copied === cell.hex
                      ? "bg-emerald-500 text-white"
                      : "bg-white/92 text-zinc-800 ring-1 ring-black/10 hover:bg-white"
                  }`}
                >
                  {copied === cell.hex ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5a2 2 0 012-2h8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}

          {copied ? (
            <p
              className="pointer-events-none absolute bottom-2 left-1/2 z-[1] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/95 px-3 py-1 text-[10px] font-medium text-zinc-200 shadow-lg backdrop-blur-sm"
              role="status"
            >
              Copied {copied}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IconFlask() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 3h6M10 6.5l-5 14a2 2 0 002 2h10a2 2 0 002-2l-5-14V3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 18h8" strokeLinecap="round" />
    </svg>
  );
}

function IconBucket() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M4 14h16l-1.5 6H5.5L4 14z" strokeLinejoin="round" />
      <path d="M6 14V8a6 6 0 0112 0v6" strokeLinecap="round" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconBookmark() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 4h12v17l-6-4-6 4V4z" strokeLinejoin="round" />
    </svg>
  );
}
