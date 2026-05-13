import { writable } from 'svelte/store';
import type { SiteContent } from './content';
import { defaultContent } from './content';

export const isAdmin = writable(false);
export const siteContent = writable<SiteContent>(structuredClone(defaultContent));
export const contentStatus = writable<'idle' | 'loading' | 'saving' | 'error'>('idle');
export const contentError = writable<string | null>(null);

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    });
    const payload = await res.json();
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

export async function loadContent() {
  contentStatus.set('loading');
  contentError.set(null);
  try {
    const res = await fetch('/api/content');
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
