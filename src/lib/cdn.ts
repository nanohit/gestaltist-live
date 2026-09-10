/**
 * Всё тяжёлое (JS, CSS, шрифты, иконки, контент) отдаётся через jsDelivr
 * из этого репозитория по хэшу коммита: такие URL неизменяемы и кэшируются
 * навсегда. С Vercel в РФ проходит только ~10 КБ на соединение, поэтому оттуда
 * идут лишь крошечная HTML-страница и короткие ответы API.
 */
export const GITHUB_OWNER = 'nanohit';
export const GITHUB_REPO = 'gestaltist-live';

/** Ветка, куда админка коммитит content.json. Сайт из неё не деплоится. */
export const CONTENT_BRANCH = 'content';
export const CONTENT_FILE = 'content.json';

/** Основной хост и запасной (Fastly) — если основной не ответил. */
export const JSDELIVR_HOSTS = ['cdn.jsdelivr.net', 'fastly.jsdelivr.net'] as const;

export function jsdelivrUrl(ref: string, path: string, host: string = JSDELIVR_HOSTS[0]): string {
  return `https://${host}/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${ref}/${path}`;
}
