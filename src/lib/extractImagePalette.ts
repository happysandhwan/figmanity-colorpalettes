import { hexToHsl, hslToHex, rgbToHex } from "@/lib/colorPalette";

function loadImageFromObjectUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = url;
  });
}

function rgbDist(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Pad by nudging lightness on existing hues so brand grids always fill `count` swatches. */
function padHexPalette(hexes: string[], count: number): string[] {
  if (hexes.length === 0) {
    return Array.from({ length: count }, (_, i) => hslToHex((i * 41) % 360, 48, 32 + (i % 5) * 10));
  }
  const out = [...hexes];
  const seedLen = hexes.length;
  let guard = 0;
  while (out.length < count && guard < count * 6) {
    guard++;
    const base = out[out.length % seedLen]!;
    const { h, s, l } = hexToHsl(base);
    const step = 10 + (out.length % 5) * 6;
    const l2 = out.length % 2 === 0 ? Math.max(12, l - step) : Math.min(90, l + step);
    const s2 = Math.min(95, Math.max(18, s + (out.length % 3 === 0 ? -8 : 6)));
    out.push(hslToHex(h, s2, l2));
  }
  return out.slice(0, count);
}

/**
 * Reads an image file in the browser, downsamples to a canvas, and picks distinct dominant colours.
 */
export async function extractDominantHexesFromFile(
  file: File,
  count: number,
  minRgbDist = 42,
): Promise<string[]> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image file");
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageFromObjectUrl(url);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas not supported");

    const maxSide = 140;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const stride = 2;
    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();

    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const i = (y * width + x) * 4;
        const a = data[i + 3] ?? 255;
        if (a < 24) continue;
        let r = data[i] ?? 0;
        let g = data[i + 1] ?? 0;
        let b = data[i + 2] ?? 0;
        // 5-bit quantisation — merges near-duplicates while keeping brand tones
        r = (r >> 3) << 3;
        g = (g >> 3) << 3;
        b = (b >> 3) << 3;
        const key = `${r},${g},${b}`;
        const cur = buckets.get(key);
        if (cur) cur.n += 1;
        else buckets.set(key, { r, g, b, n: 1 });
      }
    }

    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
    const picked: { r: number; g: number; b: number }[] = [];

    let distFloor = minRgbDist;
    for (let attempt = 0; attempt < 4 && picked.length < count; attempt++) {
      for (const c of sorted) {
        if (picked.length >= count) break;
        if (picked.some((p) => rgbDist(p, c) < distFloor)) continue;
        picked.push({ r: c.r, g: c.g, b: c.b });
      }
      distFloor *= 0.72;
    }

    let hexes = picked.map((p) => rgbToHex(p.r, p.g, p.b));
    if (hexes.length === 0) {
      hexes = padHexPalette([], count);
    } else if (hexes.length < count) {
      hexes = padHexPalette(hexes, count);
    } else {
      hexes = hexes.slice(0, count);
    }

    return hexes;
  } finally {
    URL.revokeObjectURL(url);
  }
}
