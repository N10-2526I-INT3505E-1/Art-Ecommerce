// Standalone Orders Service Server (Port 4001)
import { errorHandler } from '@common/errors/errorHandler';
import { db } from '@order/db';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { ordersPlugin } from './index';
import { OrderService } from './order.service';

const app = new Elysia()
	.use(errorHandler)
	.use(
		cors({
			origin: ['http://localhost:5173', 'https://novus.io.vn/'],
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}),
	)
	.use(
		openapi({
			documentation: {
				info: {
					title: 'Orders Service API Documentation',
					version: '1.0.0',
				},
			},
		}),
	)
	.use(await ordersPlugin({ orderService: new OrderService(db) }))
	.get('/', () => ({ status: 'ok', service: 'orders' }), {
		detail: { summary: 'Health check - Orders Service' },
	})
	.listen(3001);

console.log(`📦 Orders Service running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
