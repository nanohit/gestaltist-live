import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

/**
 * Коммит, чья папка cdn/ попадёт в ссылки на jsDelivr. На Vercel это
 * деплоящийся коммит — cdn/ в нём собрана из того же исходника.
 */
function buildSha() {
	const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
	if (fromVercel) return fromVercel;
	try {
		return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
	} catch {
		return 'main';
	}
}

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__BUILD_SHA__: JSON.stringify(buildSha())
	}
});
