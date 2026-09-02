import type { PageServerLoad } from './$types';
import { readContent } from '$lib/server/storage';

/**
 * ISR: страница рендерится на сервере, но отдаётся посетителям
 * со статического edge-кэша Vercel. Правки админа появляются
 * автоматически в течение минуты — без пересборки.
 */
export const config = {
  isr: {
    expiration: 60,
  },
};

export const load: PageServerLoad = async ({ setHeaders }) => {
  const content = await readContent();
  setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=60' });
  return { content };
};
