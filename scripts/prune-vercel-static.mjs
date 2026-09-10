import { access, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const isVercel = Boolean(process.env.VERCEL);
const isCdnPublish = process.env.GESTALT_CDN_PUBLISH === '1';

if (!isVercel || isCdnPublish) {
  process.exit(0);
}

// The first deployment of this migration has no published CDN payload yet.
// Keep the normal local SvelteKit output for that one deployment; the publish
// workflow adds .cdn-ready together with cdn/*, and subsequent deployments use
// the tiny bootstrap below.
try {
  await access('.cdn-ready', constants.F_OK);
} catch {
  console.log('CDN payload is not published yet; keeping local Vercel assets as fallback.');
  process.exit(0);
}

const revision = (process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
if (!/^[0-9a-f]{40}$/i.test(revision)) {
  throw new Error(`VERCEL_GIT_COMMIT_SHA is missing or invalid: ${revision || '(empty)'}`);
}

const staticDir = path.resolve('.vercel/output/static');
const indexPath = path.join(staticDir, 'index.html');
await access(indexPath, constants.F_OK);

const cdnBase = `https://cdn.jsdelivr.net/gh/nanohit/gestaltist-live@${revision}/cdn`;
const bootstrap = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Gestaltist</title>
<style>html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#153842}body{display:grid;place-items:center}.boot{padding:32px;text-align:center}.dot{width:24px;height:24px;margin:0 auto 14px;border:3px solid #d9eef0;border-top-color:#0aa5b5;border-radius:50%;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}.err{max-width:560px;line-height:1.5}</style>
</head>
<body>
<div class="boot" id="boot"><div class="dot"></div><div>Загрузка…</div></div>
<script>
(()=>{const b=${JSON.stringify(cdnBase)};const fail=()=>{document.getElementById('boot').innerHTML='<div class="err">Не удалось загрузить интерфейс. Обновите страницу через несколько секунд.</div>'};fetch(b+'/index.html',{cache:'force-cache',credentials:'omit'}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.text()}).then(h=>{const base='<base href="'+b+'/">';h=h.replace(/<head([^>]*)>/i,'<head$1>'+base).replaceAll('"/_app/','"'+b+'/_app/').replaceAll("'/_app/","'"+b+'/_app/');document.open();document.write(h);document.close()}).catch(fail)})();
</script>
</body>
</html>
`;

await writeFile(indexPath, bootstrap, 'utf8');

for (const entry of await readdir(staticDir, { withFileTypes: true })) {
  if (entry.name === 'index.html' || entry.name === 'robots.txt') continue;
  await rm(path.join(staticDir, entry.name), { recursive: true, force: true });
}

const info = await stat(indexPath);
if (info.size >= 10_000) {
  throw new Error(`Vercel bootstrap is ${info.size} bytes; expected < 10 KB`);
}

console.log(`Vercel static output reduced to ${info.size} byte bootstrap -> ${cdnBase}`);
