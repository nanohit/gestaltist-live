import type { RequestHandler } from './$types';
import { readContent, readPublished } from '$lib/server/storage';
import { renderBootstrap } from '$lib/server/bootstrap';

/**
 * ISR: загрузчик отдаётся с edge-кэша Vercel и пересобирается раз в минуту,
 * а после сохранения в админке — сразу (api/content дёргает x-prerender-revalidate).
 */
export const config = {
  isr: {
    expiration: 60,
    bypassToken: process.env.ISR_BYPASS_TOKEN,
  },
};

export const GET: RequestHandler = async () => {
  const [content, published] = await Promise.all([readContent(), readPublished()]);
  return new Response(renderBootstrap(content, published?.commit ?? null), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
};
