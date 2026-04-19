"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sampleAverageLogoRgb } from "@/lib/brandLogoContrast";
import { extractDominantHexesFromFile } from "@/lib/extractImagePalette";
import { analyzeLogoFromDominants, type LogoAnalysis, type LogoTone } from "@/lib/logoColorAnalysis";
import {
  buildLogoFilter,
  buildLogoPreviewZip,
  downloadBlob,
  type LogoAppearanceAdjust,
} from "@/lib/logoCanvasExport";
import { generatePalette, hexToHsl, hslToHex, type GeneratorMode } from "@/lib/colorPalette";
import { isSvgFile, prepareSvgLogoFile } from "@/lib/logoSvgPrepare";
import { buildSmartBackgrounds } from "@/lib/logoSmartBackgrounds";

function toneLabel(t: LogoTone): string {
  if (t === "light") return "Mostly light";
  if (t === "dark") return "Mostly dark";
  return "Mixed tones";
}

function previewFilter(
  logoHex: string | null,
  bgSampleHex: string,
  appearance: LogoAppearanceAdjust,
): string | undefined {
  const f = buildLogoFilter(logoHex, bgSampleHex, appearance);
  return f === "none" ? undefined : f;
}

function mergeCssFilters(...parts: (string | undefined)[]): string | undefined {
  const s = parts.filter(Boolean).join(" ");
  return s || undefined;
}

function bentoSymbolBg(primaryHex: string): string {
  const { h, s, l } = hexToHsl(primaryHex);
  return hslToHex(h, Math.min(96, Math.max(56, s + 14)), Math.max(50, Math.min(58, l * 0.55 + 28)));
}

function bentoHorizontalBg(primaryHex: string): string {
  const { h, s } = hexToHsl(primaryHex);
  return hslToHex(h, Math.min(42, s * 0.5 + 10), 9);
}

/** Very light panel wash from a palette anchor (vertical column). */
function bentoVerticalWash(anchorHex: string, vivid?: boolean): string {
  const { h, s } = hexToHsl(anchorHex);
  if (vivid) {
    return hslToHex(h, Math.min(28, s * 0.45 + 10), 93);
  }
  return hslToHex(h, Math.min(14, s * 0.25 + 5), 98.6);
}

function pickLightest(hexes: string[]): string {
  if (hexes.length === 0) return "#fafafa";
  return [...hexes].reduce((a, b) => (hexToHsl(a).l >= hexToHsl(b).l ? a : b));
}

function pickDarkest(hexes: string[]): string {
  if (hexes.length === 0) return "#131316";
  return [...hexes].reduce((a, b) => (hexToHsl(a).l <= hexToHsl(b).l ? a : b));
}

function pickMostSaturated(hexes: string[]): string {
  if (hexes.length === 0) return "#ea580c";
  return [...hexes].reduce((a, b) => (hexToHsl(a).s >= hexToHsl(b).s ? a : b));
}

type BentoSurfaces = { vertical: string; symbol: string; horizontal: string };

function computeBentoSurfaces(colors: string[], vividVertical: boolean): BentoSurfaces {
  if (!colors.length) {
    return { vertical: "#fafafa", symbol: "#ea5a1c", horizontal: "#131316" };
  }
  return {
    vertical: bentoVerticalWash(pickLightest(colors), vividVertical),
    symbol: bentoSymbolBg(pickMostSaturated(colors)),
    horizontal: bentoHorizontalBg(pickDarkest(colors)),
  };
}

function palettesEqual(a: string[] | null, b: string[]): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every((c, i) => c.toLowerCase() === b[i]!.toLowerCase());
}

/** Nudge raster logo hues toward a palette “ink” colour (CSS filters). */
function paletteInkSteerFilter(logoHex: string | null, inkTargetHex: string): string | undefined {
  if (!logoHex) return undefined;
  const from = hexToHsl(logoHex);
  const to = hexToHsl(inkTargetHex);
  let dh = to.h - from.h;
  while (dh > 180) dh -= 360;
  while (dh < -180) dh += 360;
  if (Math.abs(dh) < 3.5) return undefined;
  const sat = Math.min(1.22, 1 + to.s / 260);
  return `hue-rotate(${dh.toFixed(1)}deg) saturate(${sat.toFixed(2)})`;
}

const PALETTE_MODES: GeneratorMode[] = [
  "analogous",
  "triadic",
  "complementary",
  "random",
  "ramp",
];

function padPaletteToSix(gen: string[]): string[] {
  const out = [...gen];
  const seed = out[0] ?? "#6b7280";
  const ramp = generatePalette("ramp", seed);
  for (const c of ramp) {
    if (out.length >= 6) break;
    if (!out.includes(c)) out.push(c);
  }
  let i = 0;
  while (out.length < 6) {
    out.push(out[i % out.length]!);
    i++;
  }
  return out.slice(0, 6);
}

export function LogoPreviewTool() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoIconUrl, setLogoIconUrl] = useState<string | null>(null);
  const [iconSampleHex, setIconSampleHex] = useState<string | null>(null);
  const [svgOriginalText, setSvgOriginalText] = useState<string | null>(null);
  const [isSvg, setIsSvg] = useState(false);
  const [analysis, setAnalysis] = useState<LogoAnalysis | null>(null);
  const [logoSampleHex, setLogoSampleHex] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const [busyZip, setBusyZip] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [logoHueDeg, setLogoHueDeg] = useState(0);
  const [logoSatPercent, setLogoSatPercent] = useState(100);
  /** When set, bento surfaces + dots follow this generated deck instead of logo analysis only. */
  const [previewPalette, setPreviewPalette] = useState<string[] | null>(null);
  /** Six (or fewer) full palettes for quick comparison thumbnails. */
  const [paletteOptions, setPaletteOptions] = useState<string[][]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const logoUrlRef = useRef<string | null>(null);
  const iconUrlRef = useRef<string | null>(null);

  const logoAppearance = useMemo<LogoAppearanceAdjust>(
    () => ({ hueRotateDeg: logoHueDeg, saturatePercent: logoSatPercent }),
    [logoHueDeg, logoSatPercent],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    logoUrlRef.current = logoUrl;
  }, [logoUrl]);

  useEffect(() => {
    iconUrlRef.current = logoIconUrl;
  }, [logoIconUrl]);

  useEffect(() => {
    return () => {
      if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
      if (iconUrlRef.current) URL.revokeObjectURL(iconUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!logoUrl) return;
    let cancelled = false;
    void sampleAverageLogoRgb(logoUrl).then((hex) => {
      if (!cancelled) setLogoSampleHex(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  useEffect(() => {
    if (!logoIconUrl) return;
    let cancelled = false;
    void sampleAverageLogoRgb(logoIconUrl).then((hex) => {
      if (!cancelled) setIconSampleHex(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [logoIconUrl]);

  const backgrounds = useMemo(
    () => (analysis ? buildSmartBackgrounds(analysis) : []),
    [analysis],
  );

  const activeDeckForMain = useMemo(
    () => previewPalette ?? analysis?.balancedPalette ?? [],
    [previewPalette, analysis],
  );

  const mainSurfaces = useMemo(
    () =>
      computeBentoSurfaces(
        activeDeckForMain,
        Boolean(previewPalette && activeDeckForMain.length),
      ),
    [activeDeckForMain, previewPalette],
  );

  const verticalPanelBg = mainSurfaces.vertical;
  const symbolBg = mainSurfaces.symbol;
  const horizontalBg = mainSurfaces.horizontal;

  const bentoDots = useMemo(() => activeDeckForMain.slice(0, 3), [activeDeckForMain]);

  const brandInkHex = useMemo(
    () => (activeDeckForMain.length ? pickMostSaturated(activeDeckForMain) : null),
    [activeDeckForMain],
  );

  const verticalLogoMarkFilter = useMemo(
    () =>
      mergeCssFilters(
        previewFilter(logoSampleHex, verticalPanelBg, logoAppearance),
        brandInkHex ? paletteInkSteerFilter(logoSampleHex, brandInkHex) : undefined,
      ),
    [logoSampleHex, verticalPanelBg, logoAppearance, brandInkHex],
  );

  const horizontalLogoMarkFilter = useMemo(
    () =>
      mergeCssFilters(
        previewFilter(logoSampleHex, horizontalBg, logoAppearance),
        brandInkHex ? paletteInkSteerFilter(logoSampleHex, brandInkHex) : undefined,
      ),
    [logoSampleHex, horizontalBg, logoAppearance, brandInkHex],
  );

  const rollPreviewPalette = useCallback(() => {
    if (!analysis) return;
    const mode = PALETTE_MODES[Math.floor(Math.random() * PALETTE_MODES.length)]!;
    const seed = hslToHex(Math.random() * 360, 40 + Math.random() * 44, 36 + Math.random() * 26);
    const fresh = padPaletteToSix([...generatePalette(mode, seed)]);
    setPaletteOptions([]);
    setPreviewPalette(fresh);
    showToast("New palette");
  }, [analysis, showToast]);

  const resetPreviewPalette = useCallback(() => {
    setPreviewPalette(null);
    setPaletteOptions([]);
    showToast("Logo colours");
  }, [showToast]);

  const loadSixPaletteIdeas = useCallback(() => {
    if (!analysis) return;
    const list: string[][] = [];
    for (let i = 0; i < 6; i++) {
      const mode = PALETTE_MODES[Math.floor(Math.random() * PALETTE_MODES.length)]!;
      const seed = hslToHex(Math.random() * 360, 34 + Math.random() * 50, 32 + Math.random() * 28);
      list.push(padPaletteToSix([...generatePalette(mode, seed)]));
    }
    setPaletteOptions(list);
    setPreviewPalette(list[0]!);
    showToast("6 combinations — tap one to preview");
  }, [analysis, showToast]);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.files?.[0];
      e.target.value = "";
      if (!raw) return;
      const okType =
        raw.type === "image/png" ||
        raw.type === "image/svg+xml" ||
        /\.png$/i.test(raw.name) ||
        isSvgFile(raw);
      if (!okType) {
        showToast("Use PNG or SVG");
        return;
      }

      setBusy(true);
      try {
        if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
        if (iconUrlRef.current) URL.revokeObjectURL(iconUrlRef.current);
        iconUrlRef.current = null;
        setLogoIconUrl(null);
        setIconSampleHex(null);
        setLogoSampleHex(null);
        setAnalysis(null);
        setSvgOriginalText(null);
        setIsSvg(false);
        setLogoHueDeg(0);
        setLogoSatPercent(100);
        setPreviewPalette(null);
        setPaletteOptions([]);

        let displayUrl: string;
        let fileForExtract: File = raw;

        if (isSvgFile(raw)) {
          const { text, blob } = await prepareSvgLogoFile(raw);
          setSvgOriginalText(text);
          setIsSvg(true);
          displayUrl = URL.createObjectURL(blob);
          fileForExtract = new File([blob], raw.name.replace(/\.[^.]+$/, "") + ".svg", {
            type: "image/svg+xml",
          });
        } else {
          displayUrl = URL.createObjectURL(raw);
        }

        logoUrlRef.current = displayUrl;
        setLogoUrl(displayUrl);

        const dominant = await extractDominantHexesFromFile(fileForExtract, 8);
        setAnalysis(analyzeLogoFromDominants(dominant));
        showToast("Colours analysed");
      } catch {
        showToast("Could not read that file");
        if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
        logoUrlRef.current = null;
        setLogoUrl(null);
        if (iconUrlRef.current) URL.revokeObjectURL(iconUrlRef.current);
        iconUrlRef.current = null;
        setLogoIconUrl(null);
        setIconSampleHex(null);
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  const onIconFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.files?.[0];
      e.target.value = "";
      if (!raw) return;
      if (!logoUrl) {
        showToast("Upload main logo first");
        return;
      }
      const okType =
        raw.type === "image/png" ||
        raw.type === "image/svg+xml" ||
        /\.png$/i.test(raw.name) ||
        isSvgFile(raw);
      if (!okType) {
        showToast("Use PNG or SVG");
        return;
      }

      setIconBusy(true);
      try {
        if (iconUrlRef.current) URL.revokeObjectURL(iconUrlRef.current);
        let displayUrl: string;
        if (isSvgFile(raw)) {
          const { blob } = await prepareSvgLogoFile(raw);
          displayUrl = URL.createObjectURL(blob);
        } else {
          displayUrl = URL.createObjectURL(raw);
        }
        iconUrlRef.current = displayUrl;
        setLogoIconUrl(displayUrl);
        showToast("Icon updated");
      } catch {
        showToast("Could not read icon");
      } finally {
        setIconBusy(false);
      }
    },
    [logoUrl, showToast],
  );

  const onDownloadZip = useCallback(async () => {
    if (!logoUrl || !analysis) return;
    setBusyZip(true);
    try {
      const zipBlob = await buildLogoPreviewZip({
        logoUrl,
        logoSampleHex,
        iconUrl: logoIconUrl,
        iconSampleHex,
        backgrounds,
        svgOriginalText: isSvg ? svgOriginalText : null,
        appearance: logoAppearance,
      });
      downloadBlob(zipBlob, "logo-previews.zip");
      showToast("ZIP downloaded");
    } catch {
      showToast("Export failed");
    } finally {
      setBusyZip(false);
    }
  }, [
    analysis,
    backgrounds,
    iconSampleHex,
    isSvg,
    logoAppearance,
    logoIconUrl,
    logoSampleHex,
    logoUrl,
    showToast,
    svgOriginalText,
  ]);

  const onDownloadSvg = useCallback(() => {
    if (!svgOriginalText) return;
    const blob = new Blob([svgOriginalText], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, "logo-original.svg");
  }, [svgOriginalText]);

  return (
    <div className="relative min-h-0 flex-1 overflow-x-hidden bg-[#070708] text-zinc-100">
      <div className="grain opacity-40" aria-hidden />

      <div className="relative z-[1] mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 pb-16 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">
              Intelligent preview
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Logo lab
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
              Upload a PNG or SVG. We extract dominant colours, classify tone, build harmonious palettes, and
              suggest light, dark, gradient, and solid backgrounds with automatic contrast tuning.
            </p>
            <p className="text-xs text-zinc-500">
              Pair with{" "}
              <Link className="text-violet-300 underline-offset-4 hover:underline" href="/generator">
                Palette Lab
              </Link>{" "}
              or{" "}
              <Link className="text-violet-300 underline-offset-4 hover:underline" href="/brand-mockups">
                Brand mockups
              </Link>
              .
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/svg+xml,.svg"
              className="hidden"
              onChange={onFile}
            />
            <input
              ref={iconFileRef}
              type="file"
              accept="image/png,image/svg+xml,.svg"
              className="hidden"
              onChange={onIconFile}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {busy ? "Reading…" : "Upload logo"}
              </button>
              <button
                type="button"
                disabled={!logoUrl || iconBusy}
                onClick={() => iconFileRef.current?.click()}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-transparent px-5 text-sm font-medium text-zinc-100 transition hover:border-white/35 hover:bg-white/[0.06] disabled:opacity-40"
              >
                {iconBusy ? "…" : "Icon only"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                disabled={!logoUrl || !analysis || busyZip}
                onClick={() => void onDownloadZip()}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/35 hover:bg-white/[0.06] disabled:opacity-40"
              >
                {busyZip ? "Zipping…" : "Download all (ZIP)"}
              </button>
              {isSvg && svgOriginalText ? (
                <button
                  type="button"
                  onClick={onDownloadSvg}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/35 hover:bg-white/[0.06]"
                >
                  SVG source
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {!logoUrl ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-20 text-center">
            <p className="text-sm font-medium text-zinc-300">No logo yet</p>
            <p className="mt-2 text-xs text-zinc-500">PNG with transparency or SVG work best.</p>
          </div>
        ) : (
          <>
            {analysis ? (
              <section className="grid gap-6 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-zinc-200">Colour analysis</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs text-zinc-300">
                      {toneLabel(analysis.tone)}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>Roles</span>
                      <Swatch label="Primary" hex={analysis.primary} />
                      <Swatch label="Secondary" hex={analysis.secondary} />
                      <Swatch label="Accent" hex={analysis.accent} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Balanced palette
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.balancedPalette.map((h) => (
                        <span
                          key={h}
                          className="h-9 w-9 rounded-xl ring-1 ring-black/20"
                          style={{ backgroundColor: h }}
                          title={h}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-center lg:justify-end">
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-white/10 sm:h-44 sm:w-44">
                    <Image
                      src={logoUrl}
                      alt="Uploaded logo"
                      width={200}
                      height={200}
                      unoptimized
                      className="max-h-[80%] max-w-[80%] object-contain"
                      style={{
                        filter: previewFilter(logoSampleHex, "#27272a", logoAppearance),
                      }}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">Logo colour</h2>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">
                    Hue and saturation adjust the whole mark (CSS filters). ZIP / single PNG exports use the same
                    settings. Exact per-shape recolouring needs a design tool or SVG edits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLogoHueDeg(0);
                    setLogoSatPercent(100);
                  }}
                  className="shrink-0 self-start rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.06]"
                >
                  Reset colour
                </button>
              </div>
              <div className="mt-5 grid max-w-2xl gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-zinc-400">Hue shift — {logoHueDeg}°</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={logoHueDeg}
                    onChange={(e) => setLogoHueDeg(Number(e.target.value))}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-violet-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-zinc-400">Saturation — {logoSatPercent}%</span>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={logoSatPercent}
                    onChange={(e) => setLogoSatPercent(Number(e.target.value))}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-violet-400"
                  />
                </label>
              </div>
            </section>

            {analysis ? (
              <section className="mx-auto w-full max-w-5xl space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={rollPreviewPalette}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Generate palette
                  </button>
                  <button
                    type="button"
                    onClick={loadSixPaletteIdeas}
                    className="inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/55 hover:bg-cyan-500/25"
                  >
                    6 palette ideas
                  </button>
                  {previewPalette ? (
                    <button
                      type="button"
                      onClick={resetPreviewPalette}
                      className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/30 hover:bg-white/[0.06]"
                    >
                      Use logo colours
                    </button>
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed text-zinc-500">
                  Alag-alag palettes dekho: <strong className="text-zinc-400">6 palette ideas</strong> se chhote
                  previews, phir jis par click karo wahi upar bade lockup mein lagega — logo + icon dono har combo par.
                </p>
                {previewPalette ? (
                  <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/[0.08] bg-black/30 p-2">
                    {previewPalette.map((hex, i) => (
                      <span
                        key={`${i}-${hex}`}
                        className="h-7 w-7 rounded-lg ring-1 ring-white/10"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                ) : null}
                <h2 className="sr-only">Brand lockups</h2>
                <div className="overflow-hidden rounded-[1.75rem] ring-1 ring-white/[0.12]">
                  <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1.22fr)_minmax(0,1fr)] lg:grid-rows-2 lg:min-h-[min(76vh,640px)]">
                    {/* Vertical logo — tall light panel */}
                    <div
                      className="relative flex min-h-[320px] flex-col lg:row-span-2 lg:min-h-0"
                      style={{ backgroundColor: verticalPanelBg }}
                    >
                      <span className="absolute left-5 top-5 z-[1] text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                        Vertical logo
                      </span>
                      <div className="flex flex-1 items-center justify-center px-8 pb-14 pt-12 sm:px-12 sm:pb-16 sm:pt-14">
                        <Image
                          src={logoUrl}
                          alt=""
                          width={640}
                          height={640}
                          unoptimized
                          draggable={false}
                          className="pointer-events-none max-h-[min(42vw,260px)] w-auto max-w-[88%] select-none object-contain sm:max-h-[280px]"
                          style={{
                            filter: verticalLogoMarkFilter,
                          }}
                        />
                      </div>
                      <div className="absolute bottom-5 left-5 flex gap-2">
                        {bentoDots.map((hex, i) => (
                          <span
                            key={`bento-dot-${previewPalette?.join() ?? "logo"}-${hex}-${i}`}
                            className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Symbol — brand colour, mono mark */}
                    <div
                      className="relative flex min-h-[260px] items-center justify-center lg:min-h-0"
                      style={{ backgroundColor: symbolBg }}
                    >
                      <span className="absolute left-5 top-5 z-[1] text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
                        Symbol
                      </span>
                      <Image
                        src={logoIconUrl ?? logoUrl}
                        alt=""
                        width={512}
                        height={512}
                        unoptimized
                        draggable={false}
                        className="pointer-events-none max-h-[min(38vw,220px)] w-auto max-w-[78%] select-none object-contain sm:max-h-[240px]"
                        style={{
                          filter: mergeCssFilters(
                            previewFilter(
                              logoIconUrl && iconSampleHex != null ? iconSampleHex : logoSampleHex,
                              symbolBg,
                              logoAppearance,
                            ),
                            "brightness(0) invert(1)",
                          ),
                        }}
                      />
                    </div>

                    {/* Horizontal logo — dark panel */}
                    <div
                      className="relative flex min-h-[220px] flex-wrap items-center justify-center gap-5 px-8 pb-10 pt-12 sm:gap-7 sm:px-10 lg:min-h-0"
                      style={{ backgroundColor: horizontalBg }}
                    >
                      <span className="absolute left-5 top-5 z-[1] text-[11px] font-medium uppercase tracking-[0.16em] text-white/65">
                        Horizontal logo
                      </span>
                      <Image
                        src={logoUrl}
                        alt=""
                        width={640}
                        height={640}
                        unoptimized
                        draggable={false}
                        className="pointer-events-none h-12 w-auto max-w-[42%] select-none object-contain sm:h-14"
                        style={{
                          filter: horizontalLogoMarkFilter,
                        }}
                      />
                      <span className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,4.5vw,2.5rem)] font-semibold tracking-tight text-[#faf8f5]">
                        Brand
                      </span>
                    </div>
                  </div>
                </div>

                {paletteOptions.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                      Compare looks
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {paletteOptions.map((pal, idx) => {
                        const surf = computeBentoSurfaces(pal, true);
                        const selected = palettesEqual(previewPalette, pal);
                        return (
                          <button
                            key={`opt-${idx}-${pal[0]}`}
                            type="button"
                            onClick={() => setPreviewPalette(pal)}
                            className={`rounded-xl p-0.5 text-left transition ${
                              selected
                                ? "ring-2 ring-violet-400 ring-offset-2 ring-offset-[#070708]"
                                : "ring-1 ring-white/10 hover:ring-white/25"
                            }`}
                          >
                            <MiniBentoPreview
                              surfaces={surf}
                              palette={pal}
                              brandInkHex={pickMostSaturated(pal)}
                              logoUrl={logoUrl}
                              logoIconUrl={logoIconUrl}
                              logoSampleHex={logoSampleHex}
                              iconSampleHex={iconSampleHex}
                              appearance={logoAppearance}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-zinc-950/95 px-4 py-2 text-xs text-zinc-100 shadow-xl backdrop-blur-md">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function MiniBentoPreview({
  surfaces,
  palette,
  brandInkHex,
  logoUrl,
  logoIconUrl,
  logoSampleHex,
  iconSampleHex,
  appearance,
}: {
  surfaces: BentoSurfaces;
  palette: string[];
  brandInkHex: string;
  logoUrl: string;
  logoIconUrl: string | null;
  logoSampleHex: string | null;
  iconSampleHex: string | null;
  appearance: LogoAppearanceAdjust;
}) {
  const iconSrc = logoIconUrl ?? logoUrl;
  const sampleForSymbol =
    logoIconUrl && iconSampleHex != null ? iconSampleHex : logoSampleHex;
  const dots = palette.slice(0, 3);

  return (
    <div className="pointer-events-none grid aspect-[5/3] w-full grid-cols-[1.1fr_1fr] grid-rows-2 gap-0 overflow-hidden rounded-[11px]">
      <div
        className="relative row-span-2 flex min-h-0 flex-col"
        style={{ backgroundColor: surfaces.vertical }}
      >
        <span className="absolute left-1.5 top-1.5 z-[1] text-[7px] font-medium uppercase tracking-wide text-zinc-600/95">
          Vert.
        </span>
        <div className="flex min-h-0 flex-1 items-center justify-center px-1.5 pb-3 pt-5">
          <Image
            src={logoUrl}
            alt=""
            width={320}
            height={320}
            unoptimized
            draggable={false}
            className="pointer-events-none max-h-[56%] max-w-[92%] select-none object-contain"
            style={{
              filter: mergeCssFilters(
                previewFilter(logoSampleHex, surfaces.vertical, appearance),
                paletteInkSteerFilter(logoSampleHex, brandInkHex),
              ),
            }}
          />
        </div>
        <div className="absolute bottom-1 left-1.5 z-[1] flex gap-0.5">
          {dots.map((h, i) => (
            <span
              key={`md-${i}`}
              className="h-1.5 w-1.5 rounded-full ring-1 ring-black/12"
              style={{ backgroundColor: h }}
            />
          ))}
        </div>
      </div>
      <div
        className="relative flex min-h-0 items-center justify-center"
        style={{ backgroundColor: surfaces.symbol }}
      >
        <span className="absolute left-1.5 top-1.5 z-[1] text-[7px] font-medium uppercase tracking-wide text-white/75">
          Sym.
        </span>
        <Image
          src={iconSrc}
          alt=""
          width={256}
          height={256}
          unoptimized
          draggable={false}
          className="pointer-events-none max-h-[52%] max-w-[82%] select-none object-contain"
          style={{
            filter: mergeCssFilters(
              previewFilter(sampleForSymbol, surfaces.symbol, appearance),
              "brightness(0) invert(1)",
            ),
          }}
        />
      </div>
      <div
        className="relative flex min-h-0 flex-wrap items-center justify-center gap-0.5 px-1 pb-1.5 pt-5"
        style={{ backgroundColor: surfaces.horizontal }}
      >
        <span className="absolute left-1.5 top-1.5 z-[1] text-[7px] font-medium uppercase tracking-wide text-white/60">
          Horiz.
        </span>
        <Image
          src={logoUrl}
          alt=""
          width={240}
          height={240}
          unoptimized
          draggable={false}
          className="pointer-events-none h-7 max-w-[40%] select-none object-contain"
          style={{
            filter: mergeCssFilters(
              previewFilter(logoSampleHex, surfaces.horizontal, appearance),
              paletteInkSteerFilter(logoSampleHex, brandInkHex),
            ),
          }}
        />
        <span className="font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-tight text-[#faf8f5]">
          Brand
        </span>
      </div>
    </div>
  );
}

function Swatch({ label, hex }: { label: string; hex: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 py-0.5 pl-0.5 pr-2">
      <span className="h-5 w-5 rounded-full ring-1 ring-black/30" style={{ backgroundColor: hex }} />
      <span className="text-zinc-400">{label}</span>
    </span>
  );
}
