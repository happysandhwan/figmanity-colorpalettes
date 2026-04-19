import { hexToHsl, hslToHex } from "@/lib/colorPalette";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Stable FNV-1a–style hash for category strings */
export function hashStringToSeed(str: string): number {
  let h = 2166136261 >>> 0;
  const s = str.trim();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Mode = "ramp" | "analogous" | "complementary" | "triadic" | "random";

function paletteFromSeed(seed: number): string[] {
  const rng = mulberry32(seed);
  const modes: Mode[] = ["ramp", "analogous", "complementary", "triadic", "random"];
  const mode = modes[seed % 5];
  const hBase = seed % 360;
  const sBase = 35 + (seed % 48);
  const lBase = 38 + ((seed >> 3) % 25);
  const baseHex = hslToHex(hBase, clamp(sBase, 30, 92), clamp(lBase, 28, 58));
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
      const h = Math.floor(rng() * 360);
      const s = 45 + rng() * 42;
      const stops = [18, 32, 48, 64, 80];
      return stops.map((lv) =>
        hslToHex(h + (rng() * 10 - 5), clamp(s, 45, 95), lv),
      );
    }
    default:
      return paletteFromSeed(seed ^ 0x9e3779b9);
  }
}

/** Deterministic 5-color palette for any category label (same name → same colors). */
export function generatePaletteForCategory(categoryName: string): string[] {
  return paletteFromSeed(hashStringToSeed(categoryName));
}
