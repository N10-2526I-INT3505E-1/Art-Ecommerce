import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { imagetools } from 'vite-imagetools';

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
	ssr: {
		noExternal: ['three', 'troika-three-text'],
	},
	optimizeDeps: {
		include: ['gsap', 'three'],
		exclude: ['@threlte/core', '@threlte/extras'],
	},
	build: {
		target: 'esnext',
		rollupOptions: {
			output: {
				manualChunks: {
					three: ['three'],
					gsap: ['gsap'],
					threlte: ['@threlte/core', '@threlte/extras'],
				},
			},
		},
	},
	server: {
		proxy: {
			'/api': { target: 'http://localhost:3000', changeOrigin: true },
		},
	},
});
