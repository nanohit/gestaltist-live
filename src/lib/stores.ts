import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { SiteContent } from './content';
import snapshot from './content.snapshot.json';

export const ADMIN_TOKEN_KEY = 'gestalt-admin-token';

export const isAdmin = writable(false);
export const siteContent = writable<SiteContent>(structuredClone(snapshot as unknown as SiteContent));
export const contentStatus = writable<'idle' | 'loading' | 'saving' | 'error'>('idle');
export const contentError = writable<string | null>(null);

export function getAdminToken(): string {
  if (!browser) return '';
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
}

export function setAdminToken(token: string) {
  if (!browser) return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  isAdmin.set(true);
}

export function clearAdminToken() {
  if (!browser) return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  isAdmin.set(false);
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function updateContent(updater: (prev: SiteContent) => SiteContent) {
  siteContent.update((prev) => {
    const next = updater(prev);
    scheduleSave(next);
    return next;
  });
}

function scheduleSave(content: SiteContent) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => flushSave(content), 600);
}

async function flushSave(content: SiteContent) {
  contentStatus.set('saving');
  contentError.set(null);
  try {
    const res = await fetch('/api/content', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': getAdminToken(),
      },
      body: JSON.stringify(content),
    });
    const payload = await res.json();
    if (res.status === 401) {
      clearAdminToken();
      throw new Error('Сессия истекла — войдите заново');
    }
    if (!res.ok || !payload.success) {
      throw new Error(payload.error || 'Ошибка сохранения');
    }
    siteContent.set(payload.data);
    contentStatus.set('idle');
  } catch (err) {
    contentStatus.set('error');
    contentError.set(err instanceof Error ? err.message : 'Не удалось сохранить');
  }
}

/** Подтягивает свежий контент из БД — нужно админу, т.к. страница отдаётся из кэша. */
export async function loadContent() {
  contentStatus.set('loading');
  contentError.set(null);
  try {
    const res = await fetch('/api/content', { cache: 'no-store' });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload.error || 'Ошибка загрузки');
    }
    siteContent.set(payload.data);
    contentStatus.set('idle');
  } catch (err) {
    contentStatus.set('error');
    contentError.set(err instanceof Error ? err.message : 'Не удалось загрузить');
  }
}
