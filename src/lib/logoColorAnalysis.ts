import { hexToHsl, hslToHex } from "@/lib/colorPalette";

export type LogoTone = "light" | "dark" | "mixed";

export type LogoAnalysis = {
  /** Dominant swatches from extraction (ordered by weight). */
  dominant: string[];
  primary: string;
  secondary: string;
  accent: string;
  tone: LogoTone;
  /** Six-tone palette harmonized to the mark. */
  balancedPalette: string[];
};

function uniqHexes(hexes: string[]): string[] {
  const out: string[] = [];
  for (const h of hexes) {
    const x = h.trim().toLowerCase();
    if (!x.startsWith("#") || x.length < 4) continue;
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

function meanLightness(hexes: string[]): number {
  if (hexes.length === 0) return 50;
  let s = 0;
  for (const h of hexes) s += hexToHsl(h).l;
  return s / hexes.length;
}

function lightnessSpread(hexes: string[]): number {
  if (hexes.length < 2) return 0;
  const ls = hexes.map((h) => hexToHsl(h).l);
  return Math.max(...ls) - Math.min(...ls);
}

function spin(h: number, delta: number) {
  return (h + delta + 360) % 360;
}

/** Classify logo as mostly light inks, dark inks, or both (e.g. full-color mark). */
export function detectLogoTone(dominant: string[]): LogoTone {
  const top = dominant.slice(0, 5);
  if (top.length === 0) return "mixed";
  const avgL = meanLightness(top);
  const spread = lightnessSpread(top);
  if (spread > 36) return "mixed";
  if (avgL > 56) return "light";
  if (avgL < 40) return "dark";
  return "mixed";
}

function pickSecondaryAccent(primary: string, dominant: string[]): { secondary: string; accent: string } {
  const p = hexToHsl(primary);
  const rest = dominant.filter((c) => c.toLowerCase() !== primary.toLowerCase());
  const secondary = rest[0] ?? hslToHex(spin(p.h, 28), Math.min(92, p.s + 8), Math.max(22, p.l - 6));
  const accent =
    rest[1] ?? hslToHex(spin(p.h, 168), Math.min(90, Math.max(38, p.s)), Math.min(62, Math.max(30, p.l + 4)));
  return { secondary, accent };
}

function buildBalancedPalette(primary: string, secondary: string, accent: string): string[] {
  const p = hexToHsl(primary);
  const s = hexToHsl(secondary);
  const soft = hslToHex(p.h, Math.min(28, p.s * 0.35), Math.min(94, p.l + 38));
  const deep = hslToHex(p.h, Math.min(88, p.s + 6), Math.max(14, p.l - 28));
  const tri = hslToHex(spin(p.h, 120), Math.min(85, s.s + 4), clampL(s.l, 38, 58));
  let out = uniqHexes([primary, secondary, accent, soft, deep, tri]);
  let guard = 0;
  while (out.length < 6 && guard < 12) {
    guard++;
    const step = out.length * 31;
    out.push(
      hslToHex(
        spin(p.h, step),
        Math.min(88, 32 + (out.length % 4) * 14),
        clampL(28 + (out.length % 5) * 12, 22, 78),
      ),
    );
    out = uniqHexes(out);
  }
  return out.slice(0, 6);
}

function clampL(l: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, l));
}

/**
 * Turn dominant extracted colours into roles, tone classification, and a compact brand palette.
 */
export function analyzeLogoFromDominants(dominant: string[]): LogoAnalysis {
  const colors = uniqHexes(dominant);
  const primary = colors[0] ?? "#3b3b45";
  const { secondary, accent } = pickSecondaryAccent(primary, colors);
  const tone = detectLogoTone(colors.length ? colors : [primary]);
  const balancedPalette = buildBalancedPalette(primary, secondary, accent);

  return {
    dominant: colors.slice(0, 8),
    primary,
    secondary,
    accent,
    tone,
    balancedPalette,
  };
}
