/**
 * Russia-facing builds deliberately bypass Vercel Image Optimization. The
 * original imgbb URL is already public, so sending it straight to the browser
 * keeps the large image bytes off Vercel while preserving the same content.
 */
export function optimizeImage(url: string, _width: number, _quality = 75): string {
  return url;
}

export function imageSrcset(_url: string, _widths: number[], _quality = 75): string | undefined {
  return undefined;
}
