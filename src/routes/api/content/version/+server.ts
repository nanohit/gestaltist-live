import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readPublished } from '$lib/server/storage';

export const config = { isr: false };

/** Хэш последней публикации — пара десятков байт вместо всего контента. */
export const GET: RequestHandler = async ({ setHeaders }) => {
  const published = await readPublished();
  setHeaders({ 'cache-control': 'no-store' });
  return json({ sha: published?.commit ?? null });
};
