import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
	out: './drizzle/all',
	schema: [
		'./src/users/user.model.ts',
		'./src/users/bazi.model.ts',
		'./src/products/product.model.ts',
		'./src/orders/order.model.ts',
		'./src/orders/order_item.model.ts',
		'./src/payments/payment.model.ts',
	],
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_PRODUCTS_DATABASE_URL as string,
		authToken: process.env.TURSO_PRODUCTS_AUTH_TOKEN,
	},
});
