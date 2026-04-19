import { hexToHsl } from "./colorPalette";

const HUE_NAMES = [
  "Red",
  "Crimson",
  "Rose",
  "Coral",
  "Orange",
  "Amber",
  "Gold",
  "Yellow",
  "Lime",
  "Green",
  "Mint",
  "Teal",
  "Cyan",
  "Sky",
  "Azure",
  "Blue",
  "Indigo",
  "Violet",
  "Purple",
  "Plum",
  "Magenta",
  "Pink",
];

const LIGHT_ADJECTIVES = [
  "Pale",
  "Soft",
  "Light",
  "Pastel",
  "Misty",
  "Silk",
  "Cloud",
  "Frost",
];

const MID_ADJECTIVES = [
  "True",
  "Deep",
  "Wild",
  "Vivid",
  "Bright",
  "Bold",
  "Rich",
  "Warm",
  "Cool",
];

const DARK_ADJECTIVES = [
  "Deep",
  "Shadow",
  "Midnight",
  "Stone",
  "Dark",
  "Dusk",
  "Smoky",
  "Charcoal",
  "Ink",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seed) % arr.length];
}

/** Short label from H/S/L — feels like named swatches (not scientific). */
export function colorDisplayName(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  const hueIdx =
    (((Math.round(h) % 360) + 360) % 360) / 360;
  const hueName = HUE_NAMES[Math.floor(hueIdx * HUE_NAMES.length) % HUE_NAMES.length];
  let adj: string;
  if (l >= 72) adj = pick(LIGHT_ADJECTIVES, Math.round(h + l));
  else if (l <= 32) adj = pick(DARK_ADJECTIVES, Math.round(h + s));
  else adj = pick(MID_ADJECTIVES, Math.round(h + s + l));

  if (s < 12) {
    return l > 82 ? "Soft Pearl" : l < 22 ? "Obsidian Mist" : "Neutral Haze";
  }

  return `${adj} ${hueName}`;
}

/** Relative luminance (sRGB) → WCAG-ish text on filled background */
export function readableTextOn(hex: string): "#ffffff" | "#000000" {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return "#ffffff";
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? "#000000" : "#ffffff";
}
