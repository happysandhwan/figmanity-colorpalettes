/**
 * Ensures inline SVG has explicit pixel dimensions so `<img>` / canvas sampling works reliably.
 */
export async function prepareSvgLogoFile(file: File): Promise<{ text: string; blob: Blob }> {
  const text = await file.text();
  let body = text;
  const hasWidth = /\swidth\s*=\s*["'][^"']+["']/i.test(body);
  const hasHeight = /\sheight\s*=\s*["'][^"']+["']/i.test(body);
  if (!hasWidth || !hasHeight) {
    const m = body.match(
      /viewBox\s*=\s*["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/i,
    );
    if (m) {
      const vw = Math.max(1, parseFloat(m[3]!));
      const vh = Math.max(1, parseFloat(m[4]!));
      if (!hasWidth && !hasHeight) {
        body = body.replace(/<svg\b/i, `<svg width="${Math.round(vw)}" height="${Math.round(vh)}"`);
      } else if (!hasWidth) {
        body = body.replace(/<svg\b/i, `<svg width="${Math.round(vw)}"`);
      } else if (!hasHeight) {
        body = body.replace(/<svg\b/i, `<svg height="${Math.round(vh)}"`);
      }
    } else {
      body = body.replace(/<svg\b/i, `<svg width="512" height="512"`);
    }
  }
  const blob = new Blob([body], { type: "image/svg+xml;charset=utf-8" });
  return { text, blob };
}

export function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}
