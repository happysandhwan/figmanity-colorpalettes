"use client";

import Link from "next/link";
import { Reorder, useDragControls } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { extractDominantHexesFromFile } from "@/lib/extractImagePalette";
import { generatePalette, hexToHsl, hexToRgb, hslToHex, rgbToHex } from "@/lib/colorPalette";
import { ColorTheoryPanel } from "@/components/generator/ColorTheoryPanel";
import { colorDisplayName, readableTextOn } from "@/lib/colorDisplayName";

const DEFAULT_SWATCHES = [
  { hex: "#EF767A", name: "Light Coral" },
  { hex: "#456990", name: "Baltic Blue" },
  { hex: "#49BEAA", name: "Ocean Mist" },
  { hex: "#49DCB1", name: "Turquoise" },
  { hex: "#EEB868", name: "Sunlit Clay" },
];

const MIN_SWATCHES = 2;
const MAX_SWATCHES = 8;

type Swatch = {
  id: string;
  hex: string;
  name: string;
  locked: boolean;
  favorited: boolean;
  flexGrow: number;
};

type DetailState = { index: number; kind: "contrast" | "info" };

function newId() {
  return `sw-${Math.random().toString(36).slice(2, 11)}`;
}

function randomSeedHex() {
  return hslToHex(Math.random() * 360, 52 + Math.random() * 38, 48 + Math.random() * 14);
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastRatio(fg: string, bg: string): number {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function formatRatio(n: number): string {
  return n >= 10 ? `${n.toFixed(1)}:1` : `${n.toFixed(2)}:1`;
}

function blendHex(a: string, b: string): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex(
    Math.round((ra.r + rb.r) / 2),
    Math.round((ra.g + rb.g) / 2),
    Math.round((ra.b + rb.b) / 2),
  );
}

type CoolorsPaletteGeneratorProps = {
  className?: string;
};

export function CoolorsPaletteGenerator({ className }: CoolorsPaletteGeneratorProps = {}) {
  const [swatches, setSwatches] = useState<Swatch[]>(() =>
    DEFAULT_SWATCHES.map((s) => ({
      id: newId(),
      hex: s.hex,
      name: s.name,
      locked: false,
      favorited: false,
      flexGrow: 1,
    })),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [theorySession, setTheorySession] = useState(0);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const swatchesRef = useRef<Swatch[]>(swatches);

  const [reorderAxis, setReorderAxis] = useState<"x" | "y">("x");
  useLayoutEffect(() => {
    swatchesRef.current = swatches;
  }, [swatches]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setReorderAxis(mq.matches ? "x" : "y");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const regenerate = useCallback(() => {
    setSwatches((prev) => {
      const unlocked = prev.filter((s) => !s.locked);
      if (unlocked.length === 0) {
        showToast("Unlock a swatch to regenerate");
        return prev;
      }
      const seed = randomSeedHex();
      const fresh = generatePalette("analogous", seed);
      let fi = 0;
      return prev.map((s) => {
        if (s.locked) return s;
        const hex = fresh[fi++] ?? fresh[fresh.length - 1];
        return { ...s, hex, name: colorDisplayName(hex) };
      });
    });
  }, [showToast]);

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

  const copyHex = useCallback(
    async (hex: string) => {
      try {
        await navigator.clipboard.writeText(hex);
        showToast(`Copied ${hex}`);
      } catch {
        showToast("Copy failed");
      }
    },
    [showToast],
  );

  const copyAll = useCallback(async () => {
    const lines = swatches.map((s) => s.hex.toUpperCase()).join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      showToast("Copied all HEX");
    } catch {
      showToast("Copy failed");
    }
  }, [swatches, showToast]);

  const toggleLockAll = useCallback(() => {
    setSwatches((prev) => {
      const allLocked = prev.every((s) => s.locked);
      return prev.map((s) => ({ ...s, locked: !allLocked }));
    });
  }, []);

  const removeAt = useCallback((index: number) => {
    setSwatches((prev) => (prev.length <= MIN_SWATCHES ? prev : prev.filter((_, i) => i !== index)));
    setDetail((d) => {
      if (!d) return null;
      if (d.index === index) return null;
      if (d.index > index) return { index: d.index - 1, kind: d.kind };
      return d;
    });
  }, []);

  const toggleFavorite = useCallback((index: number) => {
    setSwatches((prev) =>
      prev.map((s, i) => (i === index ? { ...s, favorited: !s.favorited } : s)),
    );
  }, []);

  const toggleLock = useCallback((index: number) => {
    setSwatches((prev) =>
      prev.map((s, i) => (i === index ? { ...s, locked: !s.locked } : s)),
    );
  }, []);

  const toggleDetail = useCallback((index: number, kind: "contrast" | "info") => {
    setDetail((d) => (d?.index === index && d.kind === kind ? null : { index, kind }));
  }, []);

  const handleReorder = useCallback((next: Swatch[]) => {
    const prev = swatchesRef.current;
    setDetail((d) => {
      if (!d) return null;
      const id = prev[d.index]?.id;
      if (!id) return null;
      const ni = next.findIndex((x) => x.id === id);
      if (ni < 0) return null;
      return { index: ni, kind: d.kind };
    });
    setSwatches(next);
  }, []);

  const insertAfterSeam = useCallback((afterIndex: number) => {
    setSwatches((prev) => {
      if (prev.length >= MAX_SWATCHES) {
        return prev;
      }
      const left = prev[afterIndex];
      const right = prev[afterIndex + 1];
      if (!left || !right) return prev;
      const hex = blendHex(left.hex, right.hex);
      const sw: Swatch = {
        id: newId(),
        hex,
        name: colorDisplayName(hex),
        locked: false,
        favorited: false,
        flexGrow: 1,
      };
      const next = [...prev];
      next.splice(afterIndex + 1, 0, sw);
      return next;
    });
    setDetail((d) => {
      if (!d) return null;
      if (d.index > afterIndex) return { index: d.index + 1, kind: d.kind };
      return d;
    });
  }, []);

  const allLocked = swatches.length > 0 && swatches.every((s) => s.locked);

  const applyPaletteFromImage = useCallback(
    async (file: File) => {
      setLogoBusy(true);
      try {
        const n = Math.min(MAX_SWATCHES, Math.max(MIN_SWATCHES, swatches.length));
        const hexes = await extractDominantHexesFromFile(file, n);
        setSwatches(
          hexes.map((hex) => ({
            id: newId(),
            hex,
            name: colorDisplayName(hex),
            locked: false,
            favorited: false,
            flexGrow: 1,
          })),
        );
        setDetail(null);
        showToast("Brand colors from your image");
      } catch {
        showToast("Could not read that image");
      } finally {
        setLogoBusy(false);
      }
    },
    [showToast, swatches.length],
  );

  const onLogoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) void applyPaletteFromImage(file);
    },
    [applyPaletteFromImage],
  );

  return (
    <div className={`relative flex min-h-0 flex-col bg-zinc-950 text-zinc-100 ${className ?? "h-[100dvh]"}`}>
      <header className="relative shrink-0 border-b border-white/[0.08] bg-gradient-to-b from-zinc-900/95 to-zinc-950">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/25 to-transparent"
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-3.5">
          <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="rounded-md border border-white/10 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Palette lab
            </span>
            <p className="max-w-md text-center text-[11px] leading-relaxed text-zinc-500 sm:text-left sm:text-xs">
              <span className="hidden min-[420px]:inline">
                <kbd className="rounded border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-200">
                  Space
                </kbd>{" "}
                new colors
                <span className="mx-2 text-zinc-600" aria-hidden>
                  ·
                </span>
                Hover a swatch for actions
                <span className="mx-2 text-zinc-600" aria-hidden>
                  ·
                </span>
                <span className="text-zinc-500">From image</span> for brand colours
              </span>
              <span className="min-[420px]:hidden">
                <kbd className="rounded border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-200">
                  Space
                </kbd>{" "}
                shuffle · image → brand
              </span>
            </p>
          </div>
          <nav
            className="flex flex-wrap items-center justify-center gap-2 sm:justify-end"
            aria-label="Global palette actions"
          >
            <input
              ref={logoInputRef}
              type="file"
              className="sr-only"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml"
              onChange={onLogoFileChange}
              aria-label="Choose image file for brand palette"
              tabIndex={-1}
            />
            <button
              type="button"
              disabled={logoBusy}
              aria-busy={logoBusy}
              aria-label="Upload a logo or image to build a brand palette from its colours"
              title="Upload a logo or image — columns become a brand palette from its colours"
              onClick={() => logoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-[11px] font-medium text-cyan-100 transition-colors hover:border-cyan-400/45 hover:bg-cyan-500/16 disabled:cursor-wait disabled:opacity-60 sm:px-3.5 sm:text-xs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden min-[380px]:inline">{logoBusy ? "Reading…" : "From image"}</span>
              <span className="min-[380px]:hidden">{logoBusy ? "…" : "Image"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTheorySession((n) => n + 1);
                setTheoryOpen(true);
              }}
              className="rounded-full border border-violet-500/35 bg-violet-500/10 px-3 py-2 text-[11px] font-medium text-violet-200 transition-colors hover:border-violet-400/50 hover:bg-violet-500/18 sm:px-3.5 sm:text-xs"
            >
              Color theory
            </button>
            <Link
              href="/logo-preview"
              className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] sm:px-3.5 sm:text-xs"
            >
              Logo lab
            </Link>
            <Link
              href="/brand-mockups"
              className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] sm:px-3.5 sm:text-xs"
            >
              Mockups
            </Link>
            <div className="inline-flex items-stretch rounded-full border border-white/10 bg-zinc-900/70 p-0.5 backdrop-blur-sm">
              <button
                type="button"
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 sm:px-4 sm:text-xs"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 012-2h8" />
                </svg>
                Copy all
              </button>
              <span className="my-1.5 w-px shrink-0 self-stretch bg-zinc-700" aria-hidden />
              <button
                type="button"
                onClick={toggleLockAll}
                title={allLocked ? "Unlock all swatches" : "Lock all swatches"}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-medium transition-colors sm:px-4 sm:text-xs ${
                  allLocked
                    ? "bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  {allLocked ? (
                    <>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 018 0v4" />
                    </>
                  ) : (
                    <>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 018 0" strokeLinecap="round" />
                    </>
                  )}
                </svg>
                {allLocked ? "Unlock all" : "Lock all"}
              </button>
            </div>
          </nav>
        </div>
      </header>

      <Reorder.Group
        as="div"
        axis={reorderAxis}
        values={swatches}
        onReorder={handleReorder}
        className="relative flex min-h-0 flex-1 flex-col overflow-visible bg-zinc-950 md:flex-row"
      >
        {swatches.map((s, i) => (
          <PaletteReorderColumn
            key={s.id}
            s={s}
            index={i}
            total={swatches.length}
            reorderAxis={reorderAxis}
            detail={detail}
            setDetail={setDetail}
            removeAt={removeAt}
            copyHex={copyHex}
            toggleFavorite={toggleFavorite}
            toggleDetail={toggleDetail}
            toggleLock={toggleLock}
            insertAfterSeam={insertAfterSeam}
          />
        ))}
      </Reorder.Group>

      {toast ? (
        <p
          className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-100"
          role="status"
        >
          {toast}
        </p>
      ) : null}

      <ColorTheoryPanel
        key={theorySession}
        open={theoryOpen}
        onClose={() => setTheoryOpen(false)}
        paletteHexes={swatches.map((sw) => sw.hex)}
      />
    </div>
  );
}

function PaletteReorderColumn({
  s,
  index: i,
  total,
  reorderAxis,
  detail,
  setDetail,
  removeAt,
  copyHex,
  toggleFavorite,
  toggleDetail,
  toggleLock,
  insertAfterSeam,
}: {
  s: Swatch;
  index: number;
  total: number;
  reorderAxis: "x" | "y";
  detail: DetailState | null;
  setDetail: (value: DetailState | null | ((prev: DetailState | null) => DetailState | null)) => void;
  removeAt: (index: number) => void;
  copyHex: (hex: string) => void | Promise<void>;
  toggleFavorite: (index: number) => void;
  toggleDetail: (index: number, kind: "contrast" | "info") => void;
  toggleLock: (index: number) => void;
  insertAfterSeam: (afterIndex: number) => void;
}) {
  const dragControls = useDragControls();
  const fg = readableTextOn(s.hex);
  const sub = fg === "#ffffff" ? "text-white/85" : "text-black/75";
  const ratioW = contrastRatio(s.hex, "#ffffff");
  const ratioB = contrastRatio(s.hex, "#000000");
  const { r, g, b } = hexToRgb(s.hex);
  const hsl = hexToHsl(s.hex);
  const isDetail = detail?.index === i;

  const startReorderDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    dragControls.start(e);
  };

  return (
    <Reorder.Item
      as="div"
      value={s}
      dragListener={false}
      dragControls={dragControls}
      className="relative flex min-h-0 min-w-0 flex-1 basis-0 flex-row touch-manipulation max-md:flex-col"
      style={{ flex: `${s.flexGrow} 1 0%` }}
      whileDrag={{
        scale: 1.025,
        y: reorderAxis === "x" ? -10 : -8,
        zIndex: 70,
        borderRadius: 8,
        cursor: "grabbing",
        boxShadow: "none",
      }}
      transition={{ layout: { type: "spring", stiffness: 440, damping: 36 } }}
    >
      <section
        className="group relative isolate flex min-h-[16vh] min-w-0 flex-1 flex-col justify-end md:min-h-0"
        style={{ backgroundColor: s.hex }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:opacity-0 [@media(hover:none)]:opacity-100"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.14) 100%)",
          }}
          aria-hidden
        />

        <div className="pointer-events-auto absolute left-1/2 top-3 z-[45] flex w-[min(100%,11rem)] -translate-x-1/2 flex-col items-center gap-1.5 opacity-100 transition-opacity duration-200 md:opacity-0 [@media(hover:hover)]:md:group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <span className="rounded-md border border-white/10 bg-zinc-950/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400 backdrop-blur-sm">
            Actions
          </span>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-px rounded-full border border-white/10 bg-zinc-950/90 px-0.5 py-0.5 backdrop-blur-md [&_svg]:h-[14px] [&_svg]:w-[14px]">
            <ColumnIconButton
              compact
              label={`Remove swatch ${i + 1}`}
              title="Remove column"
              disabled={total <= MIN_SWATCHES}
              onClick={() => removeAt(i)}
            >
              <IconX />
            </ColumnIconButton>
            <ColumnIconButton
              compact
              label="Contrast check"
              title="Contrast vs white & black"
              pressed={isDetail && detail?.kind === "contrast"}
              onClick={() => toggleDetail(i, "contrast")}
            >
              <IconContrast />
            </ColumnIconButton>
            <ColumnIconButton
              compact
              label="Favorite"
              title="Favorite"
              pressed={s.favorited}
              onClick={() => toggleFavorite(i)}
            >
              <IconHeart filled={s.favorited} />
            </ColumnIconButton>
            <div
              role="button"
              tabIndex={0}
              title="Drag to reorder column"
              aria-label="Drag to reorder column"
              onPointerDown={startReorderDrag}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                }
              }}
              className="cursor-grab rounded-full p-1 text-zinc-400 outline-none hover:bg-zinc-800 hover:text-zinc-100 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-violet-400/40"
            >
              <IconWidth />
            </div>
            <ColumnIconButton compact label="Copy HEX" title="Copy HEX" onClick={() => copyHex(s.hex)}>
              <IconCopy />
            </ColumnIconButton>
            <ColumnIconButton
              compact
              label="Color info"
              title="RGB & HSL"
              pressed={isDetail && detail?.kind === "info"}
              onClick={() => toggleDetail(i, "info")}
            >
              <IconInfo />
            </ColumnIconButton>
            <ColumnIconButton
              compact
              label={s.locked ? "Unlock" : "Lock"}
              title={s.locked ? "Unlock (included in regen)" : "Lock (keeps on regen)"}
              pressed={s.locked}
              onClick={() => toggleLock(i)}
            >
              <IconLock locked={s.locked} />
            </ColumnIconButton>
          </div>
        </div>

        {isDetail && detail?.kind === "contrast" ? (
          <div
            className="pointer-events-auto absolute left-2 right-2 top-20 z-[50] max-h-[45%] overflow-auto rounded-lg border border-white/10 bg-zinc-950/95 p-3 text-left text-[11px] text-white backdrop-blur-md sm:text-xs"
            role="dialog"
            aria-label="Contrast"
          >
            <p className="font-semibold text-white/95">WCAG contrast</p>
            <p className="mt-2 leading-relaxed text-white/85">
              vs white: <span className="font-mono tabular-nums">{formatRatio(ratioW)}</span>
              {ratioW >= 4.5 ? " (AA text)" : ratioW >= 3 ? " (AA large)" : ""}
            </p>
            <p className="mt-1 leading-relaxed text-white/85">
              vs black: <span className="font-mono tabular-nums">{formatRatio(ratioB)}</span>
              {ratioB >= 4.5 ? " (AA text)" : ratioB >= 3 ? " (AA large)" : ""}
            </p>
            <button
              type="button"
              className="mt-3 text-[10px] font-medium text-cyan-300/95 underline-offset-2 hover:underline"
              onClick={() => setDetail(null)}
            >
              Close
            </button>
          </div>
        ) : null}

        {isDetail && detail?.kind === "info" ? (
          <div
            className="pointer-events-auto absolute left-2 right-2 top-20 z-[50] max-h-[50%] overflow-auto rounded-lg border border-white/10 bg-zinc-950/95 p-3 text-left text-[11px] text-white backdrop-blur-md sm:text-xs"
            role="dialog"
            aria-label="Color info"
          >
            <p className="font-semibold text-white/95">Color values</p>
            <p className="mt-2 font-mono text-white/90">{s.hex.toUpperCase()}</p>
            <p className="mt-1 font-mono text-white/80">
              rgb({r}, {g}, {b})
            </p>
            <p className="mt-1 font-mono text-white/80">
              hsl({Math.round(hsl.h)}°, {Math.round(hsl.s)}%, {Math.round(hsl.l)}%)
            </p>
            <button
              type="button"
              className="mt-3 text-[10px] font-medium text-cyan-300/95 underline-offset-2 hover:underline"
              onClick={() => setDetail(null)}
            >
              Close
            </button>
          </div>
        ) : null}

        <div className="relative z-[5] flex flex-col items-center px-2 pb-6 text-center md:pb-10">
          <p className="font-semibold tracking-[0.2em] tabular-nums drop-shadow-sm" style={{ color: fg }}>
            {s.hex.replace("#", "").toUpperCase()}
          </p>
          <p className={`mt-1 text-sm font-medium drop-shadow-sm ${sub}`}>{s.name}</p>
        </div>
      </section>

      {i < total - 1 ? (
        <AddColorSeam
          key={`seam-${s.id}`}
          afterIndex={i}
          canInsert={total < MAX_SWATCHES}
          onInsert={() => insertAfterSeam(i)}
        />
      ) : null}
    </Reorder.Item>
  );
}

function AddColorSeam({
  afterIndex,
  canInsert,
  onInsert,
}: {
  afterIndex: number;
  canInsert: boolean;
  onInsert: () => void;
}) {
  return (
    <div
      className="relative z-[18] flex w-0 shrink-0 self-stretch overflow-visible max-md:h-0 max-md:w-full max-md:self-auto"
      role="presentation"
    >
      {/* Narrow hit strip exactly on the boundary; + only visible on hover (fine pointer) */}
      <div
        className="group/seam pointer-events-auto absolute top-0 bottom-0 left-1/2 z-[18] flex w-8 -translate-x-1/2 items-center justify-center max-md:top-1/2 max-md:left-1/2 max-md:h-11 max-md:w-14 max-md:-translate-x-1/2 max-md:-translate-y-1/2"
        onDragOver={(e) => e.preventDefault()}
      >
        <div
          className="pointer-events-none absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-white/45 shadow-[0_0_10px_rgba(255,255,255,0.4)] max-md:inset-y-auto max-md:top-1/2 max-md:left-1/2 max-md:h-px max-md:w-12 max-md:-translate-x-1/2 max-md:-translate-y-1/2"
          aria-hidden
        />

        <div className="pointer-events-none absolute bottom-full left-1/2 z-[19] mb-2 hidden w-max -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900/95 px-2.5 py-1.5 text-center text-[10px] font-medium text-zinc-200 opacity-0 backdrop-blur-md transition-opacity duration-200 md:block [@media(hover:hover)]:group-hover/seam:opacity-100 [@media(hover:hover)]:group-focus-within/seam:opacity-100">
          <span className="whitespace-nowrap">Add color</span>
          <div
            className="mx-auto mt-1 h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-zinc-900/95"
            aria-hidden
          />
        </div>

        <button
          type="button"
          disabled={!canInsert}
          aria-label={`Add color between columns ${afterIndex + 1} and ${afterIndex + 2}`}
          onClick={(e) => {
            e.stopPropagation();
            if (canInsert) onInsert();
          }}
          className="relative flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-zinc-100 transition-[opacity,transform] duration-200 max-md:opacity-95 hover:scale-105 hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 md:pointer-events-none md:opacity-0 md:scale-90 [@media(hover:hover)]:md:group-hover/seam:pointer-events-auto [@media(hover:hover)]:md:group-hover/seam:opacity-100 [@media(hover:hover)]:md:group-hover/seam:scale-100 [@media(hover:hover)]:md:group-focus-within/seam:pointer-events-auto [@media(hover:hover)]:md:group-focus-within/seam:opacity-100 [@media(hover:hover)]:md:group-focus-within/seam:scale-100 [@media(hover:none)]:md:pointer-events-auto [@media(hover:none)]:md:opacity-90 [@media(hover:none)]:md:scale-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ColumnIconButton({
  children,
  label,
  title,
  onClick,
  disabled,
  pressed,
  compact,
}: {
  children: ReactNode;
  label: string;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  compact?: boolean;
}) {
  const pad = compact ? "p-1" : "p-1.5";
  const radius = compact ? "rounded-full" : "rounded-md";
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`${radius} ${pad} transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        pressed ? "bg-violet-500/25 text-violet-200" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function IconContrast() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" strokeLinecap="round" />
    </svg>
  );
}

function IconHeart({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWidth() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M8 9l-3 3 3 3M16 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h8" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconLock({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 018 0v4" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0" strokeLinecap="round" />
    </svg>
  );
}
