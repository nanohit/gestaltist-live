import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readContent, writeContent } from '$lib/server/storage';
import { isAuthorized } from '$lib/server/auth';

export const config = { isr: false };

export const GET: RequestHandler = async ({ setHeaders }) => {
  try {
    const content = await readContent();
    setHeaders({ 'cache-control': 'no-store' });
    return json({ success: true, data: content });
  } catch {
    return json({ success: false, error: 'Не удалось загрузить данные' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  if (!isAuthorized(request)) {
    return json({ success: false, error: 'Нет доступа: войдите заново' }, { status: 401 });
  }
  try {
    const payload = await request.json();
    if (!payload || !Array.isArray(payload.sections) || !payload.hero) {
      return json({ success: false, error: 'Некорректные данные' }, { status: 400 });
    }
    const saved = await writeContent(payload);
    return json({ success: true, data: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось сохранить данные';
    return json({ success: false, error: message }, { status: 500 });
  }
};
