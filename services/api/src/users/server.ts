// Standalone Users Service Server
import { errorHandler } from '@common/errors/errorHandler';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { db } from '@user/db';
import { BaziService } from '@user/bazi.service';
import { usersPlugin } from './index';
import { UserService } from './user.service';

const PORT = parseInt(process.env.PORT || '8080', 10);
const baziService = new BaziService();
const userService = new UserService(db, baziService);

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
					title: 'Users Service API Documentation',
					version: '1.0.0',
				},
			},
		}),
	)
	.use(usersPlugin({ userService }))
	.get('/', () => ({ status: 'ok', service: 'users' }), {
		detail: { summary: 'Health check - Users Service' },
	})
	.listen({
		port: PORT,
		hostname: '0.0.0.0',
	});

console.log(`👤 Users Service running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
