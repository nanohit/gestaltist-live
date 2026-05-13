export function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function shade(h: number, s: number, l: number, ds: number, dl: number): string {
  return rgbToHex(...hslToRgb(h, clamp(s + ds, 0, 100), clamp(l + dl, 0, 100)));
}

export function generateThemeVars(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  const rgb = hexToRgb(hex);
  const dk = hexToRgb(shade(h, s, l, 0, -8));
  const lt = hexToRgb(shade(h, s, l, 5, 15));
  const ltr = hexToRgb(shade(h, s, l, 5, 25));
  const tint = hexToRgb(shade(h, s, l, -50, 55));

  return [
    `--c:${hex}`,
    `--c-dark:${shade(h, s, l, 0, -8)}`,
    `--c-light:${shade(h, s, l, 5, 15)}`,
    `--c-lighter:${shade(h, s, l, 5, 25)}`,
    `--c-muted:${shade(h, s, l, -35, 15)}`,
    `--c-tint:${shade(h, s, l, -50, 55)}`,
    `--c-rgb:${rgb.join(',')}`,
    `--c-dark-rgb:${dk.join(',')}`,
    `--c-light-rgb:${lt.join(',')}`,
    `--c-lighter-rgb:${ltr.join(',')}`,
    `--c-tint-rgb:${tint.join(',')}`,
  ].join(';');
}
