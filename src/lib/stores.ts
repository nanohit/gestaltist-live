import { writable, get } from 'svelte/store';
import type { SiteContent } from './content';
import { CONTENT_FILE, JSDELIVR_HOSTS, jsdelivrUrl } from './cdn';

export const ADMIN_TOKEN_KEY = 'gestalt-admin-token';

export const isAdmin = writable(false);
/** Заполняется в main.ts до монтирования приложения. */
export const siteContent = writable<SiteContent>(null as unknown as SiteContent);
export const contentStatus = writable<'idle' | 'loading' | 'saving' | 'error'>('idle');
export const contentError = writable<string | null>(null);
/** Коммит ветки content, из которого загружен текущий контент. */
export const contentSha = writable<string | null>(null);

export function getAdminToken(): string {
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  isAdmin.set(true);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  isAdmin.set(false);
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isContent(value: unknown): value is SiteContent {
  const c = value as SiteContent | null;
  return !!c && typeof c === 'object' && !!c.hero && Array.isArray(c.sections);
}

/**
 * Контент берётся с jsDelivr по хэшу коммита (сначала основной хост, потом
 * Fastly). Если коммита нет или CDN недоступен — с Vercel, это работает под VPN.
 */
export async function fetchContent(sha: string | null): Promise<SiteContent> {
  if (sha) {
    for (const host of JSDELIVR_HOSTS) {
      try {
        const res = await fetchWithTimeout(jsdelivrUrl(sha, CONTENT_FILE, host));
        if (!res.ok) continue;
        const data = await res.json();
        if (isContent(data)) return data;
      } catch {
        // пробуем следующий хост
      }
    }
  }
  const res = await fetchWithTimeout('/api/content', { cache: 'no-store' }, 20000);
  const payload = await res.json();
  if (!res.ok || !payload.success || !isContent(payload.data)) {
    throw new Error(payload.error || 'Не удалось загрузить контент');
  }
  return payload.data;
}

/**
 * Страница приходит из edge-кэша; админу перед правками нужна последняя
 * версия. /api/content/version отвечает парой десятков байт.
 */
export async function refreshIfStale() {
  try {
    const res = await fetchWithTimeout('/api/content/version', { cache: 'no-store' });
    const { sha } = await res.json();
    if (!sha || sha === get(contentSha)) return;
    contentStatus.set('loading');
    siteContent.set(await fetchContent(sha));
    contentSha.set(sha);
    contentStatus.set('idle');
  } catch {
    // не критично: работаем с тем, что пришло со страницей
    if (get(contentStatus) === 'loading') contentStatus.set('idle');
  }
}

// --- Сохранение -------------------------------------------------------------
// Сохраняем не чаще раза в 1,5 с и строго по одному запросу за раз:
// каждое сохранение — это коммит в GitHub.

const SAVE_DELAY = 1500;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pending: SiteContent | null = null;
let inFlight = false;

export function hasUnsavedChanges(): boolean {
  return pending !== null || inFlight;
}

export function updateContent(updater: (prev: SiteContent) => SiteContent) {
  siteContent.update((prev) => {
    const next = updater(prev);
    pending = next;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(flushSave, SAVE_DELAY);
    return next;
  });
}

/** gzip уменьшает тело запроса примерно впятеро (54 → ~11 КБ). */
async function encodeBody(content: SiteContent): Promise<{ body: BodyInit; gzip: boolean }> {
  const json = JSON.stringify(content);
  if (typeof CompressionStream === 'undefined') return { body: json, gzip: false };
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return { body: await new Response(stream).arrayBuffer(), gzip: true };
}

const RETRY_DELAY = 5000;

async function flushSave() {
  saveTimeout = null;
  if (inFlight || !pending) return;
  const content = pending;
  pending = null;
  inFlight = true;
  let failed = false;
  contentStatus.set('saving');
  contentError.set(null);
  try {
    const { body, gzip } = await encodeBody(content);
    const res = await fetchWithTimeout(
      '/api/content',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getAdminToken(),
          ...(gzip ? { 'x-body-encoding': 'gzip' } : {}),
        },
        body,
      },
      30000
    );
    const payload = await res.json();
    if (res.status === 401) {
      clearAdminToken();
      throw new Error('Сессия истекла — войдите заново');
    }
    if (!res.ok || !payload.success) {
      throw new Error(payload.error || 'Ошибка сохранения');
    }
    if (payload.sha) contentSha.set(payload.sha);
    if (payload.published === false) {
      // В базе уже лежит, повторять не нужно — только сообщить.
      contentStatus.set('error');
      contentError.set(`Сохранено в базе, но не опубликовано: ${payload.error ?? 'ошибка GitHub'}`);
      return;
    }
    contentStatus.set('idle');
  } catch (err) {
    failed = true;
    // Правка не теряется: если новых изменений нет, повторим эту же.
    if (!pending) pending = content;
    contentStatus.set('error');
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    contentError.set(
      aborted
        ? 'Сервер не ответил — повторяем сохранение…'
        : err instanceof Error
          ? err.message
          : 'Не удалось сохранить'
    );
  } finally {
    inFlight = false;
    // Пока шёл запрос, могли появиться новые правки; после ошибки — повтор.
    if (pending && !saveTimeout && get(isAdmin)) {
      saveTimeout = setTimeout(flushSave, failed ? RETRY_DELAY : SAVE_DELAY);
    }
  }
}
