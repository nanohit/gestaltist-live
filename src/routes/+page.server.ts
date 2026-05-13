import type { PageServerLoad } from './$types';
import { readContent } from '$lib/server/storage';

export const load: PageServerLoad = async () => {
  const content = await readContent();
  return { content };
};
