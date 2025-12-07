// Standalone Users Service Server (Port 4000)
import { errorHandler } from '@common/errors/errorHandler';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { usersPlugin } from './index';

const app = new Elysia({ prefix: '/api' })
	.use(errorHandler)
	.use(
		cors({
			origin: 'http://localhost:5173',
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}),
	)
	.use(
		openapi({
			documentation: {
				info: {
					title: 'Users Service API Documentation',
					version: '1.0.0',
				},
			},
		}),
	)
	.use(usersPlugin)
	.get('/', () => ({ status: 'ok', service: 'users' }), {
		detail: { summary: 'Health check - Users Service' },
	})
	.listen(4000);

console.log(`👤 Users Service running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
