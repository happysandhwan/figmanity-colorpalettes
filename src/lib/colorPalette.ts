export type GeneratorMode = "ramp" | "analogous" | "complementary" | "triadic" | "random";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) {
    return { r: 120, g: 100, b: 220 };
  }
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) =>
        clamp(Math.round(x), 0, 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** RGB 0-255 → HSL (h:0-360, s/l:0-100) */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hueToRgb(p: number, q: number, t: number) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;

  if (ss === 0) {
    const v = Math.round(ll * 255);
    return { r: v, g: v, b: v };
  }

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const r = hueToRgb(p, q, hh + 1 / 3);
  const g = hueToRgb(p, q, hh);
  const b = hueToRgb(p, q, hh - 1 / 3);

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function randomHue() {
  return Math.floor(Math.random() * 360);
}

/** 5 harmonious colors from base + mode */
export function generatePalette(mode: GeneratorMode, baseHex: string): string[] {
  const base = hexToHsl(baseHex);

  switch (mode) {
    case "ramp": {
      const stops = [12, 28, 48, 68, 88];
      return stops.map((l) => hslToHex(base.h, clamp(base.s, 35, 85), l));
    }
    case "analogous": {
      const offsets = [-28, -12, 0, 14, 30];
      return offsets.map((off) =>
        hslToHex(base.h + off, clamp(base.s, 40, 92), clamp(base.l, 38, 62)),
      );
    }
    case "complementary": {
      const h2 = base.h + 180;
      return [
        hslToHex(base.h, clamp(base.s, 45, 90), 22),
        hslToHex(base.h, clamp(base.s, 35, 75), 42),
        hslToHex(base.h, clamp(base.s, 30, 70), 55),
        hslToHex(h2, clamp(base.s, 45, 90), 48),
        hslToHex(h2, clamp(base.s, 35, 80), 72),
      ];
    }
    case "triadic": {
      const h1 = base.h;
      const h2 = base.h + 120;
      const h3 = base.h + 240;
      return [
        hslToHex(h1, 70, 22),
        hslToHex(h2, 65, 38),
        hslToHex(h3, 60, 52),
        hslToHex(h1, 55, 68),
        hslToHex(h2, 45, 82),
      ];
    }
    case "random": {
      const h = randomHue();
      const s = 55 + Math.random() * 35;
      const stops = [18, 32, 48, 64, 80];
      return stops.map((l) => hslToHex(h + (Math.random() * 8 - 4), clamp(s, 45, 95), l));
    }
    default:
      return generatePalette("ramp", baseHex);
  }
}
