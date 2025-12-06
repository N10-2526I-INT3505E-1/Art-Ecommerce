// Standalone Payments Service Server (Port 4003)
import { errorHandler } from '@common/errors/errorHandler';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { paymentsPlugin, vnpayIpnHandler } from './index';

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
					title: 'Payments Service API Documentation',
					version: '1.0.0',
				},
			},
		}),
	)
	.use(paymentsPlugin)
	.use(vnpayIpnHandler)
	.get('/', () => ({ status: 'ok', service: 'payments' }), {
		detail: { summary: 'Health check - Payments Service' },
	})
	.listen(4003);

console.log(`💳 Payments Service running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
