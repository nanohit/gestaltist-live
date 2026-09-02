import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x',
			// Vercel Image Optimization: удалённые фото (imgbb) отдаются
			// с edge-кэша Vercel в avif/webp нужного размера.
			images: {
				sizes: [128, 256, 384, 512, 640, 828, 1200],
				formats: ['image/avif', 'image/webp'],
				minimumCacheTTL: 2592000,
				domains: ['i.ibb.co'],
				remotePatterns: [{ protocol: 'https', hostname: 'i.ibb.co' }]
			}
		})
	}
};

export default config;
