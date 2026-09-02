import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		// На Vercel доступен /_vercel/image — локально отдаём оригиналы.
		__ON_VERCEL__: JSON.stringify(Boolean(process.env.VERCEL))
	}
});
