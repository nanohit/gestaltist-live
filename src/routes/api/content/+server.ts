import { gunzipSync } from 'node:zlib';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readContent, writeContent } from '$lib/server/storage';
import { publishContent } from '$lib/server/publish';
import { isAuthorized } from '$lib/server/auth';
import { CONTENT_FILE, JSDELIVR_HOSTS, jsdelivrUrl } from '$lib/cdn';

export const config = { isr: false };

/** Полный контент — запасной путь, если jsDelivr недоступен (обычно под VPN). */
export const GET: RequestHandler = async ({ setHeaders }) => {
  try {
    const content = await readContent();
    setHeaders({ 'cache-control': 'no-store' });
    return json({ success: true, data: content });
  } catch {
    return json({ success: false, error: 'Не удалось загрузить данные' }, { status: 500 });
  }
};

/**
 * Первый запрос нового коммита jsDelivr тянет с GitHub несколько секунд —
 * делаем его сами, чтобы посетителям файл достался уже из кэша.
 */
async function warmCdn(commit: string) {
  await Promise.all(
    JSDELIVR_HOSTS.map((host) =>
      fetch(jsdelivrUrl(commit, CONTENT_FILE, host), { signal: AbortSignal.timeout(5000) })
        .then((res) => res.arrayBuffer())
        .catch(() => {})
    )
  );
}

/** Сбрасывает edge-кэш загрузчика, чтобы новый хэш контента ушёл посетителям сразу. */
async function revalidateBootstrap(origin: string) {
  const token = process.env.ISR_BYPASS_TOKEN;
  if (!token) return;
  try {
    await fetch(`${origin}/`, {
      method: 'HEAD',
      headers: { 'x-prerender-revalidate': token },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // не страшно: ISR сам обновит страницу в течение минуты
  }
}

/**
 * Ответ намеренно крошечный: из РФ до Vercel проходит ~10 КБ на соединение,
 * поэтому контент обратно не возвращаем. Тело приходит в gzip (x-body-encoding).
 */
export const PUT: RequestHandler = async ({ request, url }) => {
  if (!isAuthorized(request)) {
    return json({ success: false, error: 'Нет доступа: войдите заново' }, { status: 401 });
  }

  let payload;
  try {
    const raw = Buffer.from(await request.arrayBuffer());
    const text =
      request.headers.get('x-body-encoding') === 'gzip'
        ? gunzipSync(raw, { maxOutputLength: 10 * 1024 * 1024 }).toString('utf8')
        : raw.toString('utf8');
    payload = JSON.parse(text);
  } catch {
    return json({ success: false, error: 'Некорректные данные' }, { status: 400 });
  }
  if (!payload || !Array.isArray(payload.sections) || !payload.hero) {
    return json({ success: false, error: 'Некорректные данные' }, { status: 400 });
  }

  try {
    await writeContent(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось сохранить данные';
    return json({ success: false, error: message }, { status: 500 });
  }

  try {
    const published = await publishContent(payload);
    await Promise.all([warmCdn(published.commit), revalidateBootstrap(url.origin)]);
    return json({ success: true, published: true, sha: published.commit });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ошибка публикации';
    return json({ success: true, published: false, error: message });
  }
};
