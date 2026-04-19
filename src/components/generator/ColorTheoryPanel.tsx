"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generatePalette, hexToHsl, hexToRgb, hslToHex, type GeneratorMode } from "@/lib/colorPalette";

type ColorTheoryPanelProps = {
  open: boolean;
  onClose: () => void;
  /** Current palette colors (left → right) */
  paletteHexes: string[];
};

function contrastRatio(fg: string, bg: string): number {
  const rel = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const lin = [r, g, b].map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const L1 = rel(fg);
  const L2 = rel(bg);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function formatRatio(n: number): string {
  return n >= 10 ? `${n.toFixed(1)}:1` : `${n.toFixed(2)}:1`;
}

const HARMONY_MODES: { mode: GeneratorMode; title: string; blurb: string }[] = [
  {
    mode: "analogous",
    title: "Analogous",
    blurb: "Neighbours on the wheel — calm, cohesive UI palettes.",
  },
  {
    mode: "complementary",
    title: "Complementary",
    blurb: "Opposite hues — strong accent vs base, use sparingly.",
  },
  {
    mode: "triadic",
    title: "Triadic",
    blurb: "Three evenly spaced hues — playful but balanced.",
  },
  {
    mode: "ramp",
    title: "Monochrome ramp",
    blurb: "Same hue, different lightness — typography & surfaces.",
  },
];

const springPanel = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.85 };
const easeOut = [0.22, 1, 0.36, 1] as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.08 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
};

function MiniStrip({ colors }: { colors: string[] }) {
  return (
    <motion.div
      className="mt-2 flex h-7 w-full overflow-hidden rounded-md border border-white/10"
      initial={{ opacity: 0, scaleX: 0.96 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.35, ease: easeOut }}
    >
      {colors.map((c, i) => (
        <motion.div
          key={`${c}-${i}`}
          className="min-w-0 flex-1"
          style={{ backgroundColor: c }}
          title={c}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04, duration: 0.25 }}
        />
      ))}
    </motion.div>
  );
}

export function ColorTheoryPanel({ open, onClose, paletteHexes }: ColorTheoryPanelProps) {
  const baseHex = paletteHexes[0] ?? "#456990";
  const baseHsl = useMemo(() => hexToHsl(baseHex), [baseHex]);

  const [h, setH] = useState(() => Math.round(baseHsl.h));
  const [s, setS] = useState(() => Math.round(baseHsl.s));
  const [l, setL] = useState(() => Math.round(baseHsl.l));

  const previewHex = useMemo(() => hslToHex(h, s, l), [h, s, l]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onKey]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sampleContrast =
    paletteHexes.length >= 2 ? contrastRatio(paletteHexes[0]!, paletteHexes[1]!) : null;

  return (
    <AnimatePresence mode="sync">
      {open ? (
        <>
          <motion.button
            key="color-theory-backdrop"
            type="button"
            className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-[2px]"
            aria-label="Close color theory panel"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
          />
          <motion.aside
            key="color-theory-sheet"
            className="fixed right-0 top-0 z-[201] flex h-full w-full max-w-md flex-col border-l border-white/10 bg-zinc-950 shadow-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="color-theory-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={springPanel}
          >
            <motion.div
              className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springPanel, delay: 0.04 }}
            >
              <div>
                <h2 id="color-theory-title" className="text-sm font-semibold tracking-tight text-zinc-100">
                  Color theory
                </h2>
                <p className="mt-0.5 text-[11px] text-zinc-500">Quick concepts tied to your palette</p>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
              >
                Close
              </motion.button>
            </motion.div>

            <motion.div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <motion.section
                variants={staggerItem}
                className="rounded-xl border border-white/10 bg-zinc-900/40 p-4"
              >
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Try HSL</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  <span className="font-medium text-zinc-300">H</span>ue is position on the wheel.{" "}
                  <span className="font-medium text-zinc-300">S</span>aturation is vivid vs muted.{" "}
                  <span className="font-medium text-zinc-300">L</span>ightness is dark vs bright.
                </p>
                <motion.div
                  className="mt-4 aspect-[2/1] w-full max-w-[220px] rounded-lg border border-white/10 shadow-none"
                  animate={{ backgroundColor: previewHex }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
                <p className="mt-2 font-mono text-xs text-zinc-300">{previewHex.toUpperCase()}</p>

                <label className="mt-4 block text-[11px] font-medium text-zinc-500">
                  Hue — {h}°
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={h}
                    onChange={(e) => setH(Number(e.target.value))}
                    className="mt-1.5 block w-full accent-violet-500"
                  />
                </label>
                <label className="mt-3 block text-[11px] font-medium text-zinc-500">
                  Saturation — {s}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={s}
                    onChange={(e) => setS(Number(e.target.value))}
                    className="mt-1.5 block w-full accent-violet-500"
                  />
                </label>
                <label className="mt-3 block text-[11px] font-medium text-zinc-500">
                  Lightness — {l}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={l}
                    onChange={(e) => setL(Number(e.target.value))}
                    className="mt-1.5 block w-full accent-violet-500"
                  />
                </label>
                <button
                  type="button"
                  className="mt-3 text-[11px] font-medium text-violet-300 hover:text-violet-200"
                  onClick={() => {
                    setH(Math.round(baseHsl.h));
                    setS(Math.round(baseHsl.s));
                    setL(Math.round(baseHsl.l));
                  }}
                >
                  Reset to first swatch
                </button>
              </motion.section>

              <motion.section variants={staggerItem} className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Hue wheel</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  Colors blend smoothly around the circle. Your generator nudges hue in small steps for natural
                  palettes.
                </p>
                <motion.div
                  className="mx-auto mt-4 h-36 w-36 rounded-full border border-white/10"
                  style={{
                    background:
                      "conic-gradient(from 0deg, hsl(0,85%,55%), hsl(60,85%,52%), hsl(120,75%,48%), hsl(180,70%,46%), hsl(240,75%,55%), hsl(300,80%,55%), hsl(360,85%,55%))",
                  }}
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.88, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.06 }}
                />
              </motion.section>

              <motion.section variants={staggerItem} className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Harmony families</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  Strips below use your <span className="text-zinc-300">first swatch</span> as the seed — same engine
                  as the lab.
                </p>
                <ul className="mt-4 space-y-4">
                  {HARMONY_MODES.map(({ mode, title, blurb }) => {
                    const colors = generatePalette(mode, baseHex);
                    return (
                      <li key={mode} className="rounded-xl border border-white/10 bg-zinc-900/35 px-3 py-3">
                        <p className="text-sm font-medium text-zinc-200">{title}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{blurb}</p>
                        <MiniStrip colors={colors} />
                      </li>
                    );
                  })}
                </ul>
              </motion.section>

              <motion.section variants={staggerItem} className="mt-6 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">This lab</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  Press{" "}
                  <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                    Space
                  </kbd>{" "}
                  to shuffle — new sets use an <span className="text-zinc-300">analogous</span> scheme around a random
                  seed so columns feel related, not random rainbow noise.
                </p>
              </motion.section>

              <motion.section variants={staggerItem} className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Your swatches</h3>
                <ul className="mt-3 space-y-2">
                  {paletteHexes.slice(0, 8).map((hex, idx) => {
                    const { h: hh, s: ss, l: ll } = hexToHsl(hex);
                    return (
                      <li
                        key={`${hex}-${idx}`}
                        className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/30 px-2 py-2"
                      >
                        <span
                          className="h-9 w-9 shrink-0 rounded-md border border-white/10"
                          style={{ backgroundColor: hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[11px] text-zinc-200">{hex.toUpperCase()}</p>
                          <p className="text-[10px] text-zinc-500">
                            hsl({Math.round(hh)}°, {Math.round(ss)}%, {Math.round(ll)}%)
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </motion.section>

              <motion.section variants={staggerItem} className="mt-6 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Contrast</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  On each column, open <span className="text-zinc-300">Contrast</span> to see WCAG ratios vs white and
                  black. For small text on a swatch, aim for about <span className="text-zinc-300">4.5:1</span> or
                  higher.
                </p>
                {sampleContrast != null ? (
                  <p className="mt-2 text-[12px] text-zinc-500">
                    Example — swatch 1 vs 2:{" "}
                    <span className="font-mono text-zinc-300">{formatRatio(sampleContrast)}</span>
                  </p>
                ) : null}
              </motion.section>
            </motion.div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
