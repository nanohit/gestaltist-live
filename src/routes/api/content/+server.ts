import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readContent, writeContent } from '$lib/server/storage';

export const GET: RequestHandler = async () => {
  try {
    const content = await readContent();
    return json({ success: true, data: content });
  } catch {
    return json({ success: false, error: 'Не удалось загрузить данные' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();
    if (!payload || !Array.isArray(payload.sections) || !payload.hero) {
      return json({ success: false, error: 'Некорректные данные' }, { status: 400 });
    }
    const saved = await writeContent(payload);
    return json({ success: true, data: saved });
  } catch {
    return json({ success: false, error: 'Не удалось сохранить данные' }, { status: 500 });
  }
};
