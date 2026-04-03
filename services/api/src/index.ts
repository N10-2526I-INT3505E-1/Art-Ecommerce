import { errorHandler } from '@common/errors/errorHandler';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { usersPlugin } from '@user/index';
import { Elysia } from 'elysia';
import { ordersPlugin } from './orders';
import { db as orderDb } from './orders/db';
import { OrderService } from './orders/order.service';
import { paymentsPlugin, vnpayIpnHandler } from './payments';
import { db as paymentDb } from './payments/db';
import { PaymentIPN, PaymentService } from './payments/payment.service';
import { productsPlugin } from './products';
import { db as productDb } from './products/db';
import { ProductService } from './products/product.service';
import { searchRoutes } from './search/index';
import { BaziService } from './users/bazi.service';
import { db as userDb } from './users/db';
import { UserService } from './users/user.service';

const baziService = new BaziService();
const userService = new UserService(userDb, baziService);

export const app = new Elysia()
	.use(errorHandler)
	.use(
		cors({
			origin: [
				'http://localhost:5173',
				'https://novus.io.vn',
				'https://api.novus.io.vn',
				'http://localhost:3000',
				/\.vercel\.app$/,
				/\.onrender\.com$/,
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
					title: 'Novus API Documentation',
					version: '1.0.0',
				},
			},
		}),
	)

	.use(usersPlugin({ userService }))
	.use(productsPlugin({ productService: new ProductService(productDb) }))
	.use(searchRoutes)
	.use(await ordersPlugin({ orderService: new OrderService(orderDb) }))
	.use(paymentsPlugin({ paymentService: new PaymentService(paymentDb) }))
	.use(vnpayIpnHandler({ paymentIPN: new PaymentIPN(paymentDb) }))

	.get('/', () => ({ status: 'ok' }), {
		detail: { summary: 'Health check endpoint' },
	})

	.listen(3000);

console.log(`🦊 Elysia server is running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
