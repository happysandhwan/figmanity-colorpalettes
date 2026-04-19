import { contrastRatio } from "@/lib/brandLogoContrast";
import { paintBackgroundOnCanvas } from "@/lib/logoSmartBackgrounds";
import type { BackgroundSpec } from "@/lib/logoSmartBackgrounds";

export type PreviewLayout = "vertical" | "horizontal" | "icon";

/** User-controlled hue/sat plus optional contrast lift (no drop-shadow). */
export type LogoAppearanceAdjust = {
  hueRotateDeg: number;
  saturatePercent: number;
};

export function defaultLogoAppearance(): LogoAppearanceAdjust {
  return { hueRotateDeg: 0, saturatePercent: 100 };
}

/**
 * CSS / canvas2d `filter` string. Returns `"none"` when no transforms apply.
 */
export function buildLogoFilter(
  logoSampleHex: string | null,
  contrastBgHex: string,
  adjust: LogoAppearanceAdjust,
): string {
  const parts: string[] = [];
  if (adjust.hueRotateDeg !== 0) {
    parts.push(`hue-rotate(${adjust.hueRotateDeg}deg)`);
  }
  if (adjust.saturatePercent !== 100) {
    parts.push(`saturate(${adjust.saturatePercent}%)`);
  }
  const ratio = logoSampleHex ? contrastRatio(logoSampleHex, contrastBgHex) : 10;
  if (ratio < 4.25 && logoSampleHex) {
    parts.push("contrast(1.1)", "brightness(1.05)");
  } else if (ratio < 5.5 && logoSampleHex) {
    parts.push("contrast(1.04)", "brightness(1.02)");
  }
  return parts.length ? parts.join(" ") : "none";
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

function exportSize(layout: PreviewLayout): { w: number; h: number } {
  if (layout === "vertical") return { w: 960, h: 1200 };
  if (layout === "horizontal") return { w: 1280, h: 720 };
  return { w: 1024, h: 1024 };
}

function drawLogoLayout(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  layout: PreviewLayout,
  w: number,
  h: number,
  logoSampleHex: string | null,
  contrastBgHex: string,
  appearance: LogoAppearanceAdjust,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  let boxX: number;
  let boxY: number;
  let boxW: number;
  let boxH: number;
  if (layout === "vertical") {
    boxW = w * 0.78;
    boxH = h * 0.58;
    boxX = (w - boxW) / 2;
    boxY = (h - boxH) / 2 - h * 0.03;
  } else if (layout === "horizontal") {
    boxW = w * 0.9;
    boxH = h * 0.55;
    boxX = (w - boxW) / 2;
    boxY = (h - boxH) / 2;
  } else {
    const side = Math.min(w, h) * 0.72;
    boxW = side;
    boxH = side;
    boxX = (w - boxW) / 2;
    boxY = (h - boxH) / 2;
  }

  const useCover = layout === "icon";
  const scale = useCover
    ? Math.max(boxW / iw, boxH / ih)
    : Math.min(boxW / iw, boxH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = boxX + (boxW - dw) / 2;
  const dy = boxY + (boxH - dh) / 2;

  ctx.save();
  ctx.filter = buildLogoFilter(logoSampleHex, contrastBgHex, appearance);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export async function renderLogoPreviewPng(options: {
  logoUrl: string;
  /** Square / icon layout draws this asset when provided. */
  iconUrl?: string | null;
  iconSampleHex?: string | null;
  layout: PreviewLayout;
  background: BackgroundSpec;
  logoSampleHex: string | null;
  appearance?: LogoAppearanceAdjust;
}): Promise<Blob> {
  const { w, h } = exportSize(options.layout);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  paintBackgroundOnCanvas(ctx, w, h, options.background.canvas);
  const useIcon = options.layout === "icon" && options.iconUrl;
  const drawSrc = useIcon ? options.iconUrl! : options.logoUrl;
  const sampleHex =
    useIcon && options.iconSampleHex != null ? options.iconSampleHex : options.logoSampleHex;
  const img = await loadImage(drawSrc);
  const appearance = options.appearance ?? defaultLogoAppearance();
  drawLogoLayout(
    ctx,
    img,
    options.layout,
    w,
    h,
    sampleHex,
    options.background.contrastSample,
    appearance,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png", 0.92);
  });
}

export async function buildLogoPreviewZip(params: {
  logoUrl: string;
  logoSampleHex: string | null;
  iconUrl?: string | null;
  iconSampleHex?: string | null;
  backgrounds: BackgroundSpec[];
  layouts?: PreviewLayout[];
  svgOriginalText?: string | null;
  appearance?: LogoAppearanceAdjust;
}): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folder = zip.folder("logo-previews");
  if (!folder) throw new Error("ZIP folder failed");

  const layouts = params.layouts ?? (["vertical", "horizontal", "icon"] as const);
  const appearance = params.appearance ?? defaultLogoAppearance();

  for (const bg of params.backgrounds) {
    for (const layout of layouts) {
      const blob = await renderLogoPreviewPng({
        logoUrl: params.logoUrl,
        iconUrl: params.iconUrl,
        iconSampleHex: params.iconSampleHex,
        layout,
        background: bg,
        logoSampleHex: params.logoSampleHex,
        appearance,
      });
      folder.file(`${bg.id}__${layout}.png`, blob);
    }
  }

  if (params.svgOriginalText) {
    folder.file("logo-original.svg", params.svgOriginalText);
  }

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
