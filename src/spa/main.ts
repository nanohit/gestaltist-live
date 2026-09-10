import '../app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { contentSha, fetchContent, siteContent } from '$lib/stores';

declare global {
  interface Window {
    /** Выставляет HTML-загрузчик с Vercel (src/lib/server/bootstrap.ts). */
    __G?: { c?: string | null; started?: boolean; fail?: () => void };
  }
}

const g = (window.__G ??= {});

// Загрузчик может подгрузить запасную копию скрипта с другого хоста jsDelivr;
// запускаемся только один раз.
if (!g.started) {
  g.started = true;
  start();
}

async function start() {
  const sha = g.c ?? null;
  try {
    siteContent.set(await fetchContent(sha));
    contentSha.set(sha);
  } catch {
    g.fail?.();
    return;
  }
  const target = document.getElementById('app')!;
  target.replaceChildren();
  mount(App, { target });
}
