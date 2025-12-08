import { errorHandler } from '@common/errors/errorHandler';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { usersPlugin } from '@user/index';
import { Elysia } from 'elysia';
import { ordersPlugin } from './orders';
import { paymentsPlugin, vnpayIpnHandler } from './payments';
import { productsPlugin } from './products';
export const app = new Elysia({ prefix: '/api' })
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
					title: 'Novus API Documentation',
					version: '1.0.0',
				},
			},
		}),
	)

	// .use(usersPlugin)
	.use(productsPlugin)
	// .use(ordersPlugin)
	// .use(paymentsPlugin)
	// .use(vnpayIpnHandler)

	.get('/', () => ({ status: 'ok' }), {
		detail: { summary: 'Health check endpoint' },
	})

	.listen(3000);

console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
