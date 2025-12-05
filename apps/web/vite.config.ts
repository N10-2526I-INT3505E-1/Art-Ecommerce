import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { imagetools } from 'vite-imagetools';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
	plugins: [
		enhancedImages(),
		tailwindcss(),
		imagetools(),
		sveltekit(),
		visualizer({
			emitFile: true,
			filename: 'stats.html',
		}),
	],
	server: {
		proxy: {
			'/api': { target: 'http://localhost:3000', changeOrigin: true },
		},
	},
});
