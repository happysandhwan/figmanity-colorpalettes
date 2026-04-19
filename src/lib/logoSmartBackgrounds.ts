import type { LogoAnalysis } from "@/lib/logoColorAnalysis";
import { hexToHsl, hslToHex } from "@/lib/colorPalette";

function spinHue(h: number, delta: number) {
  return (h + delta + 360) % 360;
}

export type BackgroundKind = "light" | "dark" | "gradient" | "solid";

export type CanvasLinearStop = { pos: number; hex: string };

export type CanvasBackground =
  | { mode: "solid"; hex: string }
  | { mode: "linear"; x0: number; y0: number; x1: number; y1: number; stops: CanvasLinearStop[] };

export type BackgroundSpec = {
  id: string;
  label: string;
  kind: BackgroundKind;
  /** CSS `background` value for the UI. */
  css: string;
  /** Representative solid for WCAG-style checks against the logo sample. */
  contrastSample: string;
  canvas: CanvasBackground;
};

function fillFromCanvasSpec(ctx: CanvasRenderingContext2D, w: number, h: number, spec: CanvasBackground) {
  if (spec.mode === "solid") {
    ctx.fillStyle = spec.hex;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const g = ctx.createLinearGradient(spec.x0 * w, spec.y0 * h, spec.x1 * w, spec.y1 * h);
  for (const s of spec.stops) g.addColorStop(s.pos, s.hex);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Use the same fill logic in export (keeps previews aligned with thumbnails). */
export function paintBackgroundOnCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spec: CanvasBackground,
) {
  fillFromCanvasSpec(ctx, w, h, spec);
}

/**
 * Builds light / dark / gradient / solid surfaces from extracted logo colours.
 */
export function buildSmartBackgrounds(analysis: LogoAnalysis): BackgroundSpec[] {
  const { primary, secondary, accent } = analysis;
  const p = hexToHsl(primary);
  const s = hexToHsl(secondary);
  const a = hexToHsl(accent);

  const lightWash = hslToHex(p.h, Math.min(14, p.s * 0.22), 99);
  const lightCool = hslToHex(p.h, 6, 98.2);
  const darkCharcoal = hslToHex(p.h, Math.min(32, p.s * 0.45), 7.5);
  const darkNavy = hslToHex(spinHue(p.h, -8), Math.min(44, p.s * 0.55 + 10), 9);

  const g1a = hslToHex(p.h, Math.min(88, p.s + 24), Math.min(93, p.l + 32));
  const g1b = hslToHex(spinHue(a.h, 12), Math.min(92, a.s + 18), Math.max(44, a.l - 2));
  const g2a = hslToHex(spinHue(s.h, -18), Math.min(70, s.s * 0.9), 88);
  const g2b = hslToHex(spinHue(p.h, 140), Math.min(85, p.s + 10), 42);
  const g3a = hslToHex(210, 16, 96);
  const g3b = hslToHex(spinHue(p.h, 6), Math.min(80, p.s + 12), 52);

  const comp = hslToHex(spinHue(p.h, 180), Math.min(78, p.s + 6), clampL(p.l, 22, 62));
  const anaA = hslToHex(spinHue(p.h, -32), Math.min(70, s.s), clampL(s.l, 28, 58));
  const anaB = hslToHex(spinHue(p.h, 36), Math.min(75, a.s), clampL(a.l, 30, 62));
  const muted = hslToHex(p.h, Math.min(18, p.s * 0.35), 46);
  const paper = hslToHex(spinHue(p.h, 90), 12, 94);

  const linear = (
    id: string,
    label: string,
    css: string,
    contrastMid: string,
    stops: CanvasLinearStop[],
  ): BackgroundSpec => ({
    id,
    label,
    kind: "gradient",
    css,
    contrastSample: contrastMid,
    canvas: { mode: "linear", x0: 0, y0: 0, x1: 1, y1: 1, stops },
  });

  return [
    {
      id: "light-warm",
      label: "Off-white (warm)",
      kind: "light",
      css: lightWash,
      contrastSample: lightWash,
      canvas: { mode: "solid", hex: lightWash },
    },
    {
      id: "light-cool",
      label: "Clean white",
      kind: "light",
      css: lightCool,
      contrastSample: lightCool,
      canvas: { mode: "solid", hex: lightCool },
    },
    {
      id: "dark-charcoal",
      label: "Charcoal",
      kind: "dark",
      css: darkCharcoal,
      contrastSample: darkCharcoal,
      canvas: { mode: "solid", hex: darkCharcoal },
    },
    {
      id: "dark-navy",
      label: "Deep navy",
      kind: "dark",
      css: darkNavy,
      contrastSample: darkNavy,
      canvas: { mode: "solid", hex: darkNavy },
    },
    linear(
      "grad-brand-wash",
      "Brand wash",
      `linear-gradient(135deg, ${g1a} 0%, ${g1b} 100%)`,
      hslToHex(p.h, (p.s + a.s) / 2, (hexToHsl(g1a).l + hexToHsl(g1b).l) / 2),
      [
        { pos: 0, hex: g1a },
        { pos: 1, hex: g1b },
      ],
    ),
    linear(
      "grad-soft-pop",
      "Soft spectrum",
      `linear-gradient(135deg, ${g2a} 0%, ${g2b} 100%)`,
      hslToHex(spinHue(s.h, 40), 40, 55),
      [
        { pos: 0, hex: g2a },
        { pos: 0.55, hex: hslToHex(spinHue(s.h, 80), 55, 58) },
        { pos: 1, hex: g2b },
      ],
    ),
    linear(
      "grad-air",
      "Air & ink",
      `linear-gradient(135deg, ${g3a} 0%, ${g3b} 100%)`,
      hslToHex(p.h, 24, 72),
      [
        { pos: 0, hex: g3a },
        { pos: 1, hex: g3b },
      ],
    ),
    {
      id: "solid-comp",
      label: "Complementary",
      kind: "solid",
      css: comp,
      contrastSample: comp,
      canvas: { mode: "solid", hex: comp },
    },
    {
      id: "solid-ana-a",
      label: "Analogous A",
      kind: "solid",
      css: anaA,
      contrastSample: anaA,
      canvas: { mode: "solid", hex: anaA },
    },
    {
      id: "solid-ana-b",
      label: "Analogous B",
      kind: "solid",
      css: anaB,
      contrastSample: anaB,
      canvas: { mode: "solid", hex: anaB },
    },
    {
      id: "solid-muted",
      label: "Muted neutral",
      kind: "solid",
      css: muted,
      contrastSample: muted,
      canvas: { mode: "solid", hex: muted },
    },
    {
      id: "solid-paper",
      label: "Paper tint",
      kind: "solid",
      css: paper,
      contrastSample: paper,
      canvas: { mode: "solid", hex: paper },
    },
  ];
}

function clampL(l: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, l));
}
