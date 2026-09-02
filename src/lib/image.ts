declare const __ON_VERCEL__: boolean;

/** Ширины, разрешённые в svelte.config.js для Vercel Image Optimization. */
const ALLOWED_WIDTHS = [128, 256, 384, 512, 640, 828, 1200];

/** Хосты, объявленные в remotePatterns адаптера. */
const OPTIMIZABLE = /^https:\/\/i\.ibb\.co\//;

function snapWidth(width: number): number {
  return ALLOWED_WIDTHS.find((w) => w >= width) ?? ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
}

function canOptimize(url: string): boolean {
  return __ON_VERCEL__ && OPTIMIZABLE.test(url);
}

/** Прогоняет удалённую картинку через edge-оптимизатор Vercel (avif/webp + ресайз). */
export function optimizeImage(url: string, width: number, quality = 75): string {
  if (!url || !canOptimize(url)) return url;
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${snapWidth(width)}&q=${quality}`;
}

export function imageSrcset(url: string, widths: number[], quality = 75): string | undefined {
  if (!url || !canOptimize(url)) return undefined;
  return widths.map((w) => `${optimizeImage(url, w, quality)} ${snapWidth(w)}w`).join(', ');
}
