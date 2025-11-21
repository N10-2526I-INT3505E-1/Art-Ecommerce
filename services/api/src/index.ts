import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { productsAPI } from './products';
import { usersPlugin } from './users';

const app = new Elysia()
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
					title: "L'Artelier API Documentation",
					version: '1.0.0',
				},
			},
		}),
	)

	.use(usersPlugin)
	.use(productsAPI)

	.get('/', () => ({ status: 'ok' }), {
		detail: { summary: 'Health check endpoint' },
	})

	.listen(3000);

console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
