// Standalone Products Service Server (Port 4002)
import { errorHandler } from '@common/errors/errorHandler';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { productsPlugin } from './index';
import { ProductService } from './product.service';
import { db } from './db';
const app = new Elysia({})
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
					title: 'Products Service API Documentation',
					version: '1.0.0',
				},
			},
		}),
	)
	.use(await productsPlugin({ productService: new ProductService(db) }))
	.get('/', () => ({ status: 'ok', service: 'products' }), {
		detail: { summary: 'Health check - Products Service' },
	})
	.listen(4003);

console.log(`🛍️  Products Service running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
