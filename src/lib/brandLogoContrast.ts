import { hexToRgb, rgbToHex } from "@/lib/colorPalette";

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast between two colours (order-independent). */
export function contrastRatio(fg: string, bg: string): number {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

/**
 * Average colour of non-transparent pixels (downsampled) — used as a stand-in for logo "weight"
 * when picking backgrounds and contrast plates.
 */
export async function sampleAverageLogoRgb(imageSrc: string): Promise<string | null> {
  try {
    const img = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const maxSide = 96;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    const stride = 2;
    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const i = (y * width + x) * 4;
        const a = data[i + 3] ?? 0;
        if (a < 28) continue;
        sr += data[i] ?? 0;
        sg += data[i + 1] ?? 0;
        sb += data[i + 2] ?? 0;
        n++;
      }
    }
    if (n === 0) return null;
    return rgbToHex(Math.round(sr / n), Math.round(sg / n), Math.round(sb / n));
  } catch {
    return null;
  }
}

/** Palette colours sorted by how well the logo (as `logoHex`) separates from the background. */
export function orderPaletteForLogo(palette: string[], logoHex: string | null): string[] {
  const fg = logoHex ?? "#9ca3af";
  const unique = [...new Set(palette)];
  return unique.sort((a, b) => contrastRatio(fg, b) - contrastRatio(fg, a));
}

export function formatContrastShort(n: number): string {
  return n >= 10 ? `${n.toFixed(1)}:1` : `${n.toFixed(2)}:1`;
}

const PLATE_LIGHT = "#f4f4f5";
const PLATE_DARK = "#0a0a0b";

/** Whether to sit the logo on a light/dark plate so it reads on busy backgrounds. */
export function needsContrastPlate(logoHex: string | null, surfaceBg: string, minRatio = 4.25): boolean {
  if (!logoHex) return false;
  return contrastRatio(logoHex, surfaceBg) < minRatio;
}

export function pickPlateStyle(logoHex: string): "light" | "dark" {
  const onLight = contrastRatio(logoHex, PLATE_LIGHT);
  const onDark = contrastRatio(logoHex, PLATE_DARK);
  return onLight >= onDark ? "light" : "dark";
}
