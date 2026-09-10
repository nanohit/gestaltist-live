import adapter from '@sveltejs/adapter-vercel';

/**
 * На Vercel живут только HTML-загрузчик (/) и API. Фронтенд собирается
 * отдельно (vite.spa.config.js) и отдаётся через jsDelivr.
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x'
		})
	}
};

export default config;
