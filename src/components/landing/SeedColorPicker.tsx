"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import { hexToHsl, hslToHex } from "@/lib/colorPalette";

function isValidHex(hex: string): boolean {
  const h = hex.replace("#", "").trim();
  return /^([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(h);
}

function normalizeHex(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${h}`;
}

const PRESETS = [
  "#8b5cf6",
  "#22d3ee",
  "#f472b6",
  "#eab308",
  "#10b981",
  "#f43f5e",
] as const;

type Props = {
  value: string;
  onChange: (hex: string) => void;
};

export function SeedColorPicker({ value, onChange }: Props) {
  const uid = useId();
  const hexInputId = `seed-hex-${uid}`;
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const lastValidHsl = useRef(hexToHsl("#8b5cf6"));

  useEffect(() => {
    if (isValidHex(value)) {
      lastValidHsl.current = hexToHsl(normalizeHex(value));
    }
  }, [value]);

  const hsl = useMemo(() => {
    if (isValidHex(value)) {
      return hexToHsl(normalizeHex(value));
    }
    return lastValidHsl.current;
  }, [value]);

  const { h, s, l } = hsl;

  const onHue = useCallback(
    (hue: number) => {
      onChange(hslToHex(hue, s, l));
    },
    [onChange, s, l],
  );

  const onSat = useCallback(
    (sat: number) => {
      onChange(hslToHex(h, sat, l));
    },
    [onChange, h, l],
  );

  const onLight = useCallback(
    (light: number) => {
      onChange(hslToHex(h, s, light));
    },
    [onChange, h, s],
  );

  const onHexInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.trim();
      if (/^#?[0-9a-fA-F]{0,6}$/.test(v.replace("#", ""))) {
        onChange(v.startsWith("#") ? v : `#${v}`);
      }
    },
    [onChange],
  );

  const onNativeColor = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const eyedropper = useCallback(async () => {
    type EyeCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
    const E = (window as unknown as { EyeDropper?: EyeCtor }).EyeDropper;
    if (!E) return;
    try {
      const result = await new E().open();
      onChange(result.sRGBHex);
    } catch {
      /* dismissed */
    }
  }, [onChange]);

  const swatchBg = isValidHex(value) ? normalizeHex(value) : normalizeHex("#8b5cf6");

  const hueTrack = useMemo(
    () =>
      `linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))`,
    [],
  );
  const satTrack = useMemo(
    () =>
      `linear-gradient(to right, hsl(${h},0%,${l}%), hsl(${h},100%,${l}%))`,
    [h, l],
  );
  const lightTrack = useMemo(
    () =>
      `linear-gradient(to right, hsl(${h},${s}%,0%), hsl(${h},${s}%,50%), hsl(${h},${s}%,100%))`,
    [h, s],
  );

  const eyedropperOk = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "EyeDropper" in window,
    () => false,
  );

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.06] to-transparent p-4 md:p-5">
      <label
        htmlFor={hexInputId}
        className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
        Seed color
      </label>

      <div className="mt-3 flex flex-col gap-3">
        <input
          ref={nativeInputRef}
          type="color"
          value={isValidHex(value) ? normalizeHex(value) : "#8b5cf6"}
          onChange={onNativeColor}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />

        <div className="flex flex-wrap items-stretch gap-3 sm:flex-nowrap">
          <button
            type="button"
            onClick={() => nativeInputRef.current?.click()}
            aria-label="Open system color picker"
            className="hover-smooth relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#0a0a0f] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none ring-offset-2 ring-offset-[#0c0c12] focus-visible:ring-2 focus-visible:ring-violet-500/50 sm:h-[5rem] sm:w-[5rem]"
            style={{ backgroundColor: swatchBg }}
          >
            <span
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.08)_0%,transparent_45%,rgba(0,0,0,0.25)_100%)]"
              aria-hidden
            />
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-center font-mono text-[9px] font-semibold uppercase tracking-wide text-white/95 backdrop-blur-sm">
              Pick
            </span>
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={hexInputId}
                type="text"
                value={value}
                onChange={onHexInput}
                spellCheck={false}
                autoComplete="off"
                className="hover-smooth min-h-10 min-w-0 flex-1 rounded-lg border border-white/12 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 shadow-inner outline-none focus:border-violet-500/55 focus:ring-1 focus:ring-violet-500/25 hover:border-white/20"
                aria-label="Seed hex"
              />
              {eyedropperOk ? (
                <button
                  type="button"
                  onClick={eyedropper}
                  className="hover-smooth inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/14 bg-white/[0.06] px-3 text-[11px] font-medium text-zinc-200 hover:border-cyan-400/35 hover:bg-white/[0.1]"
                  title="Pick from screen"
                >
                  <svg
                    className="h-3.5 w-3.5 text-cyan-300/90"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M4 20h4l10.5-10.5a2.83 2.83 0 0 0-4-4L4 16v4z" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                  <span className="hidden sm:inline">Screen</span>
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-600">
                Presets
              </span>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  title={preset}
                  onClick={() => onChange(preset)}
                  className={`hover-smooth h-7 w-7 shrink-0 rounded-lg border shadow-inner ${
                    isValidHex(value) && normalizeHex(value).toLowerCase() === preset
                      ? "border-white/45 ring-1 ring-violet-400/45"
                      : "border-white/12 hover:border-white/30"
                  }`}
                  style={{ backgroundColor: preset }}
                >
                  <span className="sr-only">Use {preset}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <details className="group rounded-lg border border-white/[0.06] bg-black/20">
          <summary className="hover-smooth flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium text-zinc-500 marker:content-none [&::-webkit-details-marker]:hidden">
            Fine-tune HSL (hue · saturation · lightness)
            <span className="text-zinc-500 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </summary>
          <div className="space-y-2.5 border-t border-white/[0.06] px-3 pb-3 pt-2">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Hue
                </span>
                <span className="font-mono text-[10px] tabular-nums text-zinc-400">
                  {Math.round(h)}°
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={Math.round(h)}
                onChange={(e) => onHue(Number(e.target.value))}
                className="seed-hsl-slider w-full"
                style={{ background: hueTrack }}
                aria-label="Hue"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Saturation
                </span>
                <span className="font-mono text-[10px] tabular-nums text-zinc-400">
                  {Math.round(s)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(s)}
                onChange={(e) => onSat(Number(e.target.value))}
                className="seed-hsl-slider w-full"
                style={{ background: satTrack }}
                aria-label="Saturation"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Lightness
                </span>
                <span className="font-mono text-[10px] tabular-nums text-zinc-400">
                  {Math.round(l)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(l)}
                onChange={(e) => onLight(Number(e.target.value))}
                className="seed-hsl-slider w-full"
                style={{ background: lightTrack }}
                aria-label="Lightness"
              />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
