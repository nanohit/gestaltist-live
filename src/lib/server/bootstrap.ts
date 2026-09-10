import manifest from '../../../cdn/.vite/manifest.json';
import type { SiteContent } from '$lib/content';
import { CONTENT_FILE, jsdelivrUrl } from '$lib/cdn';

/** Коммит, в котором лежит cdn/ этой сборки (см. vite.config.js). */
declare const __BUILD_SHA__: string;

const SITE_URL = 'https://gestaltist.live/';

const entry = manifest['src/spa/main.ts'];
const fontFile = (name: string) => entry.assets?.find((a) => a.includes(`/${name}-`));

// Локальная проверка без jsDelivr: vite preview -c vite.spa.config.js --port 5200
// и CDN_BASE=http://localhost:5200/ npm run dev
const localBase = import.meta.env.DEV ? process.env.CDN_BASE : undefined;
const cdn = (path: string) => (localBase ? localBase + path : jsdelivrUrl(__BUILD_SHA__, `cdn/${path}`));
const JS = cdn(entry.file);
const CSS = cdn(entry.css[0]);
const FONTS = [fontFile('Geometria'), fontFile('Geometria-Bold')]
  .filter((f): f is string => Boolean(f))
  .map(cdn);

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function describe(content: SiteContent): string {
  const parts: string[] = [content.hero.label, content.hero.subheading];
  for (const d of content.hero.details ?? []) {
    if (d.value && !d.isList) parts.push(`${d.label}: ${d.value}`);
  }
  return parts
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join('. ')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

/**
 * HTML-загрузчик. Из РФ до Vercel доходит ~10 КБ на соединение, и почти
 * 6 КБ из них съедает TLS-рукопожатие, поэтому страница — около 2 КБ в brotli:
 * SEO-теги, заглушка и ссылки на jsDelivr. Приложение, стили, шрифты и
 * контент (по хэшу коммита ветки content) приходят оттуда. Если основной
 * хост jsDelivr не отвечает, скрипт подгружается с fastly.jsdelivr.net.
 */
export function renderBootstrap(content: SiteContent, contentCommit: string | null): string {
  const title = esc(content.hero.heading?.trim() || 'Конференция');
  const description = esc(describe(content));
  const color = esc(content.primaryColor || '#0aa5b5');
  const image = content.hero.images?.[0]?.url;
  const contentUrl = contentCommit ? jsdelivrUrl(contentCommit, CONTENT_FILE) : null;

  // Сторож стоит в <head>, до стилей: зависший CSS блокирует скрипты после себя.
  // Стили — в <body> после заглушки, чтобы она рисовалась, пока грузится CSS.
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="${color}">
<link rel="canonical" href="${SITE_URL}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:url" content="${SITE_URL}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:card" content="summary_large_image">\n` : ''}<link rel="icon" href="${cdn('favicon.ico')}" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="${cdn('favicon-32.png')}">
<link rel="apple-touch-icon" href="${cdn('apple-touch-icon.png')}">
<link rel="manifest" href="${cdn('site.webmanifest')}">
${contentUrl ? `<link rel="preload" as="fetch" href="${contentUrl}" crossorigin>\n` : ''}${FONTS.map((f) => `<link rel="preload" as="font" type="font/woff2" href="${f}" crossorigin>`).join('\n')}
<style>.gb{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px;text-align:center;font:600 22px/1.3 system-ui,sans-serif;color:#1a2b33}.gb i{width:28px;height:28px;border:3px solid #0001;border-top-color:${color};border-radius:50%;animation:gs .8s linear infinite}.gb button{font:inherit;font-size:16px;padding:10px 20px;border:0;border-radius:8px;background:${color};color:#fff}@keyframes gs{to{transform:rotate(360deg)}}</style>
<script>(function(G,a){function alt(){if(a)return;a=1;var l=document.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(CSS)}.replace("//cdn.","//fastly.");document.head.appendChild(l);var s=document.createElement("script");s.type="module";s.src=${JSON.stringify(JS)}.replace("//cdn.","//fastly.");document.head.appendChild(s)}G.alt=alt;G.fail=function(){document.getElementById("app").innerHTML='<div class="gb">Не удалось загрузить сайт<button onclick="location.reload()">Обновить</button></div>'};setTimeout(function(){G.started||alt()},9000);setTimeout(function(){G.started||G.fail()},30000)})(window.__G={c:${JSON.stringify(contentCommit)}})</script>
</head>
<body>
<div id="app"><div class="gb">${title}<i></i></div></div>
<noscript>Для работы сайта включите JavaScript.</noscript>
<link rel="stylesheet" href="${CSS}">
<script type="module" src="${JS}" onerror="__G.alt()"></script>
</body>
</html>
`;
}
