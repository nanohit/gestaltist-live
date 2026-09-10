<script lang="ts">
  import '../app.css';
  import { onMount, type Snippet } from 'svelte';
  import snapshot from '$lib/content.snapshot.json';
  import type { SiteContent } from '$lib/content';
  import { getAdminToken, loadContent, siteContent } from '$lib/stores';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    // First paint comes from the snapshot compiled into the client bundle. Once
    // the CDN JS arrives, the full page appears without waiting for Vercel.
    siteContent.set(snapshot as unknown as SiteContent);

    // Preserve the live admin behaviour: public visitors refresh Turso in the
    // background, after the usable page is already on screen. Admins already do
    // an immediate no-store refresh in +page.svelte.
    if (getAdminToken()) return;
    const timer = window.setTimeout(() => {
      void loadContent();
    }, 1200);
    return () => window.clearTimeout(timer);
  });
</script>

{@render children()}
