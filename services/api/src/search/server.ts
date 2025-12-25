import { errorHandler } from '@common/errors/errorHandler';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { searchPlugin, meilisearchService } from './index';

const app = new Elysia({})
	.use(errorHandler)
	.use(
		cors({
			origin: [
				'http://localhost:5173',
				'https://novus.io.vn',
				'https://api.novus.io.vn',
				'http://localhost:3000',
			],
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}),
	)
	.use(
		openapi({
			documentation: {
				info: {
					title: 'Search Service API Documentation',
					version: '1.0.0',
				},
			},
		}),
	)
	.use(await searchPlugin({ meilisearchService }))
	.get('/', () => ({ status: 'ok', service: 'search' }), {
		detail: { summary: 'Health check - Search Service' },
	})
	.listen(4005);

console.log(`🔍 Search Service running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
