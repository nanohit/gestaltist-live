<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <title>Гештальт Притяжение — Конференция</title>
  <meta name="description" content="Актуальные вопросы гештальт-терапии. Онлайн-конференция." />
</svelte:head>

{@render children()}
