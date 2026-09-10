import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

/**
 * Сборка фронтенда для jsDelivr (npm run build:cdn → cdn/).
 * Пути относительные: JS, CSS и шрифты находят друг друга по соседству,
 * в какой бы папке CDN они ни лежали. Имена точек входа Vercel берёт
 * из cdn/.vite/manifest.json.
 */
export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) }
	},
	base: './',
	publicDir: 'spa-public',
	build: {
		outDir: 'cdn',
		emptyOutDir: true,
		manifest: true,
		target: 'es2020',
		rollupOptions: { input: 'src/spa/main.ts' }
	}
});
